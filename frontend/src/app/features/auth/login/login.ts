import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-4">
          <div class="card shadow">
            <div class="card-body p-4">
              <h2 class="text-center mb-4">♟ ChessHub</h2>
              <h5 class="text-center mb-4">Iniciar sessió</h5>

              <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

              <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" formControlName="email">
                </div>
                <div class="mb-3">
                  <label class="form-label">Contrasenya</label>
                  <input type="password" class="form-control" formControlName="password">
                </div>
                <button type="submit" class="btn btn-dark w-100" [disabled]="loading">
                  {{ loading ? 'Carregant...' : 'Entrar' }}
                </button>
              </form>

              <p class="text-center mt-3 mb-1">
                No tens compte? <a routerLink="/register">Registra't</a>
              </p>
              <p class="text-center">
                <a routerLink="/forgot-password">Has oblidat la contrasenya?</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error   = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';

    this.auth.login(this.form.value).subscribe({
      next: () => this.router.navigate(['/lobby']),
      error: (err) => {
        this.error   = err.error?.message || 'Credencials incorrectes';
        this.loading = false;
      }
    });
  }
}
