import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { GameService } from '../../../core/services/game';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>👤 Perfil</h2>
            <a routerLink="/lobby" class="btn btn-outline-secondary btn-sm">← Lobby</a>
          </div>

          <!-- Targeta perfil -->
          <div class="card shadow-sm mb-4">
            <div class="card-body">
              <div class="row align-items-center">
                <div class="col-auto">
                  <div class="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center"
                    style="width:64px;height:64px;font-size:1.8rem">
                    {{ user?.username?.[0]?.toUpperCase() }}
                  </div>
                </div>
                <div class="col">
                  <h4 class="mb-0">{{ user?.username }}</h4>
                  <small class="text-muted">{{ user?.email }}</small>
                  <span class="badge bg-secondary ms-2">{{ user?.role }}</span>
                </div>
                <div class="col-auto text-center">
                  <div class="fw-bold fs-4 text-primary">{{ stats?.elo ?? 1200 }}</div>
                  <small class="text-muted">ELO</small>
                </div>
                <div class="col-auto">
                  <button class="btn btn-outline-dark btn-sm" (click)="toggleEdit()">
                    {{ editing ? 'Cancel·lar' : '✏️ Editar' }}
                  </button>
                </div>
              </div>

              <!-- Formulari edició -->
              <div *ngIf="editing" class="mt-3 border-top pt-3">
                <div class="mb-2">
                  <label class="form-label small">Nom d'usuari</label>
                  <input type="text" class="form-control form-control-sm" [(ngModel)]="editUsername">
                </div>
                <div class="mb-2">
                  <label class="form-label small">Nova contrasenya</label>
                  <input type="password" class="form-control form-control-sm" [(ngModel)]="editPassword" placeholder="Deixa buit per no canviar">
                </div>
                <div class="mb-2">
                  <label class="form-label small">Bio</label>
                  <textarea class="form-control form-control-sm" [(ngModel)]="editBio" rows="2"></textarea>
                </div>
                <div *ngIf="editError" class="alert alert-danger py-1 small">{{ editError }}</div>
                <div *ngIf="editSuccess" class="alert alert-success py-1 small">{{ editSuccess }}</div>
                <button class="btn btn-dark btn-sm" (click)="saveProfile()" [disabled]="saving">
                  {{ saving ? 'Guardant...' : 'Guardar canvis' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Estadístiques -->
          <div class="row g-3 mb-4" *ngIf="stats">
            <div class="col-3">
              <div class="card text-center shadow-sm">
                <div class="card-body py-2">
                  <div class="fw-bold text-success fs-4">{{ stats.wins }}</div>
                  <small>Victòries</small>
                </div>
              </div>
            </div>
            <div class="col-3">
              <div class="card text-center shadow-sm">
                <div class="card-body py-2">
                  <div class="fw-bold text-danger fs-4">{{ stats.losses }}</div>
                  <small>Derrotes</small>
                </div>
              </div>
            </div>
            <div class="col-3">
              <div class="card text-center shadow-sm">
                <div class="card-body py-2">
                  <div class="fw-bold text-warning fs-4">{{ stats.draws }}</div>
                  <small>Taules</small>
                </div>
              </div>
            </div>
            <div class="col-3">
              <div class="card text-center shadow-sm">
                <div class="card-body py-2">
                  <div class="fw-bold fs-4">{{ stats.win_rate }}%</div>
                  <small>% Victòria</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Historial -->
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="mb-3">📋 Historial de partides</h5>
              <div *ngIf="games.length === 0" class="text-muted text-center py-3">
                Encara no has jugat cap partida.
              </div>
              <div class="list-group" *ngIf="games.length > 0">
                <div *ngFor="let g of games"
                  class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <span class="badge me-2"
                      [class.bg-success]="isWin(g)"
                      [class.bg-danger]="isLoss(g)"
                      [class.bg-warning]="isDraw(g)">
                      {{ isWin(g) ? 'Victòria' : isLoss(g) ? 'Derrota' : 'Taules' }}
                    </span>
                    <span class="text-muted small">
                      vs {{ getOpponent(g) }} · {{ g.time_control / 60 }} min
                    </span>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <small class="text-muted">{{ g.created_at | date:'dd/MM/yy HH:mm' }}</small>
                    <span class="badge" [class.bg-success]="g.status === 'finished'" [class.bg-warning]="g.status === 'ongoing'">
                      {{ g.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class Profile implements OnInit {
  private auth = inject(AuthService);
  private gameService = inject(GameService);


  user = this.auth.currentUser;
  stats: any = null;
  games: any[] = [];

  editing = false;
  saving = false;
  editUsername = '';
  editPassword = '';
  editBio = '';
  editError = '';
  editSuccess = '';

  ngOnInit(): void {
    if (!this.user) return;
    this.editUsername = this.user.username;

    this.gameService.getMyGames().subscribe({
      next: (res) => this.games = res.data || [],
      error: () => {}
    });

    this.gameService.getUserStats(this.user.id).subscribe({
      next: (res) => this.stats = res.data,
      error: () => {}
    });
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    this.editError = '';
    this.editSuccess = '';
  }

  saveProfile(): void {
    this.saving = true;
    this.editError = '';
    this.editSuccess = '';

    const data: any = { username: this.editUsername, bio: this.editBio };
    if (this.editPassword) data.password = this.editPassword;

    this.gameService.updateProfile(data).subscribe({
      next: () => {
        this.editSuccess = 'Perfil actualitzat correctament!';
        this.saving = false;
        this.editing = false;
        if (this.user) {
          const updated = { ...this.user, username: this.editUsername };
          localStorage.setItem('user', JSON.stringify(updated));
        }
      },
      error: (err) => {
        this.editError = err.error?.message || 'Error actualitzant el perfil';
        this.saving = false;
      }
    });
  }

  isWin(g: any): boolean {
    return (g.result === 'white' && g.player_white_id == this.user?.id) ||
           (g.result === 'black' && g.player_black_id == this.user?.id);
  }

  isLoss(g: any): boolean {
    return (g.result === 'white' && g.player_black_id == this.user?.id) ||
           (g.result === 'black' && g.player_white_id == this.user?.id);
  }

  isDraw(g: any): boolean { return g.result === 'draw'; }

  getOpponent(g: any): string {
    return g.player_white_id == this.user?.id ? 'Negres' : 'Blanques';
  }
}
