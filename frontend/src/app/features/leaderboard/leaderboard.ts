import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameService } from '../../core/services/game';
import { AuthService } from '../../core/services/auth';

interface LeaderboardEntry {
  id: number;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  avatar: string | null;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: flex; min-height: 100vh; background: #242423; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .page { max-width: 760px; margin: 0 auto; padding: 48px 24px; width: 100%; }

    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
    .header-left { display: flex; flex-direction: column; gap: 4px; }
    .back-link {
      display: inline-flex; align-items: center; gap: 6px; color: #5a6a7a;
      text-decoration: none; font-size: 13px; font-weight: 500; transition: color .15s;
    }
    .back-link:hover { color: #81b64c; }
    .title { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .subtitle { font-size: 14px; color: #4a5a6a; margin-top: 2px; }

    .leaderboard-card {
      background: #2c2b29; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden;
    }

    .lb-header-row {
      display: grid; grid-template-columns: 48px 1fr 90px 100px 80px;
      padding: 10px 20px; background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.07);
      font-size: 11px; font-weight: 700; color: #3a4a5a; text-transform: uppercase; letter-spacing: 0.7px;
    }
    .lb-header-row span { text-align: right; }
    .lb-header-row span:first-child, .lb-header-row span:nth-child(2) { text-align: left; }

    .lb-row {
      display: grid; grid-template-columns: 48px 1fr 90px 100px 80px;
      padding: 12px 20px; align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.04); transition: background .15s;
    }
    .lb-row:last-child { border-bottom: none; }
    .lb-row:hover { background: rgba(255,255,255,0.03); }
    .lb-row.me { background: rgba(129,182,76,0.06); }
    .lb-row.me:hover { background: rgba(129,182,76,0.1); }

    .rank {
      font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: flex-start;
    }
    .rank-1 { color: #ffd700; font-size: 18px; }
    .rank-2 { color: #c0c0c0; font-size: 18px; }
    .rank-3 { color: #cd7f32; font-size: 18px; }
    .rank-n { color: #3a4a5a; font-size: 13px; }

    .player-cell { display: flex; align-items: center; gap: 10px; }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%; background: #81b64c;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .username { font-size: 14px; font-weight: 600; color: #e8e8e8; }
    .you-badge {
      font-size: 10px; font-weight: 700; color: #81b64c; background: rgba(129,182,76,0.15);
      border-radius: 4px; padding: 1px 5px; margin-left: 4px;
    }

    .elo-cell { text-align: right; font-size: 15px; font-weight: 700; color: #81b64c; }

    .record-cell {
      text-align: right; font-size: 13px; color: #5a6a7a;
      display: flex; align-items: center; justify-content: flex-end; gap: 5px;
    }
    .wins   { color: #81b64c; font-weight: 600; }
    .losses { color: #e05555; font-weight: 600; }
    .draws  { color: #6a7a8a; }

    .winrate-cell {
      text-align: right; font-size: 13px; font-weight: 600; color: #8a9ab0;
    }

    .loading { text-align: center; padding: 48px; color: #4a5a6a; font-size: 15px; }
    .error   { text-align: center; padding: 32px; color: #ff8080; font-size: 14px; }
    .empty   { text-align: center; padding: 48px; color: #3a4a5a; font-size: 15px; }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .page { padding: 28px 12px; }
      .title { font-size: 22px; }
      .leaderboard-card { overflow-x: auto; }
      .lb-header-row, .lb-row { min-width: 460px; }
    }
  `],
  template: `
<div class="page">
  <div class="header">
    <div class="header-left">
      <a class="back-link" routerLink="/lobby">← Tornar al lobby</a>
      <div class="title">&#127942; Rànquing Global</div>
      <div class="subtitle">Top jugadors per ELO</div>
    </div>
  </div>

  <div class="leaderboard-card">
    <div class="lb-header-row">
      <span>#</span>
      <span>Jugador</span>
      <span style="text-align:right">ELO</span>
      <span>Victòries</span>
      <span>% Vic.</span>
    </div>

    <div *ngIf="loading" class="loading">Carregant...</div>
    <div *ngIf="error && !loading" class="error">{{ error }}</div>
    <div *ngIf="!loading && !error && players.length === 0" class="empty">Cap jugador trobat</div>

    <div *ngFor="let p of players; let i = index"
         class="lb-row"
         [class.me]="p.id === myId">

      <div class="rank">
        <span *ngIf="i === 0" class="rank-1">🥇</span>
        <span *ngIf="i === 1" class="rank-2">🥈</span>
        <span *ngIf="i === 2" class="rank-3">🥉</span>
        <span *ngIf="i > 2" class="rank-n">{{ i + 1 }}</span>
      </div>

      <div class="player-cell">
        <div class="avatar">
          <img *ngIf="p.avatar" [src]="p.avatar" alt=""/>
          <span *ngIf="!p.avatar">{{ p.username[0].toUpperCase() }}</span>
        </div>
        <span class="username">{{ p.username }}</span>
        <span class="you-badge" *ngIf="p.id === myId">Tu</span>
      </div>

      <div class="elo-cell">{{ p.elo }}</div>

      <div class="record-cell">
        <span class="wins">{{ p.wins }}V</span>
        <span>/</span>
        <span class="losses">{{ p.losses }}D</span>
        <span>/</span>
        <span class="draws">{{ p.draws }}T</span>
      </div>

      <div class="winrate-cell">{{ winRate(p) }}%</div>
    </div>
  </div>
</div>
  `
})
export class Leaderboard implements OnInit {
  private gameService = inject(GameService);
  private auth        = inject(AuthService);

  players: LeaderboardEntry[] = [];
  loading = true;
  error   = '';
  myId    = this.auth.currentUser?.id;

  ngOnInit(): void {
    this.gameService.getLeaderboard(50).subscribe({
      next:  (res) => { this.players = res.data || []; this.loading = false; },
      error: ()    => { this.error = 'Error carregant el rànquing'; this.loading = false; }
    });
  }

  winRate(p: LeaderboardEntry): string {
    const total = p.wins + p.losses + p.draws;
    if (!total) return '0';
    return ((p.wins / total) * 100).toFixed(0);
  }
}
