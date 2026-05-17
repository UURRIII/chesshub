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
    :host { display: flex; min-height: 100vh; background: #242423; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .page { max-width: 680px; margin: 0 auto; padding: 40px 24px 60px; width: 100%; }
    .header-left { display: flex; flex-direction: column; gap: 4px; margin-bottom: 22px; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #5a6a7a; text-decoration: none; font-size: 13px; font-weight: 500; transition: color .15s; }
    .back-link:hover { color: #81b64c; }
    .title { font-size: 27px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .subtitle { font-size: 14px; color: #4a5a6a; margin-top: 2px; }

    .section { margin-bottom: 22px; }
    .section-title { font-size: 13px; font-weight: 700; color: #5a6a7a; text-transform: uppercase; letter-spacing: .7px; margin-bottom: 10px; }

    .card { background: #2c2b29; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .row:last-child { border-bottom: none; }

    .avatar { width: 38px; height: 38px; border-radius: 50%; background: #81b64c; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden; position: relative; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .online-dot { position: absolute; bottom: 0; right: 0; width: 11px; height: 11px; border-radius: 50%; background: #4a4a4a; border: 2px solid #2c2b29; }
    .online-dot.on { background: #43d854; }
    .unread-dot { position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; border-radius: 50%; background: #e0554f; border: 2px solid #2c2b29; }

    .info { flex: 1; min-width: 0; }
    .name { font-size: 15px; font-weight: 700; color: #fff; text-decoration: none; }
    .name:hover { color: #81b64c; }
    .meta { font-size: 12px; color: #5a6a7a; }
    .meta .online-txt { color: #43d854; }

    .actions { display: flex; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
    .btn { padding: 7px 12px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all .15s; white-space: nowrap; }
    .btn-green { background: #81b64c; color: #fff; }
    .btn-green:hover { background: #8ec956; }
    .btn-green:disabled { background: #3a4a3a; color: #6a7a6a; cursor: not-allowed; }
    .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: #8a9ab0; }
    .btn-ghost:hover { border-color: rgba(255,255,255,0.25); color: #e8e8e8; }
    .btn-danger:hover { border-color: rgba(220,60,60,0.4); color: #ff8080; }
    .tag { font-size: 12px; color: #6a7a8a; padding: 6px 4px; }

    .search-box { display: flex; gap: 8px; margin-bottom: 10px; }
    .search-input { flex: 1; padding: 10px 14px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; color: #e8e8e8; font-size: 14px; font-family: inherit; }
    .search-input:focus { outline: none; border-color: rgba(129,182,76,0.5); }
    .tc-select { padding: 7px 8px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #e8e8e8; font-size: 13px; font-family: inherit; }

    .empty { padding: 20px 16px; text-align: center; color: #4a5a6a; font-size: 14px; }
    .toast { background: rgba(129,182,76,0.12); border: 1px solid rgba(129,182,76,0.3); color: #a3d977; border-radius: 9px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }

    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 20px; }
    .challenge-modal { background: #2c2b29; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 28px 32px; display: flex; flex-direction: column; align-items: center; gap: 13px; }
    .challenge-icon { font-size: 44px; }
    .challenge-title { font-size: 21px; font-weight: 700; color: #fff; }
    .challenge-from { font-size: 14px; color: #9aaaba; text-align: center; }
    .challenge-actions { display: flex; gap: 14px; margin-top: 6px; }

    /* CHAT */
    .chat-modal { background: #2c2b29; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; width: 100%; max-width: 440px; height: 540px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
    .chat-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .chat-head .name { font-size: 16px; }
    .chat-close { margin-left: auto; background: transparent; border: none; color: #8a9ab0; font-size: 22px; cursor: pointer; line-height: 1; }
    .chat-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
    .chat-empty { text-align: center; color: #4a5a6a; font-size: 13px; margin: auto; }
    .msg { max-width: 78%; padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
    .msg-time { font-size: 10px; opacity: 0.55; margin-top: 3px; }
    .msg.mine { align-self: flex-end; background: #81b64c; color: #fff; border-bottom-right-radius: 3px; }
    .msg.theirs { align-self: flex-start; background: #1a1a1a; color: #e8e8e8; border-bottom-left-radius: 3px; }
    .chat-input-row { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.08); }
    .chat-input { flex: 1; padding: 9px 13px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; color: #e8e8e8; font-size: 14px; font-family: inherit; }
    .chat-input:focus { outline: none; border-color: rgba(129,182,76,0.5); }
  `],
  template: `
<div class="page">
  <div class="header-left">
    <a class="back-link" routerLink="/lobby">← Tornar al lobby</a>
    <div class="title">👥 Amics</div>
    <div class="subtitle">Cerca jugadors, repta'ls i xateja amb ells</div>
  </div>

  <div class="toast" *ngIf="toast">{{ toast }}</div>

  <!-- Cerca de jugadors -->
  <div class="section">
    <div class="section-title">Cercar jugadors</div>
    <div class="search-box">
      <input class="search-input" type="text" placeholder="Escriu un nom d'usuari..."
             [(ngModel)]="searchQuery" (input)="onSearchInput()" />
    </div>
    <div class="card" *ngIf="searchQuery.length >= 2">
      <div *ngIf="searching" class="empty">Cercant...</div>
      <div *ngIf="!searching && searchResults.length === 0" class="empty">Cap usuari trobat</div>
      <div class="row" *ngFor="let u of searchResults">
        <div class="avatar">
          <img *ngIf="u.avatar" [src]="u.avatar" alt=""/>
          <span *ngIf="!u.avatar">{{ u.username[0].toUpperCase() }}</span>
        </div>
        <div class="info">
          <a class="name" [routerLink]="['/player', u.id]">{{ u.username }}</a>
          <div class="meta">ELO {{ u.elo }}</div>
        </div>
        <div class="actions">
          <button *ngIf="u.status === 'none'" class="btn btn-green" (click)="addFriend(u)">＋ Afegir</button>
          <span  *ngIf="u.status === 'sent'"     class="tag">Sol·licitud enviada</span>
          <span  *ngIf="u.status === 'friends'"  class="tag">✓ Ja sou amics</span>
          <button *ngIf="u.status === 'received'" class="btn btn-green" (click)="acceptById(u.id, u.username)">Acceptar sol·licitud</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Sol·licituds rebudes -->
  <div class="section" *ngIf="received.length">
    <div class="section-title">Sol·licituds rebudes ({{ received.length }})</div>
    <div class="card">
      <div class="row" *ngFor="let u of received">
        <div class="avatar">
          <img *ngIf="u.avatar" [src]="u.avatar" alt=""/>
          <span *ngIf="!u.avatar">{{ u.username[0].toUpperCase() }}</span>
        </div>
        <div class="info">
          <div class="name">{{ u.username }}</div>
          <div class="meta">ELO {{ u.elo }}</div>
        </div>
        <div class="actions">
          <button class="btn btn-green" (click)="accept(u)">Acceptar</button>
          <button class="btn btn-ghost btn-danger" (click)="remove(u)">Rebutjar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Sol·licituds enviades -->
  <div class="section" *ngIf="sent.length">
    <div class="section-title">Sol·licituds enviades ({{ sent.length }})</div>
    <div class="card">
      <div class="row" *ngFor="let u of sent">
        <div class="avatar">
          <img *ngIf="u.avatar" [src]="u.avatar" alt=""/>
          <span *ngIf="!u.avatar">{{ u.username[0].toUpperCase() }}</span>
        </div>
        <div class="info">
          <div class="name">{{ u.username }}</div>
          <div class="meta">Pendent...</div>
        </div>
        <div class="actions">
          <button class="btn btn-ghost btn-danger" (click)="remove(u)">Cancel·lar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Amics -->
  <div class="section">
    <div class="section-title">
      Els meus amics ({{ friends.length }})
      <select class="tc-select" [(ngModel)]="selectedTime" style="float:right;margin-top:-4px">
        <option [ngValue]="180">Repte: 3 min</option>
        <option [ngValue]="300">Repte: 5 min</option>
        <option [ngValue]="600">Repte: 10 min</option>
      </select>
    </div>
    <div class="card">
      <div *ngIf="loading" class="empty">Carregant...</div>
      <div *ngIf="!loading && friends.length === 0" class="empty">
        Encara no tens amics. Cerca jugadors a dalt per afegir-ne.
      </div>
      <div class="row" *ngFor="let f of friends">
        <div class="avatar">
          <img *ngIf="f.avatar" [src]="f.avatar" alt=""/>
          <span *ngIf="!f.avatar">{{ f.username[0].toUpperCase() }}</span>
          <span class="online-dot" [class.on]="isOnline(f)"></span>
          <span class="unread-dot" *ngIf="unreadFrom[f.id]"></span>
        </div>
        <div class="info">
          <a class="name" [routerLink]="['/player', f.id]">{{ f.username }}</a>
          <div class="meta">
            ELO {{ f.elo }} ·
            <span [class.online-txt]="isOnline(f)">{{ isOnline(f) ? 'En línia' : 'Desconnectat' }}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-ghost" (click)="openChat(f)">💬 Xat</button>
          <button class="btn btn-green" [disabled]="!isOnline(f) || challengeSent" (click)="challenge(f)">⚔️ Repta</button>
          <button class="btn btn-ghost btn-danger" (click)="remove(f)">✕</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Repte rebut -->
<div class="overlay" *ngIf="challengeReceived">
  <div class="challenge-modal">
    <div class="challenge-icon">⚔️</div>
    <div class="challenge-title">Repte rebut!</div>
    <div class="challenge-from">{{ challengeReceived.fromUsername }} et repta a una partida</div>
    <div class="challenge-actions">
      <button class="btn btn-green" (click)="acceptChallenge()">Acceptar</button>
      <button class="btn btn-ghost" (click)="declineChallenge()">Rebutjar</button>
    </div>
  </div>
</div>

<!-- Xat amb un amic -->
<div class="overlay" *ngIf="chatFriend" (click)="closeChat()">
  <div class="chat-modal" (click)="$event.stopPropagation()">
    <div class="chat-head">
      <div class="avatar">
        <img *ngIf="chatFriend.avatar" [src]="chatFriend.avatar" alt=""/>
        <span *ngIf="!chatFriend.avatar">{{ chatFriend.username[0].toUpperCase() }}</span>
        <span class="online-dot" [class.on]="isOnline(chatFriend)"></span>
      </div>
      <span class="name">{{ chatFriend.username }}</span>
      <button class="chat-close" (click)="closeChat()">×</button>
    </div>
    <div class="chat-body" #chatBody>
      <div *ngIf="chatMessages.length === 0 && !chatLoading" class="chat-empty">
        Cap missatge encara. Escriu el primer!
      </div>
      <div *ngFor="let m of chatMessages"
           class="msg" [class.mine]="m.sender_id === myId" [class.theirs]="m.sender_id !== myId">
        {{ m.body }}
        <div class="msg-time">{{ formatTime(m.created_at) }}</div>
      </div>
    </div>
    <div class="chat-input-row">
      <input class="chat-input" type="text" placeholder="Escriu un missatge..."
             [(ngModel)]="chatInput" (keydown.enter)="sendChat()" maxlength="500" />
      <button class="btn btn-green" (click)="sendChat()">Enviar</button>
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

  myId = this.auth.currentUser?.id ?? 0;

  ngOnInit(): void {
    this.load();
    this.initSocket();
  }

  ngOnDestroy(): void {
    if (this.chatPoll) clearInterval(this.chatPoll);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.socket.disconnect();
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
        this.showToast(username + ' és ara amic teu');
        this.load();
        if (this.searchQuery.length >= 2) this.onSearchInput();
      },
      error: () => {}
    });
  }

  remove(u: Friend): void {
    this.gameService.removeFriend(u.id).subscribe({
      next: () => { this.load(); if (this.searchQuery.length >= 2) this.onSearchInput(); },
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
    this.showToast('Repte enviat a ' + f.username + '...');
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
      const el = document.querySelector('.chat-body');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  private showToast(msg: string): void {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 4000);
  }
}
