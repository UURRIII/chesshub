import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GameService } from './game';

/**
 * Tests del servei de joc.
 * Comproven que cada mètode crida l'endpoint correcte de l'API REST
 * amb el verb HTTP i les dades adequades.
 */
describe('GameService', () => {
  let service: GameService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GameService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('es crea correctament', () => {
    expect(service).toBeTruthy();
  });

  it('getHistory fa un GET a /games/history', () => {
    service.getHistory().subscribe();
    const req = http.expectOne(r => r.url.endsWith('/games/history'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: [] });
  });

  it('createGame fa un POST a /games', () => {
    service.createGame('white', 600).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/games'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: { game_id: 1 } });
  });

  it('searchUsers fa un GET a /friends/search amb el paràmetre q', () => {
    service.searchUsers('oriol').subscribe();
    const req = http.expectOne(r => r.url.includes('/friends/search'));
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toContain('q=oriol');
    req.flush({ data: [] });
  });

  it('sendMessage fa un POST a /messages/:id amb el cos del missatge', () => {
    service.sendMessage(7, 'hola amic').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/messages/7'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.body).toBe('hola amic');
    req.flush({ data: { id: 1 } });
  });

  it('sendFriendRequest fa un POST a /friends/request/:id', () => {
    service.sendFriendRequest(12).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/friends/request/12'));
    expect(req.request.method).toBe('POST');
    req.flush({ status: 'success' });
  });
});
