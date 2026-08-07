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
  resetArena: (maxHp: number, centerX: number, centerY: number) => void;
};

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

  resetArena: (maxHp, centerX, centerY) =>
    set({
      currentHp: maxHp,
      playerX: centerX,
      playerY: centerY,
      enemies: [],
    }),
}));
