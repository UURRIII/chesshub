import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrl: './login.scss',
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-4">
          <div class="card shadow">
            <div class="card-body p-4">
              <h2 class="text-center mb-2">♟ ChessHub</h2>
              <h5 class="text-center mb-4 text-muted">Iniciar sessió</h5>

              <div *ngIf="error" class="alert alert-danger d-flex align-items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                {{ error }}
              </div>

              <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

                <!-- Email -->
                <div class="mb-3">
                  <label class="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    class="form-control"
                    [class.is-invalid]="submitted && f['email'].invalid"
                    formControlName="email"
                    placeholder="correu@exemple.com"
                    autocomplete="email">
                  <div class="invalid-feedback">
                    <span *ngIf="f['email'].errors?.['required']">L'email és obligatori.</span>
                    <span *ngIf="f['email'].errors?.['email']">Format d'email no vàlid.</span>
                  </div>
                </div>

                <!-- Contrasenya -->
                <div class="mb-4">
                  <label class="form-label fw-semibold">Contrasenya</label>
                  <div class="input-group">
                    <input
                      [type]="showPassword ? 'text' : 'password'"
                      class="form-control"
                      [class.is-invalid]="submitted && f['password'].invalid"
                      formControlName="password"
                      placeholder="Contrasenya"
                      autocomplete="current-password">
                    <button
                      type="button"
                      class="btn btn-outline-secondary eye-btn"
                      (click)="showPassword = !showPassword"
                      [attr.aria-label]="showPassword ? 'Amaga contrasenya' : 'Mostra contrasenya'">
                      <!-- Eye open -->
                      <svg *ngIf="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                      <!-- Eye closed -->
                      <svg *ngIf="showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                      </svg>
                    </button>
                    <div class="invalid-feedback">
                      <span *ngIf="f['password'].errors?.['required']">La contrasenya és obligatòria.</span>
                    </div>
                  </div>
                </div>

                <button type="submit" class="btn btn-dark w-100" [disabled]="loading">
                  <span *ngIf="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ loading ? 'Entrant...' : 'Entrar' }}
                </button>
              </form>

              <p class="text-center mt-3 mb-0">
                No tens compte? <a routerLink="/register">Registra't</a>
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
  loading   = false;
  error     = '';
  submitted = false;
  showPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';

    this.auth.login(this.form.value).subscribe({
      next: () => this.router.navigate(['/lobby']),
      error: (err) => {
        const e = err.error;
        if (e?.message) {
          this.error = e.message;
        } else if (err.status === 401) {
          this.error = 'Credencials incorrectes. Revisa el teu email i contrasenya.';
        } else if (err.status === 0) {
          this.error = 'No s\'ha pogut connectar amb el servidor. Torna-ho a intentar.';
        } else {
          this.error = 'Error en iniciar sessió. Torna-ho a intentar.';
        }
        this.loading = false;
      }
    });
  }
}
