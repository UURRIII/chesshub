import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-4">
          <div class="card shadow">
            <div class="card-body p-4">
              <h2 class="text-center mb-4">♟ ChessHub</h2>
              <h5 class="text-center mb-4">Crear compte</h5>

              <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

              <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label">Nom d'usuari</label>
                  <input type="text" class="form-control" formControlName="username">
                </div>
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" formControlName="email">
                </div>
                <div class="mb-3">
                  <label class="form-label">Contrasenya</label>
                  <input type="password" class="form-control" formControlName="password">
                </div>
                <button type="submit" class="btn btn-dark w-100" [disabled]="loading">
                  {{ loading ? 'Carregant...' : 'Registrar-se' }}
                </button>
              </form>

              <p class="text-center mt-3">
                Ja tens compte? <a routerLink="/login">Inicia sessió</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error   = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';

    this.auth.register(this.form.value).subscribe({
      next: () => this.router.navigate(['/lobby']),
      error: (err) => {
        this.error   = err.error?.errors ? Object.values(err.error.errors).join(', ') : 'Error en el registre';
        this.loading = false;
      }
    });
  }
}
