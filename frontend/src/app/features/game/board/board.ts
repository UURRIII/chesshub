import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { GameService } from '../../../core/services/game';
import { SocketService } from '../../../core/services/socket';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class Board implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private gameService = inject(GameService);
  private socket = inject(SocketService);
  private auth   = inject(AuthService);

  chess       = new Chess();
  gameId!: number;
  gameType    = 'pvp';
  playerColor = 'white';
  currentTurn = 'white';
  selectedSq: string | null = null;
  possibleMoves: string[] = [];
  lastMove: { from: string; to: string } | null = null;
  gameOver    = false;
  gameResult  = '';
  gameOverMessage = '';
  analysis: any = null;

  boardRows = [0,1,2,3,4,5,6,7];
  boardCols = [0,1,2,3,4,5,6,7];

  pieceSymbols: Record<string, string> = {
    'wK':'♔','wQ':'♕','wR':'♖','wB':'♗','wN':'♘','wP':'♙',
    'bK':'♚','bQ':'♛','bR':'♜','bB':'♝','bN':'♞','bP':'♟',
  };

  ngOnInit(): void {
    this.gameId      = +this.route.snapshot.paramMap.get('id')!;
    this.gameType    = this.route.snapshot.queryParamMap.get('type') || 'pvp';
    this.playerColor = this.route.snapshot.queryParamMap.get('color') || 'white';

    if (this.gameType === 'pvp') {
      this.socket.connect();
      this.socket.joinGame(this.gameId, this.auth.currentUser!.id, this.playerColor);
      this.socket.on('move_made').subscribe((data: any) => {
        this.chess.move(data.move.uci);
        this.currentTurn = data.turn;
        this.lastMove = { from: data.move.uci.slice(0,2), to: data.move.uci.slice(2,4) };
      });
      this.socket.on('game_ended').subscribe((data: any) => this.handleGameEnd(data));
    }
  }

  ngOnDestroy(): void {
    if (this.gameType === 'pvp') this.socket.disconnect();
  }

  getSquareName(ri: number, ci: number): string {
    const files = ['a','b','c','d','e','f','g','h'];
    const rank  = this.playerColor === 'white' ? 8 - ri : ri + 1;
    const file  = this.playerColor === 'white' ? files[ci] : files[7-ci];
    return `${file}${rank}`;
  }

  getPiece(ri: number, ci: number): string | null {
    const sq    = this.getSquareName(ri, ci);
    const piece = this.chess.get(sq as any);
    if (!piece) return null;
    return `${piece.color}${piece.type.toUpperCase()}`;
  }

  getPieceSymbol(code: string): string {
    return this.pieceSymbols[code] || '';
  }

  isLight(ri: number, ci: number): boolean {
    return (ri + ci) % 2 === 0;
  }

  isSelected(ri: number, ci: number): boolean {
    return this.getSquareName(ri, ci) === this.selectedSq;
  }

  isPossible(ri: number, ci: number): boolean {
    return this.possibleMoves.includes(this.getSquareName(ri, ci));
  }

  isLastMove(ri: number, ci: number): boolean {
    if (!this.lastMove) return false;
    const sq = this.getSquareName(ri, ci);
    return sq === this.lastMove.from || sq === this.lastMove.to;
  }

  getFile(ci: number): string {
    const files = ['a','b','c','d','e','f','g','h'];
    return this.playerColor === 'white' ? files[ci] : files[7-ci];
  }

  getRank(ri: number): string {
    return this.playerColor === 'white' ? String(8-ri) : String(ri+1);
  }

  onSquareClick(ri: number, ci: number): void {
    if (this.gameOver) return;
    if (this.currentTurn !== this.playerColor) return;

    const sq    = this.getSquareName(ri, ci);
    const piece = this.chess.get(sq as any);

    if (this.selectedSq) {
      if (this.possibleMoves.includes(sq)) {
        this.doMove(this.selectedSq, sq);
      } else if (piece && piece.color === this.playerColor[0]) {
        this.selectSquare(sq);
      } else {
        this.selectedSq    = null;
        this.possibleMoves = [];
      }
    } else {
      if (piece && piece.color === this.playerColor[0]) {
        this.selectSquare(sq);
      }
    }
  }

  selectSquare(sq: string): void {
    this.selectedSq    = sq;
    this.possibleMoves = this.chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to);
  }

  doMove(from: string, to: string): void {
    const move = this.chess.move({ from: from as any, to: to as any, promotion: 'q' });
    if (!move) return;

    this.selectedSq    = null;
    this.possibleMoves = [];
    this.lastMove      = { from, to };
    this.currentTurn   = this.chess.turn() === 'w' ? 'white' : 'black';

    const moveData = { san: move.san, uci: from + to };

    if (this.gameType === 'pvp') {
      this.socket.makeMove(this.gameId, moveData, this.chess.fen(), this.currentTurn);
      this.gameService.makeMove(this.gameId, {
        move_san: move.san, move_uci: from+to, fen_after: this.chess.fen()
      }).subscribe();
    } else {
      this.gameService.makeBotMove(this.gameId, {
        move_san: move.san, move_uci: from+to, fen_after: this.chess.fen()
      }).subscribe((res: any) => {
        if (res.data?.bot_move?.uci) {
          const bm = this.chess.move(res.data.bot_move.uci);
          if (bm) {
            this.lastMove    = { from: res.data.bot_move.uci.slice(0,2), to: res.data.bot_move.uci.slice(2,4) };
            this.currentTurn = this.chess.turn() === 'w' ? 'white' : 'black';
          }
        }
      });
    }

    if (this.chess.isGameOver()) this.handleGameOver();
  }

  handleGameOver(): void {
    this.gameOver = true;
    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'black' : 'white';
      this.gameResult      = winner === this.playerColor ? 'win' : 'loss';
      this.gameOverMessage = winner === this.playerColor ? 'Has guanyat!' : 'Has perdut.';
    } else {
      this.gameResult      = 'draw';
      this.gameOverMessage = 'Taules!';
    }
  }

  handleGameEnd(data: any): void {
    this.gameOver = true;
    const won = data.result === this.playerColor;
    this.gameResult      = data.result === 'draw' ? 'draw' : won ? 'win' : 'loss';
    this.gameOverMessage = data.result === 'draw' ? 'Taules!' : won ? 'Has guanyat!' : 'Has perdut.';
  }

  resign(): void {
    if (this.gameType === 'pvp') {
      this.gameService.resign(this.gameId).subscribe();
      this.socket.resign(this.gameId, this.auth.currentUser!.id, this.playerColor);
    }
    this.handleGameEnd({ result: this.playerColor === 'white' ? 'black' : 'white' });
  }

  analyzeGame(): void {
    const obs = this.gameType === 'bot'
      ? this.gameService.analyzeBotGame(this.gameId)
      : this.gameService.analyzeGame(this.gameId);
    obs.subscribe((res: any) => { this.analysis = res.data; });
  }
}
