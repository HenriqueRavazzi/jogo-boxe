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
  | "node_second_heart"
  | "node_dmg_1"
  | "node_dmg_2"
  | "node_range_focus"
  | "node_crit_chance"
  | "node_crit_power"
  | "node_knockout"
  | "node_dmg_3"
  | "node_relentless"
  | "node_spark_ignition"
  | "node_spark_burst"
  | "node_spark_fury"
  | "node_gold_gloves"
  | "node_extra_arm"
  | "node_loot_magnet"
  | "node_spark_overdrive"
  | "node_haste"
  | "node_extra_arm_2"
  | "node_ring_master"
  | "node_adrenaline"
  | "node_berserker"
  | "node_immortal_champion";

export type SkillTreeState = Record<SkillNodeId, boolean>;

export type SkillBranchId = "vitality" | "power" | "spark" | "synergy";

export type SkillNodeDef = {
  id: SkillNodeId;
  name: string;
  description: string;
  cost: number;
  /**
   * Pré-requisitos — todos devem estar desbloqueados.
   * Array vazio = nó raiz. Vários ids = exige investimento em mais de uma linha.
   */
  requires: SkillNodeId[];
  branch: SkillBranchId;
  /** Posição vertical na branch (0 = raiz / topo). */
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
  node_second_heart: false,
  node_dmg_1: false,
  node_dmg_2: false,
  node_range_focus: false,
  node_crit_chance: false,
  node_crit_power: false,
  node_knockout: false,
  node_dmg_3: false,
  node_relentless: false,
  node_spark_ignition: false,
  node_spark_burst: false,
  node_spark_fury: false,
  node_gold_gloves: false,
  node_extra_arm: false,
  node_loot_magnet: false,
  node_spark_overdrive: false,
  node_haste: false,
  node_extra_arm_2: false,
  node_ring_master: false,
  node_adrenaline: false,
  node_berserker: false,
  node_immortal_champion: false,
};

export const SKILL_NODES: SkillNodeDef[] = [
  // ── Vitality ──────────────────────────────────────────────
  {
    id: "node_hp_1",
    name: "Tough Hide",
    description: "+30 Max HP",
    cost: 50,
    requires: [],
    branch: "vitality",
    tier: 0,
    accent: "rose",
  },
  {
    id: "node_hp_2",
    name: "Iron Lungs",
    description: "+60 Max HP",
    cost: 200,
    requires: ["node_hp_1"],
    branch: "vitality",
    tier: 1,
    accent: "rose",
  },
  {
    id: "node_iron_guard",
    name: "Iron Guard",
    description: "+50 Max HP",
    cost: 700,
    requires: ["node_hp_2"],
    branch: "vitality",
    tier: 2,
    accent: "rose",
  },
  {
    id: "node_life_steal_1",
    name: "Blood Siphon",
    description: "+1% Life Steal",
    cost: 2_500,
    requires: ["node_iron_guard"],
    branch: "vitality",
    tier: 3,
    accent: "emerald",
  },
  {
    id: "node_thick_skin",
    name: "Thick Skin",
    description: "−8% dano recebido",
    cost: 8_000,
    requires: ["node_life_steal_1"],
    branch: "vitality",
    tier: 4,
    accent: "silver",
  },
  {
    id: "node_life_steal_2",
    name: "Crimson Drain",
    description: "+1% Life Steal",
    cost: 25_000,
    requires: ["node_thick_skin"],
    branch: "vitality",
    tier: 5,
    accent: "emerald",
  },
  {
    id: "node_fortitude",
    name: "Fortitude",
    description: "+120 Max HP",
    cost: 80_000,
    requires: ["node_life_steal_2"],
    branch: "vitality",
    tier: 6,
    accent: "rose",
  },
  {
    id: "node_life_steal_3",
    name: "Vampire Fist",
    description: "+1.5% Life Steal",
    cost: 250_000,
    requires: ["node_fortitude"],
    branch: "vitality",
    tier: 7,
    accent: "emerald",
  },
  {
    id: "node_second_heart",
    name: "Second Heart",
    description: "+150 Max HP",
    cost: 400_000,
    requires: ["node_life_steal_3"],
    branch: "vitality",
    tier: 8,
    accent: "rose",
  },

  // ── Power ─────────────────────────────────────────────────
  {
    id: "node_dmg_1",
    name: "Heavy Hands",
    description: "+6 Base Damage",
    cost: 50,
    requires: [],
    branch: "power",
    tier: 0,
    accent: "amber",
  },
  {
    id: "node_dmg_2",
    name: "Bone Crusher",
    description: "+12 Base Damage",
    cost: 200,
    requires: ["node_dmg_1"],
    branch: "power",
    tier: 1,
    accent: "amber",
  },
  {
    id: "node_range_focus",
    name: "Long Reach",
    description: "+30 Range",
    cost: 700,
    requires: ["node_dmg_2"],
    branch: "power",
    tier: 2,
    accent: "amber",
  },
  {
    id: "node_crit_chance",
    name: "Precision",
    description: "+5% chance de crítico",
    cost: 2_500,
    requires: ["node_range_focus"],
    branch: "power",
    tier: 3,
    accent: "yellow",
  },
  {
    id: "node_crit_power",
    name: "Haymaker",
    description: "+25% dano crítico",
    cost: 8_000,
    requires: ["node_crit_chance"],
    branch: "power",
    tier: 4,
    accent: "yellow",
  },
  {
    id: "node_knockout",
    name: "Ring Control",
    description: "+3 empurrão",
    cost: 25_000,
    requires: ["node_crit_power"],
    branch: "power",
    tier: 5,
    accent: "silver",
  },
  {
    id: "node_dmg_3",
    name: "Glass Cannon",
    description: "+22 Base Damage",
    cost: 80_000,
    requires: ["node_knockout"],
    branch: "power",
    tier: 6,
    accent: "amber",
  },
  {
    id: "node_relentless",
    name: "Relentless",
    description: "+18 Base Damage",
    cost: 220_000,
    requires: ["node_dmg_3"],
    branch: "power",
    tier: 7,
    accent: "amber",
  },

  // ── Spark ─────────────────────────────────────────────────
  {
    id: "node_spark_ignition",
    name: "Spark Ignition",
    description: "-50ms Attack Cooldown",
    cost: 60,
    requires: [],
    branch: "spark",
    tier: 0,
    accent: "sky",
  },
  {
    id: "node_spark_burst",
    name: "Spark Burst",
    description: "-75ms Attack Cooldown",
    cost: 250,
    requires: ["node_spark_ignition"],
    branch: "spark",
    tier: 1,
    accent: "sky",
  },
  {
    id: "node_spark_fury",
    name: "Spark Fury",
    description: "-100ms Attack Cooldown",
    cost: 800,
    requires: ["node_spark_burst"],
    branch: "spark",
    tier: 2,
    accent: "sky",
  },
  {
    id: "node_gold_gloves",
    name: "Golden Gloves",
    description: "+20% ouro dropado",
    cost: 3_000,
    requires: ["node_spark_fury"],
    branch: "spark",
    tier: 3,
    accent: "yellow",
  },
  {
    id: "node_extra_arm",
    name: "Extra Arm",
    description: "+1 braço de ataque",
    cost: 10_000,
    requires: ["node_gold_gloves"],
    branch: "spark",
    tier: 4,
    accent: "cyan",
  },
  {
    id: "node_loot_magnet",
    name: "Loot Magnet",
    description: "+30% raio do ímã",
    cost: 35_000,
    requires: ["node_extra_arm"],
    branch: "spark",
    tier: 5,
    accent: "cyan",
  },
  {
    id: "node_spark_overdrive",
    name: "Overdrive",
    description: "-90ms Attack Cooldown",
    cost: 100_000,
    requires: ["node_loot_magnet"],
    branch: "spark",
    tier: 6,
    accent: "sky",
  },
  {
    id: "node_haste",
    name: "Haste",
    description: "-55ms Attack Cooldown",
    cost: 280_000,
    requires: ["node_spark_overdrive"],
    branch: "spark",
    tier: 7,
    accent: "sky",
  },

  // ── Synergy (multi-ramo) ──────────────────────────────────
  {
    id: "node_ring_master",
    name: "Ring Master",
    description: "+35 Range · +15% ouro",
    cost: 45_000,
    requires: ["node_range_focus", "node_gold_gloves"],
    branch: "synergy",
    tier: 0,
    accent: "yellow",
  },
  {
    id: "node_adrenaline",
    name: "Adrenaline",
    description: "−70ms CD · +1% Life Steal",
    cost: 60_000,
    requires: ["node_spark_fury", "node_life_steal_1"],
    branch: "synergy",
    tier: 1,
    accent: "emerald",
  },
  {
    id: "node_extra_arm_2",
    name: "Twin Arms",
    description: "+1 braço de ataque",
    cost: 180_000,
    requires: ["node_extra_arm", "node_crit_power"],
    branch: "synergy",
    tier: 2,
    accent: "cyan",
  },
  {
    id: "node_berserker",
    name: "Berserker",
    description: "+20 Damage · +80 Max HP",
    cost: 320_000,
    requires: ["node_dmg_3", "node_fortitude"],
    branch: "synergy",
    tier: 3,
    accent: "amber",
  },
  {
    id: "node_immortal_champion",
    name: "Immortal Champion",
    description: "−5% dano recebido · +10 Damage · +1% Life Steal",
    cost: 750_000,
    requires: ["node_life_steal_3", "node_dmg_3", "node_spark_overdrive"],
    branch: "synergy",
    tier: 4,
    accent: "silver",
  },
];

export const SKILL_BRANCHES = [
  { id: "vitality" as const, title: "Vitality", color: "text-rose-300" },
  { id: "power" as const, title: "Power", color: "text-amber-300" },
  { id: "spark" as const, title: "Spark", color: "text-sky-300" },
  {
    id: "synergy" as const,
    title: "Synergy",
    color: "text-fuchsia-300",
    hint: "Exige nós de mais de uma linha",
  },
];

export function getSkillNode(id: SkillNodeId): SkillNodeDef {
  return SKILL_NODES.find((n) => n.id === id)!;
}

/** Pré-requisitos ainda não desbloqueados. */
export function getMissingRequirements(
  skillTree: SkillTreeState,
  nodeId: SkillNodeId,
): SkillNodeId[] {
  const node = getSkillNode(nodeId);
  return node.requires.filter((id) => !skillTree[id]);
}

export function areRequirementsMet(
  skillTree: SkillTreeState,
  nodeId: SkillNodeId,
): boolean {
  return getMissingRequirements(skillTree, nodeId).length === 0;
}

/** Rótulos curtos dos pré-requisitos para a UI. */
export function formatRequirementLabels(requires: SkillNodeId[]): string {
  if (requires.length === 0) return "";
  return requires.map((id) => getSkillNode(id).name).join(" + ");
}

export function canUnlockSkill(
  skillTree: SkillTreeState,
  nodeId: SkillNodeId,
  gems: number,
): boolean {
  const node = getSkillNode(nodeId);
  if (skillTree[nodeId]) return false;
  if (!areRequirementsMet(skillTree, nodeId)) return false;
  if (gems < node.cost) return false;
  return true;
}

/** Nível de life steal (0–3 base + sinergias) a partir dos nós desbloqueados. */
export function getLifeStealLevel(skillTree: SkillTreeState): number {
  let level = 0;
  if (skillTree.node_life_steal_1) level += 1;
  if (skillTree.node_life_steal_2) level += 1;
  if (skillTree.node_life_steal_3) level += 1;
  if (skillTree.node_adrenaline) level += 1;
  if (skillTree.node_immortal_champion) level += 1;
  return level;
}

/** Fração do dano convertido em cura (ex.: nível 2 → 0.02). */
export function getLifeStealRatio(skillTree: SkillTreeState): number {
  let percent = 0;
  if (skillTree.node_life_steal_1) percent += LIFE_STEAL_PERCENT_PER_LEVEL;
  if (skillTree.node_life_steal_2) percent += LIFE_STEAL_PERCENT_PER_LEVEL;
  if (skillTree.node_life_steal_3) percent += 1.5;
  if (skillTree.node_adrenaline) percent += 1;
  if (skillTree.node_immortal_champion) percent += 1;
  return percent / 100;
}

/** Multiplicador de dano recebido (1 = normal; <1 = redução). */
export function getSkillDamageTakenMultiplier(
  skillTree: SkillTreeState,
): number {
  let mul = 1;
  if (skillTree.node_thick_skin) mul *= 0.92;
  if (skillTree.node_immortal_champion) mul *= 0.95;
  return mul;
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
  let mul = 1;
  if (skillTree.node_gold_gloves) mul *= 1.2;
  if (skillTree.node_ring_master) mul *= 1.15;
  return mul;
}

export function getSkillExtraArms(skillTree: SkillTreeState): number {
  let arms = 0;
  if (skillTree.node_extra_arm) arms += 1;
  if (skillTree.node_extra_arm_2) arms += 1;
  return arms;
}

export function getSkillMagnetRadiusMultiplier(
  skillTree: SkillTreeState,
): number {
  return skillTree.node_loot_magnet ? 1.3 : 1;
}

/** Bônus flat de HP vindos da árvore (inclui sinergias). */
export function getSkillTreeHpBonus(skillTree: SkillTreeState): number {
  let bonus = 0;
  if (skillTree.node_hp_1) bonus += 30;
  if (skillTree.node_hp_2) bonus += 60;
  if (skillTree.node_iron_guard) bonus += 50;
  if (skillTree.node_fortitude) bonus += 120;
  if (skillTree.node_second_heart) bonus += 150;
  if (skillTree.node_berserker) bonus += 80;
  return bonus;
}

/** Bônus flat de dano vindos da árvore (inclui sinergias). */
export function getSkillTreeDamageBonus(skillTree: SkillTreeState): number {
  let bonus = 0;
  if (skillTree.node_dmg_1) bonus += 6;
  if (skillTree.node_dmg_2) bonus += 12;
  if (skillTree.node_dmg_3) bonus += 22;
  if (skillTree.node_relentless) bonus += 18;
  if (skillTree.node_berserker) bonus += 20;
  if (skillTree.node_immortal_champion) bonus += 10;
  return bonus;
}

/** Bônus flat de alcance vindos da árvore. */
export function getSkillTreeRangeBonus(skillTree: SkillTreeState): number {
  let bonus = 0;
  if (skillTree.node_range_focus) bonus += 30;
  if (skillTree.node_ring_master) bonus += 35;
  return bonus;
}

/** Redução de cooldown (ms) vindos da árvore. */
export function getSkillTreeCooldownReduction(
  skillTree: SkillTreeState,
): number {
  let reduction = 0;
  if (skillTree.node_spark_ignition) reduction += 50;
  if (skillTree.node_spark_burst) reduction += 75;
  if (skillTree.node_spark_fury) reduction += 100;
  if (skillTree.node_spark_overdrive) reduction += 90;
  if (skillTree.node_haste) reduction += 55;
  if (skillTree.node_adrenaline) reduction += 70;
  return reduction;
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
