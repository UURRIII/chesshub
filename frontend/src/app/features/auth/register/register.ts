import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  if (pw && cpw && pw !== cpw) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrl: './register.scss',
  template: `
    <div class="container mt-5 mb-5">
      <div class="row justify-content-center">
        <div class="col-md-4">
          <div class="card shadow">
            <div class="card-body p-4">
              <h2 class="text-center mb-2">♟ ChessHub</h2>
              <h5 class="text-center mb-4 text-muted">Crear compte</h5>

              <div *ngIf="error" class="alert alert-danger d-flex align-items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
                <span [innerHTML]="error"></span>
              </div>

              <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

                <!-- Nom d'usuari -->
                <div class="mb-3">
                  <label class="form-label fw-semibold">Nom d'usuari</label>
                  <input
                    type="text"
                    class="form-control"
                    [class.is-invalid]="submitted && f['username'].invalid"
                    [class.is-valid]="submitted && f['username'].valid"
                    formControlName="username"
                    placeholder="mínim 3 caràcters"
                    autocomplete="username">
                  <div class="invalid-feedback">
                    <span *ngIf="f['username'].errors?.['required']">El nom d'usuari és obligatori.</span>
                    <span *ngIf="f['username'].errors?.['minlength']">El nom d'usuari ha de tenir com a mínim 3 caràcters.</span>
                  </div>
                </div>

                <!-- Email -->
                <div class="mb-3">
                  <label class="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    class="form-control"
                    [class.is-invalid]="submitted && f['email'].invalid"
                    [class.is-valid]="submitted && f['email'].valid"
                    formControlName="email"
                    placeholder="correu@exemple.com"
                    autocomplete="email">
                  <div class="invalid-feedback">
                    <span *ngIf="f['email'].errors?.['required']">L'email és obligatori.</span>
                    <span *ngIf="f['email'].errors?.['email']">Format d'email no vàlid.</span>
                  </div>
                </div>

                <!-- Contrasenya -->
                <div class="mb-3">
                  <label class="form-label fw-semibold">Contrasenya</label>
                  <div class="input-group">
                    <input
                      [type]="showPassword ? 'text' : 'password'"
                      class="form-control"
                      [class.is-invalid]="submitted && f['password'].invalid"
                      [class.is-valid]="submitted && f['password'].valid"
                      formControlName="password"
                      placeholder="mínim 8 caràcters"
                      autocomplete="new-password">
                    <button
                      type="button"
                      class="btn btn-outline-secondary eye-btn"
                      (click)="showPassword = !showPassword"
                      [attr.aria-label]="showPassword ? 'Amaga contrasenya' : 'Mostra contrasenya'">
                      <svg *ngIf="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                      <svg *ngIf="showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                      </svg>
                    </button>
                    <div class="invalid-feedback">
                      <span *ngIf="f['password'].errors?.['required']">La contrasenya és obligatòria.</span>
                      <span *ngIf="f['password'].errors?.['minlength']">La contrasenya ha de tenir com a mínim 8 caràcters.</span>
                    </div>
                  </div>
                </div>

                <!-- Confirmar contrasenya -->
                <div class="mb-4">
                  <label class="form-label fw-semibold">Confirmar contrasenya</label>
                  <div class="input-group">
                    <input
                      [type]="showConfirm ? 'text' : 'password'"
                      class="form-control"
                      [class.is-invalid]="submitted && (f['confirmPassword'].invalid || form.hasError('passwordMismatch'))"
                      [class.is-valid]="submitted && f['confirmPassword'].valid && !form.hasError('passwordMismatch')"
                      formControlName="confirmPassword"
                      placeholder="Repeteix la contrasenya"
                      autocomplete="new-password">
                    <button
                      type="button"
                      class="btn btn-outline-secondary eye-btn"
                      (click)="showConfirm = !showConfirm"
                      [attr.aria-label]="showConfirm ? 'Amaga contrasenya' : 'Mostra contrasenya'">
                      <svg *ngIf="!showConfirm" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                      <svg *ngIf="showConfirm" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                      </svg>
                    </button>
                    <div class="invalid-feedback">
                      <span *ngIf="f['confirmPassword'].errors?.['required']">Has de confirmar la contrasenya.</span>
                      <span *ngIf="!f['confirmPassword'].errors?.['required'] && form.hasError('passwordMismatch')">Les contrasenyes no coincideixen.</span>
                    </div>
                  </div>
                </div>

                <button type="submit" class="btn btn-dark w-100" [disabled]="loading">
                  <span *ngIf="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ loading ? 'Creant compte...' : 'Crear compte' }}
                </button>
              </form>

              <p class="text-center mt-3 mb-0">
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
  loading     = false;
  error       = '';
  submitted   = false;
  showPassword = false;
  showConfirm  = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      username:        ['', [Validators.required, Validators.minLength(3)]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordsMatchValidator });
  }

  get f() { return this.form.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';

    const { username, email, password } = this.form.value;
    this.auth.register({ username, email, password }).subscribe({
      next: () => this.router.navigate(['/lobby']),
      error: (err) => {
        const e = err.error;
        if (e?.errors) {
          // CodeIgniter validation errors object
          this.error = Object.values(e.errors).join('<br>');
        } else if (e?.message) {
          this.error = e.message;
        } else if (err.status === 409) {
          this.error = 'Ja existeix un compte amb aquest email o nom d\'usuari.';
        } else if (err.status === 0) {
          this.error = 'No s\'ha pogut connectar amb el servidor. Torna-ho a intentar.';
        } else {
          this.error = 'Error en crear el compte. Torna-ho a intentar.';
        }
        this.loading = false;
      }
    });
  }
}
