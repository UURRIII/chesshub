import { Routes } from '@angular/router';

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
    loadComponent: () => import('./features/game/lobby/lobby').then(m => m.Lobby)
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./features/game/board/board').then(m => m.Board)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile/profile').then(m => m.Profile)
  },
  { path: '**', redirectTo: '/lobby' }
];
