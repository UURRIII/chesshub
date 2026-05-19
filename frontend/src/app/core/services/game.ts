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

  finishGame(gameId: number, result: string, endReason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/games/${gameId}/finish`, { result, end_reason: endReason });
  }

  finishBotGame(gameId: number, result: string, endReason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bot-games/${gameId}/finish`, { result, end_reason: endReason });
  }

  resign(gameId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/games/${gameId}/resign`, {});
  }

  createBotGame(color: string, botLevel: number, timeControl: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/bot-games`, {
      color, bot_level: botLevel, time_control: timeControl
    });
  }

  getMyBotGames(): Observable<any> {
    return this.http.get(`${this.apiUrl}/bot-games`);
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

  getMyProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/me`);
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

  attemptPuzzle(id: number, solved: boolean, timeSpent: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/puzzles/${id}/attempt`, {
      solved, time_spent: timeSpent
    });
  }

  getActiveGames(): Observable<any> {
    return this.http.get(`${this.apiUrl}/games/active`);
  }

  getLeaderboard(limit = 20): Observable<any> {
    return this.http.get(`${this.apiUrl}/leaderboard?limit=${limit}`);
  }

  uploadAvatar(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/me/avatar`, formData);
  }

  getEloHistory(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/elo-history`);
  }

  reportUser(userId: number, reason: string, description: string, gameId?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/report`, { reason, description, game_id: gameId });
  }

  getUserProfile(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}`);
  }

  // ── Historial de partides ──────────────────────────────────────────────────

  getHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/games/history`);
  }

  // ── Sistema d'amics ────────────────────────────────────────────────────────

  getFriends(): Observable<any> {
    return this.http.get(`${this.apiUrl}/friends`);
  }

  getFriendRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/friends/requests`);
  }

  sendFriendRequest(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/friends/request/${userId}`, {});
  }

  acceptFriend(userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/friends/${userId}/accept`, {});
  }

  removeFriend(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/friends/${userId}`);
  }

  searchUsers(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/friends/search?q=${encodeURIComponent(query)}`);
  }

  // ── Missatges directes ─────────────────────────────────────────────────────

  getConversation(friendId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/messages/${friendId}`);
  }

  sendMessage(friendId: number, body: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/messages/${friendId}`, { body });
  }

  getUnreadCount(): Observable<any> {
    return this.http.get(`${this.apiUrl}/messages/unread`);
  }
}
