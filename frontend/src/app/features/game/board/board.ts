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
  botThinking = false;
  botError    = false;
  inCheck     = false;
  kingSquare: string | null = null;

  myTime       = 600;
  opponentTime = 600;
  private clockInterval: any = null;

  boardRows = [0,1,2,3,4,5,6,7];
  boardCols = [0,1,2,3,4,5,6,7];

  promotionPending: { from: string; to: string } | null = null;
  promotionPieces = ['Q', 'R', 'B', 'N'];

  moveHistory: { san: string; color: 'w' | 'b' }[] = [];
  capturedByWhite: string[] = [];
  capturedByBlack: string[] = [];

  playerName   = 'Jugador';
  opponentName = 'Oponent';
  botLevel     = 5;
  playerElo    = 1200;
  opponentElo  = 1500;
  playerAvatarUrl: string | null = null;
  avatarColors = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c'];
  avatarColor  = '#3498db';

  private audioCtx: AudioContext | null = null;

  pieceSymbols: Record<string, string> = {
    'wK':'♔','wQ':'♕','wR':'♖','wB':'♗','wN':'♘','wP':'♙',
    'bK':'♚','bQ':'♛','bR':'♜','bB':'♝','bN':'♞','bP':'♟',
  };

  // ── Getters ────────────────────────────────────────────────────────────────

  get materialAdv(): number {
    const val: Record<string, number> = { p:1, n:3, b:3, r:5, q:9 };
    const white = this.capturedByWhite.reduce((s, p) => s + (val[p] || 0), 0);
    const black = this.capturedByBlack.reduce((s, p) => s + (val[p] || 0), 0);
    return white - black;
  }

  get movePairs(): { num: number; white: string; black: string }[] {
    const pairs: { num: number; white: string; black: string }[] = [];
    for (let i = 0; i < this.moveHistory.length; i += 2) {
      pairs.push({
        num:   Math.floor(i / 2) + 1,
        white: this.moveHistory[i]?.san   || '',
        black: this.moveHistory[i+1]?.san || '',
      });
    }
    return pairs;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.gameId      = +this.route.snapshot.paramMap.get('id')!;
    this.gameType    = this.route.snapshot.queryParamMap.get('type') || 'pvp';
    this.playerColor = this.route.snapshot.queryParamMap.get('color') || 'white';
    this.botLevel    = +(this.route.snapshot.queryParamMap.get('level') || '5');
    const timeControl = +(this.route.snapshot.queryParamMap.get('time') || '600');
    this.myTime      = timeControl;
    this.opponentTime = timeControl;

    this.playerName  = this.auth.currentUser?.username || 'Jugador';
    this.opponentName = this.gameType === 'bot'
      ? 'Bot Niv. ' + this.botLevel
      : 'Oponent';
    this.avatarColor = this.avatarColors[this.playerName.charCodeAt(0) % this.avatarColors.length];
    this.playerAvatarUrl = localStorage.getItem('ch_avatar') || null;

    this.gameService.getMyProfile().subscribe({
      next: (res: any) => {
        const profile = res.data?.profile;
        if (profile?.elo) this.playerElo = profile.elo;
        if (profile?.avatar) {
          this.playerAvatarUrl = profile.avatar;
          localStorage.setItem('ch_avatar', profile.avatar);
        }
      },
      error: () => {}
    });

    if (this.gameType !== 'pvp') { this.startClock(); }

    if (this.gameType === 'pvp') {
      this.socket.connect();
      this.socket.joinGame(this.gameId, this.auth.currentUser!.id, this.playerColor);
      this.socket.on('game_start').subscribe(() => { this.startClock(); });
      this.socket.on('move_made').subscribe((data: any) => {
        const m = this.chess.move(data.move.uci);
        if (m) this.recordMove(m);
        this.currentTurn = data.turn;
        this.lastMove = { from: data.move.uci.slice(0,2), to: data.move.uci.slice(2,4) };
        this.updateCheckState();
        if (this.chess.isGameOver()) this.handleGameOver();
      });
      this.socket.on('game_ended').subscribe((data: any) => this.handleGameEnd(data));
    }
  }

  ngOnDestroy(): void {
    if (this.gameType === 'pvp') this.socket.disconnect();
    this.stopClock();
  }

  // ── Clock ───────────────────────────────────────────────────────────────────

  startClock(): void {
    this.stopClock();
    this.clockInterval = setInterval(() => {
      if (this.gameOver) { this.stopClock(); return; }
      if (this.currentTurn === this.playerColor) {
        this.myTime = Math.max(0, this.myTime - 1);
        if (this.myTime === 0) this.onTimeout();
      } else {
        this.opponentTime = Math.max(0, this.opponentTime - 1);
        if (this.opponentTime === 0) this.onOpponentTimeout();
      }
    }, 1000);
  }

  stopClock(): void {
    if (this.clockInterval) { clearInterval(this.clockInterval); this.clockInterval = null; }
  }

  onTimeout(): void {
    this.stopClock();
    if (this.gameType === 'pvp') this.socket.emit('timeout', { gameId: this.gameId, color: this.playerColor });
    this.handleGameEnd({ result: this.playerColor === 'white' ? 'black' : 'white', reason: 'timeout' });
  }

  onOpponentTimeout(): void {
    this.stopClock();
    this.handleGameEnd({ result: this.playerColor, reason: 'timeout' });
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Board helpers ────────────────────────────────────────────────────────────

  updateCheckState(): void {
    this.inCheck = this.chess.inCheck();
    if (this.inCheck) {
      const turn = this.chess.turn();
      const board = this.chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === turn) {
            const files = ['a','b','c','d','e','f','g','h'];
            this.kingSquare = files[c] + (8 - r);
          }
        }
      }
    } else { this.kingSquare = null; }
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

  isLight(ri: number, ci: number): boolean { return (ri + ci) % 2 === 0; }

  isSelected(ri: number, ci: number): boolean { return this.getSquareName(ri, ci) === this.selectedSq; }

  isPossible(ri: number, ci: number): boolean { return this.possibleMoves.includes(this.getSquareName(ri, ci)); }

  isLastMove(ri: number, ci: number): boolean {
    if (!this.lastMove) return false;
    const sq = this.getSquareName(ri, ci);
    return sq === this.lastMove.from || sq === this.lastMove.to;
  }

  isLastMoveFrom(ri: number, ci: number): boolean {
    if (!this.lastMove) return false;
    return this.getSquareName(ri, ci) === this.lastMove.from;
  }

  isLastMoveTo(ri: number, ci: number): boolean {
    if (!this.lastMove) return false;
    return this.getSquareName(ri, ci) === this.lastMove.to;
  }

  isKingInCheck(ri: number, ci: number): boolean {
    if (!this.inCheck || !this.kingSquare) return false;
    return this.getSquareName(ri, ci) === this.kingSquare;
  }

  getFile(ci: number): string {
    const files = ['a','b','c','d','e','f','g','h'];
    return this.playerColor === 'white' ? files[ci] : files[7-ci];
  }

  getRank(ri: number): string {
    return this.playerColor === 'white' ? String(8-ri) : String(ri+1);
  }

  // ── Piece SVG ────────────────────────────────────────────────────────────────

  private static readonly PIECE_SETS = [
    'cburnett','merida','alpha','chess7','tatiana',
    'companion','fantasy','gioco','pirouetti','kosal'
  ];

  getPieceSvg(code: string): string {
    if (!code) return '';
    const colorChar = code[0]; // 'w' or 'b'
    const typeChar  = code[1].toUpperCase(); // 'K','Q','R','B','N','P'
    const idx       = parseInt(localStorage.getItem('ch_piece') || '0', 10);
    const set       = Board.PIECE_SETS[idx] || 'cburnett';
    return `https://lichess1.org/assets/piece/${set}/${colorChar}${typeChar}.svg`;
  }

  // ── Move input ───────────────────────────────────────────────────────────────

  onSquareClick(ri: number, ci: number): void {
    if (this.gameOver || this.promotionPending) return;
    if (this.currentTurn !== this.playerColor) return;
    const sq    = this.getSquareName(ri, ci);
    const piece = this.chess.get(sq as any);
    if (this.selectedSq) {
      if (this.possibleMoves.includes(sq)) {
        this.doMove(this.selectedSq, sq);
      } else if (piece && piece.color === this.playerColor[0]) {
        this.selectSquare(sq);
      } else {
        this.selectedSq = null; this.possibleMoves = [];
      }
    } else {
      if (piece && piece.color === this.playerColor[0]) this.selectSquare(sq);
    }
  }

  selectSquare(sq: string): void {
    this.selectedSq    = sq;
    this.possibleMoves = this.chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to);
  }

  doMove(from: string, to: string): void {
    const piece = this.chess.get(from as any);
    const isPromotion = piece?.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromotion) {
      this.selectedSq = null; this.possibleMoves = [];
      this.promotionPending = { from, to };
      return;
    }

    const move = this.chess.move({ from: from as any, to: to as any, promotion: 'q' });
    if (!move) return;

    this.selectedSq = null; this.possibleMoves = [];
    this.lastMove   = { from, to };
    this.currentTurn = this.chess.turn() === 'w' ? 'white' : 'black';
    this.recordMove(move);
    this.updateCheckState();
    this.playSound(move.captured ? 'capture' : this.inCheck ? 'check' : 'move');

    const moveData = { san: move.san, uci: from + to };

    if (this.gameType === 'pvp') {
      this.socket.makeMove(this.gameId, moveData, this.chess.fen(), this.currentTurn);
      this.gameService.makeMove(this.gameId, { move_san: move.san, move_uci: from+to, fen_after: this.chess.fen() }).subscribe();
      if (this.chess.isGameOver()) {
        const result = this.chess.isCheckmate() ? (this.playerColor === 'white' ? 'white' : 'black') : 'draw';
        const reason = this.chess.isCheckmate() ? 'checkmate' : 'draw';
        this.socket.emit('game_over', { gameId: this.gameId, result, reason });
        this.handleGameOver();
      }
    } else {
      this.botThinking = true;
      this.botError    = false;
      this.gameService.makeBotMove(this.gameId, { move_san: move.san, move_uci: from+to, fen_after: this.chess.fen() }).subscribe({
        next: (res: any) => {
          this.botThinking = false;
          if (res.data?.bot_move?.uci) { this.applyBotMove(res.data.bot_move.uci); }
          else { this.applyFallbackBotMove(); }
          if (this.chess.isGameOver()) this.handleGameOver();
        },
        error: () => {
          this.botThinking = false;
          this.applyFallbackBotMove();
          if (this.chess.isGameOver()) this.handleGameOver();
        }
      });
    }
  }

  confirmPromotion(piece: string): void {
    if (!this.promotionPending) return;
    const { from, to } = this.promotionPending;
    this.promotionPending = null;
    const move = this.chess.move({ from: from as any, to: to as any, promotion: piece.toLowerCase() as any });
    if (!move) return;
    this.lastMove    = { from, to };
    this.currentTurn = this.chess.turn() === 'w' ? 'white' : 'black';
    this.recordMove(move);
    this.updateCheckState();
    this.playSound('move');

    if (this.gameType === 'pvp') {
      this.socket.makeMove(this.gameId, { san: move.san, uci: from+to+piece.toLowerCase() }, this.chess.fen(), this.currentTurn);
      this.gameService.makeMove(this.gameId, { move_san: move.san, move_uci: from+to+piece.toLowerCase(), fen_after: this.chess.fen() }).subscribe();
    } else {
      this.botThinking = true;
      this.gameService.makeBotMove(this.gameId, { move_san: move.san, move_uci: from+to+piece.toLowerCase(), fen_after: this.chess.fen() }).subscribe({
        next: (res: any) => {
          this.botThinking = false;
          if (res.data?.bot_move?.uci) { this.applyBotMove(res.data.bot_move.uci); }
          else { this.applyFallbackBotMove(); }
          if (this.chess.isGameOver()) this.handleGameOver();
        },
        error: () => { this.botThinking = false; this.applyFallbackBotMove(); }
      });
    }
  }

  cancelPromotion(): void {
    this.promotionPending = null;
  }

  // ── Bot moves ────────────────────────────────────────────────────────────────

  private normalizeUci(uci: string): string {
    // ChessDB uses old castling UCI (king→rook square); chess.js needs modern (king moves 2 squares)
    const castleMap: Record<string, string> = {
      'e1h1': 'e1g1', 'e1a1': 'e1c1',
      'e8h8': 'e8g8', 'e8a8': 'e8c8',
    };
    const base = uci.slice(0, 4);
    return castleMap[base] ? castleMap[base] + uci.slice(4) : uci;
  }

  private applyBotMove(uci: string): void {
    uci = this.normalizeUci(uci);
    const bm = this.chess.move({ from: uci.slice(0,2) as any, to: uci.slice(2,4) as any, promotion: (uci[4]||'q') as any });
    if (bm) {
      this.lastMove    = { from: uci.slice(0,2), to: uci.slice(2,4) };
      this.currentTurn = this.chess.turn() === 'w' ? 'white' : 'black';
      this.recordMove(bm);
      this.updateCheckState();
      this.playSound(bm.captured ? 'capture' : this.inCheck ? 'check' : 'move');
    } else { this.applyFallbackBotMove(); }
  }

  private applyFallbackBotMove(): void {
    const moves = this.chess.moves({ verbose: true }) as any[];
    if (!moves.length) return;
    const captures   = moves.filter((m: any) => m.flags.includes('c') || m.flags.includes('e'));
    const promotions = moves.filter((m: any) => m.flags.includes('p'));
    const checks     = moves.filter((m: any) => (m.san||'').includes('+'));
    const preferred  = [...promotions, ...checks, ...captures];
    const chosen     = preferred.length ? preferred[Math.floor(Math.random()*preferred.length)] : moves[Math.floor(Math.random()*moves.length)];
    const bm = this.chess.move(chosen);
    if (bm) {
      this.lastMove    = { from: chosen.from, to: chosen.to };
      this.currentTurn = this.chess.turn() === 'w' ? 'white' : 'black';
      this.recordMove(bm);
      this.updateCheckState();
      this.playSound(bm.captured ? 'capture' : this.inCheck ? 'check' : 'move');
    }
  }

  // ── Move record ──────────────────────────────────────────────────────────────

  private recordMove(move: any): void {
    this.moveHistory.push({ san: move.san, color: move.color });
    if (move.captured) {
      const p = move.captured;
      if (move.color === 'w') {
        this.capturedByWhite = [...this.capturedByWhite, p].sort((a,b) => this.pieceValue(b)-this.pieceValue(a));
      } else {
        this.capturedByBlack = [...this.capturedByBlack, p].sort((a,b) => this.pieceValue(b)-this.pieceValue(a));
      }
    }
    this.scrollMoveList();
  }

  private pieceValue(p: string): number {
    return ({p:1,n:3,b:3,r:5,q:9} as any)[p] || 0;
  }

  private scrollMoveList(): void {
    setTimeout(() => {
      const el = document.querySelector('.move-list');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // ── Game over ────────────────────────────────────────────────────────────────

  handleGameOver(): void {
    this.stopClock();
    this.gameOver = true;
    let result: string; let reason: string;
    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'black' : 'white';
      result = winner; reason = 'checkmate';
      this.gameResult      = winner === this.playerColor ? 'win' : 'loss';
      this.gameOverMessage = winner === this.playerColor ? 'Has guanyat!' : 'Has perdut.';
    } else if (this.chess.isStalemate()) {
      result='draw'; reason='stalemate'; this.gameResult='draw'; this.gameOverMessage='Taules! (Ofegat)';
    } else if (this.chess.isThreefoldRepetition()) {
      result='draw'; reason='repetition'; this.gameResult='draw'; this.gameOverMessage='Taules! (Repetició)';
    } else if (this.chess.isInsufficientMaterial()) {
      result='draw'; reason='insufficient_material'; this.gameResult='draw'; this.gameOverMessage='Taules! (Material insuficient)';
    } else {
      result='draw'; reason='draw'; this.gameResult='draw'; this.gameOverMessage='Taules!';
    }
    this.playSound('end');
    if (this.gameType === 'bot') {
      const botResult = result==='draw' ? 'draw' : (result===this.playerColor ? 'user' : 'bot');
      this.gameService.finishBotGame(this.gameId, botResult, reason).subscribe();
    } else if (this.gameType === 'pvp') {
      this.gameService.finishGame(this.gameId, result, reason).subscribe();
    }
  }

  handleGameEnd(data: any): void {
    this.stopClock(); this.gameOver = true;
    const won = data.result === this.playerColor;
    this.gameResult      = data.result === 'draw' ? 'draw' : won ? 'win' : 'loss';
    this.gameOverMessage = data.result === 'draw' ? 'Taules!' : won ? 'Has guanyat!' : 'Has perdut.';
    this.playSound('end');
  }

  resign(): void {
    if (this.gameType === 'pvp') {
      this.gameService.resign(this.gameId).subscribe();
      this.socket.resign(this.gameId, this.auth.currentUser!.id, this.playerColor);
    } else { this.gameService.resignBot(this.gameId).subscribe(); }
    this.handleGameEnd({ result: this.playerColor === 'white' ? 'black' : 'white' });
  }

  analyzeGame(): void {
    const obs = this.gameType === 'bot' ? this.gameService.analyzeBotGame(this.gameId) : this.gameService.analyzeGame(this.gameId);
    obs.subscribe((res: any) => { this.analysis = res.data; });
  }

  // ── Sound ────────────────────────────────────────────────────────────────────

  playSound(type: 'move'|'capture'|'check'|'end'): void {
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      const ctx = this.audioCtx; const now = ctx.currentTime;
      const tone = (freq: number, start: number, dur: number, vol = 0.12) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, start);
        g.gain.exponentialRampToValueAtTime(0.001, start+dur);
        o.start(start); o.stop(start+dur+0.01);
      };
      if (type==='move')    { tone(680, now, 0.08); }
      if (type==='capture') { tone(520, now, 0.05); tone(680, now+0.04, 0.08); }
      if (type==='check')   { tone(880, now, 0.07); tone(880, now+0.12, 0.07); }
      if (type==='end')     { [523,659,784].forEach((f,i)=>tone(f, now+i*0.13, 0.3, 0.15)); }
    } catch(e) {}
  }

  // ── Promotion piece color helper ─────────────────────────────────────────────

  promotionPieceCode(p: string): string {
    // Returns the SVG code for the promotion piece in the player's color
    return this.playerColor[0] + p; // e.g. 'wQ' or 'bQ'
  }
}
