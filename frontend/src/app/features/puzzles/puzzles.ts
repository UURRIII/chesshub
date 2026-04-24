import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { GameService } from '../../core/services/game';

@Component({
  selector: 'app-puzzles',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h2>🧩 Puzzles</h2>
            <a routerLink="/lobby" class="btn btn-outline-secondary btn-sm">← Lobby</a>
          </div>

          <!-- Selector dificultat -->
          <div class="btn-group mb-4 w-100" *ngIf="!currentPuzzle">
            <button class="btn" [class.btn-dark]="selectedDifficulty === ''"
              [class.btn-outline-dark]="selectedDifficulty !== ''" (click)="loadPuzzles('')">Tots</button>
            <button class="btn" [class.btn-success]="selectedDifficulty === 'beginner'"
              [class.btn-outline-success]="selectedDifficulty !== 'beginner'" (click)="loadPuzzles('beginner')">Principiant</button>
            <button class="btn" [class.btn-warning]="selectedDifficulty === 'intermediate'"
              [class.btn-outline-warning]="selectedDifficulty !== 'intermediate'" (click)="loadPuzzles('intermediate')">Intermedi</button>
            <button class="btn" [class.btn-danger]="selectedDifficulty === 'advanced'"
              [class.btn-outline-danger]="selectedDifficulty !== 'advanced'" (click)="loadPuzzles('advanced')">Avançat</button>
            <button class="btn" [class.btn-dark]="selectedDifficulty === 'expert'"
              [class.btn-outline-dark]="selectedDifficulty !== 'expert'" (click)="loadPuzzles('expert')">Expert</button>
          </div>

          <!-- Llista de puzzles -->
          <div *ngIf="!currentPuzzle && puzzles.length > 0">
            <div class="list-group">
              <button *ngFor="let p of puzzles"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                (click)="startPuzzle(p)">
                <div>
                  <strong>{{ p.title }}</strong>
                  <span class="ms-2 badge"
                    [class.bg-success]="p.difficulty === 'beginner'"
                    [class.bg-warning]="p.difficulty === 'intermediate'"
                    [class.bg-danger]="p.difficulty === 'advanced'"
                    [class.bg-dark]="p.difficulty === 'expert'">
                    {{ p.difficulty }}
                  </span>
                  <small class="text-muted ms-2">{{ p.theme_tag }}</small>
                </div>
                <span class="badge bg-secondary">⭐ {{ p.rating }}</span>
              </button>
            </div>
          </div>

          <!-- Tauler del puzzle -->
          <div *ngIf="currentPuzzle">
            <div class="card mb-3">
              <div class="card-body">
                <div class="d-flex justify-content-between">
                  <div>
                    <h5>{{ currentPuzzle.title }}</h5>
                    <span class="badge bg-secondary">{{ currentPuzzle.theme_tag }}</span>
                    <span class="ms-2 text-muted">⭐ {{ currentPuzzle.rating }}</span>
                  </div>
                  <div class="text-muted">
                    {{ turnLabel }} ha de jugar
                  </div>
                </div>
              </div>
            </div>

            <!-- Tauler -->
            <div class="board-container mb-3">
              <div *ngFor="let row of boardRows" class="board-row">
                <div *ngFor="let col of boardCols; let ci = index"
                  class="square"
                  [class.light]="isLight(row, ci)"
                  [class.dark]="!isLight(row, ci)"
                  [class.selected]="isSelected(row, ci)"
                  [class.possible]="isPossible(row, ci)"
                  [class.last-move]="isLastMove(row, ci)"
                  (click)="onSquareClick(row, ci)">
                  <span class="piece" *ngIf="getPiece(row, ci)">{{ getPieceSymbol(getPiece(row, ci)!) }}</span>
                </div>
              </div>
            </div>

            <!-- Resultat -->
            <div *ngIf="result" class="alert"
              [class.alert-success]="result === 'correct'"
              [class.alert-danger]="result === 'incorrect'">
              <strong>{{ result === 'correct' ? '✅ Correcte!' : '❌ Incorrecte' }}</strong>
              <div *ngIf="result === 'incorrect'" class="mt-1">
                <small>Solució: {{ currentPuzzle.solution }}</small>
              </div>
            </div>

            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary" (click)="backToList()">← Tornar</button>
              <button class="btn btn-primary" *ngIf="result" (click)="nextPuzzle()">Següent →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .board-container { display: inline-block; }
    .board-row { display: flex; }
    .square {
      width: 60px; height: 60px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; position: relative;
    }
    .light { background-color: #f0d9b5; }
    .dark { background-color: #b58863; }
    .selected { background-color: #7fc97f !important; }
    .possible::after {
      content: ''; position: absolute;
      width: 20px; height: 20px;
      background: rgba(0,0,0,0.2); border-radius: 50%;
    }
    .last-move { background-color: #cdd26a !important; }
    .piece { font-size: 2.2rem; line-height: 1; cursor: pointer; user-select: none; }
  `]
})
export class Puzzles implements OnInit {
  private gameService = inject(GameService);

  puzzles: any[] = [];
  currentPuzzle: any = null;
  currentIndex = 0;
  selectedDifficulty = '';
  result: string | null = null;
  startTime = 0;

  chess = new Chess();
  playerColor = 'white';
  selectedSq: string | null = null;
  possibleMoves: string[] = [];
  lastMove: { from: string; to: string } | null = null;
  userMoves: string[] = [];

  boardRows = [0,1,2,3,4,5,6,7];
  boardCols = [0,1,2,3,4,5,6,7];

  pieceSymbols: Record<string, string> = {
    'wK':'♔','wQ':'♕','wR':'♖','wB':'♗','wN':'♘','wP':'♙',
    'bK':'♚','bQ':'♛','bR':'♜','bB':'♝','bN':'♞','bP':'♟',
  };

  get turnLabel(): string {
    return this.chess.turn() === 'w' ? '⬜ Blanques' : '⬛ Negres';
  }

  ngOnInit(): void {
    this.loadPuzzles('');
  }

  loadPuzzles(difficulty: string): void {
    this.selectedDifficulty = difficulty;
    this.currentPuzzle = null;
    this.gameService.getPuzzles(difficulty || undefined).subscribe({
      next: (res) => this.puzzles = res.data || [],
      error: () => {}
    });
  }

  startPuzzle(puzzle: any): void {
    this.currentPuzzle = puzzle;
    this.result = null;
    this.userMoves = [];
    this.lastMove = null;
    this.selectedSq = null;
    this.possibleMoves = [];
    this.chess = new Chess(puzzle.fen);
    this.playerColor = this.chess.turn() === 'w' ? 'white' : 'black';
    this.startTime = Date.now();
  }

  backToList(): void {
    this.currentPuzzle = null;
    this.result = null;
  }

  nextPuzzle(): void {
    this.currentIndex = (this.currentIndex + 1) % this.puzzles.length;
    this.startPuzzle(this.puzzles[this.currentIndex]);
  }

  getSquareName(ri: number, ci: number): string {
    const files = ['a','b','c','d','e','f','g','h'];
    const rank  = this.playerColor === 'white' ? 8 - ri : ri + 1;
    const file  = this.playerColor === 'white' ? files[ci] : files[7-ci];
    return `${file}${rank}`;
  }

  getPiece(ri: number, ci: number): string | null {
    const sq = this.getSquareName(ri, ci);
    const piece = this.chess.get(sq as any);
    if (!piece) return null;
    return `${piece.color}${piece.type.toUpperCase()}`;
  }

  getPieceSymbol(code: string): string {
    return this.pieceSymbols[code] || '';
  }

  isLight(ri: number, ci: number): boolean { return (ri + ci) % 2 === 0; }
  isSelected(ri: number, ci: number): boolean { return this.getSquareName(ri, ci) === this.selectedSq; }
  isPossible(ri: number, ci: number): boolean { return this.possibleMoves.includes(this.getSquareName(ri, ci)); }
  isLastMove(ri: number, ci: number): boolean {
    if (!this.lastMove) return false;
    const sq = this.getSquareName(ri, ci);
    return sq === this.lastMove.from || sq === this.lastMove.to;
  }

  onSquareClick(ri: number, ci: number): void {
    if (this.result) return;
    const sq = this.getSquareName(ri, ci);
    const piece = this.chess.get(sq as any);

    if (this.selectedSq) {
      if (this.possibleMoves.includes(sq)) {
        this.doMove(this.selectedSq, sq);
      } else if (piece && piece.color === this.chess.turn()) {
        this.selectedSq = sq;
        this.possibleMoves = this.chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to);
      } else {
        this.selectedSq = null;
        this.possibleMoves = [];
      }
    } else {
      if (piece && piece.color === this.chess.turn()) {
        this.selectedSq = sq;
        this.possibleMoves = this.chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to);
      }
    }
  }

  doMove(from: string, to: string): void {
    const move = this.chess.move({ from: from as any, to: to as any, promotion: 'q' });
    if (!move) return;

    this.selectedSq = null;
    this.possibleMoves = [];
    this.lastMove = { from, to };
    this.userMoves.push(from + to);

    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    const movesStr = this.userMoves.join(' ');

    this.gameService.attemptPuzzle(this.currentPuzzle.id, movesStr, timeSpent).subscribe({
      next: (res) => {
        this.result = res.data.solved ? 'correct' : 'incorrect';
      },
      error: () => { this.result = 'incorrect'; }
    });
  }
}
