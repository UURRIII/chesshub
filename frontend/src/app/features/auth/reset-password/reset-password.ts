import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-4">
          <div class="card shadow">
            <div class="card-body p-4">
              <h2 class="text-center mb-4">♟ ChessHub</h2>
              <h5 class="text-center mb-4">Nova contrasenya</h5>

              <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

              <div *ngIf="done" class="text-center">
                <div style="font-size:48px">✅</div>
                <div class="alert alert-success mt-3">Contrasenya actualitzada correctament.</div>
                <a routerLink="/login" class="btn btn-dark w-100">Iniciar sessió</a>
              </div>

              <form *ngIf="!done && token" [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label">Nova contrasenya</label>
                  <input type="password" class="form-control" formControlName="password">
                </div>
                <div class="mb-3">
                  <label class="form-label">Confirma la contrasenya</label>
                  <input type="password" class="form-control" formControlName="confirm">
                </div>
                <div *ngIf="form.value.password && form.value.confirm && form.value.password !== form.value.confirm"
                     class="text-danger small mb-2">Les contrasenyes no coincideixen.</div>
                <button type="submit" class="btn btn-dark w-100" [disabled]="loading || form.invalid || form.value.password !== form.value.confirm">
                  {{ loading ? 'Desant...' : 'Canviar contrasenya' }}
                </button>
              </form>

              <div *ngIf="!token" class="alert alert-danger">
                Enllaç no vàlid: falta el token.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm:  ['', [Validators.required]],
  });
  token: string | null = null;
  loading = false;
  done    = false;
  error   = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token) return;
    if (this.form.value.password !== this.form.value.confirm) return;
    this.loading = true;
    this.error = '';
    this.auth.resetPassword(this.token, this.form.value.password).subscribe({
      next: () => { this.done = true; this.loading = false; },
      error: (err) => {
        this.error = err.error?.message || 'No s\'ha pogut restablir la contrasenya.';
        this.loading = false;
      }
    });
  }
}
