import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    if (!this.socket) {
      const token = localStorage.getItem('access_token') || undefined;
      // socketUrl buit → mateix origen que la pàgina (funciona a qualsevol domini).
      // En desenvolupament té un valor explícit (localhost:3001) perquè el socket
      // corre en un port diferent del servidor d'Angular.
      const url = environment.socketUrl || window.location.origin;
      this.socket = io(url, {
        path: '/socket.io/',
        transports: ['polling'], // l'ingress no suporta upgrade WS; polling és suficient
        upgrade: false,          // evita l'intent d'upgrade que genera errors a consola
        auth: { token },
      });
    }
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinGame(gameId: number, userId: number, color: string, timeControl?: number): void {
    this.socket?.emit('join_game', { gameId, userId, color, timeControl });
  }

  rematchOffer(gameId: number): void {
    this.socket?.emit('rematch_offer', { gameId });
  }

  rematchAccept(gameId: number, newGameId: number): void {
    this.socket?.emit('rematch_accept', { gameId, newGameId });
  }

  rematchDecline(gameId: number): void {
    this.socket?.emit('rematch_decline', { gameId });
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

  // userId/username/color es deriven al servidor a partir del JWT verificat
  sendChat(gameId: number, message: string): void {
    this.socket?.emit('chat_message', { gameId, message });
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
