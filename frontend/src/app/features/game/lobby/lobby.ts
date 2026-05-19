import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../../core/services/game';
import { AuthService } from '../../../core/services/auth';
import { SocketService } from '../../../core/services/socket';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    :host { display: flex; min-height: 100vh; background: #242423; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* SIDEBAR */
    .sidebar {
      width: 72px; min-height: 100vh; background: #1a1a1a;
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 0; position: fixed; left: 0; top: 0; bottom: 0;
      border-right: 1px solid rgba(255,255,255,0.06); z-index: 200;
      transition: width .2s ease;
    }
    .sidebar:hover { width: 220px; }
    .sidebar:hover .nav-label { opacity: 1; width: auto; }
    .sidebar:hover .sidebar-logo-text { opacity: 1; width: auto; margin-left: 10px; }
    .sidebar:hover .sidebar-footer { align-items: flex-start; padding: 0 16px 16px; width: 100%; }
    .sidebar:hover .footer-user { flex-direction: row; gap: 10px; }
    .sidebar:hover .footer-username { opacity: 1; width: auto; }

    .sidebar-logo {
      display: flex; align-items: center; padding: 0 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.07); width: 100%;
      justify-content: center; overflow: hidden; white-space: nowrap;
    }
    .sidebar:hover .sidebar-logo { justify-content: flex-start; }
    .logo-icon {
      width: 36px; height: 36px; background: #81b64c; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px;
    }
    .sidebar-logo-text {
      font-size: 17px; font-weight: 700; color: #fff; opacity: 0; width: 0; overflow: hidden;
      transition: opacity .2s, width .2s;
    }

    /* NAV */
    .sidebar-nav { flex: 1; width: 100%; padding: 12px 0; display: flex; flex-direction: column; gap: 2px; }
    .nav-item {
      display: flex; align-items: center; gap: 0; padding: 10px 0;
      width: 100%; justify-content: center;
      color: #8a9ab0; text-decoration: none; font-size: 14px; font-weight: 600;
      border-radius: 0; cursor: pointer; transition: background .15s, color .15s;
      border: none; background: transparent; font-family: inherit; overflow: hidden; white-space: nowrap;
    }
    .sidebar:hover .nav-item { padding: 10px 16px; justify-content: flex-start; gap: 12px; }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .nav-item.active { color: #81b64c; background: rgba(129,182,76,0.1); }
    .nav-item.active:hover { background: rgba(129,182,76,0.15); }
    .nav-icon { font-size: 20px; flex-shrink: 0; width: 24px; text-align: center; }
    .nav-label { opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; }
    .nav-sep { height: 1px; background: rgba(255,255,255,0.07); margin: 8px 16px; }

    /* SIDEBAR FOOTER */
    .sidebar-footer {
      width: 100%; padding: 0 0 16px; display: flex; flex-direction: column;
      align-items: center; gap: 8px;
    }
    .footer-user { display: flex; flex-direction: column; align-items: center; gap: 0; }
    .footer-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: #81b64c;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .footer-username { font-size: 13px; font-weight: 600; color: #9aaaba; opacity: 0; width: 0; overflow: hidden; transition: opacity .2s; }
    .btn-logout {
      display: flex; align-items: center; justify-content: center; gap: 0;
      width: 40px; height: 40px; border-radius: 8px; border: none;
      background: transparent; color: #5a6a7a; cursor: pointer; transition: all .15s;
      font-size: 18px;
    }
    .sidebar:hover .btn-logout { width: 100%; justify-content: flex-start; gap: 10px; padding: 8px 12px; height: auto; border: 1px solid rgba(255,255,255,0.09); font-size: 14px; font-weight: 500; }
    .btn-logout:hover { background: rgba(220,60,60,0.12); color: #ff7070; border-color: rgba(220,60,60,0.2) !important; }
    .logout-label { opacity: 0; width: 0; overflow: hidden; transition: opacity .2s; font-size: 14px; }
    .sidebar:hover .logout-label { opacity: 1; width: auto; }

    /* MAIN */
    .main-content { margin-left: 72px; flex: 1; min-height: 100vh; display: flex; flex-direction: column; }

    /* TOPBAR */
    .topbar {
      padding: 20px 32px 0; display: flex; align-items: center; justify-content: space-between;
    }
    .greeting-label { font-size: 11px; color: #4a5a6a; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .greeting-name { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px; margin-top: 2px; }
    .topbar-right { display: flex; align-items: center; gap: 10px; }
    .btn-leaderboard {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.2);
      border-radius: 8px; color: #d4a900; font-size: 13px; font-family: inherit;
      font-weight: 600; cursor: pointer; text-decoration: none; transition: all .15s;
    }
    .btn-leaderboard:hover { background: rgba(255,215,0,0.15); border-color: rgba(255,215,0,0.35); }

    /* CONTENT AREA */
    .content-area { padding: 24px 32px 48px; display: flex; flex-direction: column; gap: 20px; flex: 1; }

    /* QUICK PLAY */
    .quick-play-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    }
    @media (max-width: 760px) { .quick-play-grid { grid-template-columns: 1fr; } }

    /* MODE CARDS */
    .mode-card {
      background: #2c2b29; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 24px;
      display: flex; flex-direction: column; gap: 18px;
      transition: border-color .2s, background .2s;
    }
    .mode-card:hover { border-color: rgba(129,182,76,0.25); background: #302f2d; }

    .card-head { display: flex; align-items: center; gap: 12px; }
    .card-icon {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }
    .human-icon { background: rgba(129,182,76,0.15); }
    .bot-icon { background: rgba(90,150,230,0.15); }
    .card-title { font-size: 16px; font-weight: 700; color: #fff; }
    .card-sub { font-size: 12px; color: #4a5a6a; margin-top: 2px; }

    /* FIELDS */
    .field { display: flex; flex-direction: column; gap: 7px; }
    .field-label {
      font-size: 11px; font-weight: 600; color: #5a6a7a;
      text-transform: uppercase; letter-spacing: 0.7px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .ch-select {
      width: 100%; padding: 9px 12px; background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
      color: #e8e8e8; font-size: 14px; font-family: inherit; font-weight: 500;
      appearance: none; cursor: pointer; outline: none; transition: border-color .15s;
    }
    .ch-select:hover { border-color: rgba(255,255,255,0.2); }
    .ch-select:focus { border-color: #81b64c; }

    /* TIME PILLS */
    .time-category { font-size: 10px; font-weight: 700; color: #3a4a5a; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
    .time-pills-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 6px; }
    .t-pill {
      padding: 7px 4px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.09);
      border-radius: 7px; color: #6a7a8a; font-size: 12px; font-family: inherit;
      font-weight: 600; cursor: pointer; transition: all .15s; text-align: center; line-height: 1.3;
    }
    .t-pill small { display: block; font-size: 10px; font-weight: 400; color: #3a4a5a; }
    .t-pill:hover { border-color: rgba(129,182,76,0.4); color: #a0c870; }
    .t-pill:hover small { color: #6a9a4a; }
    .t-pill.active { background: rgba(129,182,76,0.15); border-color: #81b64c; color: #81b64c; }
    .t-pill.active small { color: #6ab040; }

    /* SLIDER */
    .lvl-badge {
      min-width: 22px; height: 22px; padding: 0 5px; background: #81b64c; border-radius: 5px;
      font-size: 12px; font-weight: 700; color: #fff; display: inline-flex; align-items: center; justify-content: center;
    }
    .lvl-slider {
      -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
      border-radius: 2px; outline: none; cursor: pointer;
      background: linear-gradient(to right, #81b64c var(--pct, 21%), #111 var(--pct, 21%));
    }
    .lvl-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
      background: #81b64c; border: 3px solid #2c2b29; box-shadow: 0 0 0 1px #81b64c; cursor: pointer;
    }
    .lvl-slider::-moz-range-thumb {
      width: 16px; height: 16px; border-radius: 50%; background: #81b64c; border: 3px solid #2c2b29; cursor: pointer;
    }
    .slider-ends { display: flex; justify-content: space-between; font-size: 11px; color: #3a4a5a; }

    /* BUTTONS */
    .btn-main {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px; background: #81b64c; border: none; border-radius: 8px;
      color: #fff; font-size: 14px; font-family: inherit; font-weight: 700;
      cursor: pointer; transition: all .15s; margin-top: auto;
    }
    .btn-main:hover:not([disabled]) { background: #8ec956; transform: translateY(-1px); }
    .btn-main:active:not([disabled]) { transform: translateY(0); }
    .btn-main[disabled] { opacity: 0.5; cursor: not-allowed; }
    .btn-bot { background: #4a7fd4; }
    .btn-bot:hover:not([disabled]) { background: #5a8de0; }

    /* WAITING / ACTIVE */
    .waiting-card, .active-card {
      background: #2c2b29; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 20px 24px;
    }
    .waiting-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .waiting-title-row { display: flex; align-items: center; gap: 8px; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #81b64c; animation: blink 2s ease-in-out infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
    .waiting-title { font-size: 15px; font-weight: 700; color: #fff; }
    .btn-refresh {
      display: flex; align-items: center; gap: 5px; padding: 6px 12px;
      background: transparent; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 7px; color: #5a6a7a; font-size: 13px; font-family: inherit;
      font-weight: 500; cursor: pointer; transition: all .15s;
    }
    .btn-refresh:hover { border-color: rgba(255,255,255,0.2); color: #9aaaba; }

    .game-list { display: flex; flex-direction: column; gap: 6px; }
    .game-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px; transition: border-color .15s;
    }
    .game-row:hover { border-color: rgba(129,182,76,0.25); }
    .game-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .game-id { font-size: 13px; font-weight: 700; color: #81b64c; white-space: nowrap; }
    .game-side { font-size: 13px; color: #5a6a7a; white-space: nowrap; }
    .game-players { font-size: 13px; color: #8a9ab0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .time-chip {
      padding: 3px 9px; background: rgba(255,255,255,0.05); border-radius: 5px;
      font-size: 12px; font-weight: 600; color: #6a7a8a; margin-left: 8px; margin-right: 8px; white-space: nowrap;
    }
    .btn-join {
      padding: 6px 14px; background: rgba(129,182,76,0.13); border: 1px solid rgba(129,182,76,0.3);
      border-radius: 7px; color: #81b64c; font-size: 13px; font-family: inherit;
      font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .btn-join:hover:not([disabled]) { background: #81b64c; color: #fff; }
    .btn-join[disabled] { opacity: 0.5; cursor: not-allowed; }
    .btn-watch {
      padding: 6px 14px; background: rgba(90,150,230,0.1); border: 1px solid rgba(90,150,230,0.25);
      border-radius: 7px; color: #7aade8; font-size: 13px; font-family: inherit;
      font-weight: 600; cursor: pointer; transition: all .15s; white-space: nowrap; text-decoration: none;
    }
    .btn-watch:hover { background: rgba(90,150,230,0.2); }

    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 24px 0; gap: 8px; }
    .mini-board { display: grid; grid-template-columns: repeat(4, 20px); width: 80px; height: 80px; border-radius: 6px; overflow: hidden; opacity: 0.2; }
    .mini-sq { width: 20px; height: 20px; }
    .mini-sq.light { background: #81b64c; }
    .mini-sq:not(.light) { background: #3a4a3a; }
    .empty-text { font-size: 14px; font-weight: 600; color: #3a4a5a; margin-top: 4px; }
    .empty-sub  { font-size: 12px; color: #2a3a4a; }

    .err-banner {
      margin-top: 12px; padding: 10px 14px; background: rgba(200,60,60,0.1);
      border: 1px solid rgba(200,60,60,0.25); border-radius: 8px; color: #ff8080; font-size: 14px;
    }

    .challenge-sent-msg {
      display: flex; align-items: center; padding: 10px 14px;
      background: rgba(129,182,76,0.1); border: 1px solid rgba(129,182,76,0.25);
      border-radius: 8px; color: #81b64c; font-size: 13px; margin-top: 8px;
    }
    .challenge-declined-msg {
      padding: 10px 14px; background: rgba(220,60,60,0.1);
      border: 1px solid rgba(220,60,60,0.2); border-radius: 8px;
      color: #ff8080; font-size: 13px; margin-top: 8px;
    }
    .challenge-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .challenge-modal {
      background: #2c2b29; border: 1px solid rgba(129,182,76,0.35);
      border-radius: 18px; padding: 36px 40px; display: flex; flex-direction: column;
      align-items: center; gap: 12px; min-width: 300px;
    }
    .challenge-icon { font-size: 44px; }
    .challenge-title { font-size: 22px; font-weight: 700; color: #fff; }
    .challenge-from { font-size: 15px; color: #9aaaba; text-align: center; }
    .challenge-tc { font-size: 13px; color: #5a6a7a; }
    .challenge-actions { display: flex; gap: 14px; margin-top: 8px; }
    .btn-accept-challenge {
      padding: 13px 28px; background: #81b64c; border: none; border-radius: 9px;
      color: #fff; font-size: 15px; font-family: inherit; font-weight: 700; cursor: pointer;
      transition: background .15s;
      &:hover { background: #8ec956; }
    }
    .btn-decline-challenge {
      padding: 13px 28px; background: transparent; border: 1px solid rgba(255,255,255,0.15);
      border-radius: 9px; color: #8a9ab0; font-size: 15px; font-family: inherit;
      font-weight: 600; cursor: pointer; transition: all .15s;
      &:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
    }

    /* Avatar image in sidebar */
    .footer-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }

    /* Light theme */
    :host-context(body.light-theme) { background: #f0f0f0 !important; color: #1a1a1a !important; }
    :host-context(body.light-theme) .main-content { background: #f0f0f0; }
    :host-context(body.light-theme) .topbar { background: transparent; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .sidebar { width: 56px; }
      .main-content { margin-left: 56px; }
      .content-area { padding: 16px 12px 40px; gap: 14px; }
      .topbar { padding-left: 14px; padding-right: 14px; }
    }
  `],
  template: `
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">&#9817;</div>
    <span class="sidebar-logo-text">ChessHub</span>
  </div>
  <nav class="sidebar-nav">
    <a class="nav-item active">
      <span class="nav-icon">&#9816;</span>
      <span class="nav-label">Jugar</span>
    </a>
    <a routerLink="/puzzles" class="nav-item">
      <span class="nav-icon">&#129513;</span>
      <span class="nav-label">Puzzles</span>
    </a>
    <a routerLink="/leaderboard" class="nav-item">
      <span class="nav-icon">&#127942;</span>
      <span class="nav-label">Rànquing</span>
    </a>
    <a routerLink="/friends" class="nav-item">
      <span class="nav-icon">&#128101;</span>
      <span class="nav-label">Amics</span>
    </a>
    <a routerLink="/history" class="nav-item">
      <span class="nav-icon">&#128220;</span>
      <span class="nav-label">Historial</span>
    </a>
    <a routerLink="/admin" class="nav-item" *ngIf="user?.role==='admin'">
      <span class="nav-icon">&#9760;</span>
      <span class="nav-label">Admin</span>
    </a>
    <a routerLink="/profile" class="nav-item">
      <span class="nav-icon">&#128100;</span>
      <span class="nav-label">Perfil</span>
    </a>
    <div class="nav-sep"></div>
  </nav>
  <div class="sidebar-footer">
    <div class="footer-user">
      <div class="footer-avatar">
        <img *ngIf="avatarUrl" [src]="avatarUrl" alt="">
        <span *ngIf="!avatarUrl">{{ user?.username?.charAt(0)?.toUpperCase() }}</span>
      </div>
      <span class="footer-username">{{ user?.username }}</span>
    </div>
    <button class="btn-logout" (click)="logout()">
      <span>&#8594;</span>
      <span class="logout-label">Sortir</span>
    </button>
  </div>
</div>

<div class="main-content">
  <div class="topbar">
    <div>
      <div class="greeting-label">BENVINGUT DE NOU</div>
      <div class="greeting-name">{{ user?.username }}</div>
    </div>
    <div class="topbar-right">
      <a routerLink="/leaderboard" class="btn-leaderboard">&#127942; Rànquing global</a>
    </div>
  </div>

  <div class="content-area">
    <div class="quick-play-grid">

      <!-- PvP card -->
      <div class="mode-card">
        <div class="card-head">
          <div class="card-icon human-icon">&#9876;</div>
          <div>
            <div class="card-title">Contra humà</div>
            <div class="card-sub">Partida en temps real</div>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Color</label>
          <select class="ch-select" [(ngModel)]="pvpColor">
            <option value="random">Aleatori</option>
            <option value="white">Blanques</option>
            <option value="black">Negres</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Control de temps</label>
          <div>
            <div class="time-category">Bullet</div>
            <div class="time-pills-group">
              <button class="t-pill" [class.active]="pvpTime===60"   (click)="pvpTime=60">1 min<small>Bullet</small></button>
              <button class="t-pill" [class.active]="pvpTime===120"  (click)="pvpTime=120">2 min<small>Bullet</small></button>
            </div>
            <div class="time-category">Blitz</div>
            <div class="time-pills-group">
              <button class="t-pill" [class.active]="pvpTime===180"  (click)="pvpTime=180">3 min<small>Blitz</small></button>
              <button class="t-pill" [class.active]="pvpTime===300"  (click)="pvpTime=300">5 min<small>Blitz</small></button>
            </div>
            <div class="time-category">Rapid · Clàssic</div>
            <div class="time-pills-group">
              <button class="t-pill" [class.active]="pvpTime===600"  (click)="pvpTime=600">10 min<small>Rapid</small></button>
              <button class="t-pill" [class.active]="pvpTime===900"  (click)="pvpTime=900">15 min<small>Rapid</small></button>
              <button class="t-pill" [class.active]="pvpTime===1800" (click)="pvpTime=1800">30 min<small>Clàssic</small></button>
            </div>
          </div>
        </div>
        <button class="btn-main" (click)="createPvP()" [disabled]="loading">
          {{ loading ? 'Creant...' : 'Crear partida' }}
        </button>
      </div>

      <!-- Bot card -->
      <div class="mode-card">
        <div class="card-head">
          <div class="card-icon bot-icon">&#129302;</div>
          <div>
            <div class="card-title">Contra bot</div>
            <div class="card-sub">Stockfish · Lichess Cloud Eval</div>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Color</label>
          <select class="ch-select" [(ngModel)]="botColor">
            <option value="white">Blanques</option>
            <option value="black">Negres</option>
            <option value="random">Aleatori</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Nivell <span class="lvl-badge">{{ botLevel }}</span></label>
          <input type="range" class="lvl-slider" min="1" max="20" step="1"
                 [(ngModel)]="botLevel" [style.--pct]="((botLevel-1)/19*100)+'%'">
          <div class="slider-ends"><span>Fàcil</span><span>Expert</span></div>
        </div>
        <button class="btn-main btn-bot" (click)="createBot()" [disabled]="loading">
          {{ loading ? 'Creant...' : 'Jugar contra bot' }}
        </button>
      </div>

    </div>

    <!-- Waiting games -->
    <div class="waiting-card">
      <div class="waiting-head">
        <div class="waiting-title-row">
          <span class="live-dot"></span>
          <span class="waiting-title">Partides en espera</span>
        </div>
        <button class="btn-refresh" (click)="loadWaiting()">&#8635; Actualitzar</button>
      </div>
      <div *ngIf="waitingGames.length === 0" class="empty-state">
        <div class="mini-board">
          <div *ngFor="let sq of boardSquares" class="mini-sq" [class.light]="sq.light"></div>
        </div>
        <p class="empty-text">No hi ha partides en espera</p>
        <p class="empty-sub">Crea una partida i espera un rival</p>
      </div>
      <div class="game-list" *ngIf="waitingGames.length > 0">
        <div *ngFor="let g of waitingGames" class="game-row">
          <div class="game-info">
            <span class="game-id">#{{ g.id }}</span>
            <span class="game-side">{{ g.player_white_id ? 'Blanques ocupades' : 'Negres ocupades' }}</span>
          </div>
          <span class="time-chip">{{ g.time_control / 60 | number:'1.0-0' }} min</span>
          <button class="btn-join" (click)="joinGame(g.id)" [disabled]="loading">Unir-se</button>
        </div>
      </div>
    </div>

    <!-- Active games (spectate) -->
    <div class="active-card">
      <div class="waiting-head">
        <div class="waiting-title-row">
          <span class="live-dot" style="background:#e05555"></span>
          <span class="waiting-title">Partides en curs</span>
        </div>
        <button class="btn-refresh" (click)="loadActive()">&#8635; Actualitzar</button>
      </div>
      <div *ngIf="activeGames.length === 0" class="empty-state">
        <p class="empty-text">Cap partida activa ara mateix</p>
        <p class="empty-sub">Torna aviat per veure una partida en directe</p>
      </div>
      <div class="game-list" *ngIf="activeGames.length > 0">
        <div *ngFor="let g of activeGames" class="game-row">
          <div class="game-info">
            <span class="game-id">#{{ g.id }}</span>
            <span class="game-players">{{ g.white_username || '?' }} vs {{ g.black_username || '?' }}</span>
          </div>
          <span class="time-chip">{{ g.time_control / 60 | number:'1.0-0' }} min</span>
          <a class="btn-watch" [routerLink]="['/game', g.id]" [queryParams]="{ type: 'pvp', color: 'spectator', time: g.time_control }">
            &#128065; Veure
          </a>
        </div>
      </div>
    </div>

    <!-- Online players + challenge -->
    <div class="active-card" *ngIf="onlineUsers.length > 0">
      <div class="waiting-head">
        <div class="waiting-title-row">
          <span class="live-dot" style="background:#81b64c"></span>
          <span class="waiting-title">Jugadors en línia ({{ onlineUsers.length }})</span>
        </div>
      </div>
      <div class="game-list">
        <div *ngFor="let u of onlineUsers" class="game-row">
          <div class="game-info">
            <span class="game-players">{{ u.username }}</span>
          </div>
          <button class="btn-join" (click)="sendChallenge(u.userId)" [disabled]="challengeSent || loading">
            ⚔ Reptar
          </button>
        </div>
      </div>
    </div>

    <div class="challenge-sent-msg" *ngIf="challengeSent">
      ⏳ Esperant resposta del repte...
      <button (click)="challengeSent=false" style="margin-left:8px;background:transparent;border:none;color:#666;cursor:pointer;font-size:16px">✕</button>
    </div>

    <div class="challenge-declined-msg" *ngIf="challengeDeclined">
      {{ challengeDeclined }} ha rebutjat el repte.
    </div>

    <div *ngIf="error" class="err-banner">{{ error }}</div>
  </div>
</div>

<!-- Challenge received overlay -->
<div class="challenge-overlay" *ngIf="challengeReceived">
  <div class="challenge-modal">
    <div class="challenge-icon">⚔️</div>
    <div class="challenge-title">Repte rebut!</div>
    <div class="challenge-from">{{ challengeReceived.fromUsername }} et reta a una partida</div>
    <div class="challenge-tc">⏱ {{ challengeReceived.timeControl / 60 }} minuts</div>
    <div class="challenge-actions">
      <button class="btn-accept-challenge" (click)="acceptChallenge()">Acceptar</button>
      <button class="btn-decline-challenge" (click)="declineChallenge()">Rebutjar</button>
    </div>
  </div>
</div>
  `
})
export class Lobby implements OnInit, OnDestroy {
  private auth   = inject(AuthService);
  private game   = inject(GameService);
  private router = inject(Router);
  private socket = inject(SocketService);

  user         = this.auth.currentUser;
  avatarUrl    = localStorage.getItem('ch_avatar') || null;
  pvpColor     = 'random';
  pvpTime      = 600;
  botColor     = 'white';
  botLevel     = 5;
  loading      = false;
  error        = '';
  waitingGames: any[] = [];
  activeGames:  any[] = [];
  private refreshInterval: any;

  // ── Challenge system ───────────────────────────────────────────────────────
  onlineUsers: { userId: string; username: string }[] = [];
  challengeReceived: { fromUserId: string; fromUsername: string; timeControl: number } | null = null;
  challengeSent    = false;
  challengeDeclined: string | null = null;

  boardSquares = Array.from({ length: 16 }, (_, i) => ({
    light: (Math.floor(i / 4) + i) % 2 === 0
  }));

  ngOnInit(): void {
    this.loadWaiting();
    this.loadActive();
    this.initLobbySocket();
    this.refreshInterval = setInterval(() => {
      this.loadWaiting();
      this.loadActive();
    }, 8000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.socket.disconnect();
  }

  private initLobbySocket(): void {
    if (!this.user) return;
    this.socket.connect();
    this.socket.emit('lobby_join', { userId: this.user.id, username: this.user.username });

    this.socket.on('lobby_users').subscribe((users: any[]) => {
      this.onlineUsers = (users || []).filter(u => u.userId !== String(this.user!.id));
    });

    this.socket.on('challenge_received').subscribe((data: any) => {
      this.challengeReceived = data;
    });

    this.socket.on('challenge_accepted').subscribe((data: any) => {
      this.challengeSent = false;
      const gameId = data.gameId;
      if (gameId) {
        // Unim-nos a la partida ja creada com a blanques
        this.game.joinGame(gameId).subscribe({
          next: (res: any) => {
            this.router.navigate(['/game', gameId], {
              queryParams: { type: 'pvp', color: 'white', time: this.pvpTime }
            });
          },
          error: () => {
            this.router.navigate(['/game', gameId], {
              queryParams: { type: 'pvp', color: 'white', time: this.pvpTime }
            });
          }
        });
      }
    });

    this.socket.on('challenge_declined').subscribe((data: any) => {
      this.challengeSent    = false;
      this.challengeDeclined = data.byUsername || 'L\'oponent';
      setTimeout(() => { this.challengeDeclined = null; }, 3500);
    });
  }

  sendChallenge(toUserId: string): void {
    if (!this.user || this.challengeSent) return;
    this.challengeSent = true;
    this.socket.emit('send_challenge', { toUserId, timeControl: this.pvpTime });
  }

  acceptChallenge(): void {
    if (!this.challengeReceived) return;
    const fromId = this.challengeReceived.fromUserId;
    const tc     = this.challengeReceived.timeControl || 600;
    this.challengeReceived = null;
    // Creem partida com a negres
    this.game.createGame('black', tc).subscribe({
      next: (res: any) => {
        const gameId = res.data?.game_id;
        if (gameId) {
          this.socket.emit('accept_challenge', { fromUserId: fromId, gameId });
          this.router.navigate(['/game', gameId], {
            queryParams: { type: 'pvp', color: 'black', time: tc }
          });
        }
      },
      error: () => {}
    });
  }

  declineChallenge(): void {
    if (!this.challengeReceived) return;
    this.socket.emit('decline_challenge', { fromUserId: this.challengeReceived.fromUserId });
    this.challengeReceived = null;
  }

  loadWaiting(): void {
    this.game.getWaitingGames().subscribe({
      next: (res) => this.waitingGames = res.data || [],
      error: (err) => {
        if (err.status === 401) {
          clearInterval(this.refreshInterval);
          this.auth.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  loadActive(): void {
    this.game.getActiveGames().subscribe({
      next: (res) => this.activeGames = res.data || [],
      error: () => {}
    });
  }

  createPvP(): void {
    this.loading = true;
    const color = this.pvpColor === 'random'
      ? (Math.random() > 0.5 ? 'white' : 'black')
      : this.pvpColor;
    this.game.createGame(color, this.pvpTime).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'pvp', color, time: this.pvpTime }
      }),
      error: () => { this.error = 'Error creant la partida'; this.loading = false; }
    });
  }

  joinGame(gameId: number): void {
    this.loading = true;
    this.game.joinGame(gameId).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'pvp', color: res.data.color, time: res.data.time_control || 600 }
      }),
      error: () => { this.error = 'Error unint-se a la partida'; this.loading = false; }
    });
  }

  createBot(): void {
    this.loading = true;
    const botColorFinal = this.botColor === 'random'
      ? (Math.random() > 0.5 ? 'white' : 'black')
      : this.botColor;
    this.game.createBotGame(botColorFinal, this.botLevel, 600).subscribe({
      next: (res) => this.router.navigate(['/game', res.data.game_id], {
        queryParams: { type: 'bot', color: botColorFinal, level: this.botLevel, time: 600 }
      }),
      error: () => { this.error = 'Error creant la partida'; this.loading = false; }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
