import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../../core/services/game';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <div class="row">
        <div class="col-12 text-center mb-4">
          <h1>♟ ChessHub</h1>
          <p class="text-muted">Benvingut, {{ user?.username }}</p>
          <button class="btn btn-outline-secondary btn-sm" (click)="logout()">Tancar sessió</button>
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

      <div *ngIf="error" class="alert alert-danger mt-3">{{ error }}</div>
    </div>
  `
})
export class Lobby {
  private auth   = inject(AuthService);
  private game   = inject(GameService);
  private router = inject(Router);

  user     = this.auth.currentUser;
  pvpColor = 'white';
  pvpTime  = 600;
  botColor = 'white';
  botLevel = 5;
  loading  = false;
  error    = '';

  createPvP(): void {
    this.loading = true;
    this.game.createGame(this.pvpColor, this.pvpTime).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], { queryParams: { type: 'pvp', color: this.pvpColor } }),
      error: () => { this.error = 'Error creant la partida'; this.loading = false; }
    });
  }

  createBot(): void {
    this.loading = true;
    this.game.createBotGame(this.botColor, this.botLevel, 600).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], { queryParams: { type: 'bot', color: this.botColor, level: this.botLevel } }),
      error: () => { this.error = 'Error creant la partida'; this.loading = false; }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
