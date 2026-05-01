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

    /* BOARD */
    .board-wrap { display: flex; justify-content: center; }
    .board-container { border: 3px solid #1a1a1a; border-radius: 4px; display: inline-block; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
    .board-row { display: flex; }
    .square { width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; }
    .light { background: var(--sq-light, #f0d9b5); }
    .dark  { background: var(--sq-dark, #b58863); }
    .selected { background: rgba(129,182,76,0.7) !important; }
    .last-move { background: rgba(205,209,111,0.6) !important; }
    .possible { position: relative; }
    .possible::after { content: ''; position: absolute; width: 32%; height: 32%; border-radius: 50%; background: rgba(0,0,0,0.28); pointer-events: none; }
    .piece { font-size: 2.5rem; line-height: 1; user-select: none; }
    .piece-w { color: var(--piece-w, #fff); text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000; }
    .piece-b { color: var(--piece-b, #111); text-shadow: -1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff; }

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
              <span [class.turn-w]="chess.turn()==='w'" [class.turn-b]="chess.turn()==='b'" class="turn-color">
                {{ chess.turn()==='w' ? 'Blanques' : 'Negres' }}
              </span>
              han de jugar
            </div>
          </div>
          <div class="rating-badge">&#9733; {{ currentPuzzle.rating }}</div>
        </div>
      </div>

      <div class="board-wrap">
        <div class="board-container">
          <div *ngFor="let row of boardRows" class="board-row">
            <div *ngFor="let col of boardCols; let ci = index"
              class="square"
              [class.light]="isLight(row, ci)"
              [class.dark]="!isLight(row, ci)"
              [class.selected]="isSelected(row, ci)"
              [class.possible]="isPossible(row, ci)"
              [class.last-move]="isLastMove(row, ci)"
              (click)="onSquareClick(row, ci)">
              <span class="piece" *ngIf="getPiece(row, ci)"
                [class.piece-w]="getPiece(row,ci)![0]==='w'"
                [class.piece-b]="getPiece(row,ci)![0]==='b'">
                {{ getPieceSymbol(getPiece(row, ci)!) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="result" class="result-banner" [class.result-ok]="result==='correct'" [class.result-err]="result==='incorrect'">
        {{ result === 'correct' ? '✅ Correcte! Molt bé!' : '❌ Incorrecte — Solució: ' + currentPuzzle.solution }}
      </div>

      <div class="actions">
        <button class="btn-back" (click)="backToList()">← Tornar</button>
        <button class="btn-next" *ngIf="result" (click)="nextPuzzle()">Següent →</button>
      </div>
    </ng-container>

  </div>
</div>
  `
})
export class Puzzles implements OnInit {
  private gameService = inject(GameService);
  private auth = inject(AuthService);
  private router = inject(Router);
  currentUser = this.auth.currentUser;

  puzzles: any[] = [];
  currentPuzzle: any = null;
  currentIndex = 0;
  selectedDifficulty = '';
  result: 'correct' | 'incorrect' | null = null;

  chess = new Chess();
  selectedSq: string | null = null;
  possibleMoves: string[] = [];
  lastMove: { from: string; to: string } | null = null;

  boardRows = [0,1,2,3,4,5,6,7];
  boardCols = [0,1,2,3,4,5,6,7];

  pieceSymbols: Record<string, string> = {
    'wK':'♔','wQ':'♕','wR':'♖','wB':'♗','wN':'♘','wP':'♙',
    'bK':'♚','bQ':'♛','bR':'♜','bB':'♝','bN':'♞','bP':'♟',
  };

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
  }

  nextPuzzle(): void {
    const idx = this.puzzles.findIndex(p => p.id === this.currentPuzzle.id);
    const next = this.puzzles[idx + 1];
    if (next) this.startPuzzle(next);
    else this.backToList();
  }

  backToList(): void { this.currentPuzzle = null; this.result = null; }

  isLight(row: number, col: number): boolean { return (row + col) % 2 === 0; }

  getSquareName(row: number, col: number): string {
    return String.fromCharCode(97 + col) + (8 - row);
  }

  getPiece(row: number, col: number): string | null {
    const sq = this.chess.get(this.getSquareName(row, col) as any);
    if (!sq) return null;
    return `${sq.color}${sq.type.toUpperCase()}`;
  }

  getPieceSymbol(code: string): string { return this.pieceSymbols[code] || ''; }

  isSelected(row: number, col: number): boolean { return this.getSquareName(row, col) === this.selectedSq; }
  isPossible(row: number, col: number): boolean { return this.possibleMoves.includes(this.getSquareName(row, col)); }
  isLastMove(row: number, col: number): boolean {
    const sq = this.getSquareName(row, col);
    return !!this.lastMove && (sq === this.lastMove.from || sq === this.lastMove.to);
  }

  onSquareClick(row: number, col: number): void {
    if (this.result) return;
    const sq = this.getSquareName(row, col);
    const piece = this.chess.get(sq as any);

    if (this.possibleMoves.includes(sq)) {
      const move = this.chess.move({ from: this.selectedSq!, to: sq, promotion: 'q' });
      if (move) {
        this.lastMove = { from: this.selectedSq!, to: sq };
        const uci = this.selectedSq! + sq;
        const sol = this.currentPuzzle.solution?.toLowerCase().replace(/\s/g,'');
        this.result = (uci === sol) ? 'correct' : 'incorrect';
      }
      this.selectedSq = null;
      this.possibleMoves = [];
    } else if (piece && piece.color === this.chess.turn()) {
      this.selectedSq = sq;
      this.possibleMoves = this.chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to);
    } else {
      this.selectedSq = null;
      this.possibleMoves = [];
    }
  }
}
