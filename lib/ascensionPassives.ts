/** Passivas permanentes de Ascensão (Ascension Shards) — nunca resetam no prestígio. */

export type AscensionPassiveId =
  | "extraArms"
  | "startingStats"
  | "startingGold"
  | "diamondLuck";

export type AscensionPassivesData = {
  /** Braços Eternos: +1 braço de ataque por nível (muito caro). */
  extraArms: number;
  /**
   * Fundação Primordial: +0,5% nos stats iniciais por nível (até +10%).
   * Não afeta range, crítico nem upgrades de diamante.
   */
  startingStats: number;
  /** Herança de Ouro: ouro fixo ao ascender e no início de cada run. */
  startingGold: number;
  /** Sorte do Campeão: +% na chance base de diamante. */
  diamondLuck: number;
};

export const DEFAULT_ASCENSION_PASSIVES: AscensionPassivesData = {
  extraArms: 0,
  startingStats: 0,
  startingGold: 0,
  diamondLuck: 0,
};

export const MAX_ASCENSION_PASSIVE_LEVEL = 20;
/** Teto — ouro (4) + árvore (1) + ascensão (3) = 8 braços totais. */
export const MAX_EXTRA_ARMS_LEVEL = 3;
/** +0,5% × 20 = +10%. */
export const MAX_STARTING_STATS_LEVEL = 20;

export const ASCENSION_PASSIVE_COST_BASE = 8;
export const ASCENSION_PASSIVE_COST_GROWTH = 1.45;

/**
 * Custo bem mais alto que as outras passivas (braços são OP).
 * Nv.0→1 ≈ 120, depois cresce agressivo.
 */
export const EXTRA_ARMS_COST_BASE = 120;
export const EXTRA_ARMS_COST_GROWTH = 1.85;

/** Ouro concedido no start da run por nível. */
export const STARTING_GOLD_PER_LEVEL = 50;
/** +0.5 pontos percentuais na chance de diamante por nível (0.005). */
export const DIAMOND_LUCK_PER_LEVEL = 0.005;
/** +0,5% nos stats iniciais por nível. */
export const STARTING_STATS_BONUS_PER_LEVEL = 0.005;
/** Teto do bônus de stats iniciais (+10%). */
export const STARTING_STATS_BONUS_CAP = 0.1;

export type AscensionPassiveDef = {
  id: AscensionPassiveId;
  title: string;
  description: string;
  bonusLabel: (level: number) => string;
  maxLevel?: number;
};

export const ASCENSION_PASSIVES: AscensionPassiveDef[] = [
  {
    id: "extraArms",
    title: "Braços Eternos",
    description:
      "Ganha braços de ataque permanentes. Extremamente poderosa — e bem mais cara.",
    bonusLabel: (level) =>
      level <= 0 ? "+0 braços" : `+${level} braço${level === 1 ? "" : "s"}`,
    maxLevel: MAX_EXTRA_ARMS_LEVEL,
  },
  {
    id: "startingStats",
    title: "Fundação Primordial",
    description:
      "Melhora stats iniciais (HP, dano e velocidade de ataque). Não afeta alcance, crítico nem upgrades de diamante.",
    bonusLabel: (level) => {
      const pct = Math.min(
        STARTING_STATS_BONUS_CAP,
        Math.max(0, level) * STARTING_STATS_BONUS_PER_LEVEL,
      );
      return `+${(pct * 100).toFixed(1)}% stats iniciais`;
    },
    maxLevel: MAX_STARTING_STATS_LEVEL,
  },
  {
    id: "startingGold",
    title: "Herança de Ouro",
    description:
      "Após ascender (e a cada nova run), você recebe um bônus fixo de ouro.",
    bonusLabel: (level) =>
      `+${(level * STARTING_GOLD_PER_LEVEL).toLocaleString("pt-BR")} ouro ao iniciar`,
  },
  {
    id: "diamondLuck",
    title: "Sorte do Campeão",
    description: "Aumenta levemente a chance base de dropar diamantes.",
    bonusLabel: (level) =>
      `+${(level * DIAMOND_LUCK_PER_LEVEL * 100).toFixed(1)}% chance de diamante`,
  },
];

export function getAscensionPassiveMaxLevel(id: AscensionPassiveId): number {
  const def = ASCENSION_PASSIVES.find((p) => p.id === id);
  return def?.maxLevel ?? MAX_ASCENSION_PASSIVE_LEVEL;
}

export function getAscensionPassiveCostAt(
  level: number,
  id?: AscensionPassiveId,
): number {
  if (id === "extraArms") {
    return Math.max(
      1,
      Math.floor(
        EXTRA_ARMS_COST_BASE *
          Math.pow(EXTRA_ARMS_COST_GROWTH, Math.max(0, level)),
      ),
    );
  }
  return Math.max(
    1,
    Math.floor(
      ASCENSION_PASSIVE_COST_BASE *
        Math.pow(ASCENSION_PASSIVE_COST_GROWTH, Math.max(0, level)),
    ),
  );
}

export function normalizeAscensionPassives(
  partial?: Partial<AscensionPassivesData> & {
    /** Campo legado removido (Ímã Primordial). */
    magnetRadius?: number;
  } | null,
): AscensionPassivesData {
  return {
    extraArms: clampPassiveLevel(
      partial?.extraArms,
      MAX_EXTRA_ARMS_LEVEL,
    ),
    startingStats: clampPassiveLevel(
      partial?.startingStats,
      MAX_STARTING_STATS_LEVEL,
    ),
    startingGold: clampPassiveLevel(partial?.startingGold),
    diamondLuck: clampPassiveLevel(partial?.diamondLuck),
  };
}

function clampPassiveLevel(
  value: unknown,
  max = MAX_ASCENSION_PASSIVE_LEVEL,
): number {
  const n = Math.floor(Number(value) || 0);
  return Math.min(max, Math.max(0, n));
}

/** Shards ganhos ao ascender, com base no progresso que será resetado. */
export function calcAscensionShardsGained(progress: {
  maxHpLevel: number;
  baseDamageLevel: number;
  armTier: number;
  xpBonusLevel: number;
  gold: number;
  /** Nível de prestígio atual (antes do +1). */
  prestigeLevel: number;
}): number {
  const hpPts = Math.floor(Math.max(0, progress.maxHpLevel) / 3);
  const dmgPts = Math.floor(Math.max(0, progress.baseDamageLevel) / 2);
  const tierPts = Math.max(0, progress.armTier) * 3;
  const xpPts = Math.floor(Math.max(0, progress.xpBonusLevel) / 4);
  const goldPts = Math.floor(Math.log10(Math.max(10, progress.gold)));
  const prestigeBonus = Math.max(0, progress.prestigeLevel) * 2;
  return Math.max(5, 5 + hpPts + dmgPts + tierPts + xpPts + goldPts + prestigeBonus);
}

export function getExtraArmsBonus(level: number): number {
  return Math.max(0, Math.floor(level));
}

/** Multiplicador 1.0–1.10 para stats iniciais (HP / dano / AS). */
export function getStartingStatsMultiplier(level: number): number {
  const bonus = Math.min(
    STARTING_STATS_BONUS_CAP,
    Math.max(0, level) * STARTING_STATS_BONUS_PER_LEVEL,
  );
  return 1 + bonus;
}

export function getStartingGoldBonus(level: number): number {
  return Math.max(0, level) * STARTING_GOLD_PER_LEVEL;
}

export function getDiamondLuckBonus(level: number): number {
  return Math.max(0, level) * DIAMOND_LUCK_PER_LEVEL;
}

/** @deprecated Ímã removido — mantido para não quebrar imports legados. */
export function getMagnetRadiusMultiplier(_level?: number): number {
  return 1;
}
