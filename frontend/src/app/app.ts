import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

const BOARD_THEMES = [
  ['#f0d9b5','#b58863'],['#dee3e6','#8ca2ad'],['#ffffdd','#86a666'],
  ['#f0e9d2','#8877b8'],['#f5deb3','#cd5c5c'],['#c8c8c8','#4a4a6a'],
  ['#e8c99a','#7b4f2e'],['#e8f4f8','#6baed6'],['#dde8cc','#557a47'],
  ['#f2d9a2','#a07850']
];

const PIECE_COLORS = [
  ['#fff','#111'],['#111','#fff'],['#f5f5f5','#333'],['#2c2c2c','#f5c518'],
  ['#1a2e1a','#81b64c'],['#1a1a3e','#a0a0ff'],['#2e0a0a','#ff6b6b'],
  ['#faf0e6','#5c4a1e'],['#2c3e50','#bdc3c7'],['#0d0d0d','#39ff14']
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('frontend');

  ngOnInit(): void {
    const theme = localStorage.getItem('ch_theme') || 'dark';
    document.body.classList.toggle('light-theme', theme === 'light');
    document.body.classList.toggle('dark-theme', theme === 'dark');

    const bi = parseInt(localStorage.getItem('ch_board') || '0');
    const t = BOARD_THEMES[bi] || BOARD_THEMES[0];
    document.documentElement.style.setProperty('--sq-light', t[0]);
    document.documentElement.style.setProperty('--sq-dark',  t[1]);

    const pw = ['#fff','#111','#f5f5f5','#f5c518','#81b64c','#a0a0ff','#ff6b6b','#faf0e6','#bdc3c7','#39ff14'];
    const pb = ['#111','#fff','#222','#111','#0a1f0a','#0a0a2e','#2e0000','#5c4a1e','#1a252f','#0d0d0d'];
    const pi = parseInt(localStorage.getItem('ch_piece') || '0');
    document.documentElement.style.setProperty('--piece-w', pw[pi]);
    document.documentElement.style.setProperty('--piece-b', pb[pi]);
  }
}
