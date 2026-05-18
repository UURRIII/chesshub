import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chess } from 'chess.js';
import { GameService } from '../../../core/services/game';
import { SocketService } from '../../../core/services/socket';
import { AuthService } from '../../../core/services/auth';

interface ChatMsg {
  userId: number;
  username: string;
  message: string;
  color: string;
  ts: number;
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './board.html',
  styleUrl: './board.scss'
})
export class Board implements OnInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private gameService = inject(GameService);
  private socket      = inject(SocketService);
  private auth        = inject(AuthService);

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

  // ── Spectator ──────────────────────────────────────────────────────────────
  isSpectator    = false;
  spectatorCount = 0;

  // ── Chat ──────────────────────────────────────────────────────────────────
  chatMessages: ChatMsg[] = [];
  chatInput = '';
  chatOpen  = true;

  // ── Draw offer ────────────────────────────────────────────────────────────
  drawOffered = false;  // opponent offered draw
  drawPending = false;  // we offered draw (waiting)

  // ── Replay ────────────────────────────────────────────────────────────────
  fenHistory: string[]  = [];
  replayIndex: number | null = null;
  private replayChess: Chess | null = null;

  get displayChess(): Chess { return this.replayChess || this.chess; }
  get inReplay(): boolean   { return this.replayIndex !== null; }

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  dragFrom: string | null = null;

  // ── Server clock ───────────────────────────────────────────────────────────
  timeControlInitial = 600;

  // ── Opponent info ──────────────────────────────────────────────────────────
  opponentAvatarUrl: string | null = null;

  // ── Rematch ────────────────────────────────────────────────────────────────
  rematchSent     = false;
  rematchOffered  = false;
  rematchDeclined = false;

  // ── Board arrows & highlights (anàlisi visual amb clic dret) ───────────────
  userArrows: { from: string; to: string }[] = [];
  userHighlights: string[] = [];
  private arrowStart: string | null = null;

  // ── Opening name ───────────────────────────────────────────────────────────
  openingName: string | null = null;

  // ── Report ─────────────────────────────────────────────────────────────────
  reportOpen    = false;
  reportReason  = 'cheating';
  reportSent    = false;
  reportReasons = [
    { value: 'cheating',      label: 'Trampes' },
    { value: 'harassment',    label: 'Assetjament' },
    { value: 'inappropriate', label: 'Comportament inapropiat' },
    { value: 'other',         label: 'Altre' },
  ];

  // ── Reconnect ──────────────────────────────────────────────────────────────
  private reconnectAttempts = 0;

  // ── Invite ────────────────────────────────────────────────────────────────
  inviteCopied = false;

  private audioCtx: AudioContext | null = null;
  private notifPermission = 'default';

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
    this.timeControlInitial = timeControl;
    this.myTime      = timeControl;
    this.opponentTime = timeControl;
    this.isSpectator  = this.playerColor === 'spectator';

    // FEN history — track positions for replay
    this.fenHistory = [this.chess.fen()];

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
      this.loadGamePlayers();
      this.initPvpSocket();
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(p => { this.notifPermission = p; });
      } else if ('Notification' in window) {
        this.notifPermission = Notification.permission;
      }
    }
  }

  private initPvpSocket(): void {
    this.socket.connect();
    this.socket.joinGame(this.gameId, this.auth.currentUser!.id, this.playerColor, this.timeControlInitial);

    this.socket.on('game_start').subscribe(() => {
      // El rellotge l'administra el servidor: rebem 'clock_sync' periòdicament.
    });

    this.socket.on('game_state').subscribe((data: any) => {
      // Sent to spectators joining mid-game
      if (this.isSpectator) {
        try { this.chess.load(data.fen); } catch { return; }
        this.currentTurn = data.turn;
        this.chatMessages = (data.chat || []) as ChatMsg[];
        this.fenHistory = [data.fen];
      }
    });

    this.socket.on('move_made').subscribe((data: any) => {
      let m: any = null;
      try { m = this.chess.move(data.move.uci); } catch { m = null; }
      if (m) {
        this.recordMove(m);
        this.fenHistory.push(this.chess.fen());
      }
      this.currentTurn = data.turn;
      this.lastMove = { from: data.move.uci.slice(0,2), to: data.move.uci.slice(2,4) };
      this.updateCheckState();
      if (this.chess.isGameOver()) this.handleGameOver();
      // Browser notification when it's the player's turn and tab is unfocused
      if (!this.isSpectator && this.notifPermission === 'granted' && !document.hasFocus()) {
        try { new Notification('ChessHub ♟', { body: 'És el teu torn!' }); } catch(e) {}
      }
    });

    this.socket.on('clock_sync').subscribe((data: any) => {
      // El servidor és l'autoritat del rellotge (jugadors i espectadors)
      if (this.playerColor === 'black') {
        this.myTime       = data.black_time ?? this.myTime;
        this.opponentTime = data.white_time ?? this.opponentTime;
      } else {
        this.myTime       = data.white_time ?? this.myTime;
        this.opponentTime = data.black_time ?? this.opponentTime;
      }
    });

    this.socket.on('game_ended').subscribe((data: any) => this.handleGameEnd(data));

    this.socket.on('chat_message').subscribe((msg: ChatMsg) => {
      this.chatMessages.push(msg);
      this.scrollChat();
    });

    this.socket.on('spectator_count').subscribe((data: any) => {
      this.spectatorCount = data.count ?? 0;
    });

    this.socket.on('draw_offered').subscribe(() => {
      this.drawOffered = true;
    });

    this.socket.on('draw_declined').subscribe(() => {
      this.drawPending = false;
    });

    this.socket.on('player_disconnected').subscribe((data: any) => {
      this.opponentName = (data.color === this.playerColor ? this.playerName : this.opponentName) + ' (desconnectat)';
    });

    this.socket.on('player_joined').subscribe(() => {
      this.loadGamePlayers();
    });

    this.socket.on('rematch_offered').subscribe(() => {
      if (!this.isSpectator && this.gameOver) this.rematchOffered = true;
    });

    this.socket.on('rematch_accepted').subscribe((data: any) => {
      if (data?.newGameId) this.goToRematch(data.newGameId);
    });

    this.socket.on('rematch_declined').subscribe(() => {
      this.rematchSent     = false;
      this.rematchDeclined = true;
      setTimeout(() => { this.rematchDeclined = false; }, 3500);
    });

    // Auto-reconnect: quan socket.io recupera la connexió, rejoinem la sala
    this.socket.on('connect').subscribe(() => {
      if (this.reconnectAttempts > 0 && !this.gameOver) {
        this.socket.joinGame(this.gameId, this.auth.currentUser!.id, this.playerColor, this.timeControlInitial);
        this.reconnectAttempts = 0;
      }
    });

    this.socket.on('disconnect').subscribe(() => {
      if (!this.gameOver) this.reconnectAttempts++;
    });
  }

  ngOnDestroy(): void {
    if (this.gameType === 'pvp') this.socket.disconnect();
    this.stopClock();
    if (this.audioCtx) { this.audioCtx.close().catch(() => {}); this.audioCtx = null; }
  }

  // ── Clock ───────────────────────────────────────────────────────────────────

  startClock(): void {
    this.stopClock();
    this.clockInterval = setInterval(() => {
      if (this.gameOver || this.isSpectator) { return; }
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
    if (this.gameType === 'pvp') {
      this.socket.emit('timeout', { gameId: this.gameId, color: this.playerColor });
    } else {
      this.gameService.finishBotGame(this.gameId, 'bot', 'timeout').subscribe();
    }
    this.handleGameEnd({ result: this.playerColor === 'white' ? 'black' : 'white', reason: 'timeout' });
  }

  onOpponentTimeout(): void {
    this.stopClock();
    if (this.gameType === 'bot') {
      this.gameService.finishBotGame(this.gameId, 'user', 'timeout').subscribe();
    }
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
    const piece = this.displayChess.get(sq as any);
    if (!piece) return null;
    return `${piece.color}${piece.type.toUpperCase()}`;
  }

  isLight(ri: number, ci: number): boolean { return (ri + ci) % 2 === 0; }

  isSelected(ri: number, ci: number): boolean {
    return !this.inReplay && this.getSquareName(ri, ci) === this.selectedSq;
  }

  isPossible(ri: number, ci: number): boolean {
    return !this.inReplay && this.possibleMoves.includes(this.getSquareName(ri, ci));
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
    if (this.inReplay || !this.inCheck || !this.kingSquare) return false;
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
    const colorChar = code[0];
    const typeChar  = code[1].toUpperCase();
    const idx       = parseInt(localStorage.getItem('ch_piece') || '0', 10);
    const set       = Board.PIECE_SETS[idx] || 'cburnett';
    return `https://lichess1.org/assets/piece/${set}/${colorChar}${typeChar}.svg`;
  }

  // ── Move input ───────────────────────────────────────────────────────────────

  onSquareClick(ri: number, ci: number): void {
    if (this.gameOver || this.promotionPending || this.inReplay) return;
    if (this.currentTurn !== this.playerColor) return;
    if (this.isSpectator) return;
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
    this.fenHistory.push(this.chess.fen());
    this.updateCheckState();
    this.playSound(move.captured ? 'capture' : this.inCheck ? 'check' : 'move');

    const moveData = { san: move.san, uci: from + to };

    if (this.gameType === 'pvp') {
      this.socket.makeMove(this.gameId, moveData, this.chess.fen(), this.currentTurn);
      this.gameService.makeMove(this.gameId, { move_san: move.san, move_uci: from+to, fen_after: this.chess.fen() })
        .subscribe({ error: () => {} });
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
          if (this.chess.isGameOver()) { this.handleGameOver(); return; }
          if (res.data?.bot_move?.uci) { this.applyBotMove(res.data.bot_move); }
          else { this.applyFallbackBotMove(); }
          if (this.chess.isGameOver()) this.handleGameOver();
        },
        error: () => {
          this.botThinking = false;
          if (this.chess.isGameOver()) { this.handleGameOver(); return; }
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
    this.fenHistory.push(this.chess.fen());
    this.updateCheckState();
    this.playSound('move');

    if (this.gameType === 'pvp') {
      this.socket.makeMove(this.gameId, { san: move.san, uci: from+to+piece.toLowerCase() }, this.chess.fen(), this.currentTurn);
      this.gameService.makeMove(this.gameId, { move_san: move.san, move_uci: from+to+piece.toLowerCase(), fen_after: this.chess.fen() })
        .subscribe({ error: () => {} });
    } else {
      this.botThinking = true;
      this.gameService.makeBotMove(this.gameId, { move_san: move.san, move_uci: from+to+piece.toLowerCase(), fen_after: this.chess.fen() }).subscribe({
        next: (res: any) => {
          this.botThinking = false;
          if (this.chess.isGameOver()) { this.handleGameOver(); return; }
          if (res.data?.bot_move?.uci) { this.applyBotMove(res.data.bot_move); }
          else { this.applyFallbackBotMove(); }
          if (this.chess.isGameOver()) this.handleGameOver();
        },
        error: () => {
          this.botThinking = false;
          if (this.chess.isGameOver()) { this.handleGameOver(); return; }
          this.applyFallbackBotMove();
          if (this.chess.isGameOver()) this.handleGameOver();
        }
      });
    }
  }

  cancelPromotion(): void {
    this.promotionPending = null;
  }

  // ── Bot moves ────────────────────────────────────────────────────────────────

  private normalizeUci(uci: string): string {
    const castleMap: Record<string, string> = {
      'e1h1': 'e1g1', 'e1a1': 'e1c1',
      'e8h8': 'e8g8', 'e8a8': 'e8c8',
    };
    const base = uci.slice(0, 4);
    return castleMap[base] ? castleMap[base] + uci.slice(4) : uci;
  }

  private applyBotMove(botMove: any): void {
    const uci = this.normalizeUci(botMove.uci);
    let bm: any = null;
    try {
      bm = this.chess.move({ from: uci.slice(0,2) as any, to: uci.slice(2,4) as any, promotion: (uci[4]||'q') as any });
    } catch { bm = null; }
    if (bm) {
      this.lastMove    = { from: uci.slice(0,2), to: uci.slice(2,4) };
      this.currentTurn = this.chess.turn() === 'w' ? 'white' : 'black';
      this.recordMove(bm);
      this.fenHistory.push(this.chess.fen());
      this.updateCheckState();
      this.playSound(bm.captured ? 'capture' : this.inCheck ? 'check' : 'move');
      // El backend desa el moviment del bot amb un FEN provisional;
      // li enviem el FEN real de la posició posterior al moviment.
      if (botMove.move_id) {
        this.gameService.updateBotFen(this.gameId, botMove.move_id, this.chess.fen()).subscribe({ error: () => {} });
      }
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
      this.fenHistory.push(this.chess.fen());
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
    this.detectOpening();
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
      result='draw'; reason='insufficient'; this.gameResult='draw'; this.gameOverMessage='Taules! (Material insuficient)';
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
    const wasOver = this.gameOver;
    this.stopClock(); this.gameOver = true;
    this.drawOffered = false; this.drawPending = false;
    const won = data.result === this.playerColor;
    if (this.isSpectator) {
      this.gameResult      = 'draw';
      this.gameOverMessage = data.result === 'draw' ? 'Taules!' : `Guanyen les ${data.result === 'white' ? 'blanques' : 'negres'}`;
    } else {
      this.gameResult      = data.result === 'draw' ? 'draw' : won ? 'win' : 'loss';
      this.gameOverMessage = data.result === 'draw' ? 'Taules!' : won ? 'Has guanyat!' : 'Has perdut.';
    }
    this.playSound('end');

    // Persisteix el final a la BD (sobretot per temps esgotat, que el detecta
    // el servidor). El backend tanca la partida de forma atòmica, així que és
    // segur que ho cridin tots dos jugadors.
    if (!wasOver && !this.isSpectator && this.gameType === 'pvp' && data.result) {
      this.gameService.finishGame(this.gameId, data.result, data.reason || 'timeout').subscribe();
    }
  }

  resign(): void {
    if (this.isSpectator) return;
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

  // ── Draw offer ────────────────────────────────────────────────────────────────

  offerDraw(): void {
    if (this.drawPending || this.gameOver || this.isSpectator) return;
    this.drawPending = true;
    this.socket.offerDraw(this.gameId, this.auth.currentUser!.id);
  }

  acceptDraw(): void {
    this.drawOffered = false;
    this.socket.acceptDraw(this.gameId);
    this.gameService.finishGame(this.gameId, 'draw', 'agreement').subscribe();
    this.handleGameEnd({ result: 'draw', reason: 'agreement' });
  }

  declineDraw(): void {
    this.drawOffered = false;
    this.socket.declineDraw(this.gameId);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────

  sendChat(): void {
    const msg = this.chatInput.trim();
    if (!msg || msg.length > 200) return;
    const user = this.auth.currentUser!;
    this.socket.sendChat(
      this.gameId, user.id, user.username, msg,
      this.isSpectator ? 'spectator' : this.playerColor
    );
    this.chatInput = '';
  }

  private scrollChat(): void {
    setTimeout(() => {
      const el = document.querySelector('.chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  chatMsgColor(color: string): string {
    if (color === 'white')    return '#f0f0f0';
    if (color === 'black')    return '#a0c0e0';
    return '#8a8a8a'; // spectator
  }

  // ── Replay ────────────────────────────────────────────────────────────────────

  replayPrev(): void {
    if (this.replayIndex === null) {
      this.replayIndex = this.fenHistory.length - 2;
    } else {
      this.replayIndex = Math.max(0, this.replayIndex - 1);
    }
    this.replayChess = new Chess(this.fenHistory[this.replayIndex] || this.fenHistory[0]);
  }

  replayNext(): void {
    if (this.replayIndex === null) return;
    if (this.replayIndex >= this.fenHistory.length - 1) {
      this.exitReplay();
      return;
    }
    this.replayIndex++;
    this.replayChess = new Chess(this.fenHistory[this.replayIndex]);
  }

  exitReplay(): void {
    this.replayIndex = null;
    this.replayChess = null;
  }

  // ── Invite ────────────────────────────────────────────────────────────────────

  copyInviteLink(): void {
    const url = `${window.location.origin}/game/${this.gameId}?type=pvp&color=spectator&time=${this.timeControlInitial}`;
    const markCopied = () => {
      this.inviteCopied = true;
      setTimeout(() => { this.inviteCopied = false; }, 2500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(markCopied).catch(() => this.fallbackCopy(url, markCopied));
    } else {
      this.fallbackCopy(url, markCopied);
    }
  }

  private fallbackCopy(text: string, onSuccess: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { if (document.execCommand('copy')) onSuccess(); } finally { document.body.removeChild(ta); }
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

  promotionPieceCode(p: string): string {
    return this.playerColor[0] + p;
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  canDrag(ri: number, ci: number): boolean {
    if (this.gameOver || this.promotionPending || this.inReplay || this.isSpectator) return false;
    if (this.currentTurn !== this.playerColor) return false;
    const piece = this.chess.get(this.getSquareName(ri, ci) as any);
    return !!piece && piece.color === this.playerColor[0];
  }

  onDragStart(ri: number, ci: number, event: DragEvent): void {
    if (!this.canDrag(ri, ci)) { event.preventDefault(); return; }
    const sq = this.getSquareName(ri, ci);
    this.dragFrom = sq;
    this.selectSquare(sq);
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', sq);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(ri: number, ci: number, event: DragEvent): void {
    const sq = this.getSquareName(ri, ci);
    if (this.dragFrom && this.possibleMoves.includes(sq)) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(ri: number, ci: number, event: DragEvent): void {
    event.preventDefault();
    if (!this.dragFrom) return;
    const to = this.getSquareName(ri, ci);
    const from = this.dragFrom;
    this.dragFrom = null;
    if (this.possibleMoves.includes(to)) {
      this.doMove(from, to);
    } else {
      this.selectedSq = null;
      this.possibleMoves = [];
    }
  }

  onDragEnd(): void {
    this.dragFrom = null;
  }

  // ── Players / opponent info ────────────────────────────────────────────────

  private loadGamePlayers(): void {
    this.gameService.getGame(this.gameId).subscribe({
      next: (res: any) => {
        const game = res.data?.game;
        if (!game) return;
        if (this.isSpectator) {
          this.applyPlayerInfo(game.player_white_id, 'player');
          this.applyPlayerInfo(game.player_black_id, 'opponent');
        } else {
          const oppId = this.playerColor === 'white' ? game.player_black_id : game.player_white_id;
          this.applyPlayerInfo(oppId, 'opponent');
        }
      },
      error: () => {}
    });
  }

  private applyPlayerInfo(userId: any, slot: 'player' | 'opponent'): void {
    if (!userId) return;
    this.gameService.getUserProfile(userId).subscribe({
      next: (res: any) => {
        const u = res.data?.user;
        const p = res.data?.profile;
        if (slot === 'opponent') {
          if (u?.username) this.opponentName = u.username;
          if (p?.elo)      this.opponentElo  = p.elo;
          this.opponentAvatarUrl = p?.avatar || null;
        } else {
          if (u?.username) this.playerName = u.username;
          if (p?.elo)      this.playerElo  = p.elo;
          if (p?.avatar)   this.playerAvatarUrl = p.avatar;
        }
      },
      error: () => {}
    });
  }

  // ── Rematch ────────────────────────────────────────────────────────────────

  offerRematch(): void {
    if (this.rematchSent || this.isSpectator) return;
    this.rematchSent = true;
    this.socket.rematchOffer(this.gameId);
  }

  acceptRematch(): void {
    this.rematchOffered = false;
    const myNewColor = this.playerColor === 'white' ? 'black' : 'white';
    this.gameService.createGame(myNewColor, this.timeControlInitial).subscribe({
      next: (res: any) => {
        const newGameId = res.data?.game_id;
        if (!newGameId) return;
        this.socket.rematchAccept(this.gameId, newGameId);
        // Petit marge perquè el socket enviï l'esdeveniment abans de recarregar
        setTimeout(() => this.navigateToGame(newGameId, myNewColor), 250);
      },
      error: () => {}
    });
  }

  declineRematch(): void {
    this.rematchOffered = false;
    this.socket.rematchDecline(this.gameId);
  }

  private goToRematch(newGameId: number): void {
    const myNewColor = this.playerColor === 'white' ? 'black' : 'white';
    this.gameService.joinGame(newGameId).subscribe({
      next:  () => this.navigateToGame(newGameId, myNewColor),
      error: () => this.navigateToGame(newGameId, myNewColor),
    });
  }

  private navigateToGame(gameId: number, color: string): void {
    // Recàrrega completa perquè el tauler es reinicialitzi des de zero
    window.location.href = `/game/${gameId}?type=pvp&color=${color}&time=${this.timeControlInitial}`;
  }

  // ── Fletxes i ressaltats d'anàlisi (clic dret) ─────────────────────────────

  private squareToRC(sq: string): { ri: number; ci: number } {
    const files   = ['a','b','c','d','e','f','g','h'];
    const fileIdx = files.indexOf(sq[0]);
    const rank    = parseInt(sq[1], 10);
    if (this.playerColor === 'black') {
      return { ri: rank - 1, ci: 7 - fileIdx };
    }
    return { ri: 8 - rank, ci: fileIdx };
  }

  // Centre d'una casella en unitats de casella (SVG amb viewBox 0 0 8 8)
  sqCenter(sq: string): { x: number; y: number } {
    const { ri, ci } = this.squareToRC(sq);
    return { x: ci + 0.5, y: ri + 0.5 };
  }

  onSquareMouseDown(ri: number, ci: number, event: MouseEvent): void {
    if (event.button === 2) {
      this.arrowStart = this.getSquareName(ri, ci);
    } else if (event.button === 0) {
      if (this.userArrows.length || this.userHighlights.length) this.clearAnnotations();
    }
  }

  onSquareMouseUp(ri: number, ci: number, event: MouseEvent): void {
    if (event.button !== 2 || !this.arrowStart) return;
    const to = this.getSquareName(ri, ci);
    if (to === this.arrowStart) {
      const i = this.userHighlights.indexOf(to);
      if (i >= 0) this.userHighlights.splice(i, 1);
      else        this.userHighlights.push(to);
    } else {
      const idx = this.userArrows.findIndex(a => a.from === this.arrowStart && a.to === to);
      if (idx >= 0) this.userArrows.splice(idx, 1);
      else          this.userArrows.push({ from: this.arrowStart, to });
    }
    this.arrowStart = null;
  }

  clearAnnotations(): void {
    this.userArrows     = [];
    this.userHighlights = [];
  }

  isHighlighted(ri: number, ci: number): boolean {
    return this.userHighlights.includes(this.getSquareName(ri, ci));
  }

  // ── PGN Export ─────────────────────────────────────────────────────────────

  exportPgn(): void {
    const pgn  = this.chess.pgn();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `chesshub_${this.gameId}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Clickable move list ─────────────────────────────────────────────────────

  goToMove(pairIndex: number, side: 'white' | 'black'): void {
    const moveIdx = pairIndex * 2 + (side === 'black' ? 1 : 0);
    const fenIdx  = moveIdx + 1; // fenHistory[0] és la posició inicial
    if (fenIdx >= this.fenHistory.length) return;
    this.replayIndex = fenIdx;
    this.replayChess = new Chess(this.fenHistory[this.replayIndex]);
  }

  // ── Report opponent ─────────────────────────────────────────────────────────

  submitReport(): void {
    if (this.reportSent) return;
    this.gameService.getGame(this.gameId).subscribe({
      next: (res: any) => {
        const game = res.data?.game;
        if (!game) return;
        const opId = this.playerColor === 'white' ? game.player_black_id : game.player_white_id;
        if (!opId) return;
        this.gameService.reportUser(opId, this.reportReason, '', this.gameId).subscribe({
          next: () => { this.reportSent = true; this.reportOpen = false; },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  // ── Opening detection ──────────────────────────────────────────────────────

  private static readonly OPENINGS: Array<[string, string]> = [
    ['e2e4 e7e5 g1f3 b8c6 f1b5 a7a6', 'Ruy López - Morphy'],
    ['e2e4 e7e5 g1f3 b8c6 f1b5', 'Ruy López'],
    ['e2e4 e7e5 g1f3 b8c6 f1c4 f8c5', 'Giuoco Piano'],
    ['e2e4 e7e5 g1f3 b8c6 f1c4', 'Obertura Italiana'],
    ['e2e4 e7e5 g1f3 b8c6 d2d4 e5d4', 'Joc Escocès'],
    ['e2e4 e7e5 g1f3 b8c6 d2d4', 'Joc Escocès'],
    ['e2e4 e7e5 g1f3 g8f6', 'Defensa Petrov'],
    ['e2e4 e7e5 f2f4', 'Gambut del Rei'],
    ['e2e4 e7e5 g1f3 b8c6', 'Partida Oberta - 3.Cf3'],
    ['e2e4 e7e5', 'Partida Oberta'],
    ['e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6', 'Siciliana - Najdorf'],
    ['e2e4 c7c5 g1f3 d7d6 d2d4', 'Siciliana - 3.d4'],
    ['e2e4 c7c5 g1f3 b8c6', 'Siciliana - 2.Cf3 Cc6'],
    ['e2e4 c7c5 g1f3 e7e6', 'Siciliana - 2.Cf3 e6'],
    ['e2e4 c7c5 g1f3', 'Defensa Siciliana - 2.Cf3'],
    ['e2e4 c7c5 b1c3', 'Defensa Siciliana - 2.Cc3'],
    ['e2e4 c7c5', 'Defensa Siciliana'],
    ['e2e4 c7c6 d2d4 d7d5 b1c3 d5e4', 'Caro-Kann - Clàssica'],
    ['e2e4 c7c6 d2d4 d7d5', 'Defensa Caro-Kann'],
    ['e2e4 c7c6', 'Defensa Caro-Kann'],
    ['e2e4 e7e6 d2d4 d7d5 b1c3', 'Defensa Francesa - Steinitz'],
    ['e2e4 e7e6 d2d4 d7d5', 'Defensa Francesa'],
    ['e2e4 e7e6', 'Defensa Francesa'],
    ['e2e4 d7d5 e4d5 d8d5', 'Defensa Escandinava'],
    ['e2e4 d7d5 e4d5', 'Defensa Escandinava'],
    ['e2e4 g8f6', "Defensa Alekhine"],
    ['e2e4 d7d6', 'Defensa Pirc/Moderna'],
    ['e2e4 g7g6', 'Defensa Moderna'],
    ['d2d4 d7d5 c2c4 d5c4', 'Gambut de Dama - Acceptat'],
    ['d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5', 'Defensa Ortodoxa'],
    ['d2d4 d7d5 c2c4 e7e6', 'Gambut de Dama - Declarat'],
    ['d2d4 d7d5 c2c4', 'Gambut de Dama'],
    ['d2d4 d7d5', 'Obertura de Dama'],
    ['d2d4 g8f6 c2c4 e7e6 b1c3 f8b4', 'Defensa Nimzo-Índia'],
    ['d2d4 g8f6 c2c4 e7e6 g1f3 d7d5 f1b5', 'Defensa Índia de Dama'],
    ['d2d4 g8f6 c2c4 e7e6', 'Defensa Índia'],
    ['d2d4 g8f6 c2c4 g7g6 b1c3 f8g7 e2e4 d7d6', 'Defensa Índia del Rei'],
    ['d2d4 g8f6 c2c4 g7g6 b1c3 d7d5', 'Defensa Grünfeld'],
    ['d2d4 g8f6 c2c4 g7g6', 'Defensa Índia del Rei / Grünfeld'],
    ['d2d4 g8f6 c2c4 c7c5 d4d5', 'Defensa Benoni'],
    ['d2d4 g8f6 c2c4', 'Obertura Índia'],
    ['d2d4 g8f6', 'Defensa Índia (1...Cf6)'],
    ['d2d4', 'Obertura de Dama'],
    ['c2c4 e7e5', 'Obertura Anglesa - 1...e5'],
    ['c2c4 g8f6', 'Obertura Anglesa - 1...Cf6'],
    ['c2c4', 'Obertura Anglesa'],
    ['g1f3 d7d5 c2c4', 'Obertura Réti'],
    ['g1f3 g8f6 c2c4', 'Obertura Réti'],
    ['g1f3', 'Obertura Réti'],
    ['e2e4', 'Partida del Rei'],
  ];

  private detectOpening(): void {
    const history  = this.chess.history({ verbose: true }) as any[];
    const moveStr  = history.map((m: any) => m.from + m.to + (m.promotion || '')).join(' ');
    this.openingName = null;
    for (const [seq, name] of Board.OPENINGS) {
      if (moveStr.startsWith(seq)) { this.openingName = name; return; }
    }
  }
}
