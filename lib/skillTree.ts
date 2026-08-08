/** Definição estática da árvore de talents. */

export type SkillNodeId =
  | "node_hp_1"
  | "node_hp_2"
  | "node_iron_guard"
  | "node_life_steal_1"
  | "node_thick_skin"
  | "node_life_steal_2"
  | "node_fortitude"
  | "node_life_steal_3"
  | "node_dmg_1"
  | "node_dmg_2"
  | "node_range_focus"
  | "node_crit_chance"
  | "node_crit_power"
  | "node_knockout"
  | "node_dmg_3"
  | "node_spark_ignition"
  | "node_spark_burst"
  | "node_spark_fury"
  | "node_gold_gloves"
  | "node_extra_arm"
  | "node_loot_magnet"
  | "node_spark_overdrive";

export type SkillTreeState = Record<SkillNodeId, boolean>;

export type SkillNodeDef = {
  id: SkillNodeId;
  name: string;
  description: string;
  cost: number;
  /** null = nó raiz (sem pré-requisito). */
  requires: SkillNodeId | null;
  branch: "vitality" | "power" | "spark";
  /** Posição vertical na branch (0 = raiz). */
  tier: number;
  accent: string;
};

/** +1% de roubo de vida por nível (nó desbloqueado). */
export const LIFE_STEAL_PERCENT_PER_LEVEL = 1;

/** Cooldown da skill de ricochete (ms). */
export const RICOCHET_COOLDOWN_MS = 8000;
/** Máximo de alvos na cadeia. */
export const RICOCHET_MAX_BOUNCES = 4;
/** Fração do dano do soco aplicada em cada bounce. */
export const RICOCHET_BOUNCE_DAMAGE_PERCENT = 0.75;
/** Multiplicador de alcance para o 1º alvo do ricochete. */
export const RICOCHET_RANGE_MULT = 1.45;
/** Raio máximo entre saltos consecutivos. */
export const RICOCHET_LINK_RADIUS = 200;

export const DEFAULT_SKILL_TREE: SkillTreeState = {
  node_hp_1: false,
  node_hp_2: false,
  node_iron_guard: false,
  node_life_steal_1: false,
  node_thick_skin: false,
  node_life_steal_2: false,
  node_fortitude: false,
  node_life_steal_3: false,
  node_dmg_1: false,
  node_dmg_2: false,
  node_range_focus: false,
  node_crit_chance: false,
  node_crit_power: false,
  node_knockout: false,
  node_dmg_3: false,
  node_spark_ignition: false,
  node_spark_burst: false,
  node_spark_fury: false,
  node_gold_gloves: false,
  node_extra_arm: false,
  node_loot_magnet: false,
  node_spark_overdrive: false,
};

export const SKILL_NODES: SkillNodeDef[] = [
  // Vitality — custos em diamantes (gems)
  {
    id: "node_hp_1",
    name: "Tough Hide",
    description: "+30 Max HP",
    cost: 50,
    requires: null,
    branch: "vitality",
    tier: 0,
    accent: "rose",
  },
  {
    id: "node_hp_2",
    name: "Iron Lungs",
    description: "+60 Max HP",
    cost: 200,
    requires: "node_hp_1",
    branch: "vitality",
    tier: 1,
    accent: "rose",
  },
  {
    id: "node_iron_guard",
    name: "Iron Guard",
    description: "+50 Max HP",
    cost: 700,
    requires: "node_hp_2",
    branch: "vitality",
    tier: 2,
    accent: "rose",
  },
  {
    id: "node_life_steal_1",
    name: "Blood Siphon",
    description: "+1% Life Steal",
    cost: 2_500,
    requires: "node_iron_guard",
    branch: "vitality",
    tier: 3,
    accent: "emerald",
  },
  {
    id: "node_thick_skin",
    name: "Thick Skin",
    description: "−8% dano recebido",
    cost: 8_000,
    requires: "node_life_steal_1",
    branch: "vitality",
    tier: 4,
    accent: "silver",
  },
  {
    id: "node_life_steal_2",
    name: "Crimson Drain",
    description: "+1% Life Steal",
    cost: 25_000,
    requires: "node_thick_skin",
    branch: "vitality",
    tier: 5,
    accent: "emerald",
  },
  {
    id: "node_fortitude",
    name: "Fortitude",
    description: "+120 Max HP",
    cost: 80_000,
    requires: "node_life_steal_2",
    branch: "vitality",
    tier: 6,
    accent: "rose",
  },
  {
    id: "node_life_steal_3",
    name: "Vampire Fist",
    description: "+1.5% Life Steal",
    cost: 250_000,
    requires: "node_fortitude",
    branch: "vitality",
    tier: 7,
    accent: "emerald",
  },
  // Power
  {
    id: "node_dmg_1",
    name: "Heavy Hands",
    description: "+6 Base Damage",
    cost: 50,
    requires: null,
    branch: "power",
    tier: 0,
    accent: "amber",
  },
  {
    id: "node_dmg_2",
    name: "Bone Crusher",
    description: "+12 Base Damage",
    cost: 200,
    requires: "node_dmg_1",
    branch: "power",
    tier: 1,
    accent: "amber",
  },
  {
    id: "node_range_focus",
    name: "Long Reach",
    description: "+30 Range",
    cost: 700,
    requires: "node_dmg_2",
    branch: "power",
    tier: 2,
    accent: "amber",
  },
  {
    id: "node_crit_chance",
    name: "Precision",
    description: "+5% chance de crítico",
    cost: 2_500,
    requires: "node_range_focus",
    branch: "power",
    tier: 3,
    accent: "yellow",
  },
  {
    id: "node_crit_power",
    name: "Haymaker",
    description: "+25% dano crítico",
    cost: 8_000,
    requires: "node_crit_chance",
    branch: "power",
    tier: 4,
    accent: "yellow",
  },
  {
    id: "node_knockout",
    name: "Ring Control",
    description: "+3 empurrão",
    cost: 25_000,
    requires: "node_crit_power",
    branch: "power",
    tier: 5,
    accent: "silver",
  },
  {
    id: "node_dmg_3",
    name: "Glass Cannon",
    description: "+22 Base Damage",
    cost: 80_000,
    requires: "node_knockout",
    branch: "power",
    tier: 6,
    accent: "amber",
  },
  // Spark
  {
    id: "node_spark_ignition",
    name: "Spark Ignition",
    description: "-50ms Attack Cooldown",
    cost: 60,
    requires: null,
    branch: "spark",
    tier: 0,
    accent: "sky",
  },
  {
    id: "node_spark_burst",
    name: "Spark Burst",
    description: "-75ms Attack Cooldown",
    cost: 250,
    requires: "node_spark_ignition",
    branch: "spark",
    tier: 1,
    accent: "sky",
  },
  {
    id: "node_spark_fury",
    name: "Spark Fury",
    description: "-100ms Attack Cooldown",
    cost: 800,
    requires: "node_spark_burst",
    branch: "spark",
    tier: 2,
    accent: "sky",
  },
  {
    id: "node_gold_gloves",
    name: "Golden Gloves",
    description: "+20% ouro dropado",
    cost: 3_000,
    requires: "node_spark_fury",
    branch: "spark",
    tier: 3,
    accent: "yellow",
  },
  {
    id: "node_extra_arm",
    name: "Extra Arm",
    description: "+1 braço de ataque",
    cost: 10_000,
    requires: "node_gold_gloves",
    branch: "spark",
    tier: 4,
    accent: "cyan",
  },
  {
    id: "node_loot_magnet",
    name: "Loot Magnet",
    description: "+30% raio do ímã",
    cost: 35_000,
    requires: "node_extra_arm",
    branch: "spark",
    tier: 5,
    accent: "cyan",
  },
  {
    id: "node_spark_overdrive",
    name: "Overdrive",
    description: "-90ms Attack Cooldown",
    cost: 100_000,
    requires: "node_loot_magnet",
    branch: "spark",
    tier: 6,
    accent: "sky",
  },
];

export const SKILL_BRANCHES = [
  { id: "vitality" as const, title: "Vitality", color: "text-rose-300" },
  { id: "power" as const, title: "Power", color: "text-amber-300" },
  { id: "spark" as const, title: "Spark", color: "text-sky-300" },
];

export function getSkillNode(id: SkillNodeId): SkillNodeDef {
  return SKILL_NODES.find((n) => n.id === id)!;
}

export function canUnlockSkill(
  skillTree: SkillTreeState,
  nodeId: SkillNodeId,
  gems: number,
): boolean {
  const node = getSkillNode(nodeId);
  if (skillTree[nodeId]) return false;
  if (node.requires && !skillTree[node.requires]) return false;
  if (gems < node.cost) return false;
  return true;
}

/** Nível de life steal (0–3) a partir dos nós desbloqueados. */
export function getLifeStealLevel(skillTree: SkillTreeState): number {
  let level = 0;
  if (skillTree.node_life_steal_1) level += 1;
  if (skillTree.node_life_steal_2) level += 1;
  if (skillTree.node_life_steal_3) level += 1;
  return level;
}

/** Fração do dano convertido em cura (ex.: nível 2 → 0.02). */
export function getLifeStealRatio(skillTree: SkillTreeState): number {
  let percent = 0;
  if (skillTree.node_life_steal_1) percent += LIFE_STEAL_PERCENT_PER_LEVEL;
  if (skillTree.node_life_steal_2) percent += LIFE_STEAL_PERCENT_PER_LEVEL;
  if (skillTree.node_life_steal_3) percent += 1.5;
  return percent / 100;
}

/** Multiplicador de dano recebido (1 = normal; <1 = redução). */
export function getSkillDamageTakenMultiplier(
  skillTree: SkillTreeState,
): number {
  return skillTree.node_thick_skin ? 0.92 : 1;
}

export function getSkillCritChanceBonus(skillTree: SkillTreeState): number {
  return skillTree.node_crit_chance ? 0.05 : 0;
}

export function getSkillCritDamageBonus(skillTree: SkillTreeState): number {
  return skillTree.node_crit_power ? 0.25 : 0;
}

export function getSkillKnockbackBonus(skillTree: SkillTreeState): number {
  return skillTree.node_knockout ? 3 : 0;
}

export function getSkillGoldIncomeMultiplier(
  skillTree: SkillTreeState,
): number {
  return skillTree.node_gold_gloves ? 1.2 : 1;
}

export function getSkillExtraArms(skillTree: SkillTreeState): number {
  return skillTree.node_extra_arm ? 1 : 0;
}

export function getSkillMagnetRadiusMultiplier(
  skillTree: SkillTreeState,
): number {
  return skillTree.node_loot_magnet ? 1.3 : 1;
}

/** @deprecated Ricochete só via Skills Roxas (`unlockedSkills.ricochet`). */
export function isRicochetUnlocked(_skillTree: SkillTreeState): boolean {
  return false;
}

export type RicochetConfig = {
  unlocked: boolean;
  cooldownMs: number;
  maxBounces: number;
  bounceDamagePercent: number;
};

/**
 * Config de ricochete (UI / meta): ciclo 25s, janela 2s.
 * Desbloqueio real vem de `unlockedSkills.ricochet` + cartas in-run.
 */
export function getRicochetConfig(
  _skillTree: SkillTreeState,
  ricochetLevel = 0,
): RicochetConfig {
  const level = Math.max(0, Math.floor(ricochetLevel));
  return {
    unlocked: level > 0,
    cooldownMs: 25_000,
    maxBounces: Math.min(5, 2 + level),
    bounceDamagePercent: 0.6 + level * 0.15,
  };
}
