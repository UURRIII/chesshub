import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GameService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createGame(color: string, timeControl: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/games`, { color, time_control: timeControl });
  }

  getGame(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/games/${id}`);
  }

  getMyGames(): Observable<any> {
    return this.http.get(`${this.apiUrl}/games`);
  }

  makeMove(gameId: number, move: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/games/${gameId}/move`, move);
  }

  resign(gameId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/games/${gameId}/resign`, {});
  }

  createBotGame(color: string, botLevel: number, timeControl: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/bot-games`, {
      color, bot_level: botLevel, time_control: timeControl
    });
  }

  getBotGame(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/bot-games/${id}`);
  }

  makeBotMove(gameId: number, move: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/bot-games/${gameId}/move`, move);
  }

  resignBot(gameId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/bot-games/${gameId}/resign`, {});
  }

  analyzeGame(gameId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/analysis/game/${gameId}`, {});
  }

  analyzeBotGame(gameId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/analysis/bot-game/${gameId}`, {});
  }

  getWaitingGames(): Observable<any> {
    return this.http.get(`${this.apiUrl}/games/waiting`);
  }

  joinGame(gameId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/games/${gameId}/join`, {});
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/me`, data);
  }

  getUserStats(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/stats`);
  }

  getPuzzles(difficulty?: string): Observable<any> {
    const params = difficulty ? `?difficulty=${difficulty}` : '';
    return this.http.get(`${this.apiUrl}/puzzles${params}`);
  }

  getPuzzle(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/puzzles/${id}`);
  }

  attemptPuzzle(id: number, moves: string, timeSpent: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/puzzles/${id}/attempt`, {
      moves, time_spent: timeSpent
    });
  }
}
