/** Raridades e geração de cartas de upgrade in-match. */

import type {
  MatchSkillsData,
  SkillsData,
  UnlockedSkillsData,
} from "@/db/schema";
import { getSkillMetaCap } from "@/db/schema";

/** Para de oferecer cartas de alcance acima deste valor efetivo (px). */
export const MATCH_RANGE_UPGRADE_CAP = 650;
/** Para de oferecer cartas de velocidade abaixo deste cooldown efetivo (ms). */
export const MATCH_COOLDOWN_UPGRADE_FLOOR = 300;

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type SpecialSkillKey = "ricochet" | "ice" | "fire" | "lightning";

/** Categoria da carta — usada para evitar duplicatas no pack de level-up. */
export type UpgradeCategory =
  | "damage"
  | "speed"
  | "range"
  | "critDamage"
  | "skillDamage"
  | SpecialSkillKey;

export type UpgradeType =
  | "attackSpeed"
  | "attackRange"
  | "damageMultiplier"
  | "critDamageMultiplier"
  | "skillDamageMultiplier"
  | SpecialSkillKey;

export type MatchUpgrade = {
  id: string;
  type: UpgradeType;
  category: UpgradeCategory;
  /** Bônus percentual (0.1 = +10%) ou +1 nível de skill especial. */
  value: number;
  rarity: Rarity;
  label: string;
  description: string;
};

/**
 * Pesos base da roleta (somam ~100.5 → normalizados):
 * Comum ~50% · Incomum ~25% · Raro ~15% · Épico ~8% · Lendário ~2.5%
 */
const BASE_RARITY_TABLE: { rarity: Rarity; weight: number }[] = [
  { rarity: "common", weight: 50 },
  { rarity: "uncommon", weight: 25 },
  { rarity: "rare", weight: 15 },
  { rarity: "epic", weight: 8 },
  { rarity: "legendary", weight: 2.5 },
];

/** Teto do bônus de sorte (15 pontos percentuais redistribuídos). */
const MAX_LUCK_BONUS = 0.15;
/** +3% de luckBonus por minuto sobrevivido. */
const LUCK_PER_MINUTE = 0.03;
/** +2.5% de luckBonus a cada 5 níveis de arena. */
const LUCK_PER_FIVE_LEVELS = 0.025;

/**
 * Magnitude do buff por raridade (diferença de poder clara).
 * Ex.: Attack Speed comum +5%, épico +15%, lendário +25%.
 */
const RARITY_BONUS: Record<Rarity, number> = {
  common: 0.05,
  uncommon: 0.08,
  rare: 0.12,
  epic: 0.15,
  legendary: 0.25,
};

type StatCategory =
  | "damage"
  | "speed"
  | "range"
  | "critDamage"
  | "skillDamage";

const STAT_UPGRADE_POOL: {
  type: UpgradeType;
  category: StatCategory;
  name: string;
  short: string;
}[] = [
  {
    type: "attackSpeed",
    category: "speed",
    name: "Attack Speed",
    short: "Velocidade de Ataque",
  },
  {
    type: "attackRange",
    category: "range",
    name: "Range",
    short: "Alcance",
  },
  {
    type: "damageMultiplier",
    category: "damage",
    name: "Damage",
    short: "Dano",
  },
  {
    type: "critDamageMultiplier",
    category: "critDamage",
    name: "Crit Damage",
    short: "Dano Crítico",
  },
  {
    type: "skillDamageMultiplier",
    category: "skillDamage",
    name: "Skill Damage",
    short: "Dano das Skills",
  },
];

const SPECIAL_SKILL_POOL: {
  type: SpecialSkillKey;
  category: SpecialSkillKey;
  name: string;
  short: string;
}[] = [
  {
    type: "ricochet",
    category: "ricochet",
    name: "Ricochete",
    short: "Soco ricocheteia entre inimigos",
  },
  {
    type: "ice",
    category: "ice",
    name: "Gelo",
    short: "Congela a área e deixa vulnerável (+30% dano)",
  },
  {
    type: "fire",
    category: "fire",
    name: "Fogo",
    short: "Aplica queimadura nos socos",
  },
  {
    type: "lightning",
    category: "lightning",
    name: "Raio",
    short: "Estouro massivo no alvo mais próximo + stun",
  },
];

export const SPECIAL_SKILL_KEYS: SpecialSkillKey[] = [
  "ricochet",
  "ice",
  "fire",
  "lightning",
];

export function isSpecialSkillType(type: UpgradeType): type is SpecialSkillKey {
  return (SPECIAL_SKILL_KEYS as string[]).includes(type);
}

/**
 * Teto in-run: 1 (após desbloqueio) + níveis meta com Diamantes Roxos.
 */
export function getMatchSkillMaxLevel(metaSkillLevel: number): number {
  return 1 + Math.max(0, Math.floor(metaSkillLevel));
}

export function canOfferSpecialSkill(
  key: SpecialSkillKey,
  unlockedSkills: UnlockedSkillsData,
  matchSkills: MatchSkillsData,
  skills: SkillsData,
): boolean {
  if (!unlockedSkills[key]) return false;
  const current = matchSkills[key] ?? 0;
  const max = getMatchSkillMaxLevel(getSkillMetaCap(skills[key]));
  return current < max;
}

export type GenerateUpgradeOptionsContext = {
  unlockedSkills: UnlockedSkillsData;
  matchSkills: MatchSkillsData;
  skills: SkillsData;
  /**
   * Skills especiais já escolhidas nesta run (máx. MAX_ACTIVE_RUN_SKILLS).
   * Com a lista cheia, só upgrades dessas skills entram na roleta.
   */
  activeRunSkills?: SpecialSkillKey[];
  /** Alcance efetivo atual (base × buffs). */
  effectiveRange?: number;
  /** Cooldown efetivo atual em ms (base / buff de velocidade). */
  effectiveCooldownMs?: number;
  /** Segundos vivos na run — escala pity de raridade. */
  timeAlive?: number;
  /** Nível atual da arena — escala pity de raridade. */
  matchLevel?: number;
};

/** Máximo de habilidades especiais distintas por partida. */
export const MAX_ACTIVE_RUN_SKILLS = 2;

/**
 * Bônus de sorte (0–0.15) a partir do tempo e do nível.
 * Em runs longas (~5 min + nível alto) chega ao teto e empurra Épico/Lendário.
 */
export function computeRarityLuckBonus(
  timeAliveSec = 0,
  matchLevel = 1,
): number {
  const fromTime = (Math.max(0, timeAliveSec) / 60) * LUCK_PER_MINUTE;
  const fromLevel =
    (Math.max(0, matchLevel - 1) / 5) * LUCK_PER_FIVE_LEVELS;
  return Math.min(MAX_LUCK_BONUS, fromTime + fromLevel);
}

/**
 * Redistribui pesos: tira de Comum/Incomum e soma em Épico/Lendário.
 * `luckBonus` 0.15 ≈ +15 pontos percentuais no topo.
 */
export function getRarityWeights(
  luckBonus = 0,
): { rarity: Rarity; weight: number }[] {
  const table = BASE_RARITY_TABLE.map((e) => ({ ...e }));
  const byRarity = Object.fromEntries(
    table.map((e) => [e.rarity, e]),
  ) as Record<Rarity, { rarity: Rarity; weight: number }>;

  const points = Math.max(0, Math.min(MAX_LUCK_BONUS, luckBonus)) * 100;
  if (points <= 0) return table;

  const commonFloor = 20;
  const uncommonFloor = 10;
  const fromCommon = Math.min(
    Math.max(0, byRarity.common.weight - commonFloor),
    points * 0.6,
  );
  const fromUncommon = Math.min(
    Math.max(0, byRarity.uncommon.weight - uncommonFloor),
    points - fromCommon,
  );
  const removed = fromCommon + fromUncommon;

  byRarity.common.weight -= fromCommon;
  byRarity.uncommon.weight -= fromUncommon;
  // 55% → Épico, 45% → Lendário
  byRarity.epic.weight += removed * 0.55;
  byRarity.legendary.weight += removed * 0.45;

  return table;
}

/**
 * Roleta por faixas cumulativas com pesos dinâmicos (pity).
 */
function rollRarity(luckBonus = 0, avoid?: Rarity): Rarity {
  const weights = getRarityWeights(luckBonus);
  const total = weights.reduce((sum, r) => sum + r.weight, 0);
  const roll = Math.random();
  let cumulative = 0;
  let picked: Rarity = "legendary";

  for (const entry of weights) {
    cumulative += entry.weight / total;
    if (roll < cumulative) {
      picked = entry.rarity;
      break;
    }
  }

  // Evita terceira carta com a mesma raridade das duas anteriores (leve re-roll).
  if (avoid && picked === avoid) {
    const high: Rarity[] = ["rare", "epic", "legendary"];
    const alt = high.filter((r) => r !== avoid);
    picked = alt[Math.floor(Math.random() * alt.length)] ?? picked;
  }

  return picked;
}

function createStatUpgrade(
  category: StatCategory,
  rarity: Rarity,
): MatchUpgrade {
  const pool =
    STAT_UPGRADE_POOL.find((p) => p.category === category) ??
    STAT_UPGRADE_POOL[0]!;
  const value = RARITY_BONUS[rarity];
  const pct = Math.round(value * 100);

  return {
    id: crypto.randomUUID(),
    type: pool.type,
    category: pool.category,
    value,
    rarity,
    label: `+${pct}% ${pool.name}`,
    description: `+${pct}% ${pool.short}`,
  };
}

function createSpecialUpgrade(
  key: SpecialSkillKey,
  rarity: Rarity,
  nextLevel: number,
): MatchUpgrade {
  const pool = SPECIAL_SKILL_POOL.find((p) => p.type === key)!;
  const isFirst = nextLevel <= 1;
  return {
    id: crypto.randomUUID(),
    type: pool.type,
    category: pool.category,
    value: 1,
    rarity,
    label: isFirst ? pool.name : `${pool.name} Lv.${nextLevel}`,
    description: isFirst
      ? `Ativa: ${pool.short}`
      : `+1 nível (${pool.short})`,
  };
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

/** Classes Tailwind por raridade (borda / texto / fundo). */
export const RARITY_STYLES: Record<
  Rarity,
  { border: string; text: string; bg: string; glow: string }
> = {
  common: {
    border: "border-zinc-500",
    text: "text-zinc-300",
    bg: "bg-zinc-800/90",
    glow: "hover:shadow-zinc-500/30",
  },
  uncommon: {
    border: "border-emerald-500",
    text: "text-emerald-300",
    bg: "bg-emerald-950/80",
    glow: "hover:shadow-emerald-500/40",
  },
  rare: {
    border: "border-blue-500",
    text: "text-blue-300",
    bg: "bg-blue-950/80",
    glow: "hover:shadow-blue-500/40",
  },
  epic: {
    border: "border-purple-500",
    text: "text-purple-300",
    bg: "bg-purple-950/80",
    glow: "hover:shadow-purple-500/40",
  },
  legendary: {
    border: "border-amber-400",
    text: "text-amber-300",
    bg: "bg-amber-950/80",
    glow: "hover:shadow-amber-400/50",
  },
};

/**
 * Chance por slot de oferecer uma skill especial (desbloqueada e ainda upável).
 */
export const SPECIAL_SKILL_CARD_CHANCE = 0.15;

const ALL_STAT_CATEGORIES: StatCategory[] = [
  "damage",
  "speed",
  "range",
  "critDamage",
  "skillDamage",
];

/** Quais categorias de status ainda podem aparecer na roleta. */
export function getEligibleStatCategories(ctx?: {
  effectiveRange?: number;
  effectiveCooldownMs?: number;
}): StatCategory[] {
  return ALL_STAT_CATEGORIES.filter((category) => {
    if (
      category === "range" &&
      ctx?.effectiveRange != null &&
      ctx.effectiveRange >= MATCH_RANGE_UPGRADE_CAP
    ) {
      return false;
    }
    if (
      category === "speed" &&
      ctx?.effectiveCooldownMs != null &&
      ctx.effectiveCooldownMs <= MATCH_COOLDOWN_UPGRADE_FLOOR
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Gera N cartas com raridade ponderada (pity por tempo/nível) e categorias distintas.
 * Por slot: 15% tenta skill especial elegível; senão, upgrade de status.
 * No máx. MAX_ACTIVE_RUN_SKILLS skills novas por run — depois só upgrades delas.
 * Nunca repete a mesma categoria/`type` na mesma tela.
 */
export function generateUpgradeOptions(
  count = 3,
  ctx?: GenerateUpgradeOptionsContext,
): MatchUpgrade[] {
  const unlocked = ctx?.unlockedSkills;
  const matchSkills = ctx?.matchSkills;
  const skills = ctx?.skills;
  const luckBonus = computeRarityLuckBonus(ctx?.timeAlive, ctx?.matchLevel);

  const activeFromCtx = ctx?.activeRunSkills ?? [];
  const activeFromLevels = SPECIAL_SKILL_KEYS.filter(
    (k) => (matchSkills?.[k] ?? 0) > 0,
  );
  const activeRunSkills = Array.from(
    new Set<SpecialSkillKey>([...activeFromCtx, ...activeFromLevels]),
  );
  const atSkillCap = activeRunSkills.length >= MAX_ACTIVE_RUN_SKILLS;

  const eligibleSpecials: SpecialSkillKey[] = [];
  if (unlocked && matchSkills && skills) {
    for (const key of SPECIAL_SKILL_KEYS) {
      if (!canOfferSpecialSkill(key, unlocked, matchSkills, skills)) continue;
      const alreadyPicked = activeRunSkills.includes(key);
      // Cap atingido: só upgrades das skills já ativas na run
      if (atSkillCap && !alreadyPicked) continue;
      eligibleSpecials.push(key);
    }
  }

  const selectedCards: MatchUpgrade[] = [];
  const usedCategories = new Set<UpgradeCategory>();
  const usedTypes = new Set<UpgradeType>();
  let specialPool = [...eligibleSpecials];
  let statPool = getEligibleStatCategories(ctx);
  let attempts = 0;
  const maxAttempts = count * 8;

  while (selectedCards.length < count && attempts < maxAttempts) {
    attempts += 1;
    // Se as 2 primeiras têm a mesma raridade, evita repetir na 3ª.
    const sameRarityTwice =
      selectedCards.length === 2 &&
      selectedCards[0]!.rarity === selectedCards[1]!.rarity
        ? selectedCards[0]!.rarity
        : undefined;
    const rarity = rollRarity(luckBonus, sameRarityTwice);
    let picked: MatchUpgrade | null = null;

    const canRollSpecial =
      specialPool.length > 0 && Math.random() < SPECIAL_SKILL_CARD_CHANCE;

    if (canRollSpecial) {
      const idx = Math.floor(Math.random() * specialPool.length);
      const key = specialPool[idx]!;
      const nextLevel = (matchSkills?.[key] ?? 0) + 1;
      picked = createSpecialUpgrade(key, rarity, nextLevel);
      specialPool = specialPool.filter((k) => k !== key);
    } else if (statPool.length > 0) {
      const idx = Math.floor(Math.random() * statPool.length);
      const category = statPool[idx]!;
      picked = createStatUpgrade(category, rarity);
      statPool = statPool.filter((c) => c !== category);
    } else if (specialPool.length > 0) {
      // Fallback: só restam skills especiais (stats esgotados)
      const idx = Math.floor(Math.random() * specialPool.length);
      const key = specialPool[idx]!;
      const nextLevel = (matchSkills?.[key] ?? 0) + 1;
      picked = createSpecialUpgrade(key, rarity, nextLevel);
      specialPool = specialPool.filter((k) => k !== key);
    } else {
      break;
    }

    if (
      picked &&
      !usedCategories.has(picked.category) &&
      !usedTypes.has(picked.type)
    ) {
      usedCategories.add(picked.category);
      usedTypes.add(picked.type);
      selectedCards.push(picked);
    }
  }

  return selectedCards;
}
