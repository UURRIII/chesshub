import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-4">
          <div class="card shadow">
            <div class="card-body p-4 text-center">
              <h2 class="mb-4">♟ ChessHub</h2>
              <h5 class="mb-4">Verificació del correu</h5>

              <div *ngIf="state === 'loading'" class="text-muted">
                <div class="spinner-border" role="status"></div>
                <p class="mt-3">Verificant el teu correu...</p>
              </div>

              <div *ngIf="state === 'ok'">
                <div style="font-size:48px">✅</div>
                <div class="alert alert-success mt-3">{{ message }}</div>
                <a routerLink="/lobby" class="btn btn-dark w-100">Anar al lobby</a>
              </div>

              <div *ngIf="state === 'error'">
                <div style="font-size:48px">⚠️</div>
                <div class="alert alert-danger mt-3">{{ message }}</div>
                <a routerLink="/login" class="btn btn-dark w-100">Tornar a l'inici de sessió</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth  = inject(AuthService);

  state: 'loading' | 'ok' | 'error' = 'loading';
  message = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.message = 'Falta el token de verificació a l\'enllaç.';
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: (res: any) => {
        this.state = 'ok';
        this.message = res.message || 'El teu correu ha estat verificat correctament!';
        this.auth.markEmailVerified();
      },
      error: (err) => {
        this.state = 'error';
        this.message = err.error?.message || 'No s\'ha pogut verificar el correu.';
      }
    });
  }
}
