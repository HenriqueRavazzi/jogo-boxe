"use client";

import { create } from "zustand";
import { useGameStore } from "@/store/useGameStore";

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
  /** Aplica dano de contato; em 0 HP limpa a arena e reinicia. */
  takeDamage: (amount: number) => void;
  damagePlayer: (amount: number) => void;
  setEnemies: (enemies: Enemy[]) => void;
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  spawnEnemy: (canvasWidth: number, canvasHeight: number) => void;
  updateEnemies: (
    playerX: number,
    playerY: number,
    dt?: number,
    playerRadius?: number,
    enemyRadius?: number,
  ) => void;
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
const GOLD_PER_KILL = 10;
const CONTACT_DAMAGE = 20;

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

  takeDamage: (amount) => {
    const nextHp = Math.max(0, get().currentHp - amount);

    if (nextHp <= 0) {
      const maxHp = useGameStore.getState().getMaxHp();
      set({
        currentHp: maxHp,
        enemies: [],
        lastAttackTime: 0,
        lastAttackTargetX: null,
        lastAttackTargetY: null,
      });
      alert("Game Over! Reiniciando...");
      return;
    }

    set({ currentHp: nextHp });
  },

  damagePlayer: (amount) => get().takeDamage(amount),

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

  updateEnemies: (
    playerX,
    playerY,
    dt = 1 / 60,
    playerRadius = 18,
    enemyRadius = 12,
  ) => {
    const collideDist = playerRadius + enemyRadius;
    let contactHits = 0;

    const nextEnemies = get()
      .enemies.map((enemy) => {
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.hypot(dx, dy) || 1;
        const step = enemy.speed * dt;
        return {
          ...enemy,
          x: enemy.x + (dx / dist) * step,
          y: enemy.y + (dy / dist) * step,
        };
      })
      .filter((enemy) => {
        const dist = Math.hypot(enemy.x - playerX, enemy.y - playerY);
        // Colisão: inimigo explode e causa dano
        if (dist < collideDist) {
          contactHits += 1;
          return false;
        }
        return true;
      });

    set({ enemies: nextEnemies });

    if (contactHits > 0) {
      get().takeDamage(CONTACT_DAMAGE * contactHits);
    }
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

    // Abate: remove inimigo e concede ouro
    if (nextHp <= 0) {
      useGameStore.getState().addGold(GOLD_PER_KILL);
      set({
        lastAttackTime: now,
        lastAttackTargetX: targetX,
        lastAttackTargetY: targetY,
        enemies: enemies.filter((e) => e.id !== targetId),
      });
      return true;
    }

    set({
      lastAttackTime: now,
      lastAttackTargetX: targetX,
      lastAttackTargetY: targetY,
      enemies: enemies.map((e) =>
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
