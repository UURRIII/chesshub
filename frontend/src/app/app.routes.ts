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
    path: 'leaderboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/leaderboard/leaderboard').then(m => m.Leaderboard)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin').then(m => m.Admin)
  },
  {
    path: 'player/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/public-profile/public-profile').then(m => m.PublicProfile)
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/game/history/history').then(m => m.History)
  },
  {
    path: 'friends',
    canActivate: [authGuard],
    loadComponent: () => import('./features/friends/friends').then(m => m.Friends)
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email').then(m => m.VerifyEmailComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password').then(m => m.ResetPasswordComponent)
  },
  { path: '**', redirectTo: '/lobby' }
];
