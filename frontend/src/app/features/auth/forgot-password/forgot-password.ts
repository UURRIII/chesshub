import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-4">
          <div class="card shadow">
            <div class="card-body p-4">
              <h2 class="text-center mb-4">♟ ChessHub</h2>
              <h5 class="text-center mb-4">Recuperar contrasenya</h5>

              <div *ngIf="sent" class="alert alert-success">
                {{ message }}
              </div>

              <form *ngIf="!sent" [formGroup]="form" (ngSubmit)="onSubmit()">
                <p class="text-muted small">
                  Introdueix el teu correu i t'enviarem un enllaç per restablir la contrasenya.
                </p>
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" formControlName="email">
                </div>
                <button type="submit" class="btn btn-dark w-100" [disabled]="loading || form.invalid">
                  {{ loading ? 'Enviant...' : 'Enviar enllaç' }}
                </button>
              </form>

              <p class="text-center mt-3">
                <a routerLink="/login">Tornar a l'inici de sessió</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  loading = false;
  sent    = false;
  message = '';

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.forgotPassword(this.form.value.email).subscribe({
      next: (res: any) => {
        this.sent = true;
        this.loading = false;
        this.message = res.message || 'Si el correu està registrat, rebràs un enllaç de recuperació.';
      },
      error: () => {
        // No revelem si l'email existeix: mostrem sempre el mateix
        this.sent = true;
        this.loading = false;
        this.message = 'Si el correu està registrat, rebràs un enllaç de recuperació.';
      }
    });
  }
}
