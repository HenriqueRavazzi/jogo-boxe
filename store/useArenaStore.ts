"use client";

import { create } from "zustand";
import {
  generateUpgradeOptions,
  type MatchUpgrade,
  type UpgradeType,
} from "@/lib/matchUpgrades";
import {
  getArmDistribution,
  getArmPunchOrder,
  getArmRestPosition,
} from "@/src/game/entities/Player";
import { PUNCH_DURATION_MS } from "@/src/game/systems/CombatSystem";
import { useGameStore } from "@/store/useGameStore";

export type Enemy = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  vx: number;
  vy: number;
  contactDamage: number;
};

export type ActiveAttack = {
  id: string;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  startTime: number;
  duration: number;
  isRetracting: boolean;
  side: "left" | "right";
  armIndex: number;
};

export type FloatingText = {
  id: string;
  x: number;
  y: number;
  text: string;
  age: number;
  color: string;
};

export type Drop = {
  id: string;
  x: number;
  y: number;
  type: "gold" | "diamond";
  spawnTime: number;
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
  drops: Drop[];
  lastAttackTime: number;
  activeAttacks: ActiveAttack[];
  floatingTexts: FloatingText[];
  shakeFrames: number;
  /** Tempo vivo na partida atual (segundos). */
  timeAlive: number;
  currentXp: number;
  xpToNextLevel: number;
  matchLevel: number;
  matchBuffs: MatchBuffs;
  levelUpOptions: MatchUpgrade[];
  /** Multiplicador de velocidade da partida (1 ou 2). */
  gameSpeed: number;
  startGame: () => void;
  setGameOver: () => void;
  /** Volta ao menu mantendo o progresso persistente (claim & exit). */
  exitMatch: () => void;
  toggleGameSpeed: () => void;
  addXp: (amount: number) => void;
  selectUpgrade: (upgradeType: UpgradeType, value: number) => void;
  setPlayerPosition: (x: number, y: number) => void;
  /** Sempre centraliza o jogador no canvas (CSS px). */
  centerPlayer: (canvasWidth: number, canvasHeight: number) => void;
  setCurrentHp: (hp: number) => void;
  takeDamage: (amount: number) => void;
  damagePlayer: (amount: number) => void;
  setEnemies: (enemies: Enemy[]) => void;
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  spawnEnemy: (canvasWidth: number, canvasHeight: number) => void;
  addFloatingTexts: (texts: FloatingText[]) => void;
  tickFloatingTexts: () => void;
  triggerShake: (frames?: number) => void;
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
  // Recompensa de diamante por level up in-match
  useGameStore.getState().addGems(1);
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
  drops: [],
  lastAttackTime: 0,
  activeAttacks: [],
  floatingTexts: [],
  shakeFrames: 0,
  timeAlive: 0,
  currentXp: 0,
  xpToNextLevel: BASE_XP_TO_LEVEL,
  matchLevel: 1,
  matchBuffs: { ...DEFAULT_BUFFS },
  levelUpOptions: [],
  gameSpeed: 1,

  startGame: () => {
    const maxHp = useGameStore.getState().getMaxHp();
    const { playerX, playerY } = get();
    const w = typeof window !== "undefined" ? window.innerWidth : 800;
    const h = typeof window !== "undefined" ? window.innerHeight : 600;

    set({
      gameState: "playing",
      currentHp: maxHp,
      enemies: [],
      drops: [],
      lastAttackTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      shakeFrames: 0,
      timeAlive: 0,
      currentXp: 0,
      xpToNextLevel: BASE_XP_TO_LEVEL,
      matchLevel: 1,
      matchBuffs: { ...DEFAULT_BUFFS },
      levelUpOptions: [],
      gameSpeed: 1,
      playerX: playerX || w / 2,
      playerY: playerY || h / 2,
    });
  },

  setGameOver: () =>
    set({
      gameState: "gameover",
      enemies: [],
      drops: [],
      lastAttackTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      shakeFrames: 0,
      levelUpOptions: [],
    }),

  /** Claim & exit: limpa a arena e volta ao menu (ouro/gems já estão no useGameStore). */
  exitMatch: () =>
    set({
      gameState: "menu",
      enemies: [],
      drops: [],
      lastAttackTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      shakeFrames: 0,
      timeAlive: 0,
      currentXp: 0,
      xpToNextLevel: BASE_XP_TO_LEVEL,
      matchLevel: 1,
      matchBuffs: { ...DEFAULT_BUFFS },
      levelUpOptions: [],
      gameSpeed: 1,
      currentHp: useGameStore.getState().getMaxHp(),
    }),

  toggleGameSpeed: () =>
    set((s) => ({ gameSpeed: s.gameSpeed === 1 ? 2 : 1 })),

  addFloatingTexts: (texts) =>
    set((s) => ({ floatingTexts: [...s.floatingTexts, ...texts] })),

  tickFloatingTexts: () =>
    set((s) => ({
      floatingTexts: s.floatingTexts
        .map((t) => ({ ...t, age: t.age + 1, y: t.y - 0.8 }))
        .filter((t) => t.age < 60),
    })),

  triggerShake: (frames = 10) => set({ shakeFrames: frames }),

  addXp: (baseAmount) => {
    const state = get();
    if (state.gameState !== "playing" && state.gameState !== "level_up") {
      return;
    }

    const { xpBonusLevel } = useGameStore.getState();
    const finalXp = Math.round(baseAmount * (1 + xpBonusLevel * 0.1));

    // Durante level_up, só acumula XP sem subir de novo
    if (state.gameState === "level_up") {
      set({ currentXp: state.currentXp + finalXp });
      return;
    }

    let xp = state.currentXp + finalXp;
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

  centerPlayer: (canvasWidth, canvasHeight) =>
    set({
      playerX: canvasWidth / 2,
      playerY: canvasHeight / 2,
    }),

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
    const timeAlive = get().timeAlive;
    const cycles = Math.floor(timeAlive / 15);
    const currentEnemyMaxHp = Math.round(
      DEFAULT_ENEMY_HP * Math.pow(1.05, cycles),
    );
    const enemy: Enemy = {
      id: crypto.randomUUID(),
      x,
      y,
      hp: currentEnemyMaxHp,
      maxHp: currentEnemyMaxHp,
      speed: DEFAULT_ENEMY_SPEED,
      vx: 0,
      vy: 0,
      contactDamage: CONTACT_DAMAGE,
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
    const wallClock = Date.now();
    const {
      playerX,
      playerY,
      enemies,
      lastAttackTime,
      activeAttacks,
      matchBuffs,
    } = get();
    const { arms, getAttackRange, getAttackCooldown, getBaseDamage } =
      useGameStore.getState();

    if (enemies.length === 0) return false;

    const effectiveCooldown = getAttackCooldown() / matchBuffs.attackSpeed;
    if (now < lastAttackTime + effectiveCooldown) return false;

    const effectiveRange = getAttackRange() * matchBuffs.attackRange;

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
      (baseDamage || getBaseDamage()) * matchBuffs.damageMultiplier;
    const hitIds = new Set(inRange.map(({ enemy }) => enemy.id));
    const { leftArms, rightArms } = getArmDistribution(arms);
    const punchOrder = getArmPunchOrder(arms);

    const newAttacks: ActiveAttack[] = inRange.map(({ enemy }, i) => {
      const arm = punchOrder[i] ?? punchOrder[punchOrder.length - 1]!;
      const armsOnSide = arm.side === "left" ? leftArms : rightArms;
      const rest = getArmRestPosition(
        playerX,
        playerY,
        arm.side,
        arm.armIndex,
        armsOnSide,
      );
      return {
        id: crypto.randomUUID(),
        targetX: enemy.x,
        targetY: enemy.y,
        startX: rest.x,
        startY: rest.y,
        startTime: wallClock,
        duration: PUNCH_DURATION_MS,
        isRetracting: false,
        side: arm.side,
        armIndex: arm.armIndex,
      };
    });

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

  pruneActiveAttacks: (maxAgeMs = PUNCH_DURATION_MS * 2) => {
    const now = Date.now();
    set((s) => ({
      activeAttacks: s.activeAttacks
        .map((a) => {
          if (!a.isRetracting && now - a.startTime >= a.duration) {
            return { ...a, isRetracting: true, startTime: now };
          }
          return a;
        })
        .filter((a) => !(a.isRetracting && now - a.startTime >= a.duration)),
    }));
  },

  resetArena: (maxHp, centerX, centerY) =>
    set({
      currentHp: maxHp,
      playerX: centerX,
      playerY: centerY,
      enemies: [],
      drops: [],
      lastAttackTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      shakeFrames: 0,
      timeAlive: 0,
      currentXp: 0,
      xpToNextLevel: BASE_XP_TO_LEVEL,
      matchLevel: 1,
      matchBuffs: { ...DEFAULT_BUFFS },
      levelUpOptions: [],
    }),
}));
