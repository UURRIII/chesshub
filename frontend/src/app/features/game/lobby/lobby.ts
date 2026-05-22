import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GameService } from '../../../core/services/game';
import { AuthService } from '../../../core/services/auth';
import { SocketService } from '../../../core/services/socket';

// ── Interfícies tipades ───────────────────────────────────────────────────────
interface WaitingGame {
  id:               number;
  player_white_id:  number | null;
  player_black_id:  number | null;
  time_control:     number;
}

interface ActiveGame {
  id:              number;
  white_username:  string | null;
  black_username:  string | null;
  time_control:    number;
}

interface OnlineUser {
  userId:   string;
  username: string;
}

interface ChallengeData {
  fromUserId:   string;
  fromUsername: string;
  timeControl:  number;
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrl: './lobby.scss',
  template: `
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">&#9817;</div>
    <span class="sidebar-logo-text">ChessHub</span>
  </div>
  <nav class="sidebar-nav">
    <a class="nav-item active">
      <span class="nav-icon">&#9816;</span>
      <span class="nav-label">Jugar</span>
    </a>
    <a routerLink="/puzzles" class="nav-item">
      <span class="nav-icon">&#129513;</span>
      <span class="nav-label">Puzzles</span>
    </a>
    <a routerLink="/leaderboard" class="nav-item">
      <span class="nav-icon">&#127942;</span>
      <span class="nav-label">Rànquing</span>
    </a>
    <a routerLink="/friends" class="nav-item">
      <span class="nav-icon">&#128101;</span>
      <span class="nav-label">Amics</span>
    </a>
    <a routerLink="/history" class="nav-item">
      <span class="nav-icon">&#128220;</span>
      <span class="nav-label">Historial</span>
    </a>
    <a routerLink="/admin" class="nav-item" *ngIf="user?.role==='admin'">
      <span class="nav-icon">&#9760;</span>
      <span class="nav-label">Admin</span>
    </a>
    <a routerLink="/profile" class="nav-item">
      <span class="nav-icon">&#128100;</span>
      <span class="nav-label">Perfil</span>
    </a>
    <div class="nav-sep"></div>
  </nav>
  <div class="sidebar-footer">
    <div class="footer-user">
      <div class="footer-avatar">
        <img *ngIf="avatarUrl" [src]="avatarUrl" alt="">
        <span *ngIf="!avatarUrl">{{ user?.username?.charAt(0)?.toUpperCase() }}</span>
      </div>
      <span class="footer-username">{{ user?.username }}</span>
    </div>
    <button class="btn-logout" (click)="logout()">
      <span>&#8594;</span>
      <span class="logout-label">Sortir</span>
    </button>
  </div>
</div>

<div class="main-content">
  <div class="topbar">
    <div>
      <div class="greeting-label">BENVINGUT DE NOU</div>
      <div class="greeting-name">{{ user?.username }}</div>
    </div>
    <div class="topbar-right">
      <a routerLink="/leaderboard" class="btn-leaderboard">&#127942; Rànquing global</a>
    </div>
  </div>

  <div class="content-area">
    <div class="quick-play-grid">

      <!-- PvP card -->
      <div class="mode-card">
        <div class="card-head">
          <div class="card-icon human-icon">&#9876;</div>
          <div>
            <div class="card-title">Contra humà</div>
            <div class="card-sub">Partida en temps real</div>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Color</label>
          <select class="ch-select" [(ngModel)]="pvpColor">
            <option value="random">Aleatori</option>
            <option value="white">Blanques</option>
            <option value="black">Negres</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Control de temps</label>
          <div>
            <div class="time-category">Bullet</div>
            <div class="time-pills-group">
              <button class="t-pill" [class.active]="pvpTime===60"   (click)="pvpTime=60">1 min<small>Bullet</small></button>
              <button class="t-pill" [class.active]="pvpTime===120"  (click)="pvpTime=120">2 min<small>Bullet</small></button>
            </div>
            <div class="time-category">Blitz</div>
            <div class="time-pills-group">
              <button class="t-pill" [class.active]="pvpTime===180"  (click)="pvpTime=180">3 min<small>Blitz</small></button>
              <button class="t-pill" [class.active]="pvpTime===300"  (click)="pvpTime=300">5 min<small>Blitz</small></button>
            </div>
            <div class="time-category">Rapid · Clàssic</div>
            <div class="time-pills-group">
              <button class="t-pill" [class.active]="pvpTime===600"  (click)="pvpTime=600">10 min<small>Rapid</small></button>
              <button class="t-pill" [class.active]="pvpTime===900"  (click)="pvpTime=900">15 min<small>Rapid</small></button>
              <button class="t-pill" [class.active]="pvpTime===1800" (click)="pvpTime=1800">30 min<small>Clàssic</small></button>
            </div>
          </div>
        </div>
        <button class="btn-main" (click)="createPvP()" [disabled]="loading">
          {{ loading ? 'Creant...' : 'Crear partida' }}
        </button>
      </div>

      <!-- Bot card -->
      <div class="mode-card">
        <div class="card-head">
          <div class="card-icon bot-icon">&#129302;</div>
          <div>
            <div class="card-title">Contra bot</div>
            <div class="card-sub">Stockfish WASM (motor local)</div>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Color</label>
          <select class="ch-select" [(ngModel)]="botColor">
            <option value="white">Blanques</option>
            <option value="black">Negres</option>
            <option value="random">Aleatori</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Nivell <span class="lvl-badge">{{ botLevel }}</span></label>
          <input type="range" class="lvl-slider" min="1" max="20" step="1"
                 [(ngModel)]="botLevel" [style.--pct]="((botLevel-1)/19*100)+'%'">
          <div class="slider-ends"><span>Fàcil</span><span>Expert</span></div>
        </div>
        <div class="field">
          <label class="field-label">Temps</label>
          <div class="time-pills-group">
            <button class="t-pill" [class.active]="botTime===300"  (click)="botTime=300">5 min<small>Blitz</small></button>
            <button class="t-pill" [class.active]="botTime===600"  (click)="botTime=600">10 min<small>Rapid</small></button>
            <button class="t-pill" [class.active]="botTime===900"  (click)="botTime=900">15 min<small>Rapid</small></button>
          </div>
        </div>
        <button class="btn-main btn-bot" (click)="createBot()" [disabled]="loading">
          {{ loading ? 'Creant...' : 'Jugar contra bot' }}
        </button>
      </div>

    </div>

    <!-- Waiting games -->
    <div class="waiting-card">
      <div class="waiting-head">
        <div class="waiting-title-row">
          <span class="live-dot"></span>
          <span class="waiting-title">Partides en espera</span>
        </div>
        <button class="btn-refresh" (click)="loadWaiting()">&#8635; Actualitzar</button>
      </div>
      <div *ngIf="waitingGames.length === 0" class="empty-state">
        <div class="mini-board">
          <div *ngFor="let sq of boardSquares" class="mini-sq" [class.light]="sq.light"></div>
        </div>
        <p class="empty-text">No hi ha partides en espera</p>
        <p class="empty-sub">Crea una partida i espera un rival</p>
      </div>
      <div class="game-list" *ngIf="waitingGames.length > 0">
        <div *ngFor="let g of waitingGames" class="game-row">
          <div class="game-info">
            <span class="game-id">#{{ g.id }}</span>
            <span class="game-side">{{ g.player_white_id ? 'Blanques ocupades' : 'Negres ocupades' }}</span>
          </div>
          <span class="time-chip">{{ g.time_control / 60 | number:'1.0-0' }} min</span>
          <button class="btn-join" (click)="joinGame(g.id)" [disabled]="loading">Unir-se</button>
        </div>
      </div>
    </div>

    <!-- Active games (spectate) -->
    <div class="active-card">
      <div class="waiting-head">
        <div class="waiting-title-row">
          <span class="live-dot" style="background:#e05555"></span>
          <span class="waiting-title">Partides en curs</span>
        </div>
        <button class="btn-refresh" (click)="loadActive()">&#8635; Actualitzar</button>
      </div>
      <div *ngIf="activeGames.length === 0" class="empty-state">
        <p class="empty-text">Cap partida activa ara mateix</p>
        <p class="empty-sub">Torna aviat per veure una partida en directe</p>
      </div>
      <div class="game-list" *ngIf="activeGames.length > 0">
        <div *ngFor="let g of activeGames" class="game-row">
          <div class="game-info">
            <span class="game-id">#{{ g.id }}</span>
            <span class="game-players">{{ g.white_username || '?' }} vs {{ g.black_username || '?' }}</span>
          </div>
          <span class="time-chip">{{ g.time_control / 60 | number:'1.0-0' }} min</span>
          <a class="btn-watch" [routerLink]="['/game', g.id]" [queryParams]="{ type: 'pvp', color: 'spectator', time: g.time_control }">
            &#128065; Veure
          </a>
        </div>
      </div>
    </div>

    <!-- Online players + challenge -->
    <div class="active-card" *ngIf="onlineUsers.length > 0">
      <div class="waiting-head">
        <div class="waiting-title-row">
          <span class="live-dot" style="background:#81b64c"></span>
          <span class="waiting-title">Jugadors en línia ({{ onlineUsers.length }})</span>
        </div>
      </div>
      <div class="game-list">
        <div *ngFor="let u of onlineUsers" class="game-row">
          <div class="game-info">
            <span class="game-players">{{ u.username }}</span>
          </div>
          <button class="btn-join" (click)="sendChallenge(u.userId)" [disabled]="challengeSent || loading">
            ⚔ Reptar
          </button>
        </div>
      </div>
    </div>

    <div class="challenge-sent-msg" *ngIf="challengeSent">
      ⏳ Esperant resposta del repte...
      <button (click)="challengeSent=false" style="margin-left:8px;background:transparent;border:none;color:#666;cursor:pointer;font-size:16px">✕</button>
    </div>

    <div class="challenge-declined-msg" *ngIf="challengeDeclined">
      {{ challengeDeclined }} ha rebutjat el repte.
    </div>

    <div *ngIf="error" class="err-banner">{{ error }}</div>
  </div>
</div>

<!-- Challenge received overlay -->
<div class="challenge-overlay" *ngIf="challengeReceived">
  <div class="challenge-modal">
    <div class="challenge-icon">⚔️</div>
    <div class="challenge-title">Repte rebut!</div>
    <div class="challenge-from">{{ challengeReceived.fromUsername }} et reta a una partida</div>
    <div class="challenge-tc">⏱ {{ challengeReceived.timeControl / 60 }} minuts</div>
    <div class="challenge-actions">
      <button class="btn-accept-challenge" (click)="acceptChallenge()">Acceptar</button>
      <button class="btn-decline-challenge" (click)="declineChallenge()">Rebutjar</button>
    </div>
  </div>
</div>
  `
})
export class Lobby implements OnInit, OnDestroy {
  private auth        = inject(AuthService);
  private game        = inject(GameService);
  private router      = inject(Router);
  private socket      = inject(SocketService);
  private destroyRef  = inject(DestroyRef);

  user         = this.auth.currentUser;
  avatarUrl:   string | null = null;           // [FIX] inicialitzat a ngOnInit
  pvpColor     = 'random';
  pvpTime      = 600;
  botColor     = 'white';
  botLevel     = 5;
  botTime      = 600;                          // [FIX] temps del bot exposat
  loading      = false;
  error        = '';
  waitingGames: WaitingGame[] = [];            // [FIX] tipat
  activeGames:  ActiveGame[]  = [];            // [FIX] tipat
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  // ── Challenge system ───────────────────────────────────────────────────────
  onlineUsers:        OnlineUser[]     = [];
  challengeReceived:  ChallengeData | null = null;
  challengeSent       = false;
  challengeDeclined:  string | null    = null;

  // [FIX] subscripcions guardades per fer unsubscribe a ngOnDestroy
  private socketSubs: Subscription[] = [];

  boardSquares = Array.from({ length: 16 }, (_, i) => ({
    light: (Math.floor(i / 4) + i) % 2 === 0
  }));

  ngOnInit(): void {
    // [FIX] avatarUrl llegit a ngOnInit, no a la definició de la propietat
    this.avatarUrl = localStorage.getItem('ch_avatar') || null;

    this.loadWaiting();
    this.loadActive();
    this.initLobbySocket();
    this.refreshInterval = setInterval(() => {
      this.loadWaiting();
      this.loadActive();
    }, 8000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    // [FIX] No fa disconnect() del servei singleton; només fa unsubscribe de les observables
    this.socketSubs.forEach(s => s.unsubscribe());
    this.socketSubs = [];
    // Sortim del lobby: emetem un event de sortida perquè el servidor netegi lobbyUsers
    this.socket.emit('lobby_leave', {});
  }

  private initLobbySocket(): void {
    if (!this.user) return;
    this.socket.connect();
    // Emet lobby_join ara; i torna a emetre cada vegada que el socket es (re)connecta
    this.socket.emit('lobby_join', { username: this.user.username });
    this.socketSubs.push(
      this.socket.on('connect').subscribe(() => {
        this.socket.emit('lobby_join', { username: this.user!.username });
      })
    );

    // [FIX] Subscripcions emmagatzemades per poder fer unsubscribe
    this.socketSubs.push(
      this.socket.on('lobby_users').subscribe((users: OnlineUser[]) => {
        this.onlineUsers = (users || []).filter(u => u.userId !== String(this.user!.id));
      })
    );

    this.socketSubs.push(
      this.socket.on('challenge_received').subscribe((data: ChallengeData) => {
        this.challengeReceived = data;
      })
    );

    this.socketSubs.push(
      this.socket.on('challenge_accepted').subscribe((data: any) => {
        this.challengeSent = false;
        const gameId = data.gameId;
        if (!gameId) return;
        // Unim-nos a la partida com a blanques
        this.game.joinGame(gameId).subscribe({
          next: () => {
            // [FIX] navega NOMÉS en cas d'èxit
            this.router.navigate(['/game', gameId], {
              queryParams: { type: 'pvp', color: 'white', time: this.pvpTime }
            });
          },
          error: (err) => {
            // [FIX] en cas d'error, mostra missatge en lloc de navegar
            this.error = 'Error unint-se a la partida acceptada.';
            console.error('[Lobby] joinGame error:', err);
          }
        });
      })
    );

    this.socketSubs.push(
      this.socket.on('challenge_declined').subscribe((data: any) => {
        this.challengeSent     = false;
        this.challengeDeclined = data.byUsername || 'L\'oponent';
        setTimeout(() => { this.challengeDeclined = null; }, 3500);
      })
    );
  }

  sendChallenge(toUserId: string): void {
    if (!this.user || this.challengeSent) return;
    this.challengeSent = true;
    this.socket.emit('send_challenge', { toUserId, timeControl: this.pvpTime });
  }

  acceptChallenge(): void {
    if (!this.challengeReceived) return;
    const fromId = this.challengeReceived.fromUserId;
    const tc     = this.challengeReceived.timeControl || 600;
    this.challengeReceived = null;
    // Creem partida com a negres
    this.game.createGame('black', tc).subscribe({
      next: (res: any) => {
        const gameId = res.data?.game_id;
        if (gameId) {
          this.socket.emit('accept_challenge', { fromUserId: fromId, gameId });
          this.router.navigate(['/game', gameId], {
            queryParams: { type: 'pvp', color: 'black', time: tc }
          });
        }
      },
      error: () => {
        this.error = 'Error acceptant el repte.';
      }
    });
  }

  declineChallenge(): void {
    if (!this.challengeReceived) return;
    this.socket.emit('decline_challenge', { fromUserId: this.challengeReceived.fromUserId });
    this.challengeReceived = null;
  }

  loadWaiting(): void {
    this.game.getWaitingGames().subscribe({
      next: (res) => this.waitingGames = res.data || [],
      error: (err) => {
        if (err.status === 401) {
          if (this.refreshInterval) clearInterval(this.refreshInterval);
          this.auth.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  loadActive(): void {
    this.game.getActiveGames().subscribe({
      next: (res) => this.activeGames = res.data || [],
      error: () => {}
    });
  }

  createPvP(): void {
    this.loading = true;
    // [FIX] Enviem 'random' al servidor; el backend/socket resol el color
    // (o el resolem aquí si el backend no ho suporta — però ho registrem amb el color final)
    const color = this.pvpColor === 'random'
      ? (Math.random() > 0.5 ? 'white' : 'black')
      : this.pvpColor;
    this.game.createGame(color, this.pvpTime).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'pvp', color, time: this.pvpTime }
      }),
      error: () => { this.error = 'Error creant la partida'; this.loading = false; }
    });
  }

  joinGame(gameId: number): void {
    this.loading = true;
    this.game.joinGame(gameId).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'pvp', color: res.data.color, time: res.data.time_control || 600 }
      }),
      error: () => { this.error = 'Error unint-se a la partida'; this.loading = false; }
    });
  }

  createBot(): void {
    this.loading = true;
    const botColorFinal = this.botColor === 'random'
      ? (Math.random() > 0.5 ? 'white' : 'black')
      : this.botColor;
    // [FIX] Usa botTime en lloc de 600 hardcoded
    this.game.createBotGame(botColorFinal, this.botLevel, this.botTime).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'bot', color: botColorFinal, level: this.botLevel, time: this.botTime }
      }),
      error: () => { this.error = 'Error creant la partida'; this.loading = false; }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
