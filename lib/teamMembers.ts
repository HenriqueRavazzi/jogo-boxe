/** Equipe de apoio (gacha) — tiers, pity, funções e buffs passivos. */

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
  // Uncommon
  | "stitch_sam"
  | "pad_holder"
  | "meal_prep"
  // Rare
  | "ringside_doc"
  | "sparring_ace"
  | "strength_coach"
  | "corner_tactician"
  // Epic
  | "prime_cutman"
  | "elite_spar"
  | "head_coach"
  | "money_manager"
  // Legendary
  | "iron_doc"
  | "shadow_spar"
  | "titan_prep"
  | "master_coach"
  | "golden_manager";

/** Nível por membro (0 = não possui). */
export type TeamMembersOwned = Record<TeamMemberId, number>;

export const TEAM_MEMBER_IDS: TeamMemberId[] = [
  "bandage_boy",
  "gym_rat",
  "water_boy",
  "stitch_sam",
  "pad_holder",
  "meal_prep",
  "ringside_doc",
  "sparring_ace",
  "strength_coach",
  "corner_tactician",
  "prime_cutman",
  "elite_spar",
  "head_coach",
  "money_manager",
  "iron_doc",
  "shadow_spar",
  "titan_prep",
  "master_coach",
  "golden_manager",
];

export const DEFAULT_TEAM_MEMBERS_OWNED: TeamMembersOwned =
  Object.fromEntries(TEAM_MEMBER_IDS.map((id) => [id, 0])) as TeamMembersOwned;

export const MAX_TEAM_MEMBER_LEVEL = 20;
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

export const TEAM_RECRUIT_GOLD_BASE = 380;
export const TEAM_RECRUIT_GEMS_BASE = 14;
export const TEAM_RECRUIT_GOLD_GROWTH = 1.045;
export const TEAM_RECRUIT_GEMS_GROWTH = 1.035;

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

export const TEAM_MEMBER_DEFS: TeamMemberDef[] = [
  {
    id: "bandage_boy",
    name: "Bandage Boy",
    tier: "common",
    role: "cutman",
    tagline: "Fita rápida entre os rounds.",
    bonusLabel: (level) =>
      `+${(0.35 * power("common", level)).toFixed(1)} HP/s`,
  },
  {
    id: "gym_rat",
    name: "Gym Rat",
    tier: "common",
    role: "sparring",
    tagline: "Parceiro de saco barato.",
    bonusLabel: (level) =>
      `+${Math.round(2 * power("common", level))} dano base`,
  },
  {
    id: "water_boy",
    name: "Water Boy",
    tier: "common",
    role: "vitality",
    tagline: "Hidratação básica.",
    bonusLabel: (level) =>
      `+${Math.round(18 * power("common", level))} HP máx.`,
  },
  {
    id: "stitch_sam",
    name: "Stitch Sam",
    tier: "uncommon",
    role: "cutman",
    tagline: "Costura cortes no canto.",
    bonusLabel: (level) =>
      `+${(0.55 * power("uncommon", level)).toFixed(1)} HP/s`,
  },
  {
    id: "pad_holder",
    name: "Pad Holder",
    tier: "uncommon",
    role: "sparring",
    tagline: "Treino de pads constante.",
    bonusLabel: (level) =>
      `+${Math.round(3 * power("uncommon", level))} dano · +${(
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
      `+${Math.round(28 * power("uncommon", level))} HP · −${(
        1.2 * power("uncommon", level)
      ).toFixed(1)}% dano recebido`,
  },
  {
    id: "ringside_doc",
    name: "Ringside Doc",
    tier: "rare",
    role: "cutman",
    tagline: "Médico de plantão no ringue.",
    bonusLabel: (level) =>
      `+${(0.85 * power("rare", level)).toFixed(1)} HP/s`,
  },
  {
    id: "sparring_ace",
    name: "Sparring Ace",
    tier: "rare",
    role: "sparring",
    tagline: "Pressão real no sparring.",
    bonusLabel: (level) =>
      `+${Math.round(5 * power("rare", level))} dano · +${(
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
      `+${Math.round(45 * power("rare", level))} HP · −${(
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
    id: "prime_cutman",
    name: "Prime Cutman",
    tier: "epic",
    role: "cutman",
    tagline: "Para sangramento em segundos.",
    bonusLabel: (level) =>
      `+${(1.35 * power("epic", level)).toFixed(1)} HP/s`,
  },
  {
    id: "elite_spar",
    name: "Elite Spar",
    tier: "epic",
    role: "sparring",
    tagline: "Sparring de elite internacional.",
    bonusLabel: (level) =>
      `+${Math.round(9 * power("epic", level))} dano · +${(
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
    id: "iron_doc",
    name: "Iron Doc",
    tier: "legendary",
    role: "cutman",
    tagline: "Lenda dos cantos sangrentos.",
    bonusLabel: (level) =>
      `+${(2.1 * power("legendary", level)).toFixed(1)} HP/s`,
  },
  {
    id: "shadow_spar",
    name: "Shadow Spar",
    tier: "legendary",
    role: "sparring",
    tagline: "Treina como luta — e luta como treina.",
    bonusLabel: (level) =>
      `+${Math.round(14 * power("legendary", level))} dano · +${(
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
      `+${Math.round(90 * power("legendary", level))} HP · −${(
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
];

export function getTeamMemberDef(id: TeamMemberId): TeamMemberDef {
  return TEAM_MEMBER_DEFS.find((m) => m.id === id)!;
}

export function getTeamMembersByTier(tier: TeamTier): TeamMemberDef[] {
  return TEAM_MEMBER_DEFS.filter((m) => m.tier === tier);
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
  const pulls = Math.max(0, Math.floor(totalPulls));
  return {
    gold: Math.max(
      1,
      Math.floor(
        TEAM_RECRUIT_GOLD_BASE * Math.pow(TEAM_RECRUIT_GOLD_GROWTH, pulls),
      ),
    ),
    gems: Math.max(
      1,
      Math.floor(
        TEAM_RECRUIT_GEMS_BASE * Math.pow(TEAM_RECRUIT_GEMS_GROWTH, pulls),
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
  flatDamage: number;
  maxHpBonus: number;
  damageTakenMultiplier: number;
  attackSpeedMultiplier: number;
  critChanceBonus: number;
  critDamageBonus: number;
  hpRegenPerSecond: number;
  goldIncomeMultiplier: number;
  diamondLuckBonus: number;
  xpMultiplierBonus: number;
};

export const EMPTY_TEAM_BUFFS: EquippedTeamBuffs = {
  flatDamage: 0,
  maxHpBonus: 0,
  damageTakenMultiplier: 1,
  attackSpeedMultiplier: 1,
  critChanceBonus: 0,
  critDamageBonus: 0,
  hpRegenPerSecond: 0,
  goldIncomeMultiplier: 1,
  diamondLuckBonus: 0,
  xpMultiplierBonus: 0,
};

function applyMemberBuffs(
  acc: EquippedTeamBuffs,
  id: TeamMemberId,
  level: number,
): void {
  if (level <= 0) return;
  const def = getTeamMemberDef(id);
  const p = power(def.tier, level);

  switch (id) {
    case "bandage_boy":
      acc.hpRegenPerSecond += 0.35 * p;
      break;
    case "gym_rat":
      acc.flatDamage += 2 * p;
      break;
    case "water_boy":
      acc.maxHpBonus += 18 * p;
      break;
    case "stitch_sam":
      acc.hpRegenPerSecond += 0.55 * p;
      break;
    case "pad_holder":
      acc.flatDamage += 3 * p;
      acc.xpMultiplierBonus += 0.02 * p;
      break;
    case "meal_prep":
      acc.maxHpBonus += 28 * p;
      acc.damageTakenMultiplier *= 1 - Math.min(0.25, 0.012 * p);
      break;
    case "ringside_doc":
      acc.hpRegenPerSecond += 0.85 * p;
      break;
    case "sparring_ace":
      acc.flatDamage += 5 * p;
      acc.xpMultiplierBonus += 0.035 * p;
      break;
    case "strength_coach":
      acc.maxHpBonus += 45 * p;
      acc.damageTakenMultiplier *= 1 - Math.min(0.3, 0.02 * p);
      break;
    case "corner_tactician":
      acc.critChanceBonus += 0.015 * p;
      acc.critDamageBonus += 0.08 * p;
      break;
    case "prime_cutman":
      acc.hpRegenPerSecond += 1.35 * p;
      break;
    case "elite_spar":
      acc.flatDamage += 9 * p;
      acc.xpMultiplierBonus += 0.055 * p;
      break;
    case "head_coach":
      acc.critChanceBonus += 0.022 * p;
      acc.attackSpeedMultiplier *= 1 + 0.03 * p;
      break;
    case "money_manager":
      acc.goldIncomeMultiplier *= 1 + 0.05 * p;
      acc.diamondLuckBonus += 0.0035 * p;
      break;
    case "iron_doc":
      acc.hpRegenPerSecond += 2.1 * p;
      break;
    case "shadow_spar":
      acc.flatDamage += 14 * p;
      acc.xpMultiplierBonus += 0.08 * p;
      break;
    case "titan_prep":
      acc.maxHpBonus += 90 * p;
      acc.damageTakenMultiplier *= 1 - Math.min(0.35, 0.04 * p);
      break;
    case "master_coach":
      acc.critChanceBonus += 0.035 * p;
      acc.attackSpeedMultiplier *= 1 + 0.05 * p;
      acc.critDamageBonus += 0.12 * p;
      break;
    case "golden_manager":
      acc.goldIncomeMultiplier *= 1 + 0.08 * p;
      acc.diamondLuckBonus += 0.0055 * p;
      break;
    default:
      break;
  }
}

export function getEquippedTeamBuffs(
  owned: TeamMembersOwned,
  equippedIds: TeamMemberId[],
): EquippedTeamBuffs {
  const acc: EquippedTeamBuffs = { ...EMPTY_TEAM_BUFFS };
  for (const id of equippedIds) {
    applyMemberBuffs(acc, id, owned[id] ?? 0);
  }
  acc.flatDamage = Math.round(acc.flatDamage);
  acc.maxHpBonus = Math.round(acc.maxHpBonus);
  acc.damageTakenMultiplier = Math.max(0.5, acc.damageTakenMultiplier);
  return acc;
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
