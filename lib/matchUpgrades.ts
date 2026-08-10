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

/** Para de oferecer cartas de velocidade abaixo deste cooldown efetivo (ms). */
export const MATCH_COOLDOWN_UPGRADE_FLOOR = 300;
/** Teto de chance crítica efetiva in-run (meta + cartas). */
export const MATCH_CRIT_CHANCE_CAP = 1;

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type SpecialSkillKey =
  | "ice"
  | "lightning"
  | "fire"
  | "stone"
  | "shadow"
  | "ricochet"
  | "aura"
  | "vendaval";

/** Categoria da carta — até 2 por pack se raridades forem diferentes. */
export type UpgradeCategory =
  | "damage"
  | "speed"
  | "critDamage"
  | "critChance"
  | "skillDamage"
  | SpecialSkillKey
  | SkillMasteryUpgradeType;

export type UpgradeType =
  | "attackSpeed"
  | "damageMultiplier"
  | "critDamageMultiplier"
  | "critChanceBonus"
  | "skillDamageMultiplier"
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
  /** Multiplica duração (burn/gelo). */
  durationMul?: number;
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
  extraHits: number;
  extraProjectiles: number;
};

export type MatchSkillBonuses = Record<SpecialSkillKey, MatchSkillBonusState>;

export const DEFAULT_MATCH_SKILL_BONUS: MatchSkillBonusState = {
  damageMul: 1,
  cooldownMul: 1,
  durationMul: 1,
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
  const pool = SPECIAL_SKILL_POOL.find((p) => p.type === key)!;

  type Pkg = {
    delta: MatchSkillBonusDelta;
    lines: string[];
  };

  const packages: Record<SpecialSkillKey, Record<Rarity, Pkg>> = {
    lightning: {
      common: {
        delta: { damageMul: 1.12 },
        lines: ["+12% dano do raio"],
      },
      uncommon: {
        delta: { cooldownMul: 0.88 },
        lines: ["−12% cooldown"],
      },
      rare: {
        delta: { damageMul: 1.2, extraHits: 1 },
        lines: ["+20% dano", "+1 burst"],
      },
      epic: {
        delta: { damageMul: 1.28, cooldownMul: 0.82 },
        lines: ["+28% dano", "−18% cooldown"],
      },
      legendary: {
        delta: {
          damageMul: 1.4,
          cooldownMul: 0.75,
          extraProjectiles: 1,
          extraHits: 1,
        },
        lines: ["+40% dano", "−25% cooldown", "+1 raio extra", "+1 burst"],
      },
    },
    fire: {
      common: {
        delta: { damageMul: 1.12 },
        lines: ["+12% dano de burn"],
      },
      uncommon: {
        delta: { durationMul: 1.18 },
        lines: ["+18% duração do burn"],
      },
      rare: {
        delta: { damageMul: 1.18, extraHits: 1 },
        lines: ["+18% burn", "+1 stack máx."],
      },
      epic: {
        delta: { damageMul: 1.28, durationMul: 1.22 },
        lines: ["+28% burn", "+22% duração"],
      },
      legendary: {
        delta: { damageMul: 1.4, durationMul: 1.35, extraHits: 2 },
        lines: ["+40% burn", "+35% duração", "+2 stacks máx."],
      },
    },
    ice: {
      common: {
        delta: { durationMul: 1.12 },
        lines: ["+12% duração do gelo"],
      },
      uncommon: {
        delta: { cooldownMul: 0.88 },
        lines: ["−12% cooldown"],
      },
      rare: {
        delta: { durationMul: 1.22, cooldownMul: 0.9 },
        lines: ["+22% duração", "−10% cooldown"],
      },
      epic: {
        delta: { durationMul: 1.3, cooldownMul: 0.82 },
        lines: ["+30% duração", "−18% cooldown"],
      },
      legendary: {
        delta: { durationMul: 1.45, cooldownMul: 0.72 },
        lines: ["+45% duração", "−28% cooldown"],
      },
    },
    ricochet: {
      common: {
        delta: { damageMul: 1.12 },
        lines: ["+12% dano dos saltos"],
      },
      uncommon: {
        delta: { cooldownMul: 0.88 },
        lines: ["−12% cooldown"],
      },
      rare: {
        delta: { damageMul: 1.15, extraHits: 1 },
        lines: ["+15% dano", "+1 salto"],
      },
      epic: {
        delta: { damageMul: 1.25, cooldownMul: 0.82 },
        lines: ["+25% dano", "−18% cooldown"],
      },
      legendary: {
        delta: { damageMul: 1.35, cooldownMul: 0.75, extraHits: 2 },
        lines: ["+35% dano", "−25% cooldown", "+2 saltos"],
      },
    },
    aura: {
      common: {
        delta: { damageMul: 1.12 },
        lines: ["+12% poder da aura"],
      },
      uncommon: {
        delta: { durationMul: 1.15 },
        lines: ["+15% raio da aura"],
      },
      rare: {
        delta: { damageMul: 1.2, durationMul: 1.12 },
        lines: ["+20% poder", "+12% raio"],
      },
      epic: {
        delta: { damageMul: 1.28, cooldownMul: 0.85, durationMul: 1.18 },
        lines: ["+28% poder", "−15% intervalo stun", "+18% raio"],
      },
      legendary: {
        delta: {
          damageMul: 1.4,
          cooldownMul: 0.75,
          durationMul: 1.3,
        },
        lines: ["+40% poder", "−25% intervalo stun", "+30% raio"],
      },
    },
    shadow: {
      common: {
        delta: { damageMul: 1.12 },
        lines: ["+12% poder do clone"],
      },
      uncommon: {
        delta: { durationMul: 1.15 },
        lines: ["+15% duração do clone"],
      },
      rare: {
        delta: { damageMul: 1.2, cooldownMul: 0.9 },
        lines: ["+20% poder", "−10% cooldown"],
      },
      epic: {
        delta: { damageMul: 1.28, cooldownMul: 0.82, durationMul: 1.2 },
        lines: ["+28% poder", "−18% cooldown", "+20% duração"],
      },
      legendary: {
        delta: {
          damageMul: 1.4,
          cooldownMul: 0.72,
          durationMul: 1.35,
        },
        lines: ["+40% poder", "−28% cooldown", "+35% duração"],
      },
    },
    stone: {
      common: {
        delta: { damageMul: 1.12 },
        lines: ["+12% dano do terremoto"],
      },
      uncommon: {
        delta: { durationMul: 1.15 },
        lines: ["+15% duração do debuff"],
      },
      rare: {
        delta: { damageMul: 1.2, cooldownMul: 0.9 },
        lines: ["+20% dano", "−10% cooldown"],
      },
      epic: {
        delta: { damageMul: 1.28, cooldownMul: 0.82, durationMul: 1.2 },
        lines: ["+28% dano", "−18% cooldown", "+20% duração"],
      },
      legendary: {
        delta: {
          damageMul: 1.4,
          cooldownMul: 0.72,
          durationMul: 1.35,
        },
        lines: ["+40% dano", "−28% cooldown", "+35% duração"],
      },
    },
    vendaval: {
      common: {
        delta: { damageMul: 1.12 },
        lines: ["+12% dano do vácuo"],
      },
      uncommon: {
        delta: { durationMul: 1.15 },
        lines: ["+15% raio do vácuo"],
      },
      rare: {
        delta: { damageMul: 1.2, cooldownMul: 0.9 },
        lines: ["+20% dano", "−10% cooldown"],
      },
      epic: {
        delta: { damageMul: 1.28, cooldownMul: 0.82, durationMul: 1.2 },
        lines: ["+28% dano", "−18% cooldown", "+20% raio"],
      },
      legendary: {
        delta: {
          damageMul: 1.4,
          cooldownMul: 0.72,
          durationMul: 1.35,
        },
        lines: ["+40% dano", "−28% cooldown", "+35% raio"],
      },
    },
  };

  const pkg = packages[key][rarity];
  const lines = [...pkg.lines];

  if (isFirst) {
    return {
      delta: pkg.delta,
      effectLines: lines,
      description: `Ativa: ${pool.short}. ${lines.join(" · ")}`,
    };
  }

  return {
    delta: pkg.delta,
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
  | "critDamage"
  | "critChance"
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
  activeRunSkills: SpecialSkillKey[] = [],
): boolean {
  if (!unlockedSkills[key]) return false;
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
  /** Segundos vivos na run — escala pity de raridade. */
  timeAlive?: number;
  /** Nível atual da arena — escala pity de raridade. */
  matchLevel?: number;
  /** Maestrias liberadas no meta. */
  skillMasteryUnlocked?: SkillMasteryUnlockedData;
  /** Maestrias já ativadas nesta run. */
  matchSkillMastery?: MatchSkillMasteryData;
};

/** Base de habilidades especiais distintas por partida (sem talentos). */
export const BASE_ACTIVE_RUN_SKILLS = 2;
/** @deprecated Use BASE_ACTIVE_RUN_SKILLS / getMaxActiveRunSkills. */
export const MAX_ACTIVE_RUN_SKILLS = BASE_ACTIVE_RUN_SKILLS;

export function getMaxActiveRunSkills(extraSlots = 0): number {
  return BASE_ACTIVE_RUN_SKILLS + Math.max(0, Math.floor(extraSlots));
}

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
  const info = SKILL_MASTERY_CARD_INFO[key];
  const type = toSkillMasteryUpgradeType(key);
  return {
    id: crypto.randomUUID(),
    type,
    category: type,
    value: 1,
    rarity: "legendary",
    label: info.label,
    description: `${info.title} — ${info.description}`,
    effectLines: info.effectLines,
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
export const SPECIAL_SKILL_CARD_CHANCE = 0.15;

const ALL_STAT_CATEGORIES: StatCategory[] = [
  "damage",
  "speed",
  "critDamage",
  "critChance",
  "skillDamage",
];

/** Quais categorias de status ainda podem aparecer na roleta. */
export function getEligibleStatCategories(ctx?: {
  effectiveRange?: number;
  effectiveCooldownMs?: number;
  effectiveCritChance?: number;
  /** True se o jogador já tem ≥1 skill especial ativa na run. */
  hasActiveSkill?: boolean;
}): StatCategory[] {
  void ctx?.effectiveRange;
  return ALL_STAT_CATEGORIES.filter((category) => {
    if (category === "skillDamage" && !ctx?.hasActiveSkill) {
      return false;
    }
    if (
      category === "speed" &&
      ctx?.effectiveCooldownMs != null &&
      ctx.effectiveCooldownMs <= MATCH_COOLDOWN_UPGRADE_FLOOR
    ) {
      return false;
    }
    if (
      category === "critChance" &&
      ctx?.effectiveCritChance != null &&
      ctx.effectiveCritChance >= MATCH_CRIT_CHANCE_CAP
    ) {
      return false;
    }
    return true;
  });
}

/** Máx. de cartas da mesma área (ex.: dano) na mesma tela de level-up. */
const MAX_SAME_CATEGORY_PER_PACK = 2;

/**
 * Pode aceitar esta carta no pack atual?
 * - Skills especiais: type único
 * - Stats: até 2 da mesma área, desde que raridades diferentes
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

  const sameArea = selected.filter((c) => c.category === candidate.category);
  if (sameArea.length >= MAX_SAME_CATEGORY_PER_PACK) return false;
  if (sameArea.some((c) => c.rarity === candidate.rarity)) return false;
  return true;
}

/**
 * Gera N cartas com raridade ponderada (pity por tempo/nível).
 * Por slot: 15% tenta skill especial elegível; senão, upgrade de status.
 * No máx. getMaxActiveRunSkills skills novas por run — depois só upgrades delas.
 * Até 2 cartas da mesma área (ex.: dano) se forem de tiers/raridades diferentes.
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
      const sameArea = selectedCards.filter((c) => c.category === category);
      if (sameArea.length >= MAX_SAME_CATEGORY_PER_PACK) return false;
      if (sameArea.some((c) => c.rarity === rarity)) return false;
      return true;
    });

    let picked: MatchUpgrade | null = null;

    const canRollMastery =
      availableMasteries.length > 0 &&
      Math.random() < SKILL_MASTERY_CARD_CHANCE;
    const canRollSpecial =
      availableSpecials.length > 0 &&
      Math.random() < SPECIAL_SKILL_CARD_CHANCE;

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
      const idx = Math.floor(Math.random() * availableStats.length);
      const category = availableStats[idx]!;
      picked = createStatUpgrade(category, rarity);
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
      // Raridade batendo com duplicata de área — tenta de novo com outro roll
      continue;
    }

    if (picked && canAcceptUpgradeCard(selectedCards, picked)) {
      selectedCards.push(picked);
    }
  }

  return selectedCards;
}
