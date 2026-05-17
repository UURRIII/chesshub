import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { GameService } from '../../core/services/game';
import { SocketService } from '../../core/services/socket';
import { AuthService } from '../../core/services/auth';

interface Friend { id: number; username: string; avatar: string | null; elo: number; }
interface SearchUser extends Friend { status: 'none' | 'sent' | 'received' | 'friends'; }
interface Msg { id: number; sender_id: number; body: string; created_at: string; }

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    :host { display: block; min-height: 100vh; background: #21201f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .page { max-width: 640px; margin: 0 auto; padding: 40px 20px 64px; }

    .topbar { display: flex; flex-direction: column; gap: 3px; margin-bottom: 26px; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #6a7a8a; text-decoration: none; font-size: 13px; font-weight: 600; width: fit-content; transition: color .15s; }
    .back-link:hover { color: #81b64c; }
    .title { font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -0.4px; }
    .subtitle { font-size: 13.5px; color: #6a7a8a; }

    .toast { background: rgba(129,182,76,0.13); border: 1px solid rgba(129,182,76,0.35); color: #a7da7d; border-radius: 10px; padding: 11px 15px; font-size: 13px; margin-bottom: 18px; font-weight: 500; }

    /* ── Cards & sections ── */
    .block { margin-bottom: 22px; }
    .block-label { font-size: 11.5px; font-weight: 700; color: #5a6a7a; text-transform: uppercase; letter-spacing: 1px; margin: 0 4px 9px; display: flex; align-items: center; justify-content: space-between; }
    .count-pill { background: rgba(129,182,76,0.18); color: #a7da7d; border-radius: 20px; padding: 1px 9px; font-size: 11px; }
    .card { background: #2b2a28; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; overflow: hidden; }

    /* ── Search ── */
    .search-field { position: relative; }
    .search-field .ic { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); font-size: 15px; opacity: .5; }
    .search-input { width: 100%; padding: 13px 15px 13px 40px; background: #2b2a28; border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; color: #e8e8e8; font-size: 14.5px; font-family: inherit; transition: border-color .15s; }
    .search-input::placeholder { color: #5a6a7a; }
    .search-input:focus { outline: none; border-color: rgba(129,182,76,0.55); }

    /* ── Rows ── */
    .row { display: flex; align-items: center; gap: 13px; padding: 13px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background .12s; }
    .row:last-child { border-bottom: none; }
    .row:hover { background: rgba(255,255,255,0.025); }

    .avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden; position: relative; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .dot { position: absolute; bottom: 1px; right: 1px; width: 11px; height: 11px; border-radius: 50%; background: #555; border: 2.5px solid #2b2a28; }
    .dot.on { background: #43d854; }
    .badge-new { position: absolute; top: -3px; right: -3px; min-width: 16px; height: 16px; border-radius: 9px; background: #e0554f; border: 2px solid #2b2a28; }

    .ident { flex: 1; min-width: 0; }
    .uname { font-size: 15px; font-weight: 700; color: #fff; text-decoration: none; display: inline-block; }
    a.uname:hover { color: #81b64c; }
    .umeta { font-size: 12.5px; color: #6a7a8a; margin-top: 1px; }
    .umeta .live { color: #43d854; font-weight: 600; }
    .uelo { color: #c9a84a; font-weight: 600; }

    .acts { display: flex; gap: 7px; align-items: center; flex-shrink: 0; }
    .btn { padding: 8px 13px; border-radius: 9px; border: none; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all .14s; white-space: nowrap; }
    .btn:active { transform: scale(0.96); }
    .btn-primary { background: #81b64c; color: #fff; }
    .btn-primary:hover { background: #8fc659; }
    .btn-primary:disabled { background: #3a4536; color: #67735f; cursor: not-allowed; }
    .btn-soft { background: rgba(255,255,255,0.07); color: #c4ccd4; }
    .btn-soft:hover { background: rgba(255,255,255,0.12); }
    .btn-icon { padding: 8px 11px; }
    .btn-x { background: transparent; color: #6a7a8a; padding: 8px 9px; }
    .btn-x:hover { color: #e0554f; }
    .pill-state { font-size: 12.5px; color: #6a7a8a; font-weight: 600; padding: 0 6px; }
    .pill-state.ok { color: #81b64c; }

    .empty { padding: 26px 16px; text-align: center; color: #56646f; font-size: 13.5px; }
    .tc-pick { background: #21201f; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #c4ccd4; font-size: 11.5px; font-family: inherit; padding: 3px 6px; font-weight: 600; }

    /* ── Overlay / challenge ── */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.74); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 400; padding: 18px; }
    .ch-modal { background: #2b2a28; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 30px 34px; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
    .ch-ico { font-size: 46px; }
    .ch-title { font-size: 21px; font-weight: 800; color: #fff; }
    .ch-from { font-size: 14px; color: #9aaaba; text-align: center; }
    .ch-acts { display: flex; gap: 12px; margin-top: 8px; }

    /* ── Chat ── */
    .chat { background: #25241f; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 100%; max-width: 430px; height: 560px; max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.55); }
    .chat-head { display: flex; align-items: center; gap: 11px; padding: 13px 15px; background: #2b2a28; border-bottom: 1px solid rgba(255,255,255,0.07); }
    .chat-head .h-name { font-size: 15.5px; font-weight: 700; color: #fff; line-height: 1.2; }
    .chat-head .h-sub { font-size: 11.5px; color: #6a7a8a; }
    .chat-head .h-sub.live { color: #43d854; }
    .chat-x { margin-left: auto; background: rgba(255,255,255,0.06); border: none; color: #9aaaba; width: 30px; height: 30px; border-radius: 8px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .chat-x:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .chat-body { flex: 1; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 3px; background: #21201f; }
    .chat-empty { margin: auto; text-align: center; color: #56646f; font-size: 13px; line-height: 1.6; }

    .bubble-row { display: flex; margin-top: 8px; }
    .bubble-row.mine { justify-content: flex-end; }
    .bubble-row.theirs { justify-content: flex-start; }
    .bubble { max-width: 75%; padding: 8px 12px 6px; border-radius: 16px; }
    .bubble .txt { font-size: 14px; line-height: 1.4; word-wrap: break-word; white-space: pre-wrap; }
    .bubble .tm { font-size: 10px; margin-top: 3px; text-align: right; }
    .mine .bubble { background: #81b64c; color: #fff; border-bottom-right-radius: 5px; }
    .mine .bubble .tm { color: rgba(255,255,255,0.7); }
    .theirs .bubble { background: #383732; color: #ececec; border-bottom-left-radius: 5px; }
    .theirs .bubble .tm { color: #8a8a82; }

    .chat-input-bar { display: flex; gap: 8px; padding: 11px 12px; background: #2b2a28; border-top: 1px solid rgba(255,255,255,0.07); }
    .chat-input { flex: 1; padding: 10px 14px; background: #21201f; border: 1px solid rgba(255,255,255,0.09); border-radius: 20px; color: #e8e8e8; font-size: 14px; font-family: inherit; }
    .chat-input::placeholder { color: #5a6a7a; }
    .chat-input:focus { outline: none; border-color: rgba(129,182,76,0.55); }
    .chat-send { width: 40px; height: 40px; border-radius: 50%; border: none; background: #81b64c; color: #fff; font-size: 17px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: background .14s; }
    .chat-send:hover { background: #8fc659; }
  `],
  template: `
<div class="page">
  <div class="topbar">
    <a class="back-link" routerLink="/lobby">&#8592; Tornar al lobby</a>
    <div class="title">Amics</div>
    <div class="subtitle">Cerca jugadors, repta'ls i xateja amb ells</div>
  </div>

  <div class="toast" *ngIf="toast">{{ toast }}</div>

  <!-- ── Cerca ── -->
  <div class="block">
    <div class="search-field">
      <span class="ic">&#128269;</span>
      <input class="search-input" type="text" placeholder="Cerca jugadors pel nom d'usuari..."
             [(ngModel)]="searchQuery" (input)="onSearchInput()" />
    </div>
    <div class="card" style="margin-top:10px" *ngIf="searchQuery.trim().length >= 2">
      <div *ngIf="searching" class="empty">Cercant...</div>
      <div *ngIf="!searching && searchResults.length === 0" class="empty">Cap jugador amb aquest nom</div>
      <div class="row" *ngFor="let u of searchResults">
        <div class="avatar" [style.background]="u.avatar ? 'transparent' : avColor(u.username)">
          <img *ngIf="u.avatar" [src]="u.avatar" alt=""/>
          <span *ngIf="!u.avatar">{{ initial(u.username) }}</span>
        </div>
        <div class="ident">
          <a class="uname" [routerLink]="['/player', u.id]">{{ u.username }}</a>
          <div class="umeta"><span class="uelo">{{ u.elo }}</span> ELO</div>
        </div>
        <div class="acts">
          <button *ngIf="u.status === 'none'" class="btn btn-primary" (click)="addFriend(u)">Afegir amic</button>
          <span  *ngIf="u.status === 'sent'"    class="pill-state">Sol·licitud enviada</span>
          <span  *ngIf="u.status === 'friends'" class="pill-state ok">&#10003; Amics</span>
          <button *ngIf="u.status === 'received'" class="btn btn-primary" (click)="acceptById(u.id, u.username)">Acceptar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Sol·licituds rebudes ── -->
  <div class="block" *ngIf="received.length">
    <div class="block-label"><span>Sol·licituds rebudes</span><span class="count-pill">{{ received.length }}</span></div>
    <div class="card">
      <div class="row" *ngFor="let u of received">
        <div class="avatar" [style.background]="u.avatar ? 'transparent' : avColor(u.username)">
          <img *ngIf="u.avatar" [src]="u.avatar" alt=""/>
          <span *ngIf="!u.avatar">{{ initial(u.username) }}</span>
        </div>
        <div class="ident">
          <span class="uname">{{ u.username }}</span>
          <div class="umeta">et vol afegir d'amic</div>
        </div>
        <div class="acts">
          <button class="btn btn-primary" (click)="accept(u)">Acceptar</button>
          <button class="btn btn-soft" (click)="remove(u)">Rebutjar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Sol·licituds enviades ── -->
  <div class="block" *ngIf="sent.length">
    <div class="block-label"><span>Sol·licituds enviades</span><span class="count-pill">{{ sent.length }}</span></div>
    <div class="card">
      <div class="row" *ngFor="let u of sent">
        <div class="avatar" [style.background]="u.avatar ? 'transparent' : avColor(u.username)">
          <img *ngIf="u.avatar" [src]="u.avatar" alt=""/>
          <span *ngIf="!u.avatar">{{ initial(u.username) }}</span>
        </div>
        <div class="ident">
          <span class="uname">{{ u.username }}</span>
          <div class="umeta">pendent d'acceptació</div>
        </div>
        <div class="acts">
          <button class="btn btn-soft" (click)="remove(u)">Cancel·lar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Amics ── -->
  <div class="block">
    <div class="block-label">
      <span>Els meus amics <span class="count-pill" *ngIf="friends.length">{{ friends.length }}</span></span>
      <select class="tc-pick" [(ngModel)]="selectedTime" title="Temps de la partida en reptar">
        <option [ngValue]="180">Repte 3 min</option>
        <option [ngValue]="300">Repte 5 min</option>
        <option [ngValue]="600">Repte 10 min</option>
      </select>
    </div>
    <div class="card">
      <div *ngIf="loading" class="empty">Carregant...</div>
      <div *ngIf="!loading && friends.length === 0" class="empty">
        Encara no tens amics.<br>Cerca jugadors a dalt per afegir-ne.
      </div>
      <div class="row" *ngFor="let f of friends">
        <div class="avatar" [style.background]="f.avatar ? 'transparent' : avColor(f.username)">
          <img *ngIf="f.avatar" [src]="f.avatar" alt=""/>
          <span *ngIf="!f.avatar">{{ initial(f.username) }}</span>
          <span class="dot" [class.on]="isOnline(f)"></span>
          <span class="badge-new" *ngIf="unreadFrom[f.id]"></span>
        </div>
        <div class="ident">
          <a class="uname" [routerLink]="['/player', f.id]">{{ f.username }}</a>
          <div class="umeta">
            <span class="uelo">{{ f.elo }}</span> ELO ·
            <span [class.live]="isOnline(f)">{{ isOnline(f) ? 'En línia' : 'Desconnectat' }}</span>
          </div>
        </div>
        <div class="acts">
          <button class="btn btn-soft btn-icon" (click)="openChat(f)" title="Xatejar">&#128172;</button>
          <button class="btn btn-primary" [disabled]="!isOnline(f) || challengeSent"
                  (click)="challenge(f)" [title]="isOnline(f) ? 'Reptar a una partida' : 'Aquest amic no està connectat'">
            Reptar
          </button>
          <button class="btn btn-x" (click)="remove(f)" title="Treure de la llista">&#10005;</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ── Repte rebut ── -->
<div class="overlay" *ngIf="challengeReceived">
  <div class="ch-modal">
    <div class="ch-ico">&#9876;&#65039;</div>
    <div class="ch-title">Repte rebut!</div>
    <div class="ch-from"><strong>{{ challengeReceived.fromUsername }}</strong> et repta a una partida</div>
    <div class="ch-acts">
      <button class="btn btn-primary" (click)="acceptChallenge()">Acceptar</button>
      <button class="btn btn-soft" (click)="declineChallenge()">Rebutjar</button>
    </div>
  </div>
</div>

<!-- ── Xat ── -->
<div class="overlay" *ngIf="chatFriend" (click)="closeChat()">
  <div class="chat" (click)="$event.stopPropagation()">
    <div class="chat-head">
      <div class="avatar" style="width:38px;height:38px"
           [style.background]="chatFriend.avatar ? 'transparent' : avColor(chatFriend.username)">
        <img *ngIf="chatFriend.avatar" [src]="chatFriend.avatar" alt=""/>
        <span *ngIf="!chatFriend.avatar">{{ initial(chatFriend.username) }}</span>
        <span class="dot" [class.on]="isOnline(chatFriend)"></span>
      </div>
      <div>
        <div class="h-name">{{ chatFriend.username }}</div>
        <div class="h-sub" [class.live]="isOnline(chatFriend)">{{ isOnline(chatFriend) ? 'En línia' : 'Desconnectat' }}</div>
      </div>
      <button class="chat-x" (click)="closeChat()">&times;</button>
    </div>

    <div class="chat-body" id="chatBody">
      <div *ngIf="chatMessages.length === 0 && !chatLoading" class="chat-empty">
        Encara no hi ha missatges.<br>Escriu el primer per començar la conversa!
      </div>
      <div *ngFor="let m of chatMessages"
           class="bubble-row" [class.mine]="isMine(m)" [class.theirs]="!isMine(m)">
        <div class="bubble">
          <div class="txt">{{ m.body }}</div>
          <div class="tm">{{ formatTime(m.created_at) }}</div>
        </div>
      </div>
    </div>

    <div class="chat-input-bar">
      <input class="chat-input" type="text" placeholder="Escriu un missatge..."
             [(ngModel)]="chatInput" (keydown.enter)="sendChat()" maxlength="500" />
      <button class="chat-send" (click)="sendChat()" title="Enviar">&#10148;</button>
    </div>
  </div>
</div>
  `
})
export class Friends implements OnInit, OnDestroy {
  private gameService = inject(GameService);
  private socket      = inject(SocketService);
  private auth        = inject(AuthService);
  private router      = inject(Router);

  friends:  Friend[] = [];
  received: Friend[] = [];
  sent:     Friend[] = [];
  loading = true;
  toast = '';

  searchQuery = '';
  searchResults: SearchUser[] = [];
  searching = false;
  private searchTimer: any = null;

  onlineIds: string[] = [];
  challengeSent = false;
  challengeReceived: { fromUserId: string; fromUsername: string; timeControl: number } | null = null;
  selectedTime = 600;

  chatFriend: Friend | null = null;
  chatMessages: Msg[] = [];
  chatInput = '';
  chatLoading = false;
  unreadFrom: Record<number, boolean> = {};
  private chatPoll: any = null;

  myId = Number(this.auth.currentUser?.id ?? 0);

  private static readonly AV_COLORS = ['#e0554f', '#3f8fd6', '#3fb56a', '#9b6fd6', '#e0973f', '#3fb5ad'];

  ngOnInit(): void {
    this.load();
    this.initSocket();
  }

  ngOnDestroy(): void {
    if (this.chatPoll) clearInterval(this.chatPoll);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.socket.disconnect();
  }

  // ── Helpers de presentació ──────────────────────────────────────────────────

  initial(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
  }

  avColor(name: string): string {
    if (!name) return Friends.AV_COLORS[1];
    return Friends.AV_COLORS[name.charCodeAt(0) % Friends.AV_COLORS.length];
  }

  isMine(m: Msg): boolean {
    return Number(m.sender_id) === this.myId;
  }

  // ── Càrrega de dades ────────────────────────────────────────────────────────

  private load(): void {
    this.gameService.getFriends().subscribe({
      next:  (res) => { this.friends = res.data || []; this.loading = false; },
      error: ()    => { this.loading = false; }
    });
    this.gameService.getFriendRequests().subscribe({
      next: (res) => {
        this.received = res.data?.received || [];
        this.sent     = res.data?.sent || [];
      },
      error: () => {}
    });
  }

  private initSocket(): void {
    const user = this.auth.currentUser;
    if (!user) return;
    this.socket.connect();
    this.socket.emit('lobby_join', { userId: user.id, username: user.username });

    this.socket.on('lobby_users').subscribe((users: any[]) => {
      this.onlineIds = (users || []).map(u => String(u.userId));
    });

    this.socket.on('challenge_received').subscribe((data: any) => {
      this.challengeReceived = data;
    });

    this.socket.on('challenge_accepted').subscribe((data: any) => {
      this.challengeSent = false;
      const gameId = data.gameId;
      const tc = this.selectedTime;
      if (gameId) {
        this.gameService.joinGame(gameId).subscribe({
          next:  () => this.router.navigate(['/game', gameId], { queryParams: { type: 'pvp', color: 'white', time: tc } }),
          error: () => this.router.navigate(['/game', gameId], { queryParams: { type: 'pvp', color: 'white', time: tc } }),
        });
      }
    });

    this.socket.on('challenge_declined').subscribe(() => {
      this.challengeSent = false;
      this.showToast('El repte ha estat rebutjat.');
    });

    this.socket.on('dm_received').subscribe((data: any) => {
      const fromId = Number(data.fromUserId);
      if (this.chatFriend && this.chatFriend.id === fromId) {
        this.refreshChat();
      } else {
        this.unreadFrom[fromId] = true;
      }
    });
  }

  // ── Cerca ───────────────────────────────────────────────────────────────────

  onSearchInput(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const q = this.searchQuery.trim();
    if (q.length < 2) { this.searchResults = []; this.searching = false; return; }
    this.searching = true;
    this.searchTimer = setTimeout(() => {
      this.gameService.searchUsers(q).subscribe({
        next:  (res) => { this.searchResults = res.data || []; this.searching = false; },
        error: ()    => { this.searchResults = []; this.searching = false; }
      });
    }, 350);
  }

  addFriend(u: SearchUser): void {
    this.gameService.sendFriendRequest(u.id).subscribe({
      next: () => {
        u.status = 'sent';
        this.showToast('Sol·licitud enviada a ' + u.username);
        this.load();
      },
      error: (err) => this.showToast(err.error?.message || 'No s\'ha pogut enviar la sol·licitud')
    });
  }

  // ── Sol·licituds ────────────────────────────────────────────────────────────

  accept(u: Friend): void {
    this.acceptById(u.id, u.username);
  }

  acceptById(id: number, username: string): void {
    this.gameService.acceptFriend(id).subscribe({
      next: () => {
        this.showToast(username + ' ja és amic teu!');
        this.load();
        if (this.searchQuery.trim().length >= 2) this.onSearchInput();
      },
      error: () => {}
    });
  }

  remove(u: Friend): void {
    this.gameService.removeFriend(u.id).subscribe({
      next: () => { this.load(); if (this.searchQuery.trim().length >= 2) this.onSearchInput(); },
      error: () => {}
    });
  }

  // ── Estat en línia ──────────────────────────────────────────────────────────

  isOnline(f: Friend): boolean {
    return this.onlineIds.includes(String(f.id));
  }

  // ── Desafiaments ────────────────────────────────────────────────────────────

  challenge(f: Friend): void {
    if (this.challengeSent || !this.isOnline(f)) return;
    this.challengeSent = true;
    this.socket.emit('send_challenge', { toUserId: f.id, timeControl: this.selectedTime });
    this.showToast('Repte enviat a ' + f.username + '. Esperant resposta...');
    setTimeout(() => { this.challengeSent = false; }, 15000);
  }

  acceptChallenge(): void {
    if (!this.challengeReceived) return;
    const fromId = this.challengeReceived.fromUserId;
    const tc     = this.challengeReceived.timeControl || 600;
    this.challengeReceived = null;
    this.gameService.createGame('black', tc).subscribe({
      next: (res: any) => {
        const gameId = res.data?.game_id;
        if (gameId) {
          this.socket.emit('accept_challenge', { fromUserId: fromId, gameId });
          this.router.navigate(['/game', gameId], { queryParams: { type: 'pvp', color: 'black', time: tc } });
        }
      },
      error: () => {}
    });
  }

  declineChallenge(): void {
    if (!this.challengeReceived) return;
    this.socket.emit('decline_challenge', { fromUserId: this.challengeReceived.fromUserId });
    this.challengeReceived = null;
  }

  // ── Xat ─────────────────────────────────────────────────────────────────────

  openChat(f: Friend): void {
    this.chatFriend = f;
    this.chatMessages = [];
    this.chatInput = '';
    delete this.unreadFrom[f.id];
    this.refreshChat();
    if (this.chatPoll) clearInterval(this.chatPoll);
    this.chatPoll = setInterval(() => this.refreshChat(), 4000);
  }

  closeChat(): void {
    this.chatFriend = null;
    if (this.chatPoll) { clearInterval(this.chatPoll); this.chatPoll = null; }
  }

  private refreshChat(): void {
    if (!this.chatFriend) return;
    const fid = this.chatFriend.id;
    this.chatLoading = true;
    this.gameService.getConversation(fid).subscribe({
      next: (res) => {
        if (this.chatFriend && this.chatFriend.id === fid) {
          this.chatMessages = res.data || [];
          this.chatLoading = false;
          this.scrollChat();
        }
      },
      error: () => { this.chatLoading = false; }
    });
  }

  sendChat(): void {
    const body = this.chatInput.trim();
    if (!body || !this.chatFriend) return;
    const friend = this.chatFriend;
    this.chatInput = '';
    this.gameService.sendMessage(friend.id, body).subscribe({
      next: () => {
        this.socket.emit('dm', {
          toUserId: friend.id,
          body,
          senderName: this.auth.currentUser?.username || 'Amic',
        });
        this.refreshChat();
      },
      error: () => this.showToast('No s\'ha pogut enviar el missatge')
    });
  }

  formatTime(d: string): string {
    if (!d) return '';
    const date = new Date(d.replace(' ', 'T'));
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollChat(): void {
    setTimeout(() => {
      const el = document.getElementById('chatBody');
      if (el) el.scrollTop = el.scrollHeight;
    }, 60);
  }

  private showToast(msg: string): void {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 4000);
  }
}
