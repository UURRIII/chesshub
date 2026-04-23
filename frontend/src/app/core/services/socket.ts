import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    if (!this.socket || !this.socket.connected) {
      this.socket = io(environment.socketUrl, {
        path: '/socket.io/',
        transports: ['polling', 'websocket'],
      });
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
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

  on(event: string): Observable<any> {
    return new Observable(observer => {
      this.socket?.on(event, (data: any) => observer.next(data));
    });
  }
}
