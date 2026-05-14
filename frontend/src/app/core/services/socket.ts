import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    if (!this.socket || !this.socket.connected) {
      const token = localStorage.getItem('access_token') || undefined;
      this.socket = io(environment.socketUrl, {
        path: '/socket.io/',
        transports: ['polling'],
        auth: { token },
      });
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinGame(gameId: number, userId: number, color: string): void {
    this.socket?.emit('join_game', { gameId, userId, color });
  }

  makeMove(gameId: number, move: any, fen: string, turn: string): void {
    this.socket?.emit('make_move', { gameId, move, fen, turn });
  }

  resign(gameId: number, userId: number, color: string): void {
    this.socket?.emit('resign', { gameId, userId, color });
  }

  offerDraw(gameId: number, userId: number): void {
    this.socket?.emit('offer_draw', { gameId, userId });
  }

  acceptDraw(gameId: number): void {
    this.socket?.emit('accept_draw', { gameId });
  }

  declineDraw(gameId: number): void {
    this.socket?.emit('decline_draw', { gameId });
  }

  sendChat(gameId: number, userId: number, username: string, message: string, color: string): void {
    this.socket?.emit('chat_message', { gameId, userId, username, message, color });
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string): Observable<any> {
    return new Observable(observer => {
      const handler = (data: any) => observer.next(data);
      this.socket?.on(event, handler);
      return () => { this.socket?.off(event, handler); };
    });
  }
}
