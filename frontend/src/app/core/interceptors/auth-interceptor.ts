import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError, tap, shareReplay } from 'rxjs';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';

// Refresc compartit: si arriben diverses peticions amb 401 alhora, només es
// fa UN sol refresc de token. Sense això, cada 401 rotaria el refresh token i
// totes les peticions menys la primera fallarien (logout prematur).
let refresh$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const token  = auth.token;

  const addToken = (r: HttpRequest<any>, t: string) =>
    r.clone({ setHeaders: { Authorization: `Bearer ${t}` } });

  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Refresc automàtic si rebem 401 en rutes protegides
      if (err.status === 401 && !req.url.includes('/auth/')) {
        if (!refresh$) {
          refresh$ = auth.refreshToken().pipe(
            tap({ complete: () => { refresh$ = null; }, error: () => { refresh$ = null; } }),
            shareReplay(1)
          );
        }
        return refresh$.pipe(
          switchMap(newToken => next(addToken(req, newToken))),
          catchError(() => {
            // Refresc fallat → logout i redirigir al login
            auth.logout();
            router.navigate(['/login']);
            return throwError(() => err);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
