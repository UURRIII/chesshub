import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * Llegeix el rol directament del payload del JWT (no del localStorage 'user')
 * per evitar que un usuari editi el localStorage i accedeixi a la UI admin.
 * El backend AdminFilter valida sempre el token, però llegir el JWT aquí
 * ofereix una defensa en profunditat a nivell de ruta Angular.
 */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  const token = localStorage.getItem('access_token');
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('invalid jwt');
    // atob pot fallar si el token és corrupte; el try-catch ho cobreix
    const payload = JSON.parse(atob(parts[1]));
    if (payload?.role === 'admin') return true;
  } catch {
    // Token malformat → tractem com a no admin
  }

  router.navigate(['/lobby']);
  return false;
};
