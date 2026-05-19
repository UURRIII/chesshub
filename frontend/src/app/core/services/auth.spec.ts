import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth';

/**
 * Tests del servei d'autenticació.
 *
 * L'entorn de test no sempre proporciona un `localStorage` utilitzable,
 * així que n'instal·lem un de fals en memòria perquè els tests siguin
 * deterministes i independents del navegador.
 */
const memStore: Record<string, string> = {};
const localStorageMock = {
  getItem:    (k: string) => (Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null),
  setItem:    (k: string, v: string) => { memStore[k] = String(v); },
  removeItem: (k: string) => { delete memStore[k]; },
  clear:      () => { Object.keys(memStore).forEach(k => delete memStore[k]); },
};
try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock, configurable: true, writable: true,
  });
} catch { /* localStorage ja existeix i no es pot redefinir */ }

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorageMock.clear();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http?.verify();
    localStorageMock.clear();
  });

  const make = () => TestBed.inject(AuthService);

  it('es crea correctament', () => {
    expect(make()).toBeTruthy();
  });

  it('isLoggedIn és false quan no hi ha cap token', () => {
    expect(make().isLoggedIn).toBe(false);
  });

  it('login desa la sessió (tokens i usuari) quan té èxit', () => {
    const service = make();
    service.login({ email: 'test@chesshub.cat', password: 'secret123' }).subscribe();

    const req = http.expectOne(r => r.url.endsWith('/auth/login'));
    expect(req.request.method).toBe('POST');
    req.flush({
      data: {
        user:   { id: 9, username: 'tester', email: 'test@chesshub.cat', role: 'user' },
        tokens: { access_token: 'AT123', refresh_token: 'RT123' },
      },
    });

    expect(localStorageMock.getItem('access_token')).toBe('AT123');
    expect(service.isLoggedIn).toBe(true);
    expect(service.currentUser?.username).toBe('tester');
  });

  it('logout neteja la sessió', () => {
    localStorageMock.setItem('access_token', 'AT');
    localStorageMock.setItem('refresh_token', 'RT');
    localStorageMock.setItem('user', JSON.stringify({ id: 1, username: 'u', email: 'e', role: 'user' }));

    const service = make();
    service.logout();
    http.expectOne(r => r.url.endsWith('/auth/logout')).flush({});

    expect(localStorageMock.getItem('access_token')).toBeNull();
    expect(service.currentUser).toBeNull();
  });

  it('no peta si les dades de l\'usuari al localStorage estan corruptes', () => {
    localStorageMock.setItem('user', '{json invalid!!');
    expect(() => make()).not.toThrow();
    expect(make().currentUser).toBeNull();
  });
});
