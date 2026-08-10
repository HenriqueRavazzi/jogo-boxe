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
    id: "towel_toss",
    name: "Towel Toss",
    tier: "common",
    role: "cutman",
    tagline: "Toalha gelada no canto.",
    bonusLabel: (level) =>
      `+${(0.22 * power("common", level)).toFixed(1)} HP/s · +${(
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
      `+${(1.5 * power("common", level)).toFixed(0)}% alcance · +${(
        1.2 * power("common", level)
      ).toFixed(0)}% XP`,
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
    id: "ice_bucket",
    name: "Ice Bucket",
    tier: "uncommon",
    role: "cutman",
    tagline: "Recuperação pós-round.",
    bonusLabel: (level) =>
      `+${(0.4 * power("uncommon", level)).toFixed(1)} HP/s · +${Math.round(
        12 * power("uncommon", level),
      )} HP máx.`,
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
    id: "push_specialist",
    name: "Push Specialist",
    tier: "rare",
    role: "sparring",
    tagline: "Clinches e empurrões de escola.",
    bonusLabel: (level) =>
      `+${Math.round(4 * power("rare", level))} empurrão · +${Math.round(
        3 * power("rare", level),
      )} dano`,
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
    id: "range_finder",
    name: "Range Finder",
    tier: "epic",
    role: "coach",
    tagline: "Distância perfeita de jab.",
    bonusLabel: (level) =>
      `+${(3.5 * power("epic", level)).toFixed(0)}% alcance · +${(
        2.5 * power("epic", level)
      ).toFixed(0)}% AS`,
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
  {
    id: "echo_striker",
    name: "Echo Striker",
    tier: "legendary",
    role: "sparring",
    tagline: "Cada golpe ecoa nas skills.",
    bonusLabel: (level) =>
      `+${(6 * power("legendary", level)).toFixed(0)}% dano de skills · +${Math.round(
        8 * power("legendary", level),
      )} empurrão`,
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
  /** Multiplicador de dano de skills (1 = neutro). */
  skillDamageMultiplier: number;
  /** Bônus flat de knockback dos socos. */
  knockbackBonus: number;
  /** Multiplicador de alcance de ataque (1 = neutro). */
  attackRangeMultiplier: number;
  /** Chance extra de diamante roxo (aditivo 0–1). */
  purpleDiamondLuckBonus: number;
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
  skillDamageMultiplier: 1,
  knockbackBonus: 0,
  attackRangeMultiplier: 1,
  purpleDiamondLuckBonus: 0,
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
    case "towel_toss":
      acc.hpRegenPerSecond += 0.22 * p;
      acc.attackSpeedMultiplier *= 1 + 0.008 * p;
      break;
    case "roadwork_runner":
      acc.attackRangeMultiplier *= 1 + 0.015 * p;
      acc.xpMultiplierBonus += 0.012 * p;
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
    case "ice_bucket":
      acc.hpRegenPerSecond += 0.4 * p;
      acc.maxHpBonus += 12 * p;
      break;
    case "focus_mitt":
      acc.critChanceBonus += 0.011 * p;
      acc.attackSpeedMultiplier *= 1 + 0.02 * p;
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
    case "push_specialist":
      acc.knockbackBonus += 4 * p;
      acc.flatDamage += 3 * p;
      break;
    case "skill_scout":
      acc.skillDamageMultiplier *= 1 + 0.04 * p;
      acc.critChanceBonus += 0.012 * p;
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
    case "range_finder":
      acc.attackRangeMultiplier *= 1 + 0.035 * p;
      acc.attackSpeedMultiplier *= 1 + 0.025 * p;
      break;
    case "purple_agent":
      acc.purpleDiamondLuckBonus += 0.0045 * p;
      acc.goldIncomeMultiplier *= 1 + 0.03 * p;
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
    case "echo_striker":
      acc.skillDamageMultiplier *= 1 + 0.06 * p;
      acc.knockbackBonus += 8 * p;
      break;
    case "vault_broker":
      acc.goldIncomeMultiplier *= 1 + 0.06 * p;
      acc.diamondLuckBonus += 0.004 * p;
      acc.purpleDiamondLuckBonus += 0.005 * p;
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
  acc.knockbackBonus = Math.round(acc.knockbackBonus);
  acc.damageTakenMultiplier = Math.max(0.5, acc.damageTakenMultiplier);
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
