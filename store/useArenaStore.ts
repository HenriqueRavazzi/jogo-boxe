"use client";

import { create } from "zustand";
import {
  applyQuestProgress,
  createRandomQuests,
  createReplacementQuest,
  type ActiveQuest,
  type QuestProgressEvent,
} from "@/lib/quests";
import {
  generateUpgradeOptions,
  isSpecialSkillType,
  type MatchUpgrade,
  type SpecialSkillKey,
  type UpgradeType,
} from "@/lib/matchUpgrades";
import {
  DEFAULT_MATCH_SKILLS,
  type MatchSkillsData,
} from "@/db/schema";
import {
  getArmDistribution,
  getArmRestPosition,
  pickNextPunchSide,
} from "@/src/game/entities/Player";
import {
  createActiveSkillPulseState,
  type ActiveSkillPulseState,
  type LightningProjectile,
  type SkillVfxEffect,
} from "@/src/game/systems/ActiveSkillsSystem";
import type { RicochetPathEffect } from "@/src/game/systems/CombatSystem";
import { PUNCH_DURATION_MS } from "@/src/game/systems/CombatSystem";
import { useGameStore } from "@/store/useGameStore";
import type { EnemyRewards } from "@/lib/gameConfig";
import {
  getStageDef,
  type RunMode,
  type StageDef,
} from "@/lib/stages";

export type { ActiveQuest, QuestProgressEvent } from "@/lib/quests";

export type EnemyType = "normal" | "dasher" | "ranged" | "boss";

export type EnemyStatusEffect = {
  type: "freeze" | "shock" | "burn";
  expiresAt: number;
  burnDps?: number;
  burnStacks?: number;
  burnDpsPerStack?: number;
  burnStackExpires?: number[];
  slowAmount?: number;
  vulnerable?: boolean;
  damageTakenMultiplier?: number;
};

export type Enemy = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  vx: number;
  vy: number;
  attackDamage: number;
  attackCooldown: number;
  lastAttackTime: number;
  isAttacking: boolean;
  projectileDamage: number;
  type: EnemyType;
  radius: number;
  color?: string;
  statusEffects: EnemyStatusEffect[];
  rewards?: EnemyRewards;
};

export type EnemyProjectile = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
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
  /** Punch normal vs segmento de ricochete. */
  kind?: "punch" | "ricochet";
  /**
   * true = linha ombro→luva; false = segmento encadeado (alvo→alvo).
   * Default true para punches.
   */
  fromShoulder?: boolean;
};

export type FloatingText = {
  id: string;
  x: number;
  y: number;
  text: string;
  age: number;
  color: string;
  /** Escala de fonte (ex.: críticos). */
  scale?: number;
};

export type Drop = {
  id: string;
  x: number;
  y: number;
  type: "gold" | "diamond" | "purple_diamond";
  spawnTime: number;
};

export type RunStats = {
  enemiesDefeated: number;
  goldCollected: number;
  diamondsCollected: number;
  purpleDiamondsCollected: number;
  bossesKilled: number;
};

export type MatchBuffs = {
  attackSpeed: number;
  attackRange: number;
  damageMultiplier: number;
  critDamageMultiplier: number;
  skillDamageMultiplier: number;
  knockbackMultiplier: number;
};

export type GameState =
  | "menu"
  | "playing"
  | "gameover"
  | "victory"
  | "level_up";

const DEFAULT_BUFFS: MatchBuffs = {
  attackSpeed: 1,
  attackRange: 1,
  damageMultiplier: 1,
  critDamageMultiplier: 1,
  skillDamageMultiplier: 1,
  knockbackMultiplier: 1,
};

const EMPTY_RUN_STATS: RunStats = {
  enemiesDefeated: 0,
  goldCollected: 0,
  diamondsCollected: 0,
  purpleDiamondsCollected: 0,
  bossesKilled: 0,
};

/** Estado volátil da partida atual (não persistido). */
export type ArenaStoreState = {
  gameState: GameState;
  currentHp: number;
  playerX: number;
  playerY: number;
  /** Facing do jogador em radianos (atan2); −π/2 = cima. */
  playerRotation: number;
  enemies: Enemy[];
  drops: Drop[];
  /** Projéteis de inimigos ranged. */
  projectiles: EnemyProjectile[];
  lastAttackTime: number;
  /** Último lado que socou (próximo ataque alterna). */
  lastPunchSide: "left" | "right";
  /** Timestamp (game clock) do último ricochete. */
  lastRicochetTime: number;
  activeAttacks: ActiveAttack[];
  floatingTexts: FloatingText[];
  /** Traços ciano da cadeia de ricochete (curta duração). */
  ricochetPathEffects: RicochetPathEffect[];
  shakeFrames: number;
  /** Tempo vivo na partida atual (segundos). */
  timeAlive: number;
  /** Relógio da partida em ms (mesmo usado por skills/combate). */
  gameClockMs: number;
  currentXp: number;
  xpToNextLevel: number;
  matchLevel: number;
  matchBuffs: MatchBuffs;
  /**
   * Níveis de skills especiais ativos nesta run (começa em 0).
   * Só sobem ao escolher cartas de level-up.
   */
  matchSkills: MatchSkillsData;
  /**
   * Skills especiais distintas já escolhidas nesta partida (máx. 2).
   * Controla quais cartas novas podem aparecer no level-up.
   */
  activeRunSkills: SpecialSkillKey[];
  /** Timers / janelas ativas de Gelo / Raio / Ricochete. */
  activeSkillPulse: ActiveSkillPulseState;
  /** Projéteis elétricos do Raio. */
  lightningProjectiles: LightningProjectile[];
  /** VFX temporários (gelo / raio). */
  skillVfxEffects: SkillVfxEffect[];
  levelUpOptions: MatchUpgrade[];
  /**
   * Pausa de combate durante a escolha de carta de level-up.
   * Independente do pause manual (ESC).
   */
  isPausedForLevelUp: boolean;
  /** Segundos restantes para auto-seleção (45 → 0). */
  levelUpTimeRemaining: number;
  /** Deadline absoluta (Date.now) da auto-seleção; null se inativo. */
  levelUpDeadlineAt: number | null;
  /** Estatísticas da run atual. */
  runStats: RunStats;
  /** Quantos bosses já foram invocados nesta run (ciclos de 240s / 4 min). */
  bossesSpawned: number;
  /** Quantos bosses já foram derrotados nesta run (scaling de diamante roxo). */
  bossesKilled: number;
  /** Cooldown (ms) até a próxima invasão de boss na horda. */
  invasionBossCooldownMs: number;
  /**
   * Até quando (game clock ms) o alerta de boss na horda permanece ativo.
   * 0 = sem alerta.
   */
  bossHordeAlertUntil: number;
  /** Missões ativas da partida atual. */
  activeQuests: ActiveQuest[];
  /** Partida pausada (ESC) — trava física/tempo. */
  isPaused: boolean;
  /** Campanha ou endless nesta run. */
  runMode: RunMode;
  /** Fase atual (ignorada em endless). */
  runStageNumber: number;
  /** Snapshot da fase para o spawner / vitória. */
  runStage: StageDef | null;
  /** Chefe da fase já foi derrotado (modo stage). */
  stageBossDefeated: boolean;
  /** Comuns já spawnados nesta fase (cota). */
  stageCommonsSpawned: number;
  /** Inimigos derrotados nesta fase (comuns + chefe). */
  stageEnemiesDefeated: number;
  /** Recompensa da última vitória de fase (null em derrota / endless). */
  stageClearReward: {
    stageNumber: number;
    firstClear: boolean;
    gold: number;
    gems: number;
  } | null;
  startGame: () => void;
  setGameOver: () => void;
  /** Vitória da fase: persiste progresso e recompensas bônus. */
  setVictory: () => void;
  /** Volta ao menu mantendo o progresso persistente (claim & exit). */
  exitMatch: () => void;
  togglePause: () => void;
  recordEnemyDefeats: (count: number) => void;
  recordLootCollected: (
    gold: number,
    diamonds: number,
    purpleDiamonds?: number,
  ) => void;
  /** Dispara alerta visual de boss surpresa na horda (2s). */
  triggerBossHordeAlert: (durationMs?: number) => void;
  /** Incrementa progresso das quests a partir de eventos de combate. */
  progressQuests: (events: QuestProgressEvent[]) => void;
  /**
   * Coleta recompensa de uma quest concluída e gera outra no lugar.
   * Retorna diamantes ganhos, ou null se inválida.
   */
  claimQuest: (questId: string) => number | null;
  addXp: (amount: number) => void;
  selectUpgrade: (upgradeType: UpgradeType, value: number) => void;
  /**
   * Sincroniza o countdown de level-up com o relógio real.
   * Em 0, escolhe uma carta aleatória automaticamente.
   */
  tickLevelUpCountdown: () => void;
  /** Escolhe uma carta aleatória entre as opções atuais (timeout). */
  autoSelectRandomUpgrade: () => void;
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
/** Tempo (s) para o jogador escolher uma carta antes da auto-seleção. */
const LEVEL_UP_TIMEOUT_SEC = 45;

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

function rollLevelUpOptions(
  matchSkills: MatchSkillsData,
  matchBuffs: MatchBuffs,
  activeRunSkills: SpecialSkillKey[],
  timeAlive: number,
  matchLevel: number,
): MatchUpgrade[] {
  const game = useGameStore.getState();
  const stats = game.getEffectiveStats();
  return generateUpgradeOptions(3, {
    unlockedSkills: game.unlockedSkills,
    matchSkills,
    skills: game.skills,
    activeRunSkills,
    effectiveRange: stats.attackRange * matchBuffs.attackRange,
    effectiveCooldownMs: stats.attackCooldownMs / matchBuffs.attackSpeed,
    timeAlive,
    matchLevel,
  });
}

function enterLevelUp(
  set: (
    partial:
      | Partial<ArenaStoreState>
      | ((s: ArenaStoreState) => Partial<ArenaStoreState>),
  ) => void,
  get: () => ArenaStoreState,
  xp: number,
  xpToNextLevel: number,
  matchLevel: number,
) {
  // Recompensa de diamante por level up in-match
  useGameStore.getState().addGems(1);
  const state = get();
  set({
    currentXp: xp,
    xpToNextLevel,
    matchLevel,
    gameState: "level_up",
    isPausedForLevelUp: true,
    levelUpTimeRemaining: LEVEL_UP_TIMEOUT_SEC,
    levelUpDeadlineAt: Date.now() + LEVEL_UP_TIMEOUT_SEC * 1000,
    levelUpOptions: rollLevelUpOptions(
      state.matchSkills,
      state.matchBuffs,
      state.activeRunSkills,
      state.timeAlive,
      matchLevel,
    ),
  });
}

export const useArenaStore = create<ArenaStoreState>((set, get) => ({
  gameState: "menu",
  currentHp: 100,
  playerX: 0,
  playerY: 0,
  playerRotation: -Math.PI / 2,
  enemies: [],
  drops: [],
  projectiles: [],
  lastAttackTime: 0,
  lastPunchSide: "right",
  lastRicochetTime: 0,
  activeAttacks: [],
  floatingTexts: [],
  ricochetPathEffects: [],
  shakeFrames: 0,
  timeAlive: 0,
  gameClockMs: 0,
  currentXp: 0,
  xpToNextLevel: BASE_XP_TO_LEVEL,
  matchLevel: 1,
  matchBuffs: { ...DEFAULT_BUFFS },
  matchSkills: { ...DEFAULT_MATCH_SKILLS },
  activeRunSkills: [],
  activeSkillPulse: createActiveSkillPulseState(),
  lightningProjectiles: [],
  skillVfxEffects: [],
  levelUpOptions: [],
  isPausedForLevelUp: false,
  levelUpTimeRemaining: 0,
  levelUpDeadlineAt: null,
  runStats: { ...EMPTY_RUN_STATS },
  bossesSpawned: 0,
  bossesKilled: 0,
  invasionBossCooldownMs: 0,
  bossHordeAlertUntil: 0,
  activeQuests: [],
  isPaused: false,
  runMode: "stage",
  runStageNumber: 1,
  runStage: null,
  stageBossDefeated: false,
  stageCommonsSpawned: 0,
  stageEnemiesDefeated: 0,
  stageClearReward: null,

  startGame: () => {
    const game = useGameStore.getState();
    const stats = game.getEffectiveStats();
    const startingGoldBonus = game.getStartingGoldBonus();
    if (startingGoldBonus > 0) {
      game.addGold(startingGoldBonus, { applyIncome: false });
    }
    const { playerX, playerY } = get();
    const w = typeof window !== "undefined" ? window.innerWidth : 800;
    const h = typeof window !== "undefined" ? window.innerHeight : 600;

    const runMode: RunMode =
      game.selectedRunMode === "endless" && game.endlessUnlocked
        ? "endless"
        : "stage";
    const runStageNumber =
      runMode === "stage"
        ? Math.max(1, Math.min(50, game.selectedStage || 1))
        : 0;
    const runStage = runMode === "stage" ? getStageDef(runStageNumber) : null;

    set({
      gameState: "playing",
      currentHp: stats.maxHp,
      enemies: [],
      drops: [],
      projectiles: [],
      lastAttackTime: 0,
      lastPunchSide: "right",
      lastRicochetTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      ricochetPathEffects: [],
      shakeFrames: 0,
      timeAlive: 0,
      gameClockMs: 0,
      currentXp: 0,
      xpToNextLevel: BASE_XP_TO_LEVEL,
      matchLevel: 1,
      matchBuffs: { ...DEFAULT_BUFFS },
      matchSkills: { ...DEFAULT_MATCH_SKILLS },
      activeRunSkills: [],
      activeSkillPulse: createActiveSkillPulseState(),
      lightningProjectiles: [],
      skillVfxEffects: [],
      levelUpOptions: [],
      isPausedForLevelUp: false,
      levelUpTimeRemaining: 0,
      levelUpDeadlineAt: null,
      runStats: { ...EMPTY_RUN_STATS },
      bossesSpawned: 0,
      bossesKilled: 0,
      invasionBossCooldownMs: 0,
      bossHordeAlertUntil: 0,
      activeQuests: createRandomQuests(2),
      isPaused: false,
      playerRotation: -Math.PI / 2,
      playerX: playerX || w / 2,
      playerY: playerY || h / 2,
      runMode,
      runStageNumber,
      runStage,
      stageBossDefeated: false,
      stageCommonsSpawned: 0,
      stageEnemiesDefeated: 0,
      stageClearReward: null,
    });
  },

  setGameOver: () =>
    set({
      gameState: "gameover",
      enemies: [],
      drops: [],
      projectiles: [],
      lastAttackTime: 0,
      lastPunchSide: "right",
      lastRicochetTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      ricochetPathEffects: [],
      shakeFrames: 0,
      levelUpOptions: [],
      isPausedForLevelUp: false,
      levelUpTimeRemaining: 0,
      levelUpDeadlineAt: null,
      bossHordeAlertUntil: 0,
      activeQuests: [],
      isPaused: false,
      activeSkillPulse: createActiveSkillPulseState(),
      lightningProjectiles: [],
      skillVfxEffects: [],
      stageClearReward: null,
    }),

  setVictory: () => {
    if (get().gameState === "victory") return;
    const { runMode, runStageNumber } = get();
    let stageClearReward: {
      stageNumber: number;
      firstClear: boolean;
      gold: number;
      gems: number;
    } | null = null;
    if (runMode === "stage" && runStageNumber > 0) {
      const rewards = useGameStore
        .getState()
        .completeStageClear(runStageNumber);
      stageClearReward = {
        stageNumber: runStageNumber,
        ...rewards,
      };
    }
    set({
      gameState: "victory",
      enemies: [],
      drops: [],
      projectiles: [],
      lastAttackTime: 0,
      lastPunchSide: "right",
      lastRicochetTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      ricochetPathEffects: [],
      shakeFrames: 0,
      levelUpOptions: [],
      isPausedForLevelUp: false,
      levelUpTimeRemaining: 0,
      levelUpDeadlineAt: null,
      bossHordeAlertUntil: 0,
      activeQuests: [],
      isPaused: false,
      activeSkillPulse: createActiveSkillPulseState(),
      lightningProjectiles: [],
      skillVfxEffects: [],
      stageClearReward,
    });
  },

  /** Claim & exit: limpa a arena e volta ao menu (ouro/gems já estão no useGameStore). */
  exitMatch: () =>
    set({
      gameState: "menu",
      enemies: [],
      drops: [],
      projectiles: [],
      lastAttackTime: 0,
      lastPunchSide: "right",
      lastRicochetTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      ricochetPathEffects: [],
      shakeFrames: 0,
      timeAlive: 0,
      gameClockMs: 0,
      currentXp: 0,
      xpToNextLevel: BASE_XP_TO_LEVEL,
      matchLevel: 1,
      bossesSpawned: 0,
      bossesKilled: 0,
      invasionBossCooldownMs: 0,
      bossHordeAlertUntil: 0,
      activeQuests: [],
      isPaused: false,
      playerRotation: -Math.PI / 2,
      matchBuffs: { ...DEFAULT_BUFFS },
      matchSkills: { ...DEFAULT_MATCH_SKILLS },
      activeRunSkills: [],
      activeSkillPulse: createActiveSkillPulseState(),
      lightningProjectiles: [],
      skillVfxEffects: [],
      levelUpOptions: [],
      isPausedForLevelUp: false,
      levelUpTimeRemaining: 0,
      levelUpDeadlineAt: null,
      runStats: { ...EMPTY_RUN_STATS },
      currentHp: useGameStore.getState().getEffectiveStats().maxHp,
      stageClearReward: null,
      stageBossDefeated: false,
      stageCommonsSpawned: 0,
      stageEnemiesDefeated: 0,
    }),

  togglePause: () => {
    const { gameState, isPaused } = get();
    if (gameState !== "playing") return;
    set({ isPaused: !isPaused });
  },

  recordEnemyDefeats: (count) => {
    if (count <= 0) return;
    set((s) => ({
      runStats: {
        ...s.runStats,
        enemiesDefeated: s.runStats.enemiesDefeated + count,
      },
    }));
  },

  recordLootCollected: (gold, diamonds, purpleDiamonds = 0) => {
    if (gold <= 0 && diamonds <= 0 && purpleDiamonds <= 0) return;
    set((s) => ({
      runStats: {
        ...s.runStats,
        goldCollected: s.runStats.goldCollected + gold,
        diamondsCollected: s.runStats.diamondsCollected + diamonds,
        purpleDiamondsCollected:
          s.runStats.purpleDiamondsCollected + purpleDiamonds,
      },
    }));
  },

  triggerBossHordeAlert: (durationMs = 2_000) => {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    set({ bossHordeAlertUntil: now + durationMs });
  },

  progressQuests: (events) => {
    if (!events.length) return;
    set((s) => ({
      activeQuests: applyQuestProgress(s.activeQuests, events),
    }));
  },

  claimQuest: (questId) => {
    const quest = get().activeQuests.find((q) => q.id === questId);
    if (!quest || !quest.completed) return null;

    const reward = quest.rewardDiamonds;
    const remaining = get().activeQuests.filter((q) => q.id !== questId);
    const replacement = createReplacementQuest(remaining);

    set({ activeQuests: [...remaining, replacement] });
    return reward;
  },

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

    const finalXp = Math.round(
      baseAmount * useGameStore.getState().getEffectiveStats().xpMultiplier,
    );

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
      enterLevelUp(set, get, xp, nextReq, level);
      return;
    }

    set({ currentXp: xp });
  },

  selectUpgrade: (upgradeType, value) => {
    if (isSpecialSkillType(upgradeType)) {
      set((s) => {
        const prevLevel = s.matchSkills[upgradeType] ?? 0;
        const nextSkills = {
          ...s.matchSkills,
          [upgradeType]: prevLevel + 1,
        };
        const alreadyTracked = s.activeRunSkills.includes(upgradeType);
        const activeRunSkills =
          prevLevel === 0 && !alreadyTracked
            ? [...s.activeRunSkills, upgradeType]
            : s.activeRunSkills;
        return {
          matchSkills: nextSkills,
          activeRunSkills,
          gameState: "playing" as const,
          levelUpOptions: [],
          isPausedForLevelUp: false,
          levelUpTimeRemaining: 0,
          levelUpDeadlineAt: null,
        };
      });
    } else {
      set((s) => ({
        matchBuffs: {
          ...s.matchBuffs,
          [upgradeType]:
            s.matchBuffs[upgradeType as keyof MatchBuffs] * (1 + value),
        },
        gameState: "playing",
        levelUpOptions: [],
        isPausedForLevelUp: false,
        levelUpTimeRemaining: 0,
        levelUpDeadlineAt: null,
      }));
    }

    // Se ainda houver XP sobrando para outro nível, abre o próximo card pack
    const { currentXp, xpToNextLevel, matchLevel } = get();
    if (currentXp >= xpToNextLevel) {
      const remainder = currentXp - xpToNextLevel;
      enterLevelUp(
        set,
        get,
        remainder,
        Math.floor(xpToNextLevel * 1.5),
        matchLevel + 1,
      );
    }
  },

  tickLevelUpCountdown: () => {
    const state = get();
    if (
      state.gameState !== "level_up" ||
      !state.isPausedForLevelUp ||
      state.levelUpDeadlineAt == null
    ) {
      return;
    }

    const remainingMs = state.levelUpDeadlineAt - Date.now();
    const remainingSec = Math.max(0, remainingMs / 1000);

    if (remainingSec <= 0) {
      set({ levelUpTimeRemaining: 0 });
      get().autoSelectRandomUpgrade();
      return;
    }

    if (Math.ceil(remainingSec) !== Math.ceil(state.levelUpTimeRemaining)) {
      set({ levelUpTimeRemaining: remainingSec });
    }
  },

  autoSelectRandomUpgrade: () => {
    const { gameState, levelUpOptions } = get();
    if (gameState !== "level_up" || levelUpOptions.length === 0) return;
    const card =
      levelUpOptions[Math.floor(Math.random() * levelUpOptions.length)];
    if (!card) return;
    get().selectUpgrade(card.type, card.value);
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
    const hpMul =
      useGameStore.getState().getDifficultyMultipliers().enemyHpMultiplier ||
      1;
    const currentEnemyMaxHp = Math.max(
      1,
      Math.floor(DEFAULT_ENEMY_HP * Math.pow(1.1, cycles) * hpMul),
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
      attackDamage: 1.2 * hpMul,
      attackCooldown: 1000,
      lastAttackTime: 0,
      isAttacking: false,
      projectileDamage: 0,
      type: "normal",
      radius: 12,
      statusEffects: [],
    };
    set((s) => ({ enemies: [...s.enemies, enemy] }));
  },

  updateEnemies: (
    playerX,
    playerY,
    dt = 1 / 60,
    playerRadius = 18,
    _enemyRadius = 12,
  ) => {
    let contactHits = 0;
    const now = Date.now();

    const nextEnemies = get().enemies.map((enemy) => {
      const dx = playerX - enemy.x;
      const dy = playerY - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const touchDist = playerRadius + (enemy.radius ?? 12);

      if (dist <= touchDist) {
        const cooldown = enemy.attackCooldown || 1000;
        const last = enemy.lastAttackTime || 0;
        let lastAttackTime = last;
        let isAttacking = true;
        if (now - last >= cooldown) {
          contactHits += 1;
          get().takeDamage(enemy.attackDamage || 1.2);
          lastAttackTime = now;
        }
        return {
          ...enemy,
          vx: 0,
          vy: 0,
          isAttacking,
          lastAttackTime,
        };
      }

      const step = enemy.speed * dt;
      return {
        ...enemy,
        x: enemy.x + (dx / dist) * step,
        y: enemy.y + (dy / dist) * step,
        isAttacking: false,
      };
    });

    set({ enemies: nextEnemies });
    void contactHits;
  },

  processCombat: (baseDamage, _attackRange, _attackCooldown) => {
    const now = performance.now();
    const {
      playerX,
      playerY,
      enemies,
      lastAttackTime,
      lastPunchSide,
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

    const lastEnemy = inRange[inRange.length - 1]!.enemy;
    const playerRotation = Math.atan2(
      lastEnemy.y - playerY,
      lastEnemy.x - playerX,
    );

    const damage =
      (baseDamage || getBaseDamage()) * matchBuffs.damageMultiplier;
    const hitIds = new Set(inRange.map(({ enemy }) => enemy.id));
    const { leftArms, rightArms } = getArmDistribution(arms);
    const sideUseCount = { left: 0, right: 0 };
    let punchSide = lastPunchSide;

    const newAttacks: ActiveAttack[] = inRange.map(({ enemy }, i) => {
      punchSide = pickNextPunchSide(punchSide, leftArms, rightArms);
      const armsOnSide = punchSide === "left" ? leftArms : rightArms;
      const armIndex =
        armsOnSide > 0 ? sideUseCount[punchSide] % armsOnSide : 0;
      sideUseCount[punchSide] += 1;
      const rest = getArmRestPosition(
        playerX,
        playerY,
        punchSide,
        armIndex,
        Math.max(1, armsOnSide),
        playerRotation,
      );
      return {
        id: crypto.randomUUID(),
        targetX: enemy.x,
        targetY: enemy.y,
        startX: rest.x,
        startY: rest.y,
        startTime: now + i * 40,
        duration: PUNCH_DURATION_MS,
        isRetracting: false,
        side: punchSide,
        armIndex,
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
      lastPunchSide: punchSide,
      playerRotation,
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
      playerRotation: -Math.PI / 2,
      enemies: [],
      drops: [],
      projectiles: [],
      lastAttackTime: 0,
      lastPunchSide: "right",
      lastRicochetTime: 0,
      activeAttacks: [],
      floatingTexts: [],
      ricochetPathEffects: [],
      shakeFrames: 0,
      timeAlive: 0,
      gameClockMs: 0,
      currentXp: 0,
      xpToNextLevel: BASE_XP_TO_LEVEL,
      matchLevel: 1,
      matchBuffs: { ...DEFAULT_BUFFS },
      matchSkills: { ...DEFAULT_MATCH_SKILLS },
      activeRunSkills: [],
      activeSkillPulse: createActiveSkillPulseState(),
      lightningProjectiles: [],
      skillVfxEffects: [],
      levelUpOptions: [],
      isPausedForLevelUp: false,
      levelUpTimeRemaining: 0,
      levelUpDeadlineAt: null,
      runStats: { ...EMPTY_RUN_STATS },
      bossesSpawned: 0,
      bossesKilled: 0,
      invasionBossCooldownMs: 0,
      bossHordeAlertUntil: 0,
    }),
}));
