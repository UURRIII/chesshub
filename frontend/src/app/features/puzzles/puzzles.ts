import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Chess } from 'chess.js';
import { GameService } from '../../core/services/game';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-puzzles',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: flex; min-height: 100vh; background: #242423; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .sidebar { width: 72px; min-height: 100vh; background: #1a1a1a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; position: fixed; left: 0; top: 0; bottom: 0; border-right: 1px solid rgba(255,255,255,0.06); z-index: 200; transition: width .2s; }
    .sidebar:hover { width: 220px; }
    .sidebar:hover .nl, .sidebar:hover .sl-text { opacity: 1; width: auto; }
    .sidebar:hover .nav-item { padding: 10px 16px; justify-content: flex-start; gap: 12px; }
    .sidebar:hover .sidebar-logo { justify-content: flex-start; }
    .sidebar-logo { display: flex; align-items: center; padding: 0 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.07); width: 100%; justify-content: center; overflow: hidden; white-space: nowrap; }
    .logo-icon { width: 32px; height: 32px; background: #81b64c; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; flex-shrink: 0; }
    .sl-text { font-size: 17px; font-weight: 700; color: #fff; opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; margin-left: 10px; }
    .sidebar-nav { flex: 1; width: 100%; padding: 12px 0; display: flex; flex-direction: column; gap: 2px; }
    .nav-item { display: flex; align-items: center; gap: 0; padding: 10px 0; width: 100%; justify-content: center; color: #8a9ab0; text-decoration: none; font-size: 14px; font-weight: 600; transition: background .15s, color .15s; border: none; background: transparent; font-family: inherit; overflow: hidden; white-space: nowrap; cursor: pointer; }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .nav-item.active { color: #81b64c; background: rgba(129,182,76,0.1); }
    .ni { font-size: 20px; flex-shrink: 0; width: 24px; text-align: center; }
    .nl { opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; }

    .main { margin-left: 72px; flex: 1; padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .inner { width: 100%; max-width: 760px; display: flex; flex-direction: column; gap: 16px; }

    /* DIFF FILTER */
    .diff-bar { display: flex; gap: 6px; flex-wrap: wrap; }
    .diff-btn { padding: 7px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1a1a1a; color: #6a7a8a; font-size: 13px; font-family: inherit; font-weight: 600; cursor: pointer; transition: all .15s; }
    .diff-btn:hover { border-color: rgba(255,255,255,0.2); color: #e8e8e8; }
    .diff-btn.active { background: #81b64c; border-color: #81b64c; color: #fff; }
    .diff-btn.beginner.active { background: #2e7d32; border-color: #2e7d32; }
    .diff-btn.intermediate.active { background: #e65100; border-color: #e65100; }
    .diff-btn.advanced.active { background: #b71c1c; border-color: #b71c1c; }
    .diff-btn.expert.active { background: #212121; border-color: #555; }

    /* PUZZLE LIST */
    .puzzle-list { display: flex; flex-direction: column; gap: 8px; }
    .puzzle-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; background: #2c2b29; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; cursor: pointer; transition: all .15s; text-align: left; width: 100%; font-family: inherit; color: inherit; }
    .puzzle-row:hover { border-color: rgba(129,182,76,0.3); background: #302f2d; transform: translateX(2px); }
    .puzzle-title { font-size: 15px; font-weight: 700; color: #fff; }
    .puzzle-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .diff-badge { padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .bg-beg { background: rgba(46,125,50,0.25); color: #81c784; }
    .bg-int { background: rgba(230,81,0,0.25); color: #ffb74d; }
    .bg-adv { background: rgba(183,28,28,0.25); color: #ef9a9a; }
    .bg-exp { background: rgba(255,255,255,0.1); color: #bbb; }
    .theme-tag { font-size: 12px; color: #5a6a7a; }
    .rating-badge { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700; color: #f0b429; }

    /* PUZZLE BOARD VIEW */
    .puzzle-header { background: #2c2b29; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 20px; }
    .puzzle-header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .puzzle-name { font-size: 20px; font-weight: 700; color: #fff; }
    .turn-label { font-size: 13px; color: #6a7a8a; margin-top: 4px; }
    .turn-color { font-weight: 700; }
    .turn-w { color: #e8e8e8; }
    .turn-b { color: #81b64c; }
    .progress-label { font-size: 12px; color: #5a6a7a; margin-top: 6px; }

    /* BOARD */
    .board-wrap { display: flex; justify-content: center; }
    .board-outer { display: flex; }
    .rank-labels { display: flex; flex-direction: column; justify-content: space-around; padding: 0 4px 0 0; }
    .rank-label { font-size: 11px; color: #5a6a7a; font-weight: 700; line-height: 1; height: 64px; display: flex; align-items: center; }
    .board-container { border: 3px solid #1a1a1a; border-radius: 4px; display: inline-block; box-shadow: 0 8px 32px rgba(0,0,0,0.5); position: relative; }
    .board-row { display: flex; }
    .sq { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; }
    .light { background: var(--sq-light, #f0d9b5); }
    .dark  { background: var(--sq-dark, #b58863); }
    .selected  { outline: 3px solid rgba(129,182,76,0.9) !important; outline-offset: -3px; background: rgba(129,182,76,0.5) !important; }
    .last-from { background: rgba(205,209,111,0.5) !important; }
    .last-to   { background: rgba(205,209,111,0.7) !important; }
    .king-check { background: radial-gradient(ellipse at center, #ff4444 0%, #cc0000 60%, transparent 100%) !important; }
    .hint-sq { background: rgba(255,200,0,0.65) !important; animation: hint-pulse 0.45s ease-in-out 4; }
    @keyframes hint-pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
    .piece-img { width: 56px; height: 56px; user-select: none; -webkit-user-drag: element; cursor: grab; }
    .piece-img:active { cursor: grabbing; }
    .piece-img.dragging { opacity: 0.4; }
    .move-dot { position: absolute; width: 26%; height: 26%; border-radius: 50%; background: rgba(0,0,0,0.25); pointer-events: none; }
    .capture-ring { position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 0 4px rgba(0,0,0,0.25); pointer-events: none; }
    .coord-file { position: absolute; bottom: 1px; right: 3px; font-size: 10px; font-weight: 700; color: rgba(0,0,0,0.4); pointer-events: none; }
    .light .coord-file { color: rgba(0,0,0,0.3); }
    .dark  .coord-file { color: rgba(255,255,255,0.3); }

    /* RESULT */
    .result-banner { padding: 16px 20px; border-radius: 10px; font-size: 16px; font-weight: 700; }
    .result-ok  { background: rgba(129,182,76,0.15); border: 1px solid rgba(129,182,76,0.4); color: #81b64c; }
    .result-err { background: rgba(220,60,60,0.15); border: 1px solid rgba(220,60,60,0.3); color: #ff8080; }

    /* ACTIONS */
    .actions { display: flex; gap: 10px; }
    .btn-back { padding: 10px 18px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; color: #8a9ab0; font-size: 14px; font-family: inherit; font-weight: 600; cursor: pointer; transition: all .15s; }
    .btn-back:hover { border-color: rgba(255,255,255,0.2); color: #e8e8e8; }
    .btn-next { padding: 10px 20px; background: #81b64c; border: none; border-radius: 9px; color: #fff; font-size: 14px; font-family: inherit; font-weight: 700; cursor: pointer; transition: all .15s; }
    .btn-next:hover { background: #8ec956; }
    .btn-retry { padding: 10px 18px; background: transparent; border: 1px solid rgba(220,60,60,0.4); border-radius: 9px; color: #ff8080; font-size: 14px; font-family: inherit; font-weight: 600; cursor: pointer; transition: all .15s; }
    .btn-retry:hover { background: rgba(220,60,60,0.1); }
  `],
  template: `
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">&#9817;</div>
    <span class="sl-text">ChessHub</span>
  </div>
  <nav class="sidebar-nav">
    <a routerLink="/lobby" class="nav-item">
      <span class="ni">&#9816;</span><span class="nl">Jugar</span>
    </a>
    <a routerLink="/puzzles" class="nav-item active">
      <span class="ni">&#129513;</span><span class="nl">Puzzles</span>
    </a>
    <a routerLink="/leaderboard" class="nav-item">
      <span class="ni">&#127942;</span><span class="nl">Rànquing</span>
    </a>
    <a routerLink="/profile" class="nav-item">
      <span class="ni">&#128100;</span><span class="nl">Perfil</span>
    </a>
    <a routerLink="/admin" class="nav-item" *ngIf="currentUser?.role==='admin'">
      <span class="ni">&#9760;</span><span class="nl">Admin</span>
    </a>
  </nav>
  <div style="padding:0 0 16px;display:flex;flex-direction:column;align-items:center;width:100%;margin-top:auto">
    <button style="width:40px;height:40px;border-radius:8px;border:none;background:transparent;color:#5a6a7a;cursor:pointer;font-size:18px;transition:all .15s" (click)="logout()">&#8594;</button>
  </div>
</div>

<div class="main">
  <div class="inner">

    <!-- LLISTA -->
    <ng-container *ngIf="!currentPuzzle">
      <div class="diff-bar">
        <button class="diff-btn" [class.active]="selectedDifficulty===''" (click)="loadPuzzles('')">Tots</button>
        <button class="diff-btn beginner" [class.active]="selectedDifficulty==='beginner'" (click)="loadPuzzles('beginner')">Principiant</button>
        <button class="diff-btn intermediate" [class.active]="selectedDifficulty==='intermediate'" (click)="loadPuzzles('intermediate')">Intermedi</button>
        <button class="diff-btn advanced" [class.active]="selectedDifficulty==='advanced'" (click)="loadPuzzles('advanced')">Avançat</button>
        <button class="diff-btn expert" [class.active]="selectedDifficulty==='expert'" (click)="loadPuzzles('expert')">Expert</button>
      </div>

      <div class="puzzle-list">
        <button *ngFor="let p of puzzles" class="puzzle-row" (click)="startPuzzle(p)">
          <div>
            <div class="puzzle-title">{{ p.title }}</div>
            <div class="puzzle-meta">
              <span class="diff-badge"
                [class.bg-beg]="p.difficulty==='beginner'"
                [class.bg-int]="p.difficulty==='intermediate'"
                [class.bg-adv]="p.difficulty==='advanced'"
                [class.bg-exp]="p.difficulty==='expert'">
                {{ p.difficulty }}
              </span>
              <span class="theme-tag">{{ p.theme_tag }}</span>
            </div>
          </div>
          <div class="rating-badge">&#9733; {{ p.rating }}</div>
        </button>
      </div>
    </ng-container>

    <!-- PUZZLE ACTIU -->
    <ng-container *ngIf="currentPuzzle">
      <div class="puzzle-header">
        <div class="puzzle-header-top">
          <div>
            <div class="puzzle-name">{{ currentPuzzle.title }}</div>
            <div class="turn-label">
              <span class="turn-color" [class.turn-w]="playerColor==='white'" [class.turn-b]="playerColor==='black'">
                {{ playerColor === 'white' ? 'Blanques' : 'Negres' }}
              </span>
              han de jugar
            </div>
            <div class="progress-label" *ngIf="solutionMoves.length > 1">
              Moviment {{ currentSolutionIndex + 1 }} de {{ solutionMoves.length }}
            </div>
          </div>
          <div class="rating-badge">&#9733; {{ currentPuzzle.rating }}</div>
        </div>
      </div>

      <div class="board-wrap">
        <div class="board-outer">
          <div class="rank-labels">
            <div class="rank-label" *ngFor="let ri of boardRows">{{ getRank(ri) }}</div>
          </div>
          <div>
            <div class="board-container">
              <!-- Promotion overlay -->
              <div *ngIf="promotionPending" style="position:absolute;inset:0;background:rgba(0,0,0,0.75);z-index:10;display:flex;align-items:center;justify-content:center;border-radius:4px">
                <div style="background:#2c2b29;border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:12px">
                  <div style="font-size:14px;font-weight:700;color:#e8e8e8">Promociona el peó</div>
                  <div style="display:flex;gap:8px">
                    <button *ngFor="let p of puzzlePromoPieces" (click)="confirmPuzzlePromotion(p)"
                      style="width:60px;height:60px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:#1a1a1a;cursor:pointer;padding:4px;transition:border-color .15s"
                      onmouseenter="this.style.borderColor='rgba(129,182,76,0.6)'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.12)'">
                      <img [src]="getPieceSvg(playerColor[0] + p.toUpperCase())" style="width:100%;height:100%" [alt]="p"/>
                    </button>
                  </div>
                </div>
              </div>
              <div *ngFor="let ri of boardRows" class="board-row">
                <div
                  *ngFor="let ci of boardCols"
                  class="sq"
                  [class.light]="isLight(ri, ci)"
                  [class.dark]="!isLight(ri, ci)"
                  [class.selected]="isSelected(ri, ci)"
                  [class.last-from]="isLastMoveFrom(ri, ci)"
                  [class.last-to]="isLastMoveTo(ri, ci)"
                  [class.king-check]="isKingInCheck(ri, ci)"
                  [class.hint-sq]="hintSquare === getSquareName(ri, ci)"
                  (click)="onSquareClick(ri, ci)"
                  (dragover)="onDragOver(ri, ci, $event)"
                  (drop)="onDrop(ri, ci, $event)"
                >
                  <img *ngIf="getPiece(ri, ci)" [src]="getPieceSvg(getPiece(ri, ci)!)" class="piece-img"
                    [class.dragging]="dragFrom === getSquareName(ri, ci)"
                    [attr.draggable]="canDragPuzzle(ri, ci)"
                    (dragstart)="onDragStart(ri, ci, $event)"
                    (dragend)="onDragEnd()" alt=""/>
                  <div class="move-dot" *ngIf="isPossible(ri, ci) && !getPiece(ri, ci)"></div>
                  <div class="capture-ring" *ngIf="isPossible(ri, ci) && getPiece(ri, ci)"></div>
                  <span class="coord-file" *ngIf="ri === 7">{{ getFile(ci) }}</span>
                </div>
              </div>
            </div>
            <!-- File labels -->
          </div>
        </div>
      </div>

      <div *ngIf="result" class="result-banner" [class.result-ok]="result==='correct'" [class.result-err]="result==='incorrect'">
        {{ result === 'correct' ? '✅ Correcte! Molt bé!' : '❌ Incorrecte. Torna-ho a intentar!' }}
      </div>

      <div class="actions">
        <button class="btn-back" (click)="backToList()">← Tornar</button>
        <button class="btn-back" *ngIf="!result" (click)="showHint()" style="border-color:rgba(255,200,0,0.35);color:#f0b429">💡 Pista</button>
        <button class="btn-retry" *ngIf="result==='incorrect'" (click)="retryPuzzle()">↺ Reintentar</button>
        <button class="btn-next" *ngIf="result==='correct'" (click)="nextPuzzle()">Següent →</button>
      </div>
    </ng-container>

  </div>
</div>
  `
})
export class Puzzles implements OnInit {
  private gameService = inject(GameService);
  private auth        = inject(AuthService);
  private router      = inject(Router);
  currentUser = this.auth.currentUser;

  puzzles: any[] = [];
  currentPuzzle: any = null;
  selectedDifficulty = '';
  result: 'correct' | 'incorrect' | null = null;

  chess = new Chess();
  selectedSq: string | null = null;
  possibleMoves: string[] = [];
  lastMove: { from: string; to: string } | null = null;

  playerColor: 'white' | 'black' = 'white';
  boardRows = [0,1,2,3,4,5,6,7];
  boardCols = [0,1,2,3,4,5,6,7];
  kingSquare: string | null = null;
  inCheck = false;

  solutionMoves: string[] = [];
  currentSolutionIndex = 0;

  promotionPending: { from: string; to: string } | null = null;
  puzzlePromoPieces = ['q', 'r', 'b', 'n'];
  hintSquare: string | null = null;
  private hintTimeout: any = null;

  dragFrom: string | null = null;

  private static readonly PIECE_SETS = [
    'cburnett','merida','alpha','chess7','tatiana',
    'companion','fantasy','gioco','pirouetti','kosal'
  ];

  ngOnInit(): void { this.loadPuzzles(''); }

  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }

  loadPuzzles(diff: string): void {
    this.selectedDifficulty = diff;
    this.currentPuzzle = null;
    this.gameService.getPuzzles(diff).subscribe({
      next: (res) => this.puzzles = res.data || [],
      error: () => {}
    });
  }

  startPuzzle(p: any): void {
    this.currentPuzzle = p;
    this.result = null;
    this.selectedSq = null;
    this.possibleMoves = [];
    this.lastMove = null;
    this.chess = new Chess(p.fen);
    this.solutionMoves = (p.solution || '').trim().split(/\s+/).filter((m: string) => m.length >= 4);
    this.currentSolutionIndex = 0;
    // El jugador mou primer: és el torn actual al FEN
    this.playerColor = this.chess.turn() === 'w' ? 'white' : 'black';
    this.updateCheckState();
  }

  retryPuzzle(): void {
    if (this.currentPuzzle) this.startPuzzle(this.currentPuzzle);
  }

  nextPuzzle(): void {
    const idx = this.puzzles.findIndex(p => p.id === this.currentPuzzle.id);
    const next = this.puzzles[idx + 1];
    if (next) this.startPuzzle(next);
    else this.backToList();
  }

  backToList(): void { this.currentPuzzle = null; this.result = null; }

  // ── Board coordinate helpers ─────────────────────────────────────────────────

  getSquareName(ri: number, ci: number): string {
    const files = ['a','b','c','d','e','f','g','h'];
    const rank = this.playerColor === 'white' ? 8 - ri : ri + 1;
    const file = this.playerColor === 'white' ? files[ci] : files[7-ci];
    return `${file}${rank}`;
  }

  getPiece(ri: number, ci: number): string | null {
    const sq    = this.getSquareName(ri, ci);
    const piece = this.chess.get(sq as any);
    if (!piece) return null;
    return `${piece.color}${piece.type.toUpperCase()}`;
  }

  getPieceSvg(code: string): string {
    if (!code) return '';
    const idx = parseInt(localStorage.getItem('ch_piece') || '0', 10);
    const set = Puzzles.PIECE_SETS[idx] || 'cburnett';
    return `https://lichess1.org/assets/piece/${set}/${code}.svg`;
  }

  isLight(ri: number, ci: number): boolean { return (ri + ci) % 2 === 0; }

  getRank(ri: number): string {
    return this.playerColor === 'white' ? String(8 - ri) : String(ri + 1);
  }

  getFile(ci: number): string {
    const files = ['a','b','c','d','e','f','g','h'];
    return this.playerColor === 'white' ? files[ci] : files[7-ci];
  }

  isSelected(ri: number, ci: number): boolean {
    return this.getSquareName(ri, ci) === this.selectedSq;
  }

  isPossible(ri: number, ci: number): boolean {
    return this.possibleMoves.includes(this.getSquareName(ri, ci));
  }

  isLastMoveFrom(ri: number, ci: number): boolean {
    return !!this.lastMove && this.getSquareName(ri, ci) === this.lastMove.from;
  }

  isLastMoveTo(ri: number, ci: number): boolean {
    return !!this.lastMove && this.getSquareName(ri, ci) === this.lastMove.to;
  }

  isKingInCheck(ri: number, ci: number): boolean {
    return this.inCheck && this.kingSquare === this.getSquareName(ri, ci);
  }

  private updateCheckState(): void {
    this.inCheck = this.chess.inCheck();
    if (this.inCheck) {
      const turn  = this.chess.turn();
      const board = this.chess.board();
      const files = ['a','b','c','d','e','f','g','h'];
      this.kingSquare = null;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            this.kingSquare = files[c] + (8 - r);
          }
        }
      }
    } else { this.kingSquare = null; }
  }

  // ── Move input ───────────────────────────────────────────────────────────────

  onSquareClick(ri: number, ci: number): void {
    if (this.result || this.promotionPending) return;
    const sq    = this.getSquareName(ri, ci);
    const piece = this.chess.get(sq as any);

    if (this.selectedSq && this.possibleMoves.includes(sq)) {
      this.makePuzzleMove(this.selectedSq, sq);
    } else if (piece && piece.color === this.chess.turn() &&
               this.chess.turn() === this.playerColor[0]) {
      // Selecciona peça pròpia en el torn del jugador
      this.selectedSq   = sq;
      this.possibleMoves = this.chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to);
    } else {
      this.selectedSq   = null;
      this.possibleMoves = [];
    }
  }

  private makePuzzleMove(from: string, to: string): void {
    const movingPiece = this.chess.get(from as any);
    const isPromo     = movingPiece?.type === 'p' &&
      ((movingPiece.color === 'w' && to[1] === '8') || (movingPiece.color === 'b' && to[1] === '1'));

    if (isPromo) {
      this.promotionPending = { from, to };
      this.selectedSq       = null;
      this.possibleMoves    = [];
      return;
    }

    const move = this.chess.move({ from, to, promotion: 'q' });
    if (move) {
      this.lastMove = { from, to };
      this.updateCheckState();
      this.checkSolutionMove(from + to);
    }
    this.selectedSq    = null;
    this.possibleMoves = [];
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────────

  canDragPuzzle(ri: number, ci: number): boolean {
    if (this.result || this.promotionPending) return false;
    const piece = this.chess.get(this.getSquareName(ri, ci) as any);
    return !!piece && piece.color === this.chess.turn() && this.chess.turn() === this.playerColor[0];
  }

  onDragStart(ri: number, ci: number, event: DragEvent): void {
    if (!this.canDragPuzzle(ri, ci)) { event.preventDefault(); return; }
    const sq = this.getSquareName(ri, ci);
    this.dragFrom      = sq;
    this.selectedSq    = sq;
    this.possibleMoves = this.chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to);
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
    const to   = this.getSquareName(ri, ci);
    const from = this.dragFrom;
    this.dragFrom = null;
    if (this.possibleMoves.includes(to)) {
      this.makePuzzleMove(from, to);
    } else {
      this.selectedSq    = null;
      this.possibleMoves = [];
    }
  }

  onDragEnd(): void {
    this.dragFrom = null;
  }

  confirmPuzzlePromotion(piece: string): void {
    if (!this.promotionPending) return;
    const { from, to } = this.promotionPending;
    this.promotionPending = null;
    const move = this.chess.move({ from, to, promotion: piece } as any);
    if (move) {
      this.lastMove = { from, to };
      const uci = from + to + piece;
      this.updateCheckState();
      this.checkSolutionMove(uci);
    }
  }

  showHint(): void {
    const move = this.solutionMoves[this.currentSolutionIndex];
    if (!move) return;
    this.hintSquare = move.slice(0, 2);
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
    this.hintTimeout = setTimeout(() => { this.hintSquare = null; }, 1800);
  }

  private checkSolutionMove(uci: string): void {
    const expected = this.solutionMoves[this.currentSolutionIndex];
    if (!expected) return;

    const normalize = (s: string) => s.toLowerCase().trim();

    if (normalize(uci) === normalize(expected)) {
      this.currentSolutionIndex++;

      if (this.currentSolutionIndex >= this.solutionMoves.length) {
        // Tots els moviments correctes → puzzle resolt!
        this.result = 'correct';
        this.submitAttempt(true);
      } else {
        // Queden moviments: fes el moviment de resposta automàtic
        setTimeout(() => this.playOpponentMove(), 500);
      }
    } else {
      // Moviment incorrecte
      this.result = 'incorrect';
      this.submitAttempt(false);
    }
  }

  private playOpponentMove(): void {
    const opponentUci = this.solutionMoves[this.currentSolutionIndex];
    if (!opponentUci) return;
    const from = opponentUci.slice(0, 2);
    const to   = opponentUci.slice(2, 4);
    const promo = opponentUci.length === 5 ? opponentUci[4] : 'q';
    const move = this.chess.move({ from, to, promotion: promo } as any);
    if (move) {
      this.lastMove = { from, to };
      this.currentSolutionIndex++;
      this.updateCheckState();
    }
  }

  private submitAttempt(solved: boolean): void {
    if (!this.currentPuzzle) return;
    this.gameService.attemptPuzzle(this.currentPuzzle.id, solved, 0)
      .subscribe({ error: () => {} });
  }
}
