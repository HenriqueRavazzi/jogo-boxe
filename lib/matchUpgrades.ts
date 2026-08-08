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
 * Pesos da roleta (somam 100):
 * Comum 50% · Incomum 28% · Raro 15% · Épico 6% · Lendário 1%
 */
const RARITY_TABLE: { rarity: Rarity; weight: number }[] = [
  { rarity: "common", weight: 50 },
  { rarity: "uncommon", weight: 28 },
  { rarity: "rare", weight: 15 },
  { rarity: "epic", weight: 6 },
  { rarity: "legendary", weight: 1 },
];

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
    short: "Chance de congelar ao socar",
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
    short: "Chance de raio em cadeia + slow",
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
  /** Alcance efetivo atual (base × buffs). */
  effectiveRange?: number;
  /** Cooldown efetivo atual em ms (base / buff de velocidade). */
  effectiveCooldownMs?: number;
};

/**
 * Roleta por faixas cumulativas: Math.random() em [0, 1) vs pesos normalizados.
 */
function rollRarity(): Rarity {
  const total = RARITY_TABLE.reduce((sum, r) => sum + r.weight, 0);
  const roll = Math.random(); // 0 ≤ roll < 1
  let cumulative = 0;

  for (const entry of RARITY_TABLE) {
    cumulative += entry.weight / total;
    if (roll < cumulative) return entry.rarity;
  }

  return "legendary";
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
 * Gera N cartas com raridade ponderada e categorias distintas.
 * Por slot: 15% tenta skill especial elegível; senão, upgrade de status.
 */
export function generateUpgradeOptions(
  count = 3,
  ctx?: GenerateUpgradeOptionsContext,
): MatchUpgrade[] {
  const unlocked = ctx?.unlockedSkills;
  const matchSkills = ctx?.matchSkills;
  const skills = ctx?.skills;

  const eligibleSpecials: SpecialSkillKey[] = [];
  if (unlocked && matchSkills && skills) {
    for (const key of SPECIAL_SKILL_KEYS) {
      if (canOfferSpecialSkill(key, unlocked, matchSkills, skills)) {
        eligibleSpecials.push(key);
      }
    }
  }

  const selectedCards: MatchUpgrade[] = [];
  let specialPool = [...eligibleSpecials];
  let statPool = getEligibleStatCategories(ctx);

  while (selectedCards.length < count) {
    const rarity = rollRarity();
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

    if (picked) selectedCards.push(picked);
  }

  return selectedCards;
}
