import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { GameService } from '../../../core/services/game';
import { drawEloLineChart } from '../public-profile/public-profile';

const BOARD_THEMES = [
  { name: 'Classic',   light: '#f0d9b5', dark: '#b58863' },
  { name: 'Ocean',     light: '#dee3e6', dark: '#8ca2ad' },
  { name: 'Forest',    light: '#ffffdd', dark: '#86a666' },
  { name: 'Purple',    light: '#f0e9d2', dark: '#8877b8' },
  { name: 'Coral',     light: '#f5deb3', dark: '#cd5c5c' },
  { name: 'Midnight',  light: '#c8c8c8', dark: '#4a4a6a' },
  { name: 'Walnut',    light: '#e8c99a', dark: '#7b4f2e' },
  { name: 'Ice',       light: '#e8f4f8', dark: '#6baed6' },
  { name: 'Moss',      light: '#dde8cc', dark: '#557a47' },
  { name: 'Sandstone', light: '#f2d9a2', dark: '#a07850' },
];

const PIECE_STYLES = [
  { name: 'Classic',   k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#fff', fg: '#222' },
  { name: 'Dark',      k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟', bg: '#222', fg: '#fff' },
  { name: 'Outlined',  k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#f5f5f5', fg: '#333' },
  { name: 'Gold',      k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#2c2c2c', fg: '#f5c518' },
  { name: 'Emerald',   k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#1a2e1a', fg: '#81b64c' },
  { name: 'Royal',     k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#1a1a3e', fg: '#a0a0ff' },
  { name: 'Crimson',   k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#2e0a0a', fg: '#ff6b6b' },
  { name: 'Ivory',     k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#faf0e6', fg: '#5c4a1e' },
  { name: 'Steel',     k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#2c3e50', fg: '#bdc3c7' },
  { name: 'Neon',      k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙', bg: '#0d0d0d', fg: '#39ff14' },
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    :host { display: flex; min-height: 100vh; background: #242423; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .sidebar { width: 72px; min-height: 100vh; background: #1a1a1a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; position: fixed; left: 0; top: 0; bottom: 0; border-right: 1px solid rgba(255,255,255,0.06); z-index: 200; transition: width .2s; }
    .sidebar:hover { width: 220px; }
    .sidebar:hover .nav-label, .sidebar:hover .sl-text, .sidebar:hover .footer-uname, .sidebar:hover .logout-lbl { opacity: 1; width: auto; }
    .sidebar:hover .nav-item { padding: 10px 16px; justify-content: flex-start; gap: 12px; }
    .sidebar:hover .sidebar-logo { justify-content: flex-start; }
    .sidebar:hover .footer-user { flex-direction: row; gap: 10px; }
    .sidebar:hover .sidebar-footer { align-items: flex-start; padding: 0 16px 16px; width: 100%; }
    .sidebar:hover .btn-logout { width: 100%; justify-content: flex-start; gap: 10px; padding: 8px 12px; height: auto; border: 1px solid rgba(255,255,255,0.09); font-size: 14px; }

    .sidebar-logo { display: flex; align-items: center; padding: 0 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.07); width: 100%; justify-content: center; overflow: hidden; white-space: nowrap; }
    .logo-icon { width: 32px; height: 32px; background: #81b64c; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; flex-shrink: 0; }
    .sl-text { font-size: 17px; font-weight: 700; color: #fff; opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; margin-left: 10px; }
    .sidebar-nav { flex: 1; width: 100%; padding: 12px 0; display: flex; flex-direction: column; gap: 2px; }
    .nav-item { display: flex; align-items: center; gap: 0; padding: 10px 0; width: 100%; justify-content: center; color: #8a9ab0; text-decoration: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s, color .15s; border: none; background: transparent; font-family: inherit; overflow: hidden; white-space: nowrap; }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .nav-item.active { color: #81b64c; background: rgba(129,182,76,0.1); }
    .nav-icon { font-size: 20px; flex-shrink: 0; width: 24px; text-align: center; }
    .nav-label { opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; }
    .nav-sep { height: 1px; background: rgba(255,255,255,0.07); margin: 8px 16px; }
    .sidebar-footer { width: 100%; padding: 0 0 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .footer-user { display: flex; flex-direction: column; align-items: center; }
    .footer-av { width: 32px; height: 32px; border-radius: 50%; background: #81b64c; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden; }
    .footer-av img { width: 100%; height: 100%; object-fit: cover; }
    .footer-uname { font-size: 13px; font-weight: 600; color: #9aaaba; opacity: 0; width: 0; overflow: hidden; transition: opacity .2s; }
    .btn-logout { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; border: none; background: transparent; color: #5a6a7a; cursor: pointer; transition: all .15s; font-size: 18px; }
    .btn-logout:hover { background: rgba(220,60,60,0.12); color: #ff7070; }
    .logout-lbl { opacity: 0; width: 0; overflow: hidden; transition: opacity .2s; font-size: 14px; }

    .main { margin-left: 72px; flex: 1; padding: 32px 32px 64px; display: flex; flex-direction: column; align-items: center; gap: 16px; } .inner { width: 100%; max-width: 820px; display: flex; flex-direction: column; gap: 16px; }

    /* CARDS */
    .pcard { background: #2c2b29; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #5a6a7a; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; }

    /* USER HEADER */
    .user-head { display: flex; align-items: center; gap: 20px; }
    .avatar-wrap { position: relative; flex-shrink: 0; }
    .avatar-img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(129,182,76,0.4); }
    .avatar-placeholder { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #fff; border: 3px solid rgba(129,182,76,0.4); }
    .avatar-edit-btn { position: absolute; bottom: 0; right: 0; width: 24px; height: 24px; border-radius: 50%; background: #81b64c; border: 2px solid #2c2b29; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; }
    .user-info { flex: 1; }
    .user-name { font-size: 24px; font-weight: 700; color: #fff; letter-spacing: -0.4px; }
    .user-email { font-size: 13px; color: #5a6a7a; margin-top: 2px; }
    .user-role { display: inline-block; padding: 2px 8px; background: rgba(129,182,76,0.15); border: 1px solid rgba(129,182,76,0.3); border-radius: 5px; font-size: 11px; font-weight: 600; color: #81b64c; margin-top: 6px; text-transform: uppercase; }
    .user-bio { font-size: 13px; color: #6a7a8a; margin-top: 6px; font-style: italic; }
    .elo-block { text-align: center; }
    .elo-num { font-size: 32px; font-weight: 700; color: #81b64c; letter-spacing: -1px; }
    .elo-lbl { font-size: 12px; color: #5a6a7a; font-weight: 600; }
    .btn-edit { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 7px 14px; background: transparent; border: 1px solid rgba(255,255,255,0.12); border-radius: 7px; color: #9aaaba; font-size: 13px; font-family: inherit; font-weight: 500; cursor: pointer; transition: all .15s; }
    .btn-edit:hover { border-color: rgba(255,255,255,0.25); color: #fff; }

    /* EDIT FORM */
    .edit-form { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 11px; font-weight: 600; color: #5a6a7a; text-transform: uppercase; letter-spacing: 0.7px; }
    .ch-input, .ch-textarea { width: 100%; padding: 10px 12px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e8e8e8; font-size: 14px; font-family: inherit; outline: none; transition: border-color .15s; }
    .ch-input:focus, .ch-textarea:focus { border-color: #81b64c; }
    .ch-textarea { resize: vertical; min-height: 70px; }
    .pass-wrap { position: relative; }
    .pass-wrap .ch-input { padding-right: 40px; }
    .pass-eye { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #5a6a7a; cursor: pointer; font-size: 16px; }
    .form-sep { height: 1px; background: rgba(255,255,255,0.07); }
    .form-sep-label { font-size: 11px; color: #4a5a6a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; }
    .msg-ok { padding: 10px 14px; background: rgba(129,182,76,0.12); border: 1px solid rgba(129,182,76,0.3); border-radius: 8px; color: #81b64c; font-size: 13px; }
    .msg-err { padding: 10px 14px; background: rgba(220,60,60,0.1); border: 1px solid rgba(220,60,60,0.25); border-radius: 8px; color: #ff8080; font-size: 13px; }
    .btn-save { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; background: #81b64c; border: none; border-radius: 8px; color: #fff; font-size: 14px; font-family: inherit; font-weight: 700; cursor: pointer; transition: all .15s; }
    .btn-save:hover:not(:disabled) { background: #8ec956; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    /* STATS */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .stat-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; }
    .stat-num { font-size: 26px; font-weight: 700; line-height: 1; }
    .stat-lbl { font-size: 12px; color: #5a6a7a; margin-top: 4px; }
    .c-green { color: #81b64c; } .c-red { color: #e05555; } .c-yellow { color: #f0b429; } .c-white { color: #e8e8e8; }

    /* BOARD THEMES */
    .theme-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .theme-opt { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
    .theme-board { display: grid; grid-template-columns: repeat(4, 1fr); width: 64px; height: 64px; border-radius: 6px; overflow: hidden; border: 2px solid transparent; transition: border-color .15s; }
    .theme-opt.selected .theme-board { border-color: #81b64c; }
    .theme-sq { width: 16px; height: 16px; }
    .theme-name { font-size: 11px; color: #6a7a8a; font-weight: 500; }
    .theme-opt.selected .theme-name { color: #81b64c; font-weight: 700; }

    /* PIECE STYLES */
    .piece-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .piece-opt { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
    .piece-preview { width: 64px; height: 64px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px; border: 2px solid transparent; transition: border-color .15s; }
    .piece-opt.selected .piece-preview { border-color: #81b64c; }
    .piece-name { font-size: 11px; color: #6a7a8a; font-weight: 500; }
    .piece-opt.selected .piece-name { color: #81b64c; font-weight: 700; }

    /* THEME TOGGLE */
    .theme-toggle-row { display: flex; align-items: center; justify-content: space-between; }
    .toggle-wrap { display: flex; gap: 8px; }
    .theme-btn { padding: 8px 18px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #6a7a8a; font-size: 13px; font-family: inherit; font-weight: 600; cursor: pointer; transition: all .15s; }
    .theme-btn.active { background: rgba(129,182,76,0.15); border-color: #81b64c; color: #81b64c; }

    /* HISTORY */
    .game-list { display: flex; flex-direction: column; gap: 6px; }
    .game-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; transition: border-color .15s; }
    .game-row:hover { border-color: rgba(255,255,255,0.12); }
    .result-badge { padding: 3px 10px; border-radius: 5px; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .badge-win { background: rgba(129,182,76,0.2); color: #81b64c; }
    .badge-loss { background: rgba(220,60,60,0.2); color: #e05555; }
    .badge-draw { background: rgba(240,180,40,0.2); color: #f0b429; }
    .game-meta { font-size: 13px; color: #5a6a7a; margin-left: 12px; flex: 1; }
    .game-date { font-size: 12px; color: #3a4a5a; }
    .empty-msg { text-align: center; padding: 24px; color: #3a4a5a; font-size: 14px; }
    :host-context(body.light-theme) { background: #f0f0f0; color: #1a1a1a; }
    :host-context(body.light-theme) .pcard { background: #fff; border-color: rgba(0,0,0,0.1); }
    :host-context(body.light-theme) .sidebar { background: #2c2b29; }
    :host-context(body.light-theme) .stat-card { background: #f5f5f5; border-color: rgba(0,0,0,0.08); }
    :host-context(body.light-theme) .game-row { background: #f5f5f5; border-color: rgba(0,0,0,0.08); }
    :host-context(body.light-theme) .ch-input, :host-context(body.light-theme) .ch-textarea { background: #f5f5f5; border-color: rgba(0,0,0,0.15); color: #1a1a1a; }
    :host-context(body.light-theme) .theme-btn { background: #f0f0f0; border-color: rgba(0,0,0,0.12); color: #444; }
  `],
  template: `
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">&#9817;</div>
    <span class="sl-text">ChessHub</span>
  </div>
  <nav class="sidebar-nav">
    <a routerLink="/lobby" class="nav-item">
      <span class="nav-icon">&#9816;</span>
      <span class="nav-label">Jugar</span>
    </a>
    <a routerLink="/puzzles" class="nav-item">
      <span class="nav-icon">&#129513;</span>
      <span class="nav-label">Puzzles</span>
    </a>
    <a routerLink="/admin" class="nav-item" *ngIf="user?.role==='admin'">
      <span class="nav-icon">&#9760;</span>
      <span class="nav-label">Admin</span>
    </a>
    <a routerLink="/profile" class="nav-item active">
      <span class="nav-icon">&#128100;</span>
      <span class="nav-label">Perfil</span>
    </a>
    <div class="nav-sep"></div>
  </nav>
  <div class="sidebar-footer">
    <div class="footer-user">
      <div class="footer-av">
        <img *ngIf="avatarUrl" [src]="avatarUrl">
        <span *ngIf="!avatarUrl">{{ user?.username?.charAt(0)?.toUpperCase() }}</span>
      </div>
      <span class="footer-uname">{{ user?.username }}</span>
    </div>
    <button class="btn-logout" (click)="logout()">
      <span>&#8594;</span>
      <span class="logout-lbl">Sortir</span>
    </button>
  </div>
</div>

<div class="main">
<div class="inner">

  <!-- USER CARD -->
  <div class="pcard">
    <div class="user-head">
      <div class="avatar-wrap">
        <img *ngIf="avatarUrl" [src]="avatarUrl" class="avatar-img">
        <div *ngIf="!avatarUrl" class="avatar-placeholder" [style.background]="avatarColor">
          {{ user?.username?.charAt(0)?.toUpperCase() }}
        </div>
        <label *ngIf="editing" class="avatar-edit-btn" title="Canviar foto">
          &#128247;
          <input type="file" accept="image/*" style="display:none" (change)="onAvatarChange($event)">
        </label>
      </div>
      <div class="user-info">
        <div class="user-name">{{ user?.username }}</div>
        <div class="user-email">{{ user?.email }}</div>
        <div class="user-role">{{ user?.role }}</div>
        <div class="user-bio" *ngIf="profile?.bio && !editing">"{{ profile?.bio }}"</div>
      </div>
      <div class="elo-block">
        <div class="elo-num">{{ stats?.elo ?? 1200 }}</div>
        <div class="elo-lbl">ELO</div>
      </div>
    </div>

    <button class="btn-edit" (click)="toggleEdit()">
      {{ editing ? '✕ Cancel·lar' : '✏️ Editar perfil' }}
    </button>

    <div class="edit-form" *ngIf="editing">
      <div class="field">
        <label class="field-label">Nom d'usuari</label>
        <input class="ch-input" [(ngModel)]="editUsername" placeholder="Nom d'usuari">
      </div>
      <div class="field">
        <label class="field-label">Bio</label>
        <textarea class="ch-textarea" [(ngModel)]="editBio" placeholder="Explica qui ets..."></textarea>
      </div>
      <div class="form-sep"></div>
      <span class="form-sep-label">Canvi de contrasenya (opcional)</span>
      <div class="field">
        <label class="field-label">Nova contrasenya</label>
        <div class="pass-wrap">
          <input class="ch-input" [type]="showPass1 ? 'text' : 'password'" [(ngModel)]="editPassword" placeholder="Nova contrasenya">
          <button class="pass-eye" type="button" (click)="showPass1=!showPass1">{{ showPass1 ? '🙈' : '👁️' }}</button>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Confirma la contrasenya</label>
        <div class="pass-wrap">
          <input class="ch-input" [type]="showPass2 ? 'text' : 'password'" [(ngModel)]="editPasswordConfirm" placeholder="Repeteix la contrasenya">
          <button class="pass-eye" type="button" (click)="showPass2=!showPass2">{{ showPass2 ? '🙈' : '👁️' }}</button>
        </div>
      </div>
      <div class="msg-ok" *ngIf="editSuccess">{{ editSuccess }}</div>
      <div class="msg-err" *ngIf="editError">{{ editError }}</div>
      <button class="btn-save" (click)="saveProfile()" [disabled]="saving || !canSave()">
        {{ saving ? 'Guardant...' : '💾 Guardar canvis' }}
      </button>
    </div>
  </div>

  <!-- STATS -->
  <div class="pcard" *ngIf="stats">
    <div class="section-title">Estadístiques</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-num c-green">{{ stats.wins }}</div><div class="stat-lbl">Victòries</div></div>
      <div class="stat-card"><div class="stat-num c-red">{{ stats.losses }}</div><div class="stat-lbl">Derrotes</div></div>
      <div class="stat-card"><div class="stat-num c-yellow">{{ stats.draws }}</div><div class="stat-lbl">Taules</div></div>
      <div class="stat-card"><div class="stat-num c-white">{{ stats.win_rate }}%</div><div class="stat-lbl">% Victòria</div></div>
    </div>
  </div>

  <!-- ELO HISTORY CHART -->
  <div class="pcard" *ngIf="eloHistory.length > 1">
    <div class="section-title">Evolució ELO</div>
    <canvas id="eloChart" style="width:100%;height:120px;display:block;background:#1a1a1a;border-radius:8px"></canvas>
  </div>

  <!-- BOARD THEME -->
  <div class="pcard">
    <div class="section-title">Color del tauler</div>
    <div class="theme-grid">
      <div *ngFor="let t of boardThemes; let i = index"
           class="theme-opt" [class.selected]="selectedBoard === i" (click)="selectBoard(i)">
        <div class="theme-board">
          <div *ngFor="let sq of miniSquares; let j = index" class="theme-sq"
               [style.background]="(Math.floor(j/4)+j)%2===0 ? t.light : t.dark"></div>
        </div>
        <span class="theme-name">{{ t.name }}</span>
      </div>
    </div>
  </div>

  <!-- PIECE STYLE -->
  <div class="pcard">
    <div class="section-title">Estil de les peces</div>
    <div class="piece-grid">
      <div *ngFor="let p of pieceStyles; let i = index"
           class="piece-opt" [class.selected]="selectedPiece === i" (click)="selectPiece(i)">
        <div class="piece-preview" [style.background]="p.bg" [style.color]="p.fg">{{ p.k }}</div>
        <span class="piece-name">{{ p.name }}</span>
      </div>
    </div>
  </div>

  <!-- THEME -->
  <div class="pcard">
    <div class="section-title">Aparença</div>
    <div class="theme-toggle-row">
      <span style="font-size:14px;color:#6a7a8a">Tema de la interfície</span>
      <div class="toggle-wrap">
        <button class="theme-btn" [class.active]="appTheme==='dark'" (click)="setTheme('dark')">&#127769; Fosc</button>
        <button class="theme-btn" [class.active]="appTheme==='light'" (click)="setTheme('light')">&#9728;&#65039; Clar</button>
      </div>
    </div>
  </div>

</div>
  `
})
export class Profile implements OnInit {
  private auth = inject(AuthService);
  private gameService = inject(GameService);

  user = this.auth.currentUser;
  stats: any = null;
  profile: any = null;
  editing = false;
  saving = false;
  editUsername = '';
  editPassword = '';
  editPasswordConfirm = '';
  editBio = '';
  editError = '';
  editSuccess = '';
  showPass1 = false;
  showPass2 = false;
  avatarUrl: string | null = null;
  avatarColors = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c'];
  avatarColor = '#3498db';

  eloHistory: any[] = [];

  boardThemes = BOARD_THEMES;
  pieceStyles = PIECE_STYLES;
  miniSquares = Array.from({ length: 16 });
  Math = Math;

  selectedBoard: number = parseInt(localStorage.getItem('ch_board') || '0');
  selectedPiece: number = parseInt(localStorage.getItem('ch_piece') || '0');
  appTheme: string = localStorage.getItem('ch_theme') || 'dark';

  ngOnInit(): void {
    if (!this.user) return;
    document.body.classList.toggle('light-theme', this.appTheme === 'light');
    document.body.classList.toggle('dark-theme', this.appTheme === 'dark');
    const boardThemes = [
      ['#f0d9b5','#b58863'],['#dee3e6','#8ca2ad'],['#ffffdd','#86a666'],
      ['#f0e9d2','#8877b8'],['#f5deb3','#cd5c5c'],['#c8c8c8','#4a4a6a'],
      ['#e8c99a','#7b4f2e'],['#e8f4f8','#6baed6'],['#dde8cc','#557a47'],
      ['#f2d9a2','#a07850']
    ];
    const bi = this.selectedBoard;
    document.documentElement.style.setProperty('--sq-light', boardThemes[bi][0]);
    document.documentElement.style.setProperty('--sq-dark',  boardThemes[bi][1]);
    this.editUsername = this.user.username;
    this.avatarColor = this.avatarColors[this.user.username.charCodeAt(0) % this.avatarColors.length];
    this.gameService.getUserStats(this.user.id).subscribe({ next: (res) => this.stats = res.data, error: () => {} });
    this.gameService.getMyProfile().subscribe({
      next: (res) => {
        this.profile = res.data?.profile;
        this.editBio = this.profile?.bio || '';
        if (this.profile?.avatar) {
          this.avatarUrl = this.profile.avatar;
          localStorage.setItem('ch_avatar', this.profile.avatar);
        }
      },
      error: () => {}
    });

    this.gameService.getEloHistory(this.user!.id).subscribe({
      next: (res: any) => {
        this.eloHistory = res.data || [];
        if (this.eloHistory.length > 1) setTimeout(() => this.drawEloChart(), 150);
      },
      error: () => {}
    });
  }

  drawEloChart(): void {
    const canvas = document.getElementById('eloChart') as HTMLCanvasElement;
    if (canvas && this.eloHistory.length > 1) drawEloLineChart(canvas, this.eloHistory);
  }

  selectBoard(i: number): void {
    this.selectedBoard = i;
    localStorage.setItem('ch_board', String(i));
    const themes = [
      ['#f0d9b5','#b58863'],['#dee3e6','#8ca2ad'],['#ffffdd','#86a666'],
      ['#f0e9d2','#8877b8'],['#f5deb3','#cd5c5c'],['#c8c8c8','#4a4a6a'],
      ['#e8c99a','#7b4f2e'],['#e8f4f8','#6baed6'],['#dde8cc','#557a47'],
      ['#f2d9a2','#a07850']
    ];
    document.documentElement.style.setProperty('--sq-light', themes[i][0]);
    document.documentElement.style.setProperty('--sq-dark',  themes[i][1]);
  }
  selectPiece(i: number): void {
    this.selectedPiece = i;
    localStorage.setItem('ch_piece', String(i));
    const pw = ['#fff','#111','#f5f5f5','#f5c518','#81b64c','#a0a0ff','#ff6b6b','#faf0e6','#bdc3c7','#39ff14'];
    const pb = ['#111','#fff','#222','#111','#0a1f0a','#0a0a2e','#2e0000','#5c4a1e','#1a252f','#0d0d0d'];
    document.documentElement.style.setProperty('--piece-w', pw[i]);
    document.documentElement.style.setProperty('--piece-b', pb[i]);
  }
  setTheme(t: string): void {
    this.appTheme = t;
    localStorage.setItem('ch_theme', t);
    document.body.classList.toggle('light-theme', t === 'light');
    document.body.classList.toggle('dark-theme', t === 'dark');
  }

  onAvatarChange(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.editError = 'Només es permeten imatges'; return; }
    if (file.size > 5 * 1024 * 1024) { this.editError = 'La imatge no pot superar els 5MB'; return; }
    const formData = new FormData();
    formData.append('avatar', file);
    this.gameService.uploadAvatar(formData).subscribe({
      next: (res: any) => {
        this.avatarUrl = res.data.avatar;
        localStorage.setItem('ch_avatar', res.data.avatar);
        this.editSuccess = 'Foto actualitzada!';
      },
      error: (err: any) => { this.editError = err.error?.message || 'Error pujant la imatge'; }
    });
  }

  toggleEdit(): void { this.editing = !this.editing; this.editError = ''; this.editSuccess = ''; this.editPassword = ''; this.editPasswordConfirm = ''; }

  canSave(): boolean {
    if (this.editUsername.length < 3) return false;
    if (this.editPassword && this.editPassword.length < 8) return false;
    if (this.editPassword && this.editPassword !== this.editPasswordConfirm) return false;
    return true;
  }

  saveProfile(): void {
    this.saving = true; this.editError = ''; this.editSuccess = '';
    const data: any = { username: this.editUsername, bio: this.editBio };
    if (this.editPassword) data.password = this.editPassword;
    this.gameService.updateProfile(data).subscribe({
      next: () => {
        this.editSuccess = 'Perfil actualitzat correctament!';
        this.saving = false; this.editing = false; this.editPassword = ''; this.editPasswordConfirm = '';
        if (this.user) {
          const u = { ...this.user, username: this.editUsername };
          this.user = u;
          this.auth.setCurrentUser(u);
        }
      },
      error: (err: any) => { this.editError = err.error?.message || 'Error actualitzant el perfil'; this.saving = false; }
    });
  }

  logout(): void { this.auth.logout(); }
}
