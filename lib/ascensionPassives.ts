/** Passivas permanentes de Ascensão (Ascension Shards) — nunca resetam no prestígio. */

export type AscensionPassiveId =
  | "magnetRadius"
  | "startingGold"
  | "diamondLuck";

export type AscensionPassivesData = {
  /** Ímã Primordial: +10% raio de coleta / magnetismo por nível. */
  magnetRadius: number;
  /** Herança de Ouro: ouro fixo ao ascender e no início de cada run. */
  startingGold: number;
  /** Sorte do Campeão: +% na chance base de diamante. */
  diamondLuck: number;
};

export const DEFAULT_ASCENSION_PASSIVES: AscensionPassivesData = {
  magnetRadius: 0,
  startingGold: 0,
  diamondLuck: 0,
};

export const MAX_ASCENSION_PASSIVE_LEVEL = 20;
export const ASCENSION_PASSIVE_COST_BASE = 8;
export const ASCENSION_PASSIVE_COST_GROWTH = 1.45;

/** +10% raio de coleta por nível. */
export const MAGNET_RADIUS_BONUS_PER_LEVEL = 0.1;
/** Ouro concedido no start da run por nível. */
export const STARTING_GOLD_PER_LEVEL = 50;
/** +0.5 pontos percentuais na chance de diamante por nível (0.005). */
export const DIAMOND_LUCK_PER_LEVEL = 0.005;

export type AscensionPassiveDef = {
  id: AscensionPassiveId;
  title: string;
  description: string;
  bonusLabel: (level: number) => string;
};

export const ASCENSION_PASSIVES: AscensionPassiveDef[] = [
  {
    id: "magnetRadius",
    title: "Ímã Primordial",
    description: "Aumenta o raio de atração e coleta de itens no chão.",
    bonusLabel: (level) =>
      `+${Math.round(level * MAGNET_RADIUS_BONUS_PER_LEVEL * 100)}% raio de coleta`,
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

export function getAscensionPassiveCostAt(level: number): number {
  return Math.max(
    1,
    Math.floor(
      ASCENSION_PASSIVE_COST_BASE *
        Math.pow(ASCENSION_PASSIVE_COST_GROWTH, Math.max(0, level)),
    ),
  );
}

export function normalizeAscensionPassives(
  partial?: Partial<AscensionPassivesData> | null,
): AscensionPassivesData {
  return {
    magnetRadius: clampPassiveLevel(partial?.magnetRadius),
    startingGold: clampPassiveLevel(partial?.startingGold),
    diamondLuck: clampPassiveLevel(partial?.diamondLuck),
  };
}

function clampPassiveLevel(value: unknown): number {
  const n = Math.floor(Number(value) || 0);
  return Math.min(MAX_ASCENSION_PASSIVE_LEVEL, Math.max(0, n));
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

export function getMagnetRadiusMultiplier(level: number): number {
  return 1 + Math.max(0, level) * MAGNET_RADIUS_BONUS_PER_LEVEL;
}

export function getStartingGoldBonus(level: number): number {
  return Math.max(0, level) * STARTING_GOLD_PER_LEVEL;
}

export function getDiamondLuckBonus(level: number): number {
  return Math.max(0, level) * DIAMOND_LUCK_PER_LEVEL;
}
