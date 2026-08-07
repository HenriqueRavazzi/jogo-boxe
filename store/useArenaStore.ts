"use client";

import { create } from "zustand";

export type Enemy = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
};

/** Estado volátil da partida atual (não persistido). */
export type ArenaStoreState = {
  currentHp: number;
  playerX: number;
  playerY: number;
  enemies: Enemy[];
  setPlayerPosition: (x: number, y: number) => void;
  setCurrentHp: (hp: number) => void;
  damagePlayer: (amount: number) => void;
  setEnemies: (enemies: Enemy[]) => void;
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  spawnEnemy: (canvasWidth: number, canvasHeight: number) => void;
  updateEnemies: (playerX: number, playerY: number, dt?: number) => void;
  resetArena: (maxHp: number, centerX: number, centerY: number) => void;
};

const EDGE_MARGIN = 24;
const DEFAULT_ENEMY_HP = 30;
const DEFAULT_ENEMY_SPEED = 55; // px/s

/** Posição aleatória em uma das quatro bordas do canvas. */
function randomEdgePosition(canvasWidth: number, canvasHeight: number) {
  const edge = Math.floor(Math.random() * 4);

  switch (edge) {
    case 0: // topo
      return { x: Math.random() * canvasWidth, y: -EDGE_MARGIN };
    case 1: // direita
      return { x: canvasWidth + EDGE_MARGIN, y: Math.random() * canvasHeight };
    case 2: // baixo
      return { x: Math.random() * canvasWidth, y: canvasHeight + EDGE_MARGIN };
    default: // esquerda
      return { x: -EDGE_MARGIN, y: Math.random() * canvasHeight };
  }
}

export const useArenaStore = create<ArenaStoreState>((set) => ({
  currentHp: 100,
  playerX: 0,
  playerY: 0,
  enemies: [],

  setPlayerPosition: (x, y) => set({ playerX: x, playerY: y }),

  setCurrentHp: (hp) => set({ currentHp: Math.max(0, hp) }),

  damagePlayer: (amount) =>
    set((s) => ({ currentHp: Math.max(0, s.currentHp - amount) })),

  setEnemies: (enemies) => set({ enemies }),

  addEnemy: (enemy) => set((s) => ({ enemies: [...s.enemies, enemy] })),

  removeEnemy: (id) =>
    set((s) => ({ enemies: s.enemies.filter((e) => e.id !== id) })),

  spawnEnemy: (canvasWidth, canvasHeight) => {
    const { x, y } = randomEdgePosition(canvasWidth, canvasHeight);
    const enemy: Enemy = {
      id: crypto.randomUUID(),
      x,
      y,
      hp: DEFAULT_ENEMY_HP,
      maxHp: DEFAULT_ENEMY_HP,
      speed: DEFAULT_ENEMY_SPEED,
    };
    set((s) => ({ enemies: [...s.enemies, enemy] }));
  },

  updateEnemies: (playerX, playerY, dt = 1 / 60) => {
    set((s) => ({
      enemies: s.enemies.map((enemy) => {
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.hypot(dx, dy) || 1;
        // Normaliza a direção e avança com base em speed (px/s) * dt
        const step = enemy.speed * dt;
        return {
          ...enemy,
          x: enemy.x + (dx / dist) * step,
          y: enemy.y + (dy / dist) * step,
        };
      }),
    }));
  },

  resetArena: (maxHp, centerX, centerY) =>
    set({
      currentHp: maxHp,
      playerX: centerX,
      playerY: centerY,
      enemies: [],
    }),
}));
