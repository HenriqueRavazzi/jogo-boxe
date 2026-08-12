/** Equipe de apoio (gacha) — tiers, pity, funções e buffs passivos. */

import type { TeamMemberBuffConfig } from "@/db/schema";
import {
  applyTeamMemberBuffs,
  capEquippedTeamBuffs,
  getTeamMemberConfigById,
  getTeamMembersConfig,
  getTeamScaleConstants,
} from "@/lib/balanceConfig";

export type TeamTier =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export type TeamRole =
  | "cutman"
  | "sparring"
  | "vitality"
  | "coach"
  | "manager";

export type TeamMemberId =
  // Common
  | "bandage_boy"
  | "gym_rat"
  | "water_boy"
  | "towel_toss"
  | "roadwork_runner"
  // Uncommon
  | "stitch_sam"
  | "pad_holder"
  | "meal_prep"
  | "ice_bucket"
  | "focus_mitt"
  // Rare
  | "ringside_doc"
  | "sparring_ace"
  | "strength_coach"
  | "corner_tactician"
  | "push_specialist"
  | "skill_scout"
  // Epic
  | "prime_cutman"
  | "elite_spar"
  | "head_coach"
  | "money_manager"
  | "range_finder"
  | "purple_agent"
  // Legendary
  | "iron_doc"
  | "shadow_spar"
  | "titan_prep"
  | "master_coach"
  | "golden_manager"
  | "echo_striker"
  | "vault_broker";

/** Nível por membro (0 = não possui). */
export type TeamMembersOwned = Record<TeamMemberId, number>;

export const TEAM_MEMBER_IDS: TeamMemberId[] = [
  "bandage_boy",
  "gym_rat",
  "water_boy",
  "towel_toss",
  "roadwork_runner",
  "stitch_sam",
  "pad_holder",
  "meal_prep",
  "ice_bucket",
  "focus_mitt",
  "ringside_doc",
  "sparring_ace",
  "strength_coach",
  "corner_tactician",
  "push_specialist",
  "skill_scout",
  "prime_cutman",
  "elite_spar",
  "head_coach",
  "money_manager",
  "range_finder",
  "purple_agent",
  "iron_doc",
  "shadow_spar",
  "titan_prep",
  "master_coach",
  "golden_manager",
  "echo_striker",
  "vault_broker",
];

export const DEFAULT_TEAM_MEMBERS_OWNED: TeamMembersOwned =
  Object.fromEntries(TEAM_MEMBER_IDS.map((id) => [id, 0])) as TeamMembersOwned;

export const MAX_TEAM_MEMBER_LEVEL = 40;
/** Slots ativos na esquina do ringue. */
export const MAX_EQUIPPED_TEAM_MEMBERS = 3;

export const TEAM_TIERS: TeamTier[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

export const TEAM_TIER_LABEL: Record<TeamTier, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  cutman: "Cutman",
  sparring: "Sparring",
  vitality: "Vitalidade",
  coach: "Coach",
  manager: "Manager",
};

/** Multiplicador de potência do buff base por tier. */
export const TEAM_TIER_POWER: Record<TeamTier, number> = {
  common: 1,
  uncommon: 1.45,
  rare: 2.1,
  epic: 3.2,
  legendary: 4.8,
};

/** Pesos base de raridade (antes do pity). */
export const TEAM_BASE_TIER_WEIGHTS: Record<TeamTier, number> = {
  common: 52,
  uncommon: 26,
  rare: 14,
  epic: 6,
  legendary: 2,
};

/** A cada N pulls, rare/epic/legendary ganham peso extra. */
export const TEAM_PULL_LUCK_INTERVAL = 12;
export const TEAM_SOFT_PITY_EPIC = 18;
export const TEAM_HARD_PITY_EPIC = 40;
export const TEAM_SOFT_PITY_LEGENDARY = 55;
export const TEAM_HARD_PITY_LEGENDARY = 90;

export const TEAM_RECRUIT_GOLD_BASE = 220;
export const TEAM_RECRUIT_GEMS_BASE = 8;
export const TEAM_RECRUIT_GOLD_GROWTH = 1.022;
export const TEAM_RECRUIT_GEMS_GROWTH = 1.016;

export type TeamMemberDef = {
  id: TeamMemberId;
  name: string;
  tier: TeamTier;
  role: TeamRole;
  tagline: string;
  /** Descrição do buff no nível N. */
  bonusLabel: (level: number) => string;
};

function power(tier: TeamTier, level: number): number {
  const lv = Math.max(1, level);
  return TEAM_TIER_POWER[tier] * (1 + (lv - 1) * 0.12);
}

/** Escalas de buff — % do stat do jogador (não valores fixos). */
export const TEAM_DAMAGE_PCT_SCALE = 0.01;
export const TEAM_MAX_HP_PCT_SCALE = 0.001;
export const TEAM_REGEN_MAX_HP_PCT_SCALE = 0.0001;
export const TEAM_KNOCKBACK_PCT_SCALE = 0.01;

/** Tetos totais da esquina (soma dos 3 slots equipados). */
export const TEAM_MAX_HP_REGEN_RATIO_PER_SECOND = 0.03;
export const TEAM_MAX_DAMAGE_MULTIPLIER = 1.1;
export const TEAM_MAX_HP_MULTIPLIER = 1.15;
/** 40% de redução de dano recebido → multiplicador mín. 0.6. */
export const TEAM_MIN_DAMAGE_TAKEN_MULTIPLIER = 0.6;

function teamBonusPct(
  coeff: number,
  tier: TeamTier,
  level: number,
  scale: number,
): number {
  return coeff * power(tier, level) * scale;
}

function labelPct(
  coeff: number,
  tier: TeamTier,
  level: number,
  scale: number,
  suffix: string,
  decimals = 1,
): string {
  const v = teamBonusPct(coeff, tier, level, scale) * 100;
  const fmt =
    v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(decimals);
  return `+${fmt}% ${suffix}`;
}

export const TEAM_MEMBER_DEFS: TeamMemberDef[] = [
  {
    id: "bandage_boy",
    name: "Bandage Boy",
    tier: "common",
    role: "cutman",
    tagline: "Fita rápida entre os rounds.",
    bonusLabel: (level) =>
      labelPct(0.35, "common", level, TEAM_REGEN_MAX_HP_PCT_SCALE, "HP máx/s", 2),
  },
  {
    id: "gym_rat",
    name: "Gym Rat",
    tier: "common",
    role: "sparring",
    tagline: "Parceiro de saco barato.",
    bonusLabel: (level) =>
      labelPct(2, "common", level, TEAM_DAMAGE_PCT_SCALE, "dano"),
  },
  {
    id: "water_boy",
    name: "Water Boy",
    tier: "common",
    role: "vitality",
    tagline: "Hidratação básica.",
    bonusLabel: (level) =>
      labelPct(18, "common", level, TEAM_MAX_HP_PCT_SCALE, "HP máx"),
  },
  {
    id: "towel_toss",
    name: "Towel Toss",
    tier: "common",
    role: "cutman",
    tagline: "Toalha gelada no canto.",
    bonusLabel: (level) =>
      `${labelPct(0.22, "common", level, TEAM_REGEN_MAX_HP_PCT_SCALE, "HP máx/s", 2)} · +${(
        0.8 * power("common", level)
      ).toFixed(1)}% AS`,
  },
  {
    id: "roadwork_runner",
    name: "Roadwork Runner",
    tier: "common",
    role: "sparring",
    tagline: "Quilômetros antes do sol.",
    bonusLabel: (level) =>
      `+${(1.2 * power("common", level)).toFixed(0)}% XP`,
  },
  {
    id: "stitch_sam",
    name: "Stitch Sam",
    tier: "uncommon",
    role: "cutman",
    tagline: "Costura cortes no canto.",
    bonusLabel: (level) =>
      labelPct(0.55, "uncommon", level, TEAM_REGEN_MAX_HP_PCT_SCALE, "HP máx/s", 2),
  },
  {
    id: "pad_holder",
    name: "Pad Holder",
    tier: "uncommon",
    role: "sparring",
    tagline: "Treino de pads constante.",
    bonusLabel: (level) =>
      `${labelPct(3, "uncommon", level, TEAM_DAMAGE_PCT_SCALE, "dano")} · +${(
        2 * power("uncommon", level)
      ).toFixed(0)}% XP`,
  },
  {
    id: "meal_prep",
    name: "Meal Prep Mia",
    tier: "uncommon",
    role: "vitality",
    tagline: "Cardápio de campeão amador.",
    bonusLabel: (level) =>
      `${labelPct(28, "uncommon", level, TEAM_MAX_HP_PCT_SCALE, "HP máx")} · −${(
        1.2 * power("uncommon", level)
      ).toFixed(1)}% dano recebido`,
  },
  {
    id: "ice_bucket",
    name: "Ice Bucket",
    tier: "uncommon",
    role: "cutman",
    tagline: "Recuperação pós-round.",
    bonusLabel: (level) =>
      `${labelPct(0.4, "uncommon", level, TEAM_REGEN_MAX_HP_PCT_SCALE, "HP máx/s", 2)} · ${labelPct(
        12,
        "uncommon",
        level,
        TEAM_MAX_HP_PCT_SCALE,
        "HP máx",
      )}`,
  },
  {
    id: "focus_mitt",
    name: "Focus Mitt",
    tier: "uncommon",
    role: "coach",
    tagline: "Timing de jab e entrada.",
    bonusLabel: (level) =>
      `+${(1.1 * power("uncommon", level)).toFixed(1)}% crit · +${(
        2 * power("uncommon", level)
      ).toFixed(0)}% AS`,
  },
  {
    id: "ringside_doc",
    name: "Ringside Doc",
    tier: "rare",
    role: "cutman",
    tagline: "Médico de plantão no ringue.",
    bonusLabel: (level) =>
      labelPct(0.85, "rare", level, TEAM_REGEN_MAX_HP_PCT_SCALE, "HP máx/s", 2),
  },
  {
    id: "sparring_ace",
    name: "Sparring Ace",
    tier: "rare",
    role: "sparring",
    tagline: "Pressão real no sparring.",
    bonusLabel: (level) =>
      `${labelPct(5, "rare", level, TEAM_DAMAGE_PCT_SCALE, "dano")} · +${(
        3.5 * power("rare", level)
      ).toFixed(0)}% XP`,
  },
  {
    id: "strength_coach",
    name: "Strength Coach",
    tier: "rare",
    role: "vitality",
    tagline: "Força funcional e core.",
    bonusLabel: (level) =>
      `${labelPct(45, "rare", level, TEAM_MAX_HP_PCT_SCALE, "HP máx")} · −${(
        2 * power("rare", level)
      ).toFixed(1)}% dano recebido`,
  },
  {
    id: "corner_tactician",
    name: "Corner Tactician",
    tier: "rare",
    role: "coach",
    tagline: "Lê o adversário no canto.",
    bonusLabel: (level) =>
      `+${(1.5 * power("rare", level)).toFixed(1)}% crit · +${(
        8 * power("rare", level)
      ).toFixed(0)}% dano crít.`,
  },
  {
    id: "push_specialist",
    name: "Push Specialist",
    tier: "rare",
    role: "sparring",
    tagline: "Clinches e empurrões de escola.",
    bonusLabel: (level) =>
      `${labelPct(4, "rare", level, TEAM_KNOCKBACK_PCT_SCALE, "empurrão")} · ${labelPct(
        3,
        "rare",
        level,
        TEAM_DAMAGE_PCT_SCALE,
        "dano",
      )}`,
  },
  {
    id: "skill_scout",
    name: "Skill Scout",
    tier: "rare",
    role: "coach",
    tagline: "Olheiro de especiais.",
    bonusLabel: (level) =>
      `+${(4 * power("rare", level)).toFixed(0)}% dano de skills · +${(
        1.2 * power("rare", level)
      ).toFixed(1)}% crit`,
  },
  {
    id: "prime_cutman",
    name: "Prime Cutman",
    tier: "epic",
    role: "cutman",
    tagline: "Para sangramento em segundos.",
    bonusLabel: (level) =>
      labelPct(1.35, "epic", level, TEAM_REGEN_MAX_HP_PCT_SCALE, "HP máx/s", 2),
  },
  {
    id: "elite_spar",
    name: "Elite Spar",
    tier: "epic",
    role: "sparring",
    tagline: "Sparring de elite internacional.",
    bonusLabel: (level) =>
      `${labelPct(9, "epic", level, TEAM_DAMAGE_PCT_SCALE, "dano")} · +${(
        5.5 * power("epic", level)
      ).toFixed(0)}% XP`,
  },
  {
    id: "head_coach",
    name: "Head Coach",
    tier: "epic",
    role: "coach",
    tagline: "Estratégia e timing de skills.",
    bonusLabel: (level) =>
      `+${(2.2 * power("epic", level)).toFixed(1)}% crit · +${(
        3 * power("epic", level)
      ).toFixed(0)}% AS`,
  },
  {
    id: "money_manager",
    name: "Money Manager",
    tier: "epic",
    role: "manager",
    tagline: "Contratos e sponsors.",
    bonusLabel: (level) =>
      `+${(5 * power("epic", level)).toFixed(0)}% ouro · +${(
        0.35 * power("epic", level)
      ).toFixed(1)}% diamantes`,
  },
  {
    id: "range_finder",
    name: "Range Finder",
    tier: "epic",
    role: "coach",
    tagline: "Distância perfeita de jab.",
    bonusLabel: (level) =>
      `+${(2.5 * power("epic", level)).toFixed(0)}% AS`,
  },
  {
    id: "purple_agent",
    name: "Purple Agent",
    tier: "epic",
    role: "manager",
    tagline: "Contratos com o mercado roxo.",
    bonusLabel: (level) =>
      `+${(0.45 * power("epic", level)).toFixed(1)}% diam. roxos · +${(
        3 * power("epic", level)
      ).toFixed(0)}% ouro`,
  },
  {
    id: "iron_doc",
    name: "Iron Doc",
    tier: "legendary",
    role: "cutman",
    tagline: "Lenda dos cantos sangrentos.",
    bonusLabel: (level) =>
      labelPct(2.1, "legendary", level, TEAM_REGEN_MAX_HP_PCT_SCALE, "HP máx/s", 2),
  },
  {
    id: "shadow_spar",
    name: "Shadow Spar",
    tier: "legendary",
    role: "sparring",
    tagline: "Treina como luta — e luta como treina.",
    bonusLabel: (level) =>
      `${labelPct(14, "legendary", level, TEAM_DAMAGE_PCT_SCALE, "dano")} · +${(
        8 * power("legendary", level)
      ).toFixed(0)}% XP`,
  },
  {
    id: "titan_prep",
    name: "Titan Prep",
    tier: "legendary",
    role: "vitality",
    tagline: "Corpo de aço, fôlego infinito.",
    bonusLabel: (level) =>
      `${labelPct(90, "legendary", level, TEAM_MAX_HP_PCT_SCALE, "HP máx")} · −${(
        4 * power("legendary", level)
      ).toFixed(1)}% dano recebido`,
  },
  {
    id: "master_coach",
    name: "Master Coach",
    tier: "legendary",
    role: "coach",
    tagline: "O cérebro por trás do cinturão.",
    bonusLabel: (level) =>
      `+${(3.5 * power("legendary", level)).toFixed(1)}% crit · +${(
        5 * power("legendary", level)
      ).toFixed(0)}% AS · +${(
        12 * power("legendary", level)
      ).toFixed(0)}% dano crít.`,
  },
  {
    id: "golden_manager",
    name: "Golden Manager",
    tier: "legendary",
    role: "manager",
    tagline: "Transforma rounds em fortuna.",
    bonusLabel: (level) =>
      `+${(8 * power("legendary", level)).toFixed(0)}% ouro · +${(
        0.55 * power("legendary", level)
      ).toFixed(1)}% diamantes`,
  },
  {
    id: "echo_striker",
    name: "Echo Striker",
    tier: "legendary",
    role: "sparring",
    tagline: "Cada golpe ecoa nas skills.",
    bonusLabel: (level) =>
      `+${(6 * power("legendary", level)).toFixed(0)}% dano de skills · ${labelPct(
        8,
        "legendary",
        level,
        TEAM_KNOCKBACK_PCT_SCALE,
        "empurrão",
      )}`,
  },
  {
    id: "vault_broker",
    name: "Vault Broker",
    tier: "legendary",
    role: "manager",
    tagline: "Ouro, diamantes e o cofre roxo.",
    bonusLabel: (level) =>
      `+${(6 * power("legendary", level)).toFixed(0)}% ouro · +${(
        0.4 * power("legendary", level)
      ).toFixed(1)}% diam. · +${(
        0.5 * power("legendary", level)
      ).toFixed(1)}% roxos`,
  },
];

export function getTeamMemberDef(id: TeamMemberId): TeamMemberDef {
  const fromConfig = getTeamMemberConfigById(id);
  if (fromConfig) {
    return {
      id: id,
      name: fromConfig.name,
      tier: fromConfig.tier as TeamTier,
      role: fromConfig.role as TeamRole,
      tagline: fromConfig.tagline,
      bonusLabel: (level) => formatMemberBonusLabel(fromConfig.buffs, fromConfig.tier as TeamTier, level),
    };
  }
  return TEAM_MEMBER_DEFS.find((m) => m.id === id)!;
}

function formatMemberBonusLabel(
  buffs: TeamMemberBuffConfig[],
  tier: TeamTier,
  level: number,
): string {
  const parts = buffs.map((buff) => {
    switch (buff.type) {
      case "hp_regen_pct_max":
        return labelPct(buff.coefficient, tier, level, TEAM_REGEN_MAX_HP_PCT_SCALE, "HP máx/s", 2);
      case "damage_mul_pct":
        return labelPct(buff.coefficient, tier, level, TEAM_DAMAGE_PCT_SCALE, "dano");
      case "max_hp_mul_pct":
        return labelPct(buff.coefficient, tier, level, TEAM_MAX_HP_PCT_SCALE, "HP máx");
      case "knockback_mul_pct":
        return labelPct(buff.coefficient, tier, level, TEAM_KNOCKBACK_PCT_SCALE, "empurrão");
      case "damage_taken_reduce":
        return `−${(buff.coefficient * power(tier, level)).toFixed(1)}% dano recebido`;
      case "attack_speed_mul":
        return `+${(buff.coefficient * power(tier, level)).toFixed(1)}% AS`;
      case "xp_bonus":
        return `+${(buff.coefficient * power(tier, level) * 100).toFixed(0)}% XP`;
      case "crit_chance":
        return `+${(buff.coefficient * power(tier, level) * 100).toFixed(1)}% crit`;
      case "crit_damage":
        return `+${(buff.coefficient * power(tier, level) * 100).toFixed(0)}% dano crít.`;
      case "skill_damage_mul":
        return `+${(buff.coefficient * power(tier, level) * 100).toFixed(0)}% dano de skills`;
      case "gold_income_mul":
        return `+${(buff.coefficient * power(tier, level) * 100).toFixed(0)}% ouro`;
      case "diamond_luck":
        return `+${(buff.coefficient * power(tier, level) * 100).toFixed(1)}% diamantes`;
      case "purple_diamond_luck":
        return `+${(buff.coefficient * power(tier, level) * 100).toFixed(1)}% diam. roxos`;
      default:
        return "";
    }
  });
  return parts.filter(Boolean).join(" · ");
}

/** @deprecated Prefer `getTeamMembersConfig()` — mantido para compatibilidade de UI. */
export function getTeamMembersByTierFromConfig(tier: TeamTier): TeamMemberDef[] {
  return getTeamMembersConfig()
    .filter((m) => m.tier === tier)
    .map((m) => getTeamMemberDef(m.id as TeamMemberId));
}

export function getTeamMemberDefLegacy(id: TeamMemberId): TeamMemberDef {
  return TEAM_MEMBER_DEFS.find((m) => m.id === id)!;
}

export function getTeamMembersByTier(tier: TeamTier): TeamMemberDef[] {
  return getTeamMembersConfig()
    .filter((m) => m.tier === tier)
    .map((m) => getTeamMemberDef(m.id as TeamMemberId));
}

export function clampTeamMemberLevel(value: unknown): number {
  const n = Math.floor(Number(value) || 0);
  return Math.min(MAX_TEAM_MEMBER_LEVEL, Math.max(0, n));
}

export function normalizeTeamMembersOwned(
  partial?: Partial<TeamMembersOwned> | null,
): TeamMembersOwned {
  const next = { ...DEFAULT_TEAM_MEMBERS_OWNED };
  if (!partial) return next;
  for (const id of TEAM_MEMBER_IDS) {
    next[id] = clampTeamMemberLevel(partial[id]);
  }
  return next;
}

export function normalizeEquippedTeamIds(
  value: unknown,
  owned: TeamMembersOwned,
): TeamMemberId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<TeamMemberId>();
  const result: TeamMemberId[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    if (!TEAM_MEMBER_IDS.includes(raw as TeamMemberId)) continue;
    const id = raw as TeamMemberId;
    if (seen.has(id)) continue;
    if ((owned[id] ?? 0) <= 0) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= MAX_EQUIPPED_TEAM_MEMBERS) break;
  }
  return result;
}

export function getTeamRecruitCost(totalPulls: number): {
  gold: number;
  gems: number;
} {
  const scales = getTeamScaleConstants();
  const pulls = Math.max(0, Math.floor(totalPulls));
  return {
    gold: Math.max(
      1,
      Math.floor(
        scales.recruitGoldBase *
          Math.pow(scales.recruitGoldGrowth, pulls),
      ),
    ),
    gems: Math.max(
      1,
      Math.floor(
        scales.recruitGemsBase *
          Math.pow(scales.recruitGemsGrowth, pulls),
      ),
    ),
  };
}

/** Quantidade do pacote multi-pull. */
export const TEAM_MULTI_PULL_COUNT = 10;
/** Desconto no pacote 10× (10%). */
export const TEAM_MULTI_PULL_DISCOUNT = 0.1;

/**
 * Soma o custo das próximas `count` pulls (custo cresce com totalPulls)
 * e aplica desconto de pacote.
 */
export function getTeamMultiRecruitCost(
  totalPulls: number,
  count: number = TEAM_MULTI_PULL_COUNT,
): {
  gold: number;
  gems: number;
  rawGold: number;
  rawGems: number;
  count: number;
  discount: number;
} {
  const start = Math.max(0, Math.floor(totalPulls));
  const n = Math.max(1, Math.floor(count));
  let rawGold = 0;
  let rawGems = 0;
  for (let i = 0; i < n; i++) {
    const c = getTeamRecruitCost(start + i);
    rawGold += c.gold;
    rawGems += c.gems;
  }
  const mul = 1 - TEAM_MULTI_PULL_DISCOUNT;
  return {
    count: n,
    discount: TEAM_MULTI_PULL_DISCOUNT,
    rawGold,
    rawGems,
    gold: Math.max(n, Math.floor(rawGold * mul)),
    gems: Math.max(n, Math.floor(rawGems * mul)),
  };
}

export type TeamPityState = {
  totalPulls: number;
  pullsSinceEpic: number;
  pullsSinceLegendary: number;
};

export function normalizeTeamPity(
  partial?: Partial<TeamPityState> | null,
): TeamPityState {
  return {
    totalPulls: Math.max(0, Math.floor(Number(partial?.totalPulls) || 0)),
    pullsSinceEpic: Math.max(
      0,
      Math.floor(Number(partial?.pullsSinceEpic) || 0),
    ),
    pullsSinceLegendary: Math.max(
      0,
      Math.floor(Number(partial?.pullsSinceLegendary) || 0),
    ),
  };
}

/** Pesos dinâmicos com soft/hard pity e luck por total_pulls. */
export function getTeamTierWeights(pity: TeamPityState): Record<TeamTier, number> {
  const weights = { ...TEAM_BASE_TIER_WEIGHTS };
  const luckStacks = Math.floor(pity.totalPulls / TEAM_PULL_LUCK_INTERVAL);

  weights.rare *= 1 + luckStacks * 0.06;
  weights.epic *= 1 + luckStacks * 0.1;
  weights.legendary *= 1 + luckStacks * 0.08;

  if (pity.pullsSinceEpic >= TEAM_SOFT_PITY_EPIC) {
    const soft = pity.pullsSinceEpic - TEAM_SOFT_PITY_EPIC + 1;
    weights.epic *= 1 + soft * 0.18;
    weights.legendary *= 1 + soft * 0.08;
  }
  if (pity.pullsSinceLegendary >= TEAM_SOFT_PITY_LEGENDARY) {
    const soft = pity.pullsSinceLegendary - TEAM_SOFT_PITY_LEGENDARY + 1;
    weights.legendary *= 1 + soft * 0.25;
  }

  if (pity.pullsSinceLegendary >= TEAM_HARD_PITY_LEGENDARY) {
    return {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 1,
    };
  }
  if (pity.pullsSinceEpic >= TEAM_HARD_PITY_EPIC) {
    return {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: weights.epic,
      legendary: weights.legendary,
    };
  }

  return weights;
}

function pickWeightedTier(
  weights: Record<TeamTier, number>,
): TeamTier {
  let total = 0;
  for (const t of TEAM_TIERS) total += Math.max(0, weights[t]);
  if (total <= 0) return "common";
  let roll = Math.random() * total;
  for (const t of TEAM_TIERS) {
    roll -= Math.max(0, weights[t]);
    if (roll <= 0) return t;
  }
  return "legendary";
}

export function rollTeamMemberId(pity: TeamPityState): {
  memberId: TeamMemberId;
  tier: TeamTier;
} {
  const weights = getTeamTierWeights(pity);
  const tier = pickWeightedTier(weights);
  const pool = getTeamMembersByTier(tier);
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
  return { memberId: pick.id, tier: pick.tier };
}

export type EquippedTeamBuffs = {
  /** Multiplicador de dano base (1 = neutro). */
  damageMultiplier: number;
  /** Multiplicador de HP máximo (1 = neutro). */
  maxHpMultiplier: number;
  damageTakenMultiplier: number;
  attackSpeedMultiplier: number;
  critChanceBonus: number;
  critDamageBonus: number;
  /** % do HP máximo regenerado por segundo (0.001 = 0.1%/s). */
  hpRegenMaxHpRatioPerSecond: number;
  goldIncomeMultiplier: number;
  diamondLuckBonus: number;
  xpMultiplierBonus: number;
  /** Multiplicador de dano de skills (1 = neutro). */
  skillDamageMultiplier: number;
  /** Multiplicador de knockback (1 = neutro). */
  knockbackMultiplier: number;
  /** Chance extra de diamante roxo (aditivo 0–1). */
  purpleDiamondLuckBonus: number;
};

export const EMPTY_TEAM_BUFFS: EquippedTeamBuffs = {
  damageMultiplier: 1,
  maxHpMultiplier: 1,
  damageTakenMultiplier: 1,
  attackSpeedMultiplier: 1,
  critChanceBonus: 0,
  critDamageBonus: 0,
  hpRegenMaxHpRatioPerSecond: 0,
  goldIncomeMultiplier: 1,
  diamondLuckBonus: 0,
  xpMultiplierBonus: 0,
  skillDamageMultiplier: 1,
  knockbackMultiplier: 1,
  purpleDiamondLuckBonus: 0,
};

function applyMemberBuffs(
  acc: EquippedTeamBuffs,
  id: TeamMemberId,
  level: number,
): void {
  if (level <= 0) return;
  const config = getTeamMemberConfigById(id);
  if (!config) return;
  applyTeamMemberBuffs(acc, config.buffs, config.tierPower, level);
}

export function getEquippedTeamBuffs(
  owned: TeamMembersOwned,
  equippedIds: TeamMemberId[],
): EquippedTeamBuffs {
  const acc: EquippedTeamBuffs = { ...EMPTY_TEAM_BUFFS };
  for (const id of equippedIds) {
    applyMemberBuffs(acc, id, owned[id] ?? 0);
  }
  capEquippedTeamBuffs(acc);
  return acc;
}

/** Prestígio: membros obtidos voltam ao Nv.1; não-possuídos ficam 0. */
export function resetOwnedTeamMembersToBase(
  owned: TeamMembersOwned,
): TeamMembersOwned {
  const next = { ...DEFAULT_TEAM_MEMBERS_OWNED };
  for (const id of TEAM_MEMBER_IDS) {
    next[id] = (owned[id] ?? 0) > 0 ? 1 : 0;
  }
  return next;
}

export type RecruitTeamResult =
  | { ok: false; reason: "funds" }
  | {
      ok: true;
      memberId: TeamMemberId;
      tier: TeamTier;
      isDuplicate: boolean;
      level: number;
      goldSpent: number;
      gemsSpent: number;
      totalPulls: number;
    };

export type RecruitTeamPullEntry = {
  memberId: TeamMemberId;
  tier: TeamTier;
  isDuplicate: boolean;
  level: number;
};

export type RecruitTeamBatchResult =
  | { ok: false; reason: "funds" }
  | {
      ok: true;
      pulls: RecruitTeamPullEntry[];
      goldSpent: number;
      gemsSpent: number;
      totalPulls: number;
      discount: number;
    };

export function advancePityAfterPull(
  pity: TeamPityState,
  tier: TeamTier,
): TeamPityState {
  const next: TeamPityState = {
    totalPulls: pity.totalPulls + 1,
    pullsSinceEpic: pity.pullsSinceEpic + 1,
    pullsSinceLegendary: pity.pullsSinceLegendary + 1,
  };
  if (tier === "epic" || tier === "legendary") {
    next.pullsSinceEpic = 0;
  }
  if (tier === "legendary") {
    next.pullsSinceLegendary = 0;
  }
  return next;
}
