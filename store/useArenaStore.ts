"use client";

import { create } from "zustand";
import {
  generateUpgradeOptions,
  type MatchUpgrade,
  type UpgradeType,
} from "@/lib/matchUpgrades";
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

export type MatchBuffs = {
  attackSpeed: number;
  attackRange: number;
  damageMultiplier: number;
};

export type GameState = "menu" | "playing" | "gameover" | "level_up";

const DEFAULT_BUFFS: MatchBuffs = {
  attackSpeed: 1,
  attackRange: 1,
  damageMultiplier: 1,
};

/** Estado volátil da partida atual (não persistido). */
export type ArenaStoreState = {
  gameState: GameState;
  currentHp: number;
  playerX: number;
  playerY: number;
  enemies: Enemy[];
  lastAttackTime: number;
  activeAttacks: ActiveAttack[];
  currentXp: number;
  xpToNextLevel: number;
  matchLevel: number;
  matchBuffs: MatchBuffs;
  levelUpOptions: MatchUpgrade[];
  startGame: () => void;
  setGameOver: () => void;
  addXp: (amount: number) => void;
  selectUpgrade: (upgradeType: UpgradeType, value: number) => void;
  setPlayerPosition: (x: number, y: number) => void;
  setCurrentHp: (hp: number) => void;
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
const DEFAULT_ENEMY_SPEED = 55;
const GOLD_PER_KILL = 10;
const XP_PER_KILL = 25;
const CONTACT_DAMAGE = 20;
const BASE_XP_TO_LEVEL = 100;

function randomEdgePosition(canvasWidth: number, canvasHeight: number) {
  const edge = Math.floor(Math.random() * 4);

  switch (edge) {
    case 0:
      return { x: Math.random() * canvasWidth, y: -EDGE_MARGIN };
    case 1:
      return { x: canvasWidth + EDGE_MARGIN, y: Math.random() * canvasHeight };
    case 2:
      return { x: Math.random() * canvasWidth, y: canvasHeight + EDGE_MARGIN };
    default:
      return { x: -EDGE_MARGIN, y: Math.random() * canvasHeight };
  }
}

function enterLevelUp(
  set: (
    partial:
      | Partial<ArenaStoreState>
      | ((s: ArenaStoreState) => Partial<ArenaStoreState>),
  ) => void,
  xp: number,
  xpToNextLevel: number,
  matchLevel: number,
) {
  set({
    currentXp: xp,
    xpToNextLevel,
    matchLevel,
    gameState: "level_up",
    levelUpOptions: generateUpgradeOptions(3),
  });
}

export const useArenaStore = create<ArenaStoreState>((set, get) => ({
  gameState: "menu",
  currentHp: 100,
  playerX: 0,
  playerY: 0,
  enemies: [],
  lastAttackTime: 0,
  activeAttacks: [],
  currentXp: 0,
  xpToNextLevel: BASE_XP_TO_LEVEL,
  matchLevel: 1,
  matchBuffs: { ...DEFAULT_BUFFS },
  levelUpOptions: [],

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
      currentXp: 0,
      xpToNextLevel: BASE_XP_TO_LEVEL,
      matchLevel: 1,
      matchBuffs: { ...DEFAULT_BUFFS },
      levelUpOptions: [],
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
      levelUpOptions: [],
    }),

  addXp: (amount) => {
    const state = get();
    if (state.gameState !== "playing" && state.gameState !== "level_up") {
      return;
    }
    // Durante level_up, só acumula XP sem subir de novo
    if (state.gameState === "level_up") {
      set({ currentXp: state.currentXp + amount });
      return;
    }

    let xp = state.currentXp + amount;
    let nextReq = state.xpToNextLevel;
    let level = state.matchLevel;

    if (xp >= nextReq) {
      xp -= nextReq;
      level += 1;
      nextReq = Math.floor(nextReq * 1.5);
      enterLevelUp(set, xp, nextReq, level);
      return;
    }

    set({ currentXp: xp });
  },

  selectUpgrade: (upgradeType, value) => {
    set((s) => ({
      matchBuffs: {
        ...s.matchBuffs,
        [upgradeType]: s.matchBuffs[upgradeType] * (1 + value),
      },
      gameState: "playing",
      levelUpOptions: [],
    }));

    // Se ainda houver XP sobrando para outro nível, abre o próximo card pack
    const { currentXp, xpToNextLevel, matchLevel } = get();
    if (currentXp >= xpToNextLevel) {
      const remainder = currentXp - xpToNextLevel;
      enterLevelUp(
        set,
        remainder,
        Math.floor(xpToNextLevel * 1.5),
        matchLevel + 1,
      );
    }
  },

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

  processCombat: (baseDamage, _attackRange, _attackCooldown) => {
    const now = performance.now();
    const {
      playerX,
      playerY,
      enemies,
      lastAttackTime,
      activeAttacks,
      matchBuffs,
    } = get();
    const { arms, armTier, baseRange, baseAttackSpeed } =
      useGameStore.getState();

    if (enemies.length === 0) return false;

    // Cooldown efetivo: baseAttackSpeed / buff de velocidade
    const effectiveCooldown = baseAttackSpeed / matchBuffs.attackSpeed;
    if (now < lastAttackTime + effectiveCooldown) return false;

    // Alcance efetivo: baseRange * buff de range
    const effectiveRange = baseRange * matchBuffs.attackRange;

    const inRange = enemies
      .map((enemy) => ({
        enemy,
        dist: Math.hypot(enemy.x - playerX, enemy.y - playerY),
      }))
      .filter(({ dist }) => dist <= effectiveRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, arms);

    if (inRange.length === 0) return false;

    const damage =
      baseDamage * armTier * matchBuffs.damageMultiplier;
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

    set({
      lastAttackTime: now,
      enemies: nextEnemies,
      activeAttacks: [...activeAttacks, ...newAttacks],
    });

    if (kills > 0) {
      useGameStore.getState().addGold(GOLD_PER_KILL * kills);
      get().addXp(XP_PER_KILL * kills);
    }

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
      currentXp: 0,
      xpToNextLevel: BASE_XP_TO_LEVEL,
      matchLevel: 1,
      matchBuffs: { ...DEFAULT_BUFFS },
      levelUpOptions: [],
    }),
}));
