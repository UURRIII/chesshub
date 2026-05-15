import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { GameService } from '../../../core/services/game';
import { AuthService } from '../../../core/services/auth';

// ── Shared ELO chart drawing function (exported for reuse in profile page) ────
export function drawEloLineChart(canvas: HTMLCanvasElement, history: any[]): void {
  const dpr = window.devicePixelRatio || 1;
  const w   = canvas.offsetWidth  || 600;
  const h   = 120;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const eloValues = history.map((d: any) => Number(d.elo_after));
  if (eloValues.length < 2) return;

  const minE = Math.min(...eloValues) - 30;
  const maxE = Math.max(...eloValues) + 30;
  const pad  = { top: 12, right: 20, bottom: 20, left: 44 };
  const cw   = w - pad.left - pad.right;
  const ch   = h - pad.top  - pad.bottom;

  const xOf = (i: number) => pad.left + (i / (eloValues.length - 1)) * cw;
  const yOf = (e: number) => pad.top  + ch - ((e - minE) / (maxE - minE || 1)) * ch;

  ctx.clearRect(0, 0, w, h);

  // Grid lines + Y labels
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y     = pad.top + (ch / 3) * i;
    const label = Math.round(maxE - ((maxE - minE) / 3) * i);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#4a5a6a'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(String(label), pad.left - 6, y + 4);
  }

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
  grad.addColorStop(0, 'rgba(129,182,76,0.28)');
  grad.addColorStop(1, 'rgba(129,182,76,0.00)');
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(eloValues[0]));
  for (let i = 1; i < eloValues.length; i++) ctx.lineTo(xOf(i), yOf(eloValues[i]));
  ctx.lineTo(xOf(eloValues.length - 1), h - pad.bottom);
  ctx.lineTo(xOf(0), h - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(eloValues[0]));
  for (let i = 1; i < eloValues.length; i++) ctx.lineTo(xOf(i), yOf(eloValues[i]));
  ctx.strokeStyle = '#81b64c'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  // Dots (only if few data points)
  if (eloValues.length <= 25) {
    eloValues.forEach((e, i) => {
      ctx.beginPath();
      ctx.arc(xOf(i), yOf(e), 3, 0, Math.PI * 2);
      ctx.fillStyle = '#81b64c'; ctx.fill();
    });
  }

  // Last ELO label
  const last = eloValues[eloValues.length - 1];
  ctx.fillStyle = '#81b64c'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(String(last), xOf(eloValues.length - 1) + 5, yOf(last) + 4);
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    :host { display: flex; min-height: 100vh; background: #242423; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* SIDEBAR */
    .sidebar { width: 72px; min-height: 100vh; background: #1a1a1a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; position: fixed; left: 0; top: 0; bottom: 0; border-right: 1px solid rgba(255,255,255,0.06); z-index: 200; transition: width .2s; }
    .sidebar:hover { width: 220px; }
    .sidebar:hover .nl { opacity: 1; width: auto; }
    .sidebar:hover .nav-item { padding: 10px 16px; justify-content: flex-start; gap: 12px; }
    .sidebar:hover .sidebar-logo { justify-content: flex-start; }
    .sidebar-logo { display: flex; align-items: center; padding: 0 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.07); width: 100%; justify-content: center; overflow: hidden; white-space: nowrap; }
    .logo-icon { width: 32px; height: 32px; background: #81b64c; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; flex-shrink: 0; }
    .sl-text { font-size: 17px; font-weight: 700; color: #fff; opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; margin-left: 10px; }
    .sidebar-nav { flex: 1; width: 100%; padding: 12px 0; display: flex; flex-direction: column; gap: 2px; }
    .nav-item { display: flex; align-items: center; gap: 0; padding: 10px 0; width: 100%; justify-content: center; color: #8a9ab0; text-decoration: none; font-size: 14px; font-weight: 600; transition: background .15s, color .15s; border: none; background: transparent; font-family: inherit; overflow: hidden; white-space: nowrap; }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .ni { font-size: 20px; flex-shrink: 0; width: 24px; text-align: center; }
    .nl { opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; }

    /* MAIN */
    .main { margin-left: 72px; flex: 1; padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .inner { width: 100%; max-width: 720px; display: flex; flex-direction: column; gap: 16px; }

    .back-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #9aaaba; text-decoration: none; font-size: 14px; font-weight: 600; transition: all .15s; align-self: flex-start; }
    .back-btn:hover { border-color: rgba(255,255,255,0.25); color: #fff; }

    /* CARDS */
    .pcard { background: #2c2b29; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #5a6a7a; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; }

    /* USER HEAD */
    .user-head { display: flex; align-items: center; gap: 20px; }
    .avatar-img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(129,182,76,0.4); flex-shrink: 0; }
    .avatar-placeholder { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; color: #fff; border: 3px solid rgba(129,182,76,0.4); flex-shrink: 0; }
    .user-info { flex: 1; }
    .user-name { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.4px; }
    .user-bio { font-size: 13px; color: #6a7a8a; margin-top: 6px; font-style: italic; }
    .elo-block { text-align: center; }
    .elo-num { font-size: 36px; font-weight: 700; color: #81b64c; letter-spacing: -1px; }
    .elo-lbl { font-size: 12px; color: #5a6a7a; font-weight: 600; }

    /* STATS */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .stat-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; }
    .stat-num { font-size: 26px; font-weight: 700; line-height: 1; }
    .stat-lbl { font-size: 12px; color: #5a6a7a; margin-top: 4px; }
    .c-green { color: #81b64c; } .c-red { color: #e05555; } .c-yellow { color: #f0b429; } .c-white { color: #e8e8e8; }

    /* CHART */
    canvas { width: 100%; height: 120px; display: block; background: #1a1a1a; border-radius: 8px; }

    /* GAME LIST */
    .game-list { display: flex; flex-direction: column; gap: 6px; }
    .game-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; }
    .result-badge { padding: 3px 10px; border-radius: 5px; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .badge-win { background: rgba(129,182,76,0.2); color: #81b64c; }
    .badge-loss { background: rgba(220,60,60,0.2); color: #e05555; }
    .badge-draw { background: rgba(240,180,40,0.2); color: #f0b429; }
    .game-meta { font-size: 13px; color: #5a6a7a; margin-left: 12px; flex: 1; }
    .game-date { font-size: 12px; color: #3a4a5a; }

    .loading { text-align: center; padding: 60px; color: #5a6a7a; font-size: 16px; }
    .empty-msg { text-align: center; padding: 24px; color: #3a4a5a; font-size: 14px; }

    @media (max-width: 600px) {
      .main { padding: 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .user-name { font-size: 20px; }
    }
  `],
  template: `
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">&#9817;</div>
    <span class="sl-text">ChessHub</span>
  </div>
  <nav class="sidebar-nav">
    <a routerLink="/lobby" class="nav-item"><span class="ni">&#9816;</span><span class="nl">Jugar</span></a>
    <a routerLink="/puzzles" class="nav-item"><span class="ni">&#129513;</span><span class="nl">Puzzles</span></a>
    <a routerLink="/leaderboard" class="nav-item"><span class="ni">&#127942;</span><span class="nl">Rànquing</span></a>
    <a routerLink="/profile" class="nav-item"><span class="ni">&#128100;</span><span class="nl">El meu perfil</span></a>
  </nav>
</div>

<div class="main">
  <div class="inner">

    <div *ngIf="loading" class="loading pcard">Carregant perfil...</div>

    <ng-container *ngIf="!loading && userData">
      <a routerLink="/leaderboard" class="back-btn">← Tornar al rànquing</a>

      <!-- User Card -->
      <div class="pcard">
        <div class="user-head">
          <img *ngIf="userData.profile?.avatar" [src]="userData.profile.avatar" class="avatar-img" alt="avatar"/>
          <div *ngIf="!userData.profile?.avatar" class="avatar-placeholder" [style.background]="avatarColor">
            {{ userData.user?.username?.charAt(0)?.toUpperCase() }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ userData.user?.username }}</div>
            <div class="user-bio" *ngIf="userData.profile?.bio">"{{ userData.profile.bio }}"</div>
          </div>
          <div class="elo-block">
            <div class="elo-num">{{ userData.profile?.elo ?? 1200 }}</div>
            <div class="elo-lbl">ELO</div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="pcard" *ngIf="userData.profile">
        <div class="section-title">Estadístiques</div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-num c-green">{{ userData.profile.wins }}</div><div class="stat-lbl">Victòries</div></div>
          <div class="stat-card"><div class="stat-num c-red">{{ userData.profile.losses }}</div><div class="stat-lbl">Derrotes</div></div>
          <div class="stat-card"><div class="stat-num c-yellow">{{ userData.profile.draws }}</div><div class="stat-lbl">Taules</div></div>
          <div class="stat-card"><div class="stat-num c-white">{{ winRate }}%</div><div class="stat-lbl">% Victòria</div></div>
        </div>
      </div>

      <!-- ELO Chart -->
      <div class="pcard" *ngIf="eloHistory.length > 1">
        <div class="section-title">Evolució ELO</div>
        <canvas id="pubEloChart"></canvas>
      </div>

    </ng-container>

    <div *ngIf="!loading && !userData" class="pcard">
      <div class="empty-msg">Usuari no trobat.</div>
    </div>

  </div>
</div>
  `
})
export class PublicProfile implements OnInit {
  private route       = inject(ActivatedRoute);
  private gameService = inject(GameService);

  loading        = true;
  userData: any  = null;
  eloHistory: any[] = [];
  profileUserId  = 0;
  avatarColors   = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c'];
  avatarColor    = '#3498db';

  get winRate(): number {
    const p = this.userData?.profile;
    if (!p) return 0;
    const total = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
    return total > 0 ? Math.round(((p.wins || 0) / total) * 100) : 0;
  }

  ngOnInit(): void {
    this.profileUserId = +this.route.snapshot.paramMap.get('id')!;
    this.gameService.getUserProfile(this.profileUserId).subscribe({
      next: (res: any) => {
        this.userData = res.data;
        this.loading  = false;
        const name    = this.userData?.user?.username || '';
        if (name) this.avatarColor = this.avatarColors[name.charCodeAt(0) % this.avatarColors.length];
        this.loadEloHistory();
      },
      error: () => { this.loading = false; }
    });
  }

  private loadEloHistory(): void {
    this.gameService.getEloHistory(this.profileUserId).subscribe({
      next: (res: any) => {
        this.eloHistory = res.data || [];
        if (this.eloHistory.length > 1) setTimeout(() => this.drawChart(), 100);
      },
      error: () => {}
    });
  }

  private drawChart(): void {
    const canvas = document.getElementById('pubEloChart') as HTMLCanvasElement;
    if (canvas) drawEloLineChart(canvas, this.eloHistory);
  }
}
