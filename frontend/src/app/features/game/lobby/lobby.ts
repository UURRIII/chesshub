import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../../core/services/game';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container mt-4">
      <div class="row">
        <div class="col-12 text-center mb-4">
          <h1>♟ ChessHub</h1>
          <p class="text-muted">Benvingut, {{ user?.username }}</p>
          <button class="btn btn-outline-secondary btn-sm" (click)="logout()">Tancar sessió</button>
          <a routerLink="/puzzles" class="btn btn-outline-warning btn-sm ms-2">🧩 Puzzles</a>
        </div>
      </div>

      <div class="row g-4 justify-content-center">
        <div class="col-md-5">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h4>⚔️ Jugar contra humà</h4>
              <div class="mb-3">
                <label class="form-label">Color</label>
                <select class="form-select" [(ngModel)]="pvpColor">
                  <option value="random">Aleatori</option>
                  <option value="white">Blanques</option>
                  <option value="black">Negres</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Temps (minuts)</label>
                <select class="form-select" [(ngModel)]="pvpTime">
                  <option value="180">3 min (Bullet)</option>
                  <option value="300">5 min (Blitz)</option>
                  <option value="600">10 min (Rapid)</option>
                  <option value="900">15 min (Rapid)</option>
                </select>
              </div>
              <button class="btn btn-dark w-100" (click)="createPvP()" [disabled]="loading">
                {{ loading ? 'Creant...' : 'Crear partida' }}
              </button>
            </div>
          </div>
        </div>

        <div class="col-md-5">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h4>🤖 Jugar contra bot</h4>
              <div class="mb-3">
                <label class="form-label">Color</label>
                <select class="form-select" [(ngModel)]="botColor">
                  <option value="white">Blanques</option>
                  <option value="black">Negres</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Nivell Stockfish</label>
                <input type="range" class="form-range" [(ngModel)]="botLevel" min="1" max="20">
                <small class="text-muted">Nivell: {{ botLevel }}</small>
              </div>
              <button class="btn btn-secondary w-100" (click)="createBot()" [disabled]="loading">
                {{ loading ? 'Creant...' : 'Jugar contra bot' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="row mt-4 justify-content-center">
        <div class="col-md-10">
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">🕐 Partides en espera</h5>
                <button class="btn btn-outline-secondary btn-sm" (click)="loadWaiting()">🔄 Actualitzar</button>
              </div>
              <div *ngIf="waitingGames.length === 0" class="text-muted text-center py-3">
                No hi ha partides en espera.
              </div>
              <div class="list-group" *ngIf="waitingGames.length > 0">
                <div *ngFor="let g of waitingGames"
                     class="list-group-item d-flex justify-content-between align-items-center">
                  <span>
                    <strong>Partida #{{ g.id }}</strong>
                    — {{ g.player_white_id ? 'Blanques ocupades' : 'Negres ocupades' }}
                    — {{ g.time_control / 60 }} min
                  </span>
                  <button class="btn btn-success btn-sm" (click)="joinGame(g.id)" [disabled]="loading">
                    Unir-se
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="error" class="alert alert-danger mt-3">{{ error }}</div>
    </div>
  `
})
export class Lobby implements OnInit, OnDestroy {
  private auth   = inject(AuthService);
  private game   = inject(GameService);
  private router = inject(Router);

  user         = this.auth.currentUser;
  pvpColor     = 'random';
  pvpTime      = 600;
  botColor     = 'white';
  botLevel     = 5;
  loading      = false;
  error        = '';
  waitingGames: any[] = [];
  private refreshInterval: any;

  ngOnInit(): void {
    this.loadWaiting();
    this.refreshInterval = setInterval(() => this.loadWaiting(), 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  loadWaiting(): void {
    this.game.getWaitingGames().subscribe({
      next: (res) => this.waitingGames = res.data || [],
      error: () => {}
    });
  }

  createPvP(): void {
    this.loading = true;
    const color = this.pvpColor === 'random'
      ? (Math.random() > 0.5 ? 'white' : 'black')
      : this.pvpColor;
    this.game.createGame(color, this.pvpTime).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'pvp', color: color }
      }),
      error: () => { this.error = 'Error creant la partida'; this.loading = false; }
    });
  }

  joinGame(gameId: number): void {
    this.loading = true;
    this.game.joinGame(gameId).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'pvp', color: res.data.color }
      }),
      error: () => { this.error = 'Error unint-se a la partida'; this.loading = false; }
    });
  }

  createBot(): void {
    this.loading = true;
    this.game.createBotGame(this.botColor, this.botLevel, 600).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'bot', color: this.botColor, level: this.botLevel }
      }),
      error: () => { this.error = 'Error creant la partida'; this.loading = false; }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
