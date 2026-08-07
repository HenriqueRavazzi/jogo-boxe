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

export type ActiveAttack = {
  targetX: number;
  targetY: number;
  timestamp: number;
};

export type GameState = "menu" | "playing" | "gameover";

/** Estado volátil da partida atual (não persistido). */
export type ArenaStoreState = {
  gameState: GameState;
  currentHp: number;
  playerX: number;
  playerY: number;
  enemies: Enemy[];
  lastAttackTime: number;
  /** Socos recentes para feedback visual (linha do braço). */
  activeAttacks: ActiveAttack[];
  startGame: () => void;
  setGameOver: () => void;
  setPlayerPosition: (x: number, y: number) => void;
  setCurrentHp: (hp: number) => void;
  /** Aplica dano de contato; em 0 HP limpa a arena e vai para game over. */
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
  pruneActiveAttacks: (maxAgeMs?: number) => void;
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
  gameState: "menu",
  currentHp: 100,
  playerX: 0,
  playerY: 0,
  enemies: [],
  lastAttackTime: 0,
  activeAttacks: [],

  startGame: () => {
    const maxHp = useGameStore.getState().getMaxHp();
    const { playerX, playerY } = get();
    const w = typeof window !== "undefined" ? window.innerWidth : 800;
    const h = typeof window !== "undefined" ? window.innerHeight : 600;

    set({
      gameState: "playing",
      currentHp: maxHp,
      enemies: [],
      lastAttackTime: 0,
      activeAttacks: [],
      playerX: playerX || w / 2,
      playerY: playerY || h / 2,
    });
  },

  setGameOver: () =>
    set({
      gameState: "gameover",
      enemies: [],
      lastAttackTime: 0,
      activeAttacks: [],
    }),

  setPlayerPosition: (x, y) => set({ playerX: x, playerY: y }),

  setCurrentHp: (hp) => set({ currentHp: Math.max(0, hp) }),

  takeDamage: (amount) => {
    const nextHp = Math.max(0, get().currentHp - amount);

    if (nextHp <= 0) {
      set({ currentHp: 0, enemies: [] });
      get().setGameOver();
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
   * Auto-ataca até N inimigos mais próximos (N = braços),
   * com dano baseDamage * armTier.
   */
  processCombat: (baseDamage, attackRange, attackCooldown) => {
    const now = performance.now();
    const { playerX, playerY, enemies, lastAttackTime, activeAttacks } = get();
    const { arms, armTier } = useGameStore.getState();

    if (enemies.length === 0) return false;
    if (now < lastAttackTime + attackCooldown) return false;

    const inRange = enemies
      .map((enemy) => ({
        enemy,
        dist: Math.hypot(enemy.x - playerX, enemy.y - playerY),
      }))
      .filter(({ dist }) => dist <= attackRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, arms);

    if (inRange.length === 0) return false;

    const damage = baseDamage * armTier;
    const hitIds = new Set(inRange.map(({ enemy }) => enemy.id));
    const newAttacks: ActiveAttack[] = inRange.map(({ enemy }) => ({
      targetX: enemy.x,
      targetY: enemy.y,
      timestamp: now,
    }));

    let kills = 0;
    const nextEnemies: Enemy[] = [];

    for (const enemy of enemies) {
      if (!hitIds.has(enemy.id)) {
        nextEnemies.push(enemy);
        continue;
      }

      const nextHp = enemy.hp - damage;
      if (nextHp <= 0) {
        kills += 1;
      } else {
        nextEnemies.push({ ...enemy, hp: nextHp });
      }
    }

    if (kills > 0) {
      useGameStore.getState().addGold(GOLD_PER_KILL * kills);
    }

    set({
      lastAttackTime: now,
      enemies: nextEnemies,
      activeAttacks: [...activeAttacks, ...newAttacks],
    });

    return true;
  },

  pruneActiveAttacks: (maxAgeMs = 150) => {
    const now = performance.now();
    set((s) => ({
      activeAttacks: s.activeAttacks.filter(
        (a) => now - a.timestamp < maxAgeMs,
      ),
    }));
  },

  resetArena: (maxHp, centerX, centerY) =>
    set({
      currentHp: maxHp,
      playerX: centerX,
      playerY: centerY,
      enemies: [],
      lastAttackTime: 0,
      activeAttacks: [],
    }),
}));
