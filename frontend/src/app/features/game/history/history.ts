import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameService } from '../../../core/services/game';

interface HistoryGame {
  id: number;
  type: 'pvp' | 'bot';
  opponent: string;
  color: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  end_reason: string | null;
  time_control: number | null;
  date: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: flex; min-height: 100vh; background: #242423; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .page { max-width: 760px; margin: 0 auto; padding: 48px 24px; width: 100%; }
    .header-left { display: flex; flex-direction: column; gap: 4px; margin-bottom: 24px; }
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #5a6a7a; text-decoration: none; font-size: 13px; font-weight: 500; transition: color .15s; }
    .back-link:hover { color: #81b64c; }
    .title { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .subtitle { font-size: 14px; color: #4a5a6a; margin-top: 2px; }

    .filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
    .filter-btn { padding: 7px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #1a1a1a; color: #6a7a8a; font-size: 13px; font-family: inherit; font-weight: 600; cursor: pointer; transition: all .15s; }
    .filter-btn:hover { border-color: rgba(255,255,255,0.2); color: #e8e8e8; }
    .filter-btn.active { background: #81b64c; border-color: #81b64c; color: #fff; }

    .games-card { background: #2c2b29; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
    .game-row { display: grid; grid-template-columns: 60px 1fr 110px 90px; padding: 13px 18px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .game-row:last-child { border-bottom: none; }
    .game-row:hover { background: rgba(255,255,255,0.03); }

    .res-badge { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
    .res-win  { background: rgba(129,182,76,0.2);  color: #81c784; }
    .res-loss { background: rgba(220,60,60,0.18);  color: #ef9a9a; }
    .res-draw { background: rgba(255,255,255,0.08); color: #bbb; }

    .opp { display: flex; flex-direction: column; gap: 2px; }
    .opp-name { font-size: 14px; font-weight: 700; color: #fff; }
    .opp-meta { font-size: 12px; color: #5a6a7a; }
    .tag { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 1px 6px; border-radius: 4px; margin-right: 5px; }
    .tag-pvp { background: rgba(80,140,220,0.2); color: #8ab4f0; }
    .tag-bot { background: rgba(180,120,220,0.2); color: #c89af0; }

    .reason-cell { font-size: 12px; color: #6a7a8a; text-align: right; }
    .date-cell { font-size: 12px; color: #5a6a7a; text-align: right; }

    .loading, .empty { text-align: center; padding: 48px; color: #4a5a6a; font-size: 15px; }
    .summary { display: flex; gap: 18px; margin-bottom: 16px; flex-wrap: wrap; }
    .sum-item { font-size: 13px; color: #8a9ab0; }
    .sum-item b { color: #fff; font-size: 15px; }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .page { padding: 28px 12px; }
      .title { font-size: 22px; }
      .games-card { overflow-x: auto; }
      .game-row { min-width: 430px; }
    }
  `],
  template: `
<div class="page">
  <div class="header-left">
    <a class="back-link" routerLink="/lobby">← Tornar al lobby</a>
    <div class="title">📜 Historial de partides</div>
    <div class="subtitle">Totes les teves partides acabades</div>
  </div>

  <div class="summary" *ngIf="!loading && allGames.length">
    <span class="sum-item"><b>{{ allGames.length }}</b> partides</span>
    <span class="sum-item"><b>{{ countBy('win') }}</b> victòries</span>
    <span class="sum-item"><b>{{ countBy('loss') }}</b> derrotes</span>
    <span class="sum-item"><b>{{ countBy('draw') }}</b> taules</span>
  </div>

  <div class="filters">
    <button class="filter-btn" [class.active]="typeFilter===''"    (click)="typeFilter=''">Totes</button>
    <button class="filter-btn" [class.active]="typeFilter==='pvp'" (click)="typeFilter='pvp'">PvP</button>
    <button class="filter-btn" [class.active]="typeFilter==='bot'" (click)="typeFilter='bot'">Bot</button>
    <span style="width:12px"></span>
    <button class="filter-btn" [class.active]="resultFilter===''"     (click)="resultFilter=''">Tots resultats</button>
    <button class="filter-btn" [class.active]="resultFilter==='win'"  (click)="resultFilter='win'">Victòries</button>
    <button class="filter-btn" [class.active]="resultFilter==='loss'" (click)="resultFilter='loss'">Derrotes</button>
    <button class="filter-btn" [class.active]="resultFilter==='draw'" (click)="resultFilter='draw'">Taules</button>
  </div>

  <div class="games-card">
    <div *ngIf="loading" class="loading">Carregant...</div>
    <div *ngIf="!loading && filtered.length === 0" class="empty">Cap partida trobada</div>

    <div *ngFor="let g of filtered" class="game-row">
      <div class="res-badge"
           [class.res-win]="g.result==='win'"
           [class.res-loss]="g.result==='loss'"
           [class.res-draw]="g.result==='draw'">
        {{ g.result==='win' ? 'V' : g.result==='loss' ? 'D' : 'T' }}
      </div>
      <div class="opp">
        <span class="opp-name">{{ g.opponent }}</span>
        <span class="opp-meta">
          <span class="tag" [class.tag-pvp]="g.type==='pvp'" [class.tag-bot]="g.type==='bot'">{{ g.type }}</span>
          {{ g.color === 'white' ? 'Blanques' : 'Negres' }}
          <span *ngIf="g.time_control"> · {{ g.time_control / 60 }} min</span>
        </span>
      </div>
      <div class="reason-cell">{{ reasonLabel(g.end_reason) }}</div>
      <div class="date-cell">{{ formatDate(g.date) }}</div>
    </div>
  </div>
</div>
  `
})
export class History implements OnInit {
  private gameService = inject(GameService);

  allGames: HistoryGame[] = [];
  loading = true;
  typeFilter   = '';
  resultFilter = '';

  ngOnInit(): void {
    this.gameService.getHistory().subscribe({
      next:  (res) => { this.allGames = res.data || []; this.loading = false; },
      error: ()    => { this.loading = false; }
    });
  }

  get filtered(): HistoryGame[] {
    return this.allGames.filter(g =>
      (!this.typeFilter   || g.type === this.typeFilter) &&
      (!this.resultFilter || g.result === this.resultFilter)
    );
  }

  countBy(result: string): number {
    return this.allGames.filter(g => g.result === result).length;
  }

  reasonLabel(r: string | null): string {
    const map: Record<string, string> = {
      checkmate: 'Escac i mat', resignation: 'Rendició', timeout: 'Temps',
      stalemate: 'Ofegat', agreement: 'Acord', repetition: 'Repetició',
      insufficient: 'Material insuf.', draw: 'Taules',
    };
    return r ? (map[r] || r) : '—';
  }

  formatDate(d: string): string {
    if (!d) return '';
    const date = new Date(d.replace(' ', 'T'));
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('ca-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
