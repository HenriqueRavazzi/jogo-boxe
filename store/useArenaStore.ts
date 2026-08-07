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
  lastAttackTime: number;
  /** Alvo do último auto-ataque (feedback visual no canvas). */
  lastAttackTargetX: number | null;
  lastAttackTargetY: number | null;
  setPlayerPosition: (x: number, y: number) => void;
  setCurrentHp: (hp: number) => void;
  damagePlayer: (amount: number) => void;
  setEnemies: (enemies: Enemy[]) => void;
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  spawnEnemy: (canvasWidth: number, canvasHeight: number) => void;
  updateEnemies: (playerX: number, playerY: number, dt?: number) => void;
  processCombat: (
    baseDamage: number,
    attackRange: number,
    attackCooldown: number,
  ) => boolean;
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

export const useArenaStore = create<ArenaStoreState>((set, get) => ({
  currentHp: 100,
  playerX: 0,
  playerY: 0,
  enemies: [],
  lastAttackTime: 0,
  lastAttackTargetX: null,
  lastAttackTargetY: null,

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

  /**
   * Auto-ataca o inimigo mais próximo dentro do alcance, respeitando o cooldown.
   * @returns true se um golpe foi aplicado neste frame
   */
  processCombat: (baseDamage, attackRange, attackCooldown) => {
    const now = performance.now();
    const { playerX, playerY, enemies, lastAttackTime } = get();

    if (enemies.length === 0) return false;
    if (now < lastAttackTime + attackCooldown) return false;

    let nearest: Enemy | null = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - playerX, enemy.y - playerY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    if (!nearest || nearestDist > attackRange) return false;

    const nextHp = nearest.hp - baseDamage;
    const targetId = nearest.id;
    const targetX = nearest.x;
    const targetY = nearest.y;

    set({
      lastAttackTime: now,
      lastAttackTargetX: targetX,
      lastAttackTargetY: targetY,
      enemies:
        nextHp <= 0
          ? enemies.filter((e) => e.id !== targetId)
          : enemies.map((e) =>
              e.id === targetId ? { ...e, hp: nextHp } : e,
            ),
    });

    return true;
  },

  resetArena: (maxHp, centerX, centerY) =>
    set({
      currentHp: maxHp,
      playerX: centerX,
      playerY: centerY,
      enemies: [],
      lastAttackTime: 0,
      lastAttackTargetX: null,
      lastAttackTargetY: null,
    }),
}));
