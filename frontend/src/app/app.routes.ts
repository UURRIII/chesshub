import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/lobby', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'lobby',
    canActivate: [authGuard],
    loadComponent: () => import('./features/game/lobby/lobby').then(m => m.Lobby)
  },
  {
    path: 'game/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/game/board/board').then(m => m.Board)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile/profile').then(m => m.Profile)
  },
  {
    path: 'puzzles',
    canActivate: [authGuard],
    loadComponent: () => import('./features/puzzles/puzzles').then(m => m.Puzzles)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin').then(m => m.Admin)
  },
  { path: '**', redirectTo: '/lobby' }
];
