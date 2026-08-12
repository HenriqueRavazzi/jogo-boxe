/** Raridades e geração de cartas de upgrade in-match. */

import type {
  MatchSkillsData,
  SkillsData,
  UnlockedSkillsData,
} from "@/db/schema";
import { getSkillMetaCap } from "@/db/schema";
import {
  SKILL_MASTERY_CARD_CHANCE,
  SKILL_MASTERY_CARD_INFO,
  SKILL_MASTERY_KEYS,
  SKILL_MASTERY_MATCH_LEVEL_REQ,
  isSkillMasteryUpgradeType,
  toSkillMasteryUpgradeType,
  type MatchSkillMasteryData,
  type SkillMasteryUnlockedData,
  type SkillMasteryUpgradeType,
} from "@/lib/skillMastery";
import {
  getMatchGlobals,
  getMatchRarityBonus,
  getMatchRarityWeights,
  getMatchSkillCards,
  getMatchSkillEffect,
  getMatchStatCards,
  getSkillTierScaling,
  getStatCardTierConfig,
  getStatCardsConfig,
  resolveStatCardValue,
} from "@/lib/balanceConfig";

/** Para de oferecer cartas de velocidade abaixo deste cooldown efetivo (ms).
 * O CD real pode ir abaixo via meta/equipe; só as cartas in-run param aqui. */
export const MATCH_COOLDOWN_UPGRADE_FLOOR = 300;
/** Teto de chance crítica efetiva in-run (meta + cartas). */
export const MATCH_CRIT_CHANCE_CAP = 1;
/** Cap da redução de dano recebido por cartas in-run (30%). */
export const MATCH_DAMAGE_TAKEN_REDUCTION_CAP = 0.3;
/** Espinhos: começa a aparecer no Endless após 15min. */
export const MATCH_THORNS_UNLOCK_TIME_SEC = 15 * 60;
/** Espinhos: máximo de 3 upgrades por run. */
export const MATCH_THORNS_MAX_LEVEL = 3;
/** Espinhos: no máx. 30% do dano recebido refletido. */
export const MATCH_THORNS_REFLECT_CAP = 0.3;
/** Guard: máximo de 3 upgrades por run. */
export const MATCH_GUARD_MAX_LEVEL = 3;
/** Guard/Espinhos: +2% por degrau de raridade (lendário = 10%). */
export const MATCH_MITIGATION_BONUS_PER_TIER = 0.02;

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

const MITIGATION_RARITY_TIER: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

/** Bônus de Guard/Espinhos: comum 2% … lendário 10%. */
export function getMitigationRarityBonus(rarity: Rarity): number {
  const perTier =
    getMatchGlobals().mitigationBonusPerTier ?? MATCH_MITIGATION_BONUS_PER_TIER;
  return MITIGATION_RARITY_TIER[rarity] * perTier;
}

export type SpecialSkillKey =
  | "ice"
  | "lightning"
  | "fire"
  | "stone"
  | "shadow"
  | "ricochet"
  | "aura"
  | "vendaval";

/** Categoria da carta — única por pack de level-up. */
export type UpgradeCategory =
  | "damage"
  | "speed"
  | "guard"
  | "thorns"
  | "critDamage"
  | "critChance"
  | "skillDamage"
  | "range"
  | "knockback"
  | SpecialSkillKey
  | SkillMasteryUpgradeType;

export type UpgradeType =
  | "attackSpeed"
  | "damageMultiplier"
  | "damageTakenMultiplier"
  | "thornsReflectRatio"
  | "critDamageMultiplier"
  | "critChanceBonus"
  | "skillDamageMultiplier"
  | "attackRange"
  | "knockbackMultiplier"
  | SpecialSkillKey
  | SkillMasteryUpgradeType;

export type MatchUpgrade = {
  id: string;
  type: UpgradeType;
  category: UpgradeCategory;
  /** Bônus percentual (0.1 = +10%) ou +1 nível de skill especial. */
  value: number;
  rarity: Rarity;
  label: string;
  description: string;
  /** Linhas curtas do que a carta faz (skills especiais). */
  effectLines?: string[];
  /** Efeitos extras de raridade em cartas de skill especial. */
  skillBonus?: MatchSkillBonusDelta;
};

/** Delta aplicado ao escolher uma carta de skill (raridade importa). */
export type MatchSkillBonusDelta = {
  /** Multiplica o dano da skill (ex.: 1.25 = +25%). */
  damageMul?: number;
  /** Multiplica o cooldown (ex.: 0.8 = −20% CD). */
  cooldownMul?: number;
  /** Multiplica duração (burn/gelo/clone/debuff). */
  durationMul?: number;
  /** Multiplica raio (Aura / Vendaval). */
  radiusMul?: number;
  /** Hits/bounces/stacks extras. */
  extraHits?: number;
  /** Projéteis extras (Raio). */
  extraProjectiles?: number;
};

/** Bônus acumulados in-run por skill especial. */
export type MatchSkillBonusState = {
  damageMul: number;
  cooldownMul: number;
  durationMul: number;
  radiusMul: number;
  extraHits: number;
  extraProjectiles: number;
};

export type MatchSkillBonuses = Record<SpecialSkillKey, MatchSkillBonusState>;

export const DEFAULT_MATCH_SKILL_BONUS: MatchSkillBonusState = {
  damageMul: 1,
  cooldownMul: 1,
  durationMul: 1,
  radiusMul: 1,
  extraHits: 0,
  extraProjectiles: 0,
};

export const DEFAULT_MATCH_SKILL_BONUSES: MatchSkillBonuses = {
  ricochet: { ...DEFAULT_MATCH_SKILL_BONUS },
  ice: { ...DEFAULT_MATCH_SKILL_BONUS },
  fire: { ...DEFAULT_MATCH_SKILL_BONUS },
  lightning: { ...DEFAULT_MATCH_SKILL_BONUS },
  aura: { ...DEFAULT_MATCH_SKILL_BONUS },
  shadow: { ...DEFAULT_MATCH_SKILL_BONUS },
  stone: { ...DEFAULT_MATCH_SKILL_BONUS },
  vendaval: { ...DEFAULT_MATCH_SKILL_BONUS },
};

export function createEmptyMatchSkillBonuses(): MatchSkillBonuses {
  return {
    ricochet: { ...DEFAULT_MATCH_SKILL_BONUS },
    ice: { ...DEFAULT_MATCH_SKILL_BONUS },
    fire: { ...DEFAULT_MATCH_SKILL_BONUS },
    lightning: { ...DEFAULT_MATCH_SKILL_BONUS },
    aura: { ...DEFAULT_MATCH_SKILL_BONUS },
    shadow: { ...DEFAULT_MATCH_SKILL_BONUS },
    stone: { ...DEFAULT_MATCH_SKILL_BONUS },
    vendaval: { ...DEFAULT_MATCH_SKILL_BONUS },
  };
}

export function applySkillBonusDelta(
  current: MatchSkillBonusState,
  delta?: MatchSkillBonusDelta | null,
): MatchSkillBonusState {
  if (!delta) return current;
  return {
    damageMul: current.damageMul * (delta.damageMul ?? 1),
    cooldownMul: current.cooldownMul * (delta.cooldownMul ?? 1),
    durationMul: current.durationMul * (delta.durationMul ?? 1),
    radiusMul: (current.radiusMul ?? 1) * (delta.radiusMul ?? 1),
    extraHits: current.extraHits + (delta.extraHits ?? 0),
    extraProjectiles: current.extraProjectiles + (delta.extraProjectiles ?? 0),
  };
}

/**
 * Pacote de efeitos por raridade para cada skill.
 * Lendário >> Épico >> Raro >> Incomum >> Comum.
 */
function buildSpecialSkillEffect(
  key: SpecialSkillKey,
  rarity: Rarity,
  nextLevel: number,
): { delta: MatchSkillBonusDelta; description: string; effectLines: string[] } {
  const isFirst = nextLevel <= 1;
  const pool = getSpecialSkillPool().find((p) => p.type === key);
  const effect = getMatchSkillEffect(key, rarity);
  const delta = effect?.delta ?? {};
  const lines = effect?.effectLines?.length
    ? [...effect.effectLines]
    : ["+efeito"];
  const short = pool?.short ?? key;

  if (isFirst) {
    return {
      delta,
      effectLines: lines,
      description: `Ativa: ${short}. ${lines.join(" · ")}`,
    };
  }

  return {
    delta,
    effectLines: lines,
    description: `+1 nível · ${lines.join(" · ")}`,
  };
}

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

type StatCategory =
  | "damage"
  | "speed"
  | "guard"
  | "thorns"
  | "critDamage"
  | "critChance"
  | "skillDamage"
  | "range"
  | "knockback";

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
    type: "damageMultiplier",
    category: "damage",
    name: "Damage",
    short: "Dano",
  },
  {
    type: "damageTakenMultiplier",
    category: "guard",
    name: "Guard",
    short: "Dano Recebido",
  },
  {
    type: "thornsReflectRatio",
    category: "thorns",
    name: "Espinhos",
    short: "Dano Refletido",
  },
  {
    type: "critDamageMultiplier",
    category: "critDamage",
    name: "Crit Damage",
    short: "Dano Crítico",
  },
  {
    type: "critChanceBonus",
    category: "critChance",
    name: "Crit Chance",
    short: "Chance Crítica",
  },
  {
    type: "skillDamageMultiplier",
    category: "skillDamage",
    name: "Skill Damage",
    short: "Dano das Skills",
  },
];

/** Alcance só no upgrade de ouro (10 lv); knockback não entra na roleta. */
const RETIRED_STAT_CATEGORIES = new Set<StatCategory>(["range", "knockback"]);

const SPECIAL_SKILL_POOL: {
  type: SpecialSkillKey;
  category: SpecialSkillKey;
  name: string;
  short: string;
}[] = [
  {
    type: "fire",
    category: "fire",
    name: "Fogo",
    short: "Aplica queimadura nos socos",
  },
  {
    type: "ice",
    category: "ice",
    name: "Gelo",
    short: "Congela a área e deixa vulnerável (+30% dano)",
  },
  {
    type: "lightning",
    category: "lightning",
    name: "Raio",
    short: "Homing elétrico; explode em área com shock",
  },
  {
    type: "stone",
    category: "stone",
    name: "Pedra",
    short: "Terremoto: dano em todos + −50% AS/dano inimigo por 10s",
  },
  {
    type: "ricochet",
    category: "ricochet",
    name: "Ricochete",
    short: "Soco ricocheteia entre inimigos",
  },
  {
    type: "vendaval",
    category: "vendaval",
    name: "Vendaval",
    short: "Cria um vácuo periódico que puxa os inimigos para o centro",
  },
  {
    type: "shadow",
    category: "shadow",
    name: "Shadow Clone",
    short: "Clone com 15% dos stats; bate em alvos diferentes (exceto boss)",
  },
  {
    type: "aura",
    category: "aura",
    name: "Aura",
    short: "Área no herói: sinergia com skills ativas na run (ou neutra)",
  },
];

function getStatUpgradePool() {
  const tierRows = getStatCardsConfig();
  if (tierRows.length > 0) {
    const byCategory = new Map<
      string,
      { type: UpgradeType; category: StatCategory; name: string; short: string }
    >();
    const sorted = [...tierRows].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const row of sorted) {
      if (byCategory.has(row.category)) continue;
      byCategory.set(row.category, {
        type: row.upgradeType as UpgradeType,
        category: row.category as StatCategory,
        name: row.displayName,
        short: row.displayName,
      });
    }
    if (byCategory.size > 0) {
      return [...byCategory.values()].filter(
        (p) => !RETIRED_STAT_CATEGORIES.has(p.category),
      );
    }
  }
  const cards = getMatchStatCards();
  if (cards.length === 0) return STAT_UPGRADE_POOL;
  return cards
    .map((c) => ({
      type: c.upgradeType as UpgradeType,
      category: c.category as StatCategory,
      name: c.name,
      short: c.short,
    }))
    .filter((p) => !RETIRED_STAT_CATEGORIES.has(p.category));
}

function getSpecialSkillPool() {
  const cards = getMatchSkillCards();
  if (cards.length === 0) return SPECIAL_SKILL_POOL;
  return cards.map((c) => ({
    type: c.skillKey as SpecialSkillKey,
    category: c.skillKey as SpecialSkillKey,
    name: c.name,
    short: c.short,
  }));
}

export const SPECIAL_SKILL_KEYS: SpecialSkillKey[] = [
  "fire",
  "ice",
  "lightning",
  "stone",
  "ricochet",
  "vendaval",
  "shadow",
  "aura",
];

export function isSpecialSkillType(type: UpgradeType): type is SpecialSkillKey {
  return (SPECIAL_SKILL_KEYS as string[]).includes(type);
}

/**
 * Teto duro in-run das skills especiais (cartas de level-up).
 * Piso 5 mesmo sem meta roxa — senão a roleta some no Lv.1–2.
 * Meta alta ainda sobe até `skillLevelCap` (8).
 */
export const MATCH_SKILL_LEVEL_CAP = 8;
/** Mínimo de níveis in-run por skill, independente do investimento roxo. */
export const MATCH_SKILL_LEVEL_FLOOR = 5;

/**
 * Teto in-run: no mínimo FLOOR, no máximo `1 + meta` limitado ao cap global.
 */
export function getMatchSkillMaxLevel(metaSkillLevel: number): number {
  const cap = getMatchGlobals().skillLevelCap;
  const fromMeta = 1 + Math.max(0, Math.floor(metaSkillLevel));
  return Math.min(cap, Math.max(MATCH_SKILL_LEVEL_FLOOR, fromMeta));
}

export function canOfferSpecialSkill(
  key: SpecialSkillKey,
  unlockedSkills: UnlockedSkillsData,
  matchSkills: MatchSkillsData,
  skills: SkillsData,
  activeRunSkills: SpecialSkillKey[] = [],
  /** Se a maestria da skill já foi ativada nesta run, não oferece mais upgrades. */
  matchSkillMastery?: MatchSkillMasteryData,
): boolean {
  if (!unlockedSkills[key]) return false;
  if (matchSkillMastery?.[key]) return false;
  const current = matchSkills[key] ?? 0;
  const max = getMatchSkillMaxLevel(getSkillMetaCap(skills[key]));
  if (current >= max) return false;

  // Aura: primeira ativação só se já houver outra skill especial na run
  if (key === "aura" && current <= 0) {
    const hasOther = SPECIAL_SKILL_KEYS.some((k) => {
      if (k === "aura") return false;
      return (matchSkills[k] ?? 0) > 0 || activeRunSkills.includes(k);
    });
    if (!hasOther) return false;
  }

  return true;
}

export type GenerateUpgradeOptionsContext = {
  unlockedSkills: UnlockedSkillsData;
  matchSkills: MatchSkillsData;
  skills: SkillsData;
  /**
   * Skills especiais já escolhidas nesta run (máx. getMaxActiveRunSkills).
   * Com a lista cheia, só upgrades dessas skills entram na roleta.
   */
  activeRunSkills?: SpecialSkillKey[];
  /** Cap de skills distintas na run (default: BASE_ACTIVE_RUN_SKILLS). */
  maxActiveRunSkills?: number;
  /** Alcance efetivo atual (base × buffs). */
  effectiveRange?: number;
  /** Cooldown efetivo atual em ms (base / buff de velocidade). */
  effectiveCooldownMs?: number;
  /** Chance crítica efetiva atual (meta + cartas in-run), 0–1. */
  effectiveCritChance?: number;
  /** Multiplicador de dano recebido atual (1 = normal, 0.7 = -30%). */
  effectiveDamageTakenMultiplier?: number;
  /** % de dano refletido atual por Espinhos (0..0.3). */
  effectiveThornsReflectRatio?: number;
  /** Nível atual de Espinhos (máx. 3). */
  thornsLevel?: number;
  /** Nível atual de Guard (máx. 3). */
  guardLevel?: number;
  /** Em Endless pode aparecer carta de redução de dano recebido. */
  isEndlessRun?: boolean;
  /** Segundos vivos na run — escala pity de raridade. */
  timeAlive?: number;
  /** Nível atual da arena — escala pity de raridade. */
  matchLevel?: number;
  /** Maestrias liberadas no meta. */
  skillMasteryUnlocked?: SkillMasteryUnlockedData;
  /** Maestrias já ativadas nesta run. */
  matchSkillMastery?: MatchSkillMasteryData;
  /**
   * Chance por slot de tentar carta de skill especial (default SPECIAL_SKILL_CARD_CHANCE).
   * Skill Fortune na árvore eleva este valor.
   */
  specialSkillCardChance?: number;
};

/** Base de habilidades especiais distintas por partida (sem talentos). */
export const BASE_ACTIVE_RUN_SKILLS = 2;
/** @deprecated Use BASE_ACTIVE_RUN_SKILLS / getMaxActiveRunSkills. */
export const MAX_ACTIVE_RUN_SKILLS = BASE_ACTIVE_RUN_SKILLS;

export function getMaxActiveRunSkills(extraSlots = 0): number {
  return getMatchGlobals().baseActiveRunSkills + Math.max(0, Math.floor(extraSlots));
}

/**
 * Bônus de sorte (0–0.15) a partir do tempo e do nível.
 * Em runs longas (~5 min + nível alto) chega ao teto e empurra Épico/Lendário.
 */
export function computeRarityLuckBonus(
  timeAliveSec = 0,
  matchLevel = 1,
): number {
  const g = getMatchGlobals();
  const fromTime = (Math.max(0, timeAliveSec) / 60) * g.luckPerMinute;
  const fromLevel =
    (Math.max(0, matchLevel - 1) / 5) * g.luckPerFiveLevels;
  return Math.min(g.maxLuckBonus, fromTime + fromLevel);
}

/**
 * Redistribui pesos: tira de Comum/Incomum e soma em Épico/Lendário.
 * `luckBonus` 0.15 ≈ +15 pontos percentuais no topo.
 */
export function getRarityWeights(
  luckBonus = 0,
): { rarity: Rarity; weight: number }[] {
  const source = getMatchRarityWeights();
  const table = (source.length > 0 ? source : BASE_RARITY_TABLE).map((e) => ({
    rarity: e.rarity as Rarity,
    weight: e.weight,
  }));
  const byRarity = Object.fromEntries(
    table.map((e) => [e.rarity, e]),
  ) as Record<Rarity, { rarity: Rarity; weight: number }>;

  const maxLuck = getMatchGlobals().maxLuckBonus;
  const points = Math.max(0, Math.min(maxLuck, luckBonus)) * 100;
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

function pickWeightedStatCategory(
  available: StatCategory[],
  rarity: Rarity,
): StatCategory | null {
  if (available.length === 0) return null;
  const weights = available.map((category) => {
    const row = getStatCardTierConfig(category, rarity);
    return Math.max(0, row?.weight ?? 10);
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return available[Math.floor(Math.random() * available.length)] ?? null;
  }
  let roll = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return available[i]!;
  }
  return available[available.length - 1] ?? null;
}

function createStatUpgrade(
  category: StatCategory,
  rarity: Rarity,
): MatchUpgrade {
  const pool =
    getStatUpgradePool().find((p) => p.category === category) ??
    getStatUpgradePool()[0]!;
  const row = getStatCardTierConfig(category, rarity);
  const fallback =
    pool.type === "damageTakenMultiplier" || pool.type === "thornsReflectRatio"
      ? getMitigationRarityBonus(rarity)
      : getMatchRarityBonus(rarity);
  const value = row
    ? resolveStatCardValue(row.statValues, fallback)
    : fallback;
  const name = row?.displayName ?? pool.name;
  const short = row?.displayName ?? pool.short;
  const pct = Math.round(value * 100);

  if (pool.type === "damageTakenMultiplier") {
    return {
      id: crypto.randomUUID(),
      type: pool.type,
      category: pool.category,
      value,
      rarity,
      label: `-${pct}% ${name}`,
      description: `-${pct}% ${short}`,
    };
  }
  if (pool.type === "thornsReflectRatio") {
    return {
      id: crypto.randomUUID(),
      type: pool.type,
      category: pool.category,
      value,
      rarity,
      label: `+${pct}% ${name}`,
      description: `Reflete ${pct}% do dano recebido`,
    };
  }

  return {
    id: crypto.randomUUID(),
    type: pool.type,
    category: pool.category,
    value,
    rarity,
    label: `+${pct}% ${name}`,
    description: `+${pct}% ${short}`,
  };
}

function createSpecialUpgrade(
  key: SpecialSkillKey,
  rarity: Rarity,
  nextLevel: number,
): MatchUpgrade {
  const pool = getSpecialSkillPool().find((p) => p.type === key)!;
  const isFirst = nextLevel <= 1;
  const effect = buildSpecialSkillEffect(key, rarity, nextLevel);

  return {
    id: crypto.randomUUID(),
    type: pool.type,
    category: pool.category,
    value: 1,
    rarity,
    label: isFirst ? pool.name : `${pool.name} Lv.${nextLevel}`,
    description: effect.description,
    effectLines: effect.effectLines,
    skillBonus: effect.delta,
  };
}

function createMasteryUpgrade(key: SpecialSkillKey): MatchUpgrade {
  const fallback = SKILL_MASTERY_CARD_INFO[key];
  const row = getSkillTierScaling(key, "master");
  const type = toSkillMasteryUpgradeType(key);
  const label = row?.cardLabel || fallback.label;
  const title = row?.cardTitle || fallback.title;
  const description = row?.cardDescription || fallback.description;
  const effectLines =
    row?.effectLines && row.effectLines.length > 0
      ? row.effectLines
      : fallback.effectLines;
  return {
    id: crypto.randomUUID(),
    type,
    category: type,
    value: 1,
    rarity: "legendary",
    label,
    description: `${title} — ${description}`,
    effectLines,
  };
}

/** Maestrias elegíveis para a roleta (meta + Lv.5 in-run + ainda não ativada). */
export function getEligibleSkillMasteries(
  ctx?: GenerateUpgradeOptionsContext,
): SpecialSkillKey[] {
  if (!ctx?.skillMasteryUnlocked || !ctx.matchSkills) return [];
  const active = ctx.matchSkillMastery;
  return SKILL_MASTERY_KEYS.filter((key) => {
    if (!ctx.skillMasteryUnlocked?.[key]) return false;
    if (active?.[key]) return false;
    return (ctx.matchSkills?.[key] ?? 0) >= SKILL_MASTERY_MATCH_LEVEL_REQ;
  });
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
export const SPECIAL_SKILL_CARD_CHANCE = 0.25;

/** Quais categorias de status ainda podem aparecer na roleta. */
export function getEligibleStatCategories(ctx?: {
  effectiveRange?: number;
  effectiveCooldownMs?: number;
  effectiveCritChance?: number;
  effectiveDamageTakenMultiplier?: number;
  effectiveThornsReflectRatio?: number;
  thornsLevel?: number;
  guardLevel?: number;
  timeAlive?: number;
  isEndlessRun?: boolean;
  /** True se o jogador já tem ≥1 skill especial ativa na run. */
  hasActiveSkill?: boolean;
}): StatCategory[] {
  return getStatUpgradePool().map((p) => p.category).filter((category) => {
    if (RETIRED_STAT_CATEGORIES.has(category)) return false;
    if (category === "skillDamage" && !ctx?.hasActiveSkill) {
      return false;
    }
    if (category === "guard") {
      if (!ctx?.isEndlessRun) return false;
      const g = getMatchGlobals();
      const reduction = 1 - (ctx?.effectiveDamageTakenMultiplier ?? 1);
      if (reduction + 1e-9 >= g.damageTakenReductionCap) return false;
      if ((ctx?.guardLevel ?? 0) >= (g.guardMaxLevel ?? MATCH_GUARD_MAX_LEVEL)) {
        return false;
      }
    }
    if (category === "thorns") {
      if (!ctx?.isEndlessRun) return false;
      const g = getMatchGlobals();
      if ((ctx?.timeAlive ?? 0) < g.thornsUnlockTimeSec) return false;
      if ((ctx?.thornsLevel ?? 0) >= g.thornsMaxLevel) return false;
      if ((ctx?.effectiveThornsReflectRatio ?? 0) + 1e-9 >= g.thornsReflectCap) {
        return false;
      }
    }
    if (
      category === "speed" &&
      ctx?.effectiveCooldownMs != null &&
      ctx.effectiveCooldownMs <= getMatchGlobals().cooldownUpgradeFloor
    ) {
      return false;
    }
    if (
      category === "critChance" &&
      ctx?.effectiveCritChance != null &&
      ctx.effectiveCritChance >= getMatchGlobals().critChanceCap
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Pode aceitar esta carta no pack atual?
 * Skills especiais / maestria: type único.
 * Stats: categoria única (sem duplicar a mesma área em raridades diferentes).
 */
function canAcceptUpgradeCard(
  selected: MatchUpgrade[],
  candidate: MatchUpgrade,
): boolean {
  if (isSpecialSkillType(candidate.type)) {
    return !selected.some((c) => c.type === candidate.type);
  }
  if (isSkillMasteryUpgradeType(candidate.type)) {
    return !selected.some((c) => c.type === candidate.type);
  }

  return !selected.some((c) => c.category === candidate.category);
}

/**
 * Gera N cartas com raridade ponderada (pity por tempo/nível).
 * Por slot: 25% tenta skill especial elegível; senão, upgrade de status.
 * No máx. getMaxActiveRunSkills skills novas por run — depois só upgrades delas.
 * Nunca repete a mesma categoria/`type` na mesma tela.
 */
export function generateUpgradeOptions(
  count = 4,
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
  const maxSlots =
    ctx?.maxActiveRunSkills ?? getMaxActiveRunSkills(0);
  const atSkillCap = activeRunSkills.length >= maxSlots;

  const eligibleSpecials: SpecialSkillKey[] = [];
  if (unlocked && matchSkills && skills) {
    for (const key of SPECIAL_SKILL_KEYS) {
      if (
        !canOfferSpecialSkill(
          key,
          unlocked,
          matchSkills,
          skills,
          activeRunSkills,
          ctx?.matchSkillMastery,
        )
      ) {
        continue;
      }
      const alreadyPicked = activeRunSkills.includes(key);
      // Cap atingido: só upgrades das skills já ativas na run
      if (atSkillCap && !alreadyPicked) continue;
      eligibleSpecials.push(key);
    }
  }

  const selectedCards: MatchUpgrade[] = [];
  let specialPool = [...eligibleSpecials];
  let masteryPool = getEligibleSkillMasteries(ctx);
  const skillCardChance =
    ctx?.specialSkillCardChance ?? getMatchGlobals().specialSkillCardChance;
  // Skills masterizadas ainda liberam cartas de "dano de skill"
  const baseStatPool = getEligibleStatCategories({
    ...ctx,
    hasActiveSkill: activeRunSkills.length > 0,
  });
  let attempts = 0;
  const maxAttempts = count * 24;

  while (selectedCards.length < count && attempts < maxAttempts) {
    attempts += 1;
    // Se as 2 primeiras têm a mesma raridade, evita repetir na 3ª.
    const sameRarityTwice =
      selectedCards.length === 2 &&
      selectedCards[0]!.rarity === selectedCards[1]!.rarity
        ? selectedCards[0]!.rarity
        : undefined;
    const rarity = rollRarity(luckBonus, sameRarityTwice);

    const availableMasteries = masteryPool.filter(
      (key) =>
        !selectedCards.some(
          (c) => c.type === toSkillMasteryUpgradeType(key),
        ),
    );
    const availableSpecials = specialPool.filter(
      (key) => !selectedCards.some((c) => c.type === key),
    );
    const availableStats = baseStatPool.filter((category) => {
      return !selectedCards.some((c) => c.category === category);
    });

    let picked: MatchUpgrade | null = null;

    const canRollMastery =
      availableMasteries.length > 0 &&
      Math.random() < SKILL_MASTERY_CARD_CHANCE;
    const canRollSpecial =
      availableSpecials.length > 0 && Math.random() < skillCardChance;

    if (canRollMastery) {
      const idx = Math.floor(Math.random() * availableMasteries.length);
      const key = availableMasteries[idx]!;
      picked = createMasteryUpgrade(key);
      masteryPool = masteryPool.filter((k) => k !== key);
    } else if (canRollSpecial) {
      const idx = Math.floor(Math.random() * availableSpecials.length);
      const key = availableSpecials[idx]!;
      const nextLevel = (matchSkills?.[key] ?? 0) + 1;
      picked = createSpecialUpgrade(key, rarity, nextLevel);
      specialPool = specialPool.filter((k) => k !== key);
    } else if (availableStats.length > 0) {
      const category = pickWeightedStatCategory(availableStats, rarity);
      if (category) {
        picked = createStatUpgrade(category, rarity);
      }
    } else if (availableMasteries.length > 0) {
      const idx = Math.floor(Math.random() * availableMasteries.length);
      const key = availableMasteries[idx]!;
      picked = createMasteryUpgrade(key);
      masteryPool = masteryPool.filter((k) => k !== key);
    } else if (availableSpecials.length > 0) {
      // Fallback: só restam skills especiais (stats indisponíveis nesta raridade)
      const idx = Math.floor(Math.random() * availableSpecials.length);
      const key = availableSpecials[idx]!;
      const nextLevel = (matchSkills?.[key] ?? 0) + 1;
      picked = createSpecialUpgrade(key, rarity, nextLevel);
      specialPool = specialPool.filter((k) => k !== key);
    } else {
      // Pool esgotado para esta raridade / tentativa — tenta de novo
      continue;
    }

    if (picked && canAcceptUpgradeCard(selectedCards, picked)) {
      selectedCards.push(picked);
    }
  }

  return selectedCards;
}
