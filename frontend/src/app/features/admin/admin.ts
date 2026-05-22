import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styles: [`
    :host { display: flex; min-height: 100vh; background: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e8e8; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .sidebar { width: 72px; min-height: 100vh; background: #111; display: flex; flex-direction: column; align-items: center; padding: 16px 0; position: fixed; left: 0; top: 0; bottom: 0; border-right: 1px solid rgba(255,255,255,0.06); z-index: 200; transition: width .2s; }
    .sidebar:hover { width: 220px; }
    .sidebar:hover .nav-label, .sidebar:hover .sl-text, .sidebar:hover .logout-lbl { opacity: 1; width: auto; }
    .sidebar:hover .nav-item { padding: 10px 16px; justify-content: flex-start; gap: 12px; }
    .sidebar:hover .sidebar-logo { justify-content: flex-start; }
    .sidebar-logo { display: flex; align-items: center; padding: 0 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.07); width: 100%; justify-content: center; overflow: hidden; white-space: nowrap; }
    .logo-icon { width: 32px; height: 32px; background: #e05555; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; flex-shrink: 0; }
    .sl-text { font-size: 17px; font-weight: 700; color: #fff; opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; margin-left: 10px; }
    .sidebar-nav { flex: 1; width: 100%; padding: 12px 0; display: flex; flex-direction: column; gap: 2px; }
    .nav-item { display: flex; align-items: center; gap: 0; padding: 10px 0; width: 100%; justify-content: center; color: #8a9ab0; text-decoration: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s, color .15s; border: none; background: transparent; font-family: inherit; overflow: hidden; white-space: nowrap; }
    .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .nav-item.active { color: #e05555; background: rgba(224,85,85,0.1); }
    .nav-icon { font-size: 20px; flex-shrink: 0; width: 24px; text-align: center; }
    .nav-label { opacity: 0; width: 0; overflow: hidden; transition: opacity .2s, width .2s; }
    .nav-sep { height: 1px; background: rgba(255,255,255,0.07); margin: 8px 16px; }
    .sidebar-footer { width: 100%; padding: 0 0 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .btn-logout { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; border: none; background: transparent; color: #5a6a7a; cursor: pointer; transition: all .15s; font-size: 18px; }
    .btn-logout:hover { background: rgba(220,60,60,0.12); color: #ff7070; }
    .logout-lbl { opacity: 0; width: 0; overflow: hidden; transition: opacity .2s; font-size: 14px; }

    .main { margin-left: 72px; flex: 1; padding: 32px; display: flex; flex-direction: column; gap: 24px; max-width: calc(100vw - 72px); }
    .page-header { display: flex; align-items: center; gap: 12px; }
    .page-title { font-size: 24px; font-weight: 700; color: #fff; }
    .admin-badge { padding: 3px 10px; background: rgba(224,85,85,0.2); border: 1px solid rgba(224,85,85,0.4); border-radius: 5px; font-size: 11px; font-weight: 700; color: #e05555; text-transform: uppercase; }

    .tabs { display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .tab { padding: 10px 18px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #5a6a7a; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; margin-bottom: -1px; }
    .tab:hover { color: #9aaaba; }
    .tab.active { color: #e05555; border-bottom-color: #e05555; }

    .card { background: #242423; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #5a6a7a; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; }

    /* STATS */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .stat-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 20px; text-align: center; }
    .stat-num { font-size: 32px; font-weight: 700; line-height: 1; }
    .stat-lbl { font-size: 12px; color: #5a6a7a; margin-top: 6px; }
    .c-green { color: #81b64c; } .c-red { color: #e05555; } .c-blue { color: #4a9eff; } .c-yellow { color: #f0b429; } .c-purple { color: #a78bfa; } .c-orange { color: #fb923c; }

    .recent-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .recent-table th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #4a5a6a; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid rgba(255,255,255,0.07); }
    .recent-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .recent-table tr:last-child td { border-bottom: none; }
    .recent-table tr:hover td { background: rgba(255,255,255,0.02); }

    /* TABLE / LIST */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #4a5a6a; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .data-table td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: rgba(255,255,255,0.02); }

    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .search-input { flex: 1; max-width: 320px; padding: 9px 12px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e8e8e8; font-size: 13px; font-family: inherit; outline: none; }
    .search-input:focus { border-color: #e05555; }
    .filter-select { padding: 9px 12px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e8e8e8; font-size: 13px; font-family: inherit; outline: none; cursor: pointer; }
    .filter-select:focus { border-color: #e05555; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none; font-size: 13px; font-family: inherit; font-weight: 600; cursor: pointer; transition: all .15s; }
    .btn-primary { background: #e05555; color: #fff; }
    .btn-primary:hover { background: #f06060; }
    .btn-secondary { background: rgba(255,255,255,0.06); color: #9aaaba; border: 1px solid rgba(255,255,255,0.1); }
    .btn-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .btn-danger { background: rgba(220,60,60,0.15); color: #ff8080; border: 1px solid rgba(220,60,60,0.2); }
    .btn-danger:hover { background: rgba(220,60,60,0.25); }
    .btn-sm { padding: 5px 10px; font-size: 12px; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .badge-admin { background: rgba(224,85,85,0.2); color: #e05555; border: 1px solid rgba(224,85,85,0.3); }
    .badge-user { background: rgba(129,182,76,0.15); color: #81b64c; border: 1px solid rgba(129,182,76,0.2); }
    .badge-active { background: rgba(129,182,76,0.15); color: #81b64c; }
    .badge-inactive { background: rgba(90,90,90,0.3); color: #5a6a7a; }
    .badge-pending { background: rgba(240,180,40,0.15); color: #f0b429; }
    .badge-reviewed { background: rgba(74,158,255,0.15); color: #4a9eff; }
    .badge-resolved { background: rgba(129,182,76,0.15); color: #81b64c; }
    .badge-dismissed { background: rgba(90,90,90,0.3); color: #5a6a7a; }
    .badge-easy { background: rgba(129,182,76,0.15); color: #81b64c; }
    .badge-medium { background: rgba(240,180,40,0.15); color: #f0b429; }
    .badge-hard { background: rgba(224,85,85,0.15); color: #e05555; }
    .badge-win { background: rgba(129,182,76,0.15); color: #81b64c; }
    .badge-draw { background: rgba(240,180,40,0.15); color: #f0b429; }
    .badge-loss { background: rgba(224,85,85,0.15); color: #e05555; }

    .pagination { display: flex; align-items: center; gap: 8px; justify-content: flex-end; margin-top: 16px; }
    .page-info { font-size: 13px; color: #5a6a7a; }
    .btn-page { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; background: transparent; color: #9aaaba; cursor: pointer; font-size: 14px; transition: all .15s; }
    .btn-page:hover:not(:disabled) { border-color: #e05555; color: #e05555; }
    .btn-page:disabled { opacity: 0.3; cursor: not-allowed; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal { background: #2c2b29; border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 28px; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 16px; }
    .modal-title { font-size: 18px; font-weight: 700; color: #fff; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 11px; font-weight: 600; color: #5a6a7a; text-transform: uppercase; letter-spacing: 0.6px; }
    .ch-input, .ch-select, .ch-textarea { width: 100%; padding: 10px 12px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e8e8e8; font-size: 14px; font-family: inherit; outline: none; transition: border-color .15s; }
    .ch-input:focus, .ch-select:focus, .ch-textarea:focus { border-color: #e05555; }
    .ch-textarea { resize: vertical; min-height: 80px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
    .msg-ok { padding: 10px 14px; background: rgba(129,182,76,0.12); border: 1px solid rgba(129,182,76,0.3); border-radius: 8px; color: #81b64c; font-size: 13px; }
    .msg-err { padding: 10px 14px; background: rgba(220,60,60,0.1); border: 1px solid rgba(220,60,60,0.25); border-radius: 8px; color: #ff8080; font-size: 13px; }
    .empty { text-align: center; padding: 32px; color: #3a4a5a; font-size: 14px; }
    .loading { text-align: center; padding: 32px; color: #5a6a7a; font-size: 14px; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .sidebar {
        width: 100% !important; height: 60px; min-height: unset;
        flex-direction: row; top: auto; bottom: 0; left: 0; right: 0;
        padding: 0; border-right: none;
        border-top: 1px solid rgba(255,255,255,0.09);
        transition: none; z-index: 300;
      }
      .sidebar:hover { width: 100% !important; }
      .sidebar-logo { display: none !important; }
      .sidebar-nav {
        flex: 1; flex-direction: row; padding: 0; gap: 0;
        justify-content: space-around; align-items: stretch;
      }
      .nav-sep { display: none; }
      .nav-item, .sidebar:hover .nav-item {
        flex-direction: column !important;
        padding: 6px 2px !important; gap: 2px !important;
        justify-content: center !important;
        flex: 1; height: 60px; overflow: visible;
      }
      .nav-icon { font-size: 18px; width: auto; }
      .nav-label, .sidebar:hover .nav-label {
        opacity: 1 !important; width: auto !important;
        font-size: 9px; line-height: 1.2; overflow: visible;
      }
      /* Logout: show as compact tab */
      .sidebar-footer {
        display: flex !important; flex-direction: column !important;
        align-items: center !important; justify-content: center !important;
        padding: 0 !important; width: auto !important; min-width: 48px; gap: 2px; height: 60px;
      }
      .btn-logout, .sidebar:hover .btn-logout {
        display: flex !important; flex-direction: column !important;
        align-items: center !important; justify-content: center !important;
        gap: 2px !important; width: auto !important; height: 60px !important;
        padding: 4px !important; border: none !important; border-radius: 0 !important;
        font-size: 18px; color: #8a9ab0;
      }
      .logout-lbl, .sidebar:hover .logout-lbl {
        opacity: 1 !important; width: auto !important;
        font-size: 9px !important; line-height: 1.2;
      }
      .main { margin-left: 0 !important; padding: 16px 10px 70px; max-width: 100vw; }
      .tabs { overflow-x: auto; white-space: nowrap; gap: 0; }
      .tab { padding: 10px 12px; font-size: 13px; }
      .toolbar { flex-wrap: wrap; }
      .card { padding: 14px; overflow-x: auto; }
      .recent-table, .data-table { min-width: 520px; }
    }
  `],
  template: `
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">&#9760;</div>
    <span class="sl-text">Admin</span>
  </div>
  <nav class="sidebar-nav">
    <a routerLink="/lobby" class="nav-item">
      <span class="nav-icon">&#9816;</span>
      <span class="nav-label">Joc</span>
    </a>
    <a routerLink="/profile" class="nav-item">
      <span class="nav-icon">&#128100;</span>
      <span class="nav-label">Perfil</span>
    </a>
    <a routerLink="/admin" class="nav-item active">
      <span class="nav-icon">&#9760;</span>
      <span class="nav-label">Admin</span>
    </a>
    <div class="nav-sep"></div>
  </nav>
  <div class="sidebar-footer">
    <button class="btn-logout" (click)="logout()">
      <span>&#8594;</span>
      <span class="logout-lbl">Sortir</span>
    </button>
  </div>
</div>

<div class="main">
  <div class="page-header">
    <div class="page-title">Panell d'Administraci&#243;</div>
    <span class="admin-badge">Admin</span>
  </div>

  <div class="tabs">
    <button class="tab" [class.active]="tab==='stats'" (click)="setTab('stats')">&#128202; Dashboard</button>
    <button class="tab" [class.active]="tab==='users'" (click)="setTab('users')">&#128100; Usuaris</button>
    <button class="tab" [class.active]="tab==='puzzles'" (click)="setTab('puzzles')">&#129513; Puzzles</button>
    <button class="tab" [class.active]="tab==='reports'" (click)="setTab('reports')">&#9888;&#65039; Denúncies</button>
    <button class="tab" [class.active]="tab==='games'" (click)="setTab('games')">&#9823; Partides</button>
  </div>

  <!-- DASHBOARD -->
  <ng-container *ngIf="tab==='stats'">
    <div class="card" *ngIf="stats">
      <div class="section-title">Resum General</div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-num c-blue">{{stats.total_users}}</div><div class="stat-lbl">Usuaris totals</div></div>
        <div class="stat-card"><div class="stat-num c-green">{{stats.active_users}}</div><div class="stat-lbl">Usuaris actius</div></div>
        <div class="stat-card"><div class="stat-num c-purple">{{stats.total_games}}</div><div class="stat-lbl">Partides PvP</div></div>
        <div class="stat-card"><div class="stat-num c-orange">{{stats.total_bot_games}}</div><div class="stat-lbl">Partides vs Bot</div></div>
        <div class="stat-card"><div class="stat-num c-yellow">{{stats.total_puzzles}}</div><div class="stat-lbl">Puzzles</div></div>
        <div class="stat-card"><div class="stat-num c-red">{{stats.pending_reports}}</div><div class="stat-lbl">Denúncies pendents</div></div>
      </div>
    </div>
    <div class="card" *ngIf="stats?.recent_games?.length">
      <div class="section-title">Partides recents</div>
      <table class="recent-table">
        <thead><tr><th>Blanques</th><th>Negres</th><th>Resultat</th><th>Fi</th><th>Data</th></tr></thead>
        <tbody>
          <tr *ngFor="let g of stats.recent_games">
            <td>{{g.white_username || '—'}}</td>
            <td>{{g.black_username || '—'}}</td>
            <td>
              <span class="badge" [ngClass]="{'badge-win': g.result==='white', 'badge-draw': g.result==='draw', 'badge-loss': g.result==='black'}">
                {{g.result==='white' ? 'Blanques' : g.result==='black' ? 'Negres' : g.result==='draw' ? 'Taules' : '—'}}
              </span>
            </td>
            <td>{{g.end_reason || '—'}}</td>
            <td style="color:#5a6a7a">{{g.created_at | date:'dd/MM/yy HH:mm'}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="loading" *ngIf="!stats">Carregant estadístiques...</div>
  </ng-container>

  <!-- USERS -->
  <ng-container *ngIf="tab==='users'">
    <div class="card">
      <div class="toolbar">
        <input class="search-input" [(ngModel)]="usersSearch" (input)="onSearchUsers()" placeholder="&#128269; Cercar usuaris...">
        <button class="btn btn-secondary btn-sm" (click)="loadUsers()">Actualitzar</button>
      </div>
      <div class="loading" *ngIf="usersLoading">Carregant usuaris...</div>
      <table class="data-table" *ngIf="!usersLoading">
        <thead><tr><th>ID</th><th>Usuari</th><th>Email</th><th>Rol</th><th>Estat</th><th>ELO</th><th>V/D/T</th><th>Accions</th></tr></thead>
        <tbody>
          <tr *ngFor="let u of users">
            <td style="color:#5a6a7a">{{u.id}}</td>
            <td style="font-weight:600">{{u.username}}</td>
            <td style="color:#5a6a7a">{{u.email}}</td>
            <td><span class="badge" [ngClass]="u.role==='admin' ? 'badge-admin' : 'badge-user'">{{u.role}}</span></td>
            <td><span class="badge" [ngClass]="u.is_active ? 'badge-active' : 'badge-inactive'">{{u.is_active ? 'Actiu' : 'Inactiu'}}</span></td>
            <td style="font-weight:700;color:#81b64c">{{u.elo ?? 1200}}</td>
            <td style="color:#5a6a7a">{{u.wins??0}}/{{u.losses??0}}/{{u.draws??0}}</td>
            <td>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-secondary btn-sm" (click)="toggleUserRole(u)" [disabled]="u.id===currentUserId">
                  {{u.role==='admin' ? '&#128100; → User' : '&#9760; → Admin'}}
                </button>
                <button class="btn btn-secondary btn-sm" (click)="toggleUserActive(u)" [disabled]="u.id===currentUserId">
                  {{u.is_active ? '&#128683; Desactivar' : '&#10003; Activar'}}
                </button>
                <button class="btn btn-danger btn-sm" (click)="confirmDeleteUser(u)" [disabled]="u.id===currentUserId">
                  &#128465;
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty" *ngIf="!usersLoading && users.length===0">No s'han trobat usuaris.</div>
      <div class="pagination">
        <span class="page-info">Pàg. {{usersPage}} / {{usersTotalPages}}</span>
        <button class="btn-page" (click)="usersPage=usersPage-1;loadUsers()" [disabled]="usersPage<=1">&#8592;</button>
        <button class="btn-page" (click)="usersPage=usersPage+1;loadUsers()" [disabled]="usersPage>=usersTotalPages">&#8594;</button>
      </div>
    </div>
  </ng-container>

  <!-- PUZZLES -->
  <ng-container *ngIf="tab==='puzzles'">
    <div class="card">
      <div class="toolbar">
        <select class="filter-select" [(ngModel)]="puzzlesDiff" (change)="loadPuzzles()">
          <option value="">Totes les dificultats</option>
          <option value="easy">Fàcil</option>
          <option value="medium">Mitjana</option>
          <option value="hard">Difícil</option>
        </select>
        <button class="btn btn-primary btn-sm" (click)="openPuzzleModal()">+ Nou puzzle</button>
        <button class="btn btn-secondary btn-sm" (click)="loadPuzzles()">Actualitzar</button>
      </div>
      <div class="loading" *ngIf="puzzlesLoading">Carregant puzzles...</div>
      <table class="data-table" *ngIf="!puzzlesLoading">
        <thead><tr><th>ID</th><th>FEN</th><th>Solució</th><th>Dificultat</th><th>Tema</th><th>Intents</th><th>Accions</th></tr></thead>
        <tbody>
          <tr *ngFor="let p of puzzles">
            <td style="color:#5a6a7a">{{p.id}}</td>
            <td style="font-family:monospace;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{p.fen}}</td>
            <td style="font-family:monospace;font-size:12px">{{p.solution}}</td>
            <td><span class="badge" [ngClass]="'badge-'+p.difficulty">{{p.difficulty}}</span></td>
            <td style="color:#5a6a7a">{{p.theme || '—'}}</td>
            <td style="color:#5a6a7a">{{p.attempt_count ?? 0}}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" (click)="openPuzzleModal(p)">&#9998;</button>
                <button class="btn btn-danger btn-sm" (click)="deletePuzzle(p.id)">&#128465;</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty" *ngIf="!puzzlesLoading && puzzles.length===0">No hi ha puzzles.</div>
      <div class="pagination">
        <span class="page-info">Pàg. {{puzzlesPage}} / {{puzzlesTotalPages}}</span>
        <button class="btn-page" (click)="puzzlesPage=puzzlesPage-1;loadPuzzles()" [disabled]="puzzlesPage<=1">&#8592;</button>
        <button class="btn-page" (click)="puzzlesPage=puzzlesPage+1;loadPuzzles()" [disabled]="puzzlesPage>=puzzlesTotalPages">&#8594;</button>
      </div>
    </div>
  </ng-container>

  <!-- REPORTS -->
  <ng-container *ngIf="tab==='reports'">
    <div class="card">
      <div class="toolbar">
        <select class="filter-select" [(ngModel)]="reportsStatus" (change)="loadReports()">
          <option value="">Tots els estats</option>
          <option value="pending">Pendents</option>
          <option value="reviewed">Revisades</option>
          <option value="resolved">Resoltes</option>
          <option value="dismissed">Descartades</option>
        </select>
        <button class="btn btn-secondary btn-sm" (click)="loadReports()">Actualitzar</button>
      </div>
      <div class="loading" *ngIf="reportsLoading">Carregant denúncies...</div>
      <table class="data-table" *ngIf="!reportsLoading">
        <thead><tr><th>ID</th><th>Denunciant</th><th>Denunciat</th><th>Motiu</th><th>Estat</th><th>Data</th><th>Accions</th></tr></thead>
        <tbody>
          <tr *ngFor="let r of reports">
            <td style="color:#5a6a7a">{{r.id}}</td>
            <td>{{r.reporter_username || r.reporter_id}}</td>
            <td>{{r.reported_username || r.reported_id}}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9aaaba">{{r.reason}}</td>
            <td><span class="badge" [ngClass]="'badge-'+r.status">{{r.status}}</span></td>
            <td style="color:#5a6a7a">{{r.created_at | date:'dd/MM/yy'}}</td>
            <td>
              <select class="filter-select" style="font-size:12px;padding:4px 8px" [ngModel]="r.status" (ngModelChange)="updateReport(r.id, $event)">
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty" *ngIf="!reportsLoading && reports.length===0">No hi ha denúncies.</div>
      <div class="pagination">
        <span class="page-info">Pàg. {{reportsPage}} / {{reportsTotalPages}}</span>
        <button class="btn-page" (click)="reportsPage=reportsPage-1;loadReports()" [disabled]="reportsPage<=1">&#8592;</button>
        <button class="btn-page" (click)="reportsPage=reportsPage+1;loadReports()" [disabled]="reportsPage>=reportsTotalPages">&#8594;</button>
      </div>
    </div>
  </ng-container>

  <!-- GAMES -->
  <ng-container *ngIf="tab==='games'">
    <div class="card">
      <div class="toolbar">
        <button class="btn btn-secondary btn-sm" (click)="loadGames()">Actualitzar</button>
      </div>
      <div class="loading" *ngIf="gamesLoading">Carregant partides...</div>
      <table class="data-table" *ngIf="!gamesLoading">
        <thead><tr><th>ID</th><th>Blanques</th><th>Negres</th><th>Resultat</th><th>Fi</th><th>Temps</th><th>Estat</th><th>Data</th></tr></thead>
        <tbody>
          <tr *ngFor="let g of adminGames">
            <td style="color:#5a6a7a">{{g.id}}</td>
            <td>{{g.white_username || '—'}}</td>
            <td>{{g.black_username || '—'}}</td>
            <td>
              <span class="badge" [ngClass]="{'badge-win': g.result==='white', 'badge-draw': g.result==='draw', 'badge-loss': g.result==='black'}">
                {{g.result==='white' ? 'Blanques' : g.result==='black' ? 'Negres' : g.result==='draw' ? 'Taules' : '—'}}
              </span>
            </td>
            <td style="color:#5a6a7a">{{g.end_reason || '—'}}</td>
            <td style="color:#5a6a7a">{{g.time_control ? (g.time_control/60)+'min' : '—'}}</td>
            <td><span class="badge" [ngClass]="g.status==='finished' ? 'badge-active' : 'badge-pending'">{{g.status}}</span></td>
            <td style="color:#5a6a7a">{{g.created_at | date:'dd/MM/yy HH:mm'}}</td>
          </tr>
        </tbody>
      </table>
      <div class="empty" *ngIf="!gamesLoading && adminGames.length===0">No hi ha partides.</div>
      <div class="pagination">
        <span class="page-info">Pàg. {{gamesPage}} / {{gamesTotalPages}}</span>
        <button class="btn-page" (click)="gamesPage=gamesPage-1;loadGames()" [disabled]="gamesPage<=1">&#8592;</button>
        <button class="btn-page" (click)="gamesPage=gamesPage+1;loadGames()" [disabled]="gamesPage>=gamesTotalPages">&#8594;</button>
      </div>
    </div>
  </ng-container>

  <!-- FEEDBACK -->
  <div class="msg-ok" *ngIf="feedback">{{feedback}}</div>
  <div class="msg-err" *ngIf="feedbackErr">{{feedbackErr}}</div>
</div>

<!-- PUZZLE MODAL -->
<div class="modal-overlay" *ngIf="showPuzzleModal" (click)="closePuzzleModal()">
  <div class="modal" (click)="$event.stopPropagation()">
    <div class="modal-title">{{editingPuzzle?.id ? 'Editar puzzle' : 'Nou puzzle'}}</div>
    <div class="field">
      <label class="field-label">Títol</label>
      <input class="ch-input" [(ngModel)]="puzzleForm.title" placeholder="Atac doble, Mat en 2...">
    </div>
    <div class="field">
      <label class="field-label">FEN (posició inicial)</label>
      <input class="ch-input" [(ngModel)]="puzzleForm.fen" placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1">
    </div>
    <div class="field">
      <label class="field-label">Solució UCI — jugador i oponent alternats (p. ex. e2e4 d7d5 e4e5)</label>
      <input class="ch-input" [(ngModel)]="puzzleForm.solution" placeholder="e2e4 d7d5 e4e5 ...">
    </div>
    <div class="field">
      <label class="field-label">Dificultat</label>
      <select class="ch-select" [(ngModel)]="puzzleForm.difficulty">
        <option value="beginner">Principiant</option>
        <option value="intermediate">Intermedi</option>
        <option value="advanced">Avançat</option>
        <option value="expert">Expert</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">Tema (opcional)</label>
      <input class="ch-input" [(ngModel)]="puzzleForm.theme" placeholder="tàctica, obertura...">
    </div>
    <div class="msg-err" *ngIf="puzzleErr">{{puzzleErr}}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" (click)="closePuzzleModal()">Cancel·lar</button>
      <button class="btn btn-primary" (click)="savePuzzle()" [disabled]="savingPuzzle">
        {{savingPuzzle ? 'Guardant...' : editingPuzzle?.id ? 'Guardar' : 'Crear'}}
      </button>
    </div>
  </div>
</div>

<!-- DELETE USER CONFIRM -->
<div class="modal-overlay" *ngIf="deleteUserTarget" (click)="deleteUserTarget=null">
  <div class="modal" (click)="$event.stopPropagation()">
    <div class="modal-title">Eliminar usuari</div>
    <p style="color:#9aaaba;font-size:14px">Segur que vols eliminar <strong style="color:#fff">{{deleteUserTarget?.username}}</strong>? Aquesta acció no es pot desfer.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" (click)="deleteUserTarget=null">Cancel·lar</button>
      <button class="btn btn-danger" (click)="deleteUser()">Eliminar</button>
    </div>
  </div>
</div>
  `
})
export class Admin implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;
  private searchDebounce: any = null;

  tab = 'stats';
  feedback = '';
  feedbackErr = '';
  currentUserId = this.auth.currentUser?.id;

  stats: any = null;

  users: any[] = [];
  usersLoading = false;
  usersPage = 1;
  usersTotalPages = 1;
  usersSearch = '';
  deleteUserTarget: any = null;

  puzzles: any[] = [];
  puzzlesLoading = false;
  puzzlesPage = 1;
  puzzlesTotalPages = 1;
  puzzlesDiff = '';
  showPuzzleModal = false;
  editingPuzzle: any = null;
  savingPuzzle = false;
  puzzleErr = '';
  puzzleForm = { fen: '', solution: '', difficulty: 'intermediate', theme: '', theme_tag: '', rating: 1200, title: '' };

  reports: any[] = [];
  reportsLoading = false;
  reportsPage = 1;
  reportsTotalPages = 1;
  reportsStatus = '';

  adminGames: any[] = [];
  gamesLoading = false;
  gamesPage = 1;
  gamesTotalPages = 1;

  ngOnInit(): void { this.loadStats(); }

  setTab(t: string): void {
    this.tab = t;
    this.feedback = ''; this.feedbackErr = '';
    if (t === 'stats') this.loadStats();
    if (t === 'users') this.loadUsers();
    if (t === 'puzzles') this.loadPuzzles();
    if (t === 'reports') this.loadReports();
    if (t === 'games') this.loadGames();
  }

  loadStats(): void {
    this.http.get(`${this.apiUrl}/admin/stats`).subscribe({
      next: (r: any) => this.stats = r.data,
      error: () => this.feedbackErr = 'Error carregant estadístiques'
    });
  }

  onSearchUsers(): void {
    // Debounce de 300 ms per evitar una crida HTTP per cada tecla
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.usersPage = 1; this.loadUsers(); }, 300);
  }

  loadUsers(): void {
    this.usersLoading = true;
    const params: any = { page: this.usersPage, limit: 15 };
    if (this.usersSearch) params.search = this.usersSearch;
    const qs = new URLSearchParams(params).toString();
    this.http.get(`${this.apiUrl}/admin/users?${qs}`).subscribe({
      next: (r: any) => {
        this.users = r.data?.users || [];
        this.usersTotalPages = r.data?.pages || 1;
        this.usersLoading = false;
      },
      error: () => { this.usersLoading = false; }
    });
  }

  toggleUserRole(u: any): void {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    this.http.put(`${this.apiUrl}/admin/users/${u.id}`, { role: newRole }).subscribe({
      next: () => { u.role = newRole; this.showFeedback('Rol actualitzat correctament'); },
      error: () => this.showFeedbackErr('Error actualitzant el rol')
    });
  }

  toggleUserActive(u: any): void {
    this.http.put(`${this.apiUrl}/admin/users/${u.id}`, { is_active: !u.is_active }).subscribe({
      next: () => { u.is_active = !u.is_active; this.showFeedback('Estat actualitzat'); },
      error: () => this.showFeedbackErr('Error actualitzant l\'estat')
    });
  }

  confirmDeleteUser(u: any): void { this.deleteUserTarget = u; }
  deleteUser(): void {
    if (!this.deleteUserTarget) return;
    this.http.delete(`${this.apiUrl}/admin/users/${this.deleteUserTarget.id}`).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== this.deleteUserTarget.id);
        this.deleteUserTarget = null;
        this.showFeedback('Usuari eliminat');
      },
      error: (e: any) => { this.showFeedbackErr(e.error?.message || 'Error eliminant l\'usuari'); this.deleteUserTarget = null; }
    });
  }

  loadPuzzles(): void {
    this.puzzlesLoading = true;
    const params: any = { page: this.puzzlesPage, limit: 15 };
    if (this.puzzlesDiff) params.difficulty = this.puzzlesDiff;
    const qs = new URLSearchParams(params).toString();
    this.http.get(`${this.apiUrl}/admin/puzzles?${qs}`).subscribe({
      next: (r: any) => {
        this.puzzles = r.data?.puzzles || [];
        this.puzzlesTotalPages = r.data?.pages || 1;
        this.puzzlesLoading = false;
      },
      error: () => { this.puzzlesLoading = false; }
    });
  }

  openPuzzleModal(p?: any): void {
    this.editingPuzzle = p || null;
    this.puzzleErr = '';
    this.puzzleForm = p
      ? { fen: p.fen, solution: p.solution, difficulty: p.difficulty, theme: p.theme_tag || '', theme_tag: p.theme_tag || '', rating: p.rating || 1200, title: p.title || '' }
      : { fen: '', solution: '', difficulty: 'intermediate', theme: '', theme_tag: '', rating: 1200, title: '' };
    this.showPuzzleModal = true;
  }
  closePuzzleModal(): void { this.showPuzzleModal = false; this.editingPuzzle = null; this.puzzleErr = ''; }

  savePuzzle(): void {
    if (!this.puzzleForm.fen || !this.puzzleForm.solution) { this.puzzleErr = 'FEN i moviments són obligatoris'; return; }
    this.savingPuzzle = true; this.puzzleErr = '';
    const obs = this.editingPuzzle?.id
      ? this.http.put(`${this.apiUrl}/admin/puzzles/${this.editingPuzzle.id}`, this.puzzleForm)
      : this.http.post(`${this.apiUrl}/admin/puzzles`, this.puzzleForm);
    obs.subscribe({
      next: () => {
        this.savingPuzzle = false;
        this.closePuzzleModal();
        this.loadPuzzles();
        this.showFeedback(this.editingPuzzle?.id ? 'Puzzle actualitzat' : 'Puzzle creat');
      },
      error: (e: any) => { this.savingPuzzle = false; this.puzzleErr = e.error?.message || 'Error guardant puzzle'; }
    });
  }

  deletePuzzle(id: number): void {
    if (!confirm('Eliminar aquest puzzle?')) return;
    this.http.delete(`${this.apiUrl}/admin/puzzles/${id}`).subscribe({
      next: () => { this.puzzles = this.puzzles.filter(p => p.id !== id); this.showFeedback('Puzzle eliminat'); },
      error: () => this.showFeedbackErr('Error eliminant el puzzle')
    });
  }

  loadReports(): void {
    this.reportsLoading = true;
    const params: any = { page: this.reportsPage, limit: 15 };
    if (this.reportsStatus) params.status = this.reportsStatus;
    const qs = new URLSearchParams(params).toString();
    this.http.get(`${this.apiUrl}/admin/reports?${qs}`).subscribe({
      next: (r: any) => {
        this.reports = r.data?.reports || [];
        this.reportsTotalPages = r.data?.pages || 1;
        this.reportsLoading = false;
      },
      error: () => { this.reportsLoading = false; }
    });
  }

  updateReport(id: number, status: string): void {
    this.http.put(`${this.apiUrl}/admin/reports/${id}`, { status }).subscribe({
      next: () => this.showFeedback('Denúncia actualitzada'),
      error: () => this.showFeedbackErr('Error actualitzant la denúncia')
    });
  }

  loadGames(): void {
    this.gamesLoading = true;
    const qs = new URLSearchParams({ page: String(this.gamesPage), limit: '15' }).toString();
    this.http.get(`${this.apiUrl}/admin/games?${qs}`).subscribe({
      next: (r: any) => {
        this.adminGames = r.data?.games || [];
        this.gamesTotalPages = r.data?.pages || 1;
        this.gamesLoading = false;
      },
      error: () => { this.gamesLoading = false; }
    });
  }

  showFeedback(msg: string): void { this.feedback = msg; this.feedbackErr = ''; setTimeout(() => this.feedback = '', 3000); }
  showFeedbackErr(msg: string): void { this.feedbackErr = msg; setTimeout(() => this.feedbackErr = '', 4000); }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}
