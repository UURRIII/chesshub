import { Injectable } from '@angular/core';

/**
 * EngineService — integració del motor d'escacs Stockfish.
 *
 * Stockfish s'executa íntegrament al NAVEGADOR del client, dins un Web Worker,
 * carregat via WebAssembly (fitxers a /engine/). El servidor no executa cap IA:
 * només serveix els fitxers estàtics del motor.
 *
 * Stockfish decideix els seus moviments amb tècniques d'intel·ligència
 * artificial: cerca adversària amb l'algoritme alfa-beta (amb poda) sobre
 * l'arbre de jocs i una funció d'avaluació heurística de les posicions.
 */
@Injectable({ providedIn: 'root' })
export class EngineService {
  private worker: Worker | null = null;
  private resolver: ((uci: string | null) => void) | null = null;
  private guard: any = null;

  /** Carrega el motor en un Web Worker. Idempotent: només crea el worker un cop. */
  init(): void {
    if (this.worker) return;
    try {
      this.worker = new Worker('engine/stockfish.js');
      this.worker.onmessage = (e: MessageEvent) => this.onMessage(e);
      this.worker.onerror   = () => this.dispose();
      this.worker.postMessage('uci');
      this.worker.postMessage('isready');
    } catch {
      this.worker = null;
    }
  }

  get available(): boolean {
    return this.worker !== null;
  }

  private onMessage(e: MessageEvent): void {
    const line = typeof e.data === 'string' ? e.data : '';
    if (line.startsWith('bestmove')) {
      const parts = line.split(/\s+/);
      const uci   = parts[1] && parts[1] !== '(none)' ? parts[1] : null;
      this.settle(uci);
    }
  }

  private settle(uci: string | null): void {
    if (this.guard) { clearTimeout(this.guard); this.guard = null; }
    const r = this.resolver;
    this.resolver = null;
    if (r) r(uci);
  }

  /**
   * Calcula el millor moviment (en notació UCI) per a una posició FEN.
   * @param fen   posició actual
   * @param level dificultat 1 (molt fluix) … 10 (molt fort)
   */
  bestMove(fen: string, level: number): Promise<string | null> {
    this.init();
    return new Promise((resolve) => {
      if (!this.worker) { resolve(null); return; }

      // Si hi havia una petició pendent, la tanquem buida
      if (this.resolver) this.settle(null);
      this.resolver = resolve;

      const lvl      = Math.max(1, Math.min(10, Math.round(level || 5)));
      const skill    = Math.round(((lvl - 1) / 9) * 20);   // 0 … 20
      const depth    = 2 + lvl;                            // 3 … 12
      const moveTime = 200 + lvl * 130;                    // 330 … 1500 ms

      this.worker.postMessage('setoption name Skill Level value ' + skill);
      this.worker.postMessage('position fen ' + fen);
      this.worker.postMessage('go depth ' + depth + ' movetime ' + moveTime);

      // Salvaguarda: si el motor no respon, no deixem la promesa penjada
      this.guard = setTimeout(() => this.settle(null), 9000);
    });
  }

  /** Atura i allibera el motor. */
  dispose(): void {
    if (this.guard) { clearTimeout(this.guard); this.guard = null; }
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    this.resolver = null;
  }
}
