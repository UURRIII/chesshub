import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { GameService } from '../../core/services/game';
import { SocketService } from '../../core/services/socket';
import { AuthService } from '../../core/services/auth';

interface Friend {
  id: number;
  username: string;
  avatar: string | null;
  elo: number;
}

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: flex; min-height: 100vh; background: #242423; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .page { max-width: 680px; margin: 0 auto; padding: 48px 24px; width: 100%; }
    .header-left { display: flex; flex-direction: column; gap: 4px; margin-bottom: 24px; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #5a6a7a; text-decoration: none; font-size: 13px; font-weight: 500; transition: color .15s; }
    .back-link:hover { color: #81b64c; }
    .title { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .subtitle { font-size: 14px; color: #4a5a6a; margin-top: 2px; }

    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #5a6a7a; text-transform: uppercase; letter-spacing: .7px; margin-bottom: 10px; }

    .card { background: #2c2b29; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .row:last-child { border-bottom: none; }

    .avatar { width: 38px; height: 38px; border-radius: 50%; background: #81b64c; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden; position: relative; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .online-dot { position: absolute; bottom: 0; right: 0; width: 11px; height: 11px; border-radius: 50%; background: #4a4a4a; border: 2px solid #2c2b29; }
    .online-dot.on { background: #43d854; }

    .info { flex: 1; min-width: 0; }
    .name { font-size: 15px; font-weight: 700; color: #fff; }
    .meta { font-size: 12px; color: #5a6a7a; }
    .meta .online-txt { color: #43d854; }

    .actions { display: flex; gap: 7px; }
    .btn { padding: 7px 13px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all .15s; }
    .btn-challenge { background: #81b64c; color: #fff; }
    .btn-challenge:hover { background: #8ec956; }
    .btn-challenge:disabled { background: #3a4a3a; color: #6a7a6a; cursor: not-allowed; }
    .btn-accept { background: #81b64c; color: #fff; }
    .btn-accept:hover { background: #8ec956; }
    .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: #8a9ab0; }
    .btn-ghost:hover { border-color: rgba(220,60,60,0.4); color: #ff8080; }

    .empty { padding: 22px 16px; text-align: center; color: #4a5a6a; font-size: 14px; }
    .hint { font-size: 12px; color: #4a5a6a; margin-top: 8px; }
    .hint a { color: #81b64c; }

    .challenge-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 300; }
    .challenge-modal { background: #2c2b29; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 28px 32px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .challenge-icon { font-size: 44px; }
    .challenge-title { font-size: 21px; font-weight: 700; color: #fff; }
    .challenge-from { font-size: 14px; color: #9aaaba; }
    .challenge-actions { display: flex; gap: 14px; margin-top: 6px; }
    .toast { background: rgba(129,182,76,0.12); border: 1px solid rgba(129,182,76,0.3); color: #a3d977; border-radius: 9px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
  `],
  template: `
<div class="page">
  <div class="header-left">
    <a class="back-link" routerLink="/lobby">← Tornar al lobby</a>
    <div class="title">👥 Amics</div>
    <div class="subtitle">Gestiona els teus amics i repta'ls a jugar</div>
  </div>

  <div class="toast" *ngIf="toast">{{ toast }}</div>

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
          <button class="btn btn-accept" (click)="accept(u)">Acceptar</button>
          <button class="btn btn-ghost" (click)="remove(u)">Rebutjar</button>
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
          <button class="btn btn-ghost" (click)="remove(u)">Cancel·lar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Amics -->
  <div class="section">
    <div class="section-title">Els meus amics ({{ friends.length }})</div>
    <div class="card">
      <div *ngIf="!loading && friends.length === 0" class="empty">
        Encara no tens amics. Afegeix-ne des del perfil d'un jugador.
      </div>
      <div *ngIf="loading" class="empty">Carregant...</div>
      <div class="row" *ngFor="let f of friends">
        <div class="avatar">
          <img *ngIf="f.avatar" [src]="f.avatar" alt=""/>
          <span *ngIf="!f.avatar">{{ f.username[0].toUpperCase() }}</span>
          <span class="online-dot" [class.on]="isOnline(f)"></span>
        </div>
        <div class="info">
          <a class="name" [routerLink]="['/player', f.id]" style="text-decoration:none">{{ f.username }}</a>
          <div class="meta">
            ELO {{ f.elo }} ·
            <span [class.online-txt]="isOnline(f)">{{ isOnline(f) ? 'En línia' : 'Desconnectat' }}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-challenge" [disabled]="!isOnline(f) || challengeSent"
                  (click)="challenge(f)">⚔️ Repta</button>
          <button class="btn btn-ghost" (click)="remove(f)">Treure</button>
        </div>
      </div>
    </div>
    <div class="hint">Repta un amic quan estigui <span class="online-txt" style="color:#43d854">en línia</span>.</div>
  </div>
</div>

<!-- Repte rebut -->
<div class="challenge-overlay" *ngIf="challengeReceived">
  <div class="challenge-modal">
    <div class="challenge-icon">⚔️</div>
    <div class="challenge-title">Repte rebut!</div>
    <div class="challenge-from">{{ challengeReceived.fromUsername }} et repta a una partida</div>
    <div class="challenge-actions">
      <button class="btn btn-accept" (click)="acceptChallenge()">Acceptar</button>
      <button class="btn btn-ghost" (click)="declineChallenge()">Rebutjar</button>
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

  onlineIds: string[] = [];
  challengeSent = false;
  challengeReceived: { fromUserId: string; fromUsername: string; timeControl: number } | null = null;

  private readonly TC = 600;

  ngOnInit(): void {
    this.load();
    this.initSocket();
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }

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
      if (gameId) {
        this.gameService.joinGame(gameId).subscribe({
          next:  () => this.router.navigate(['/game', gameId], { queryParams: { type: 'pvp', color: 'white', time: this.TC } }),
          error: () => this.router.navigate(['/game', gameId], { queryParams: { type: 'pvp', color: 'white', time: this.TC } }),
        });
      }
    });

    this.socket.on('challenge_declined').subscribe(() => {
      this.challengeSent = false;
      this.showToast('El repte ha estat rebutjat.');
    });
  }

  isOnline(f: Friend): boolean {
    return this.onlineIds.includes(String(f.id));
  }

  challenge(f: Friend): void {
    if (this.challengeSent || !this.isOnline(f)) return;
    this.challengeSent = true;
    this.socket.emit('send_challenge', { toUserId: f.id, timeControl: this.TC });
    this.showToast('Repte enviat a ' + f.username + '...');
    setTimeout(() => { this.challengeSent = false; }, 12000);
  }

  acceptChallenge(): void {
    if (!this.challengeReceived) return;
    const fromId = this.challengeReceived.fromUserId;
    const tc     = this.challengeReceived.timeControl || this.TC;
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

  accept(u: Friend): void {
    this.gameService.acceptFriend(u.id).subscribe({
      next: () => { this.showToast(u.username + ' és ara amic teu'); this.load(); },
      error: () => {}
    });
  }

  remove(u: Friend): void {
    this.gameService.removeFriend(u.id).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }

  private showToast(msg: string): void {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 4000);
  }
}
