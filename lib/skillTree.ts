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
  | "node_hemostasis"
  | "node_guardian_hide"
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
  | "node_spark_surge"
  | "node_spark_tempest"
  | "node_spark_apex"
  | "node_jab_specialist"
  | "node_iron_tempo"
  | "node_prizefighter"
  | "node_bloodsport"
  | "node_crowd_control"
  | "node_golden_blood"
  | "node_precision_storm"
  | "node_vampire_tempo"
  | "node_heavyweight"
  | "node_apex_predator"
  | "node_war_discipline"
  | "node_ring_master"
  | "node_adrenaline"
  | "node_berserker"
  | "node_immortal_champion"
  | "node_skill_fortune"
  | "node_skill_slot";

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
  /**
   * Se true, só libera após completar todos os outros nós do board
   * (ignorando este próprio nó).
   */
  requiresFullBoard?: boolean;
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
  node_hemostasis: false,
  node_guardian_hide: false,
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
  node_spark_surge: false,
  node_spark_tempest: false,
  node_spark_apex: false,
  node_jab_specialist: false,
  node_iron_tempo: false,
  node_prizefighter: false,
  node_bloodsport: false,
  node_crowd_control: false,
  node_golden_blood: false,
  node_precision_storm: false,
  node_vampire_tempo: false,
  node_heavyweight: false,
  node_apex_predator: false,
  node_war_discipline: false,
  node_ring_master: false,
  node_adrenaline: false,
  node_berserker: false,
  node_immortal_champion: false,
  node_skill_fortune: false,
  node_skill_slot: false,
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
    description: "−12% dano recebido",
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
  {
    id: "node_hemostasis",
    name: "Hemostasis",
    description: "+1.5% Life Steal",
    cost: 700_000,
    requires: ["node_second_heart"],
    branch: "vitality",
    tier: 9,
    accent: "emerald",
  },
  {
    id: "node_guardian_hide",
    name: "Guardian Hide",
    description: "−10% dano recebido",
    cost: 1_150_000,
    requires: ["node_hemostasis"],
    branch: "vitality",
    tier: 10,
    accent: "silver",
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
    description: "+8% chance de crítico",
    cost: 2_500,
    requires: ["node_range_focus"],
    branch: "power",
    tier: 3,
    accent: "yellow",
  },
  {
    id: "node_crit_power",
    name: "Haymaker",
    description: "+40% dano crítico",
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
    description: "+5% APS",
    cost: 60,
    requires: [],
    branch: "spark",
    tier: 0,
    accent: "sky",
  },
  {
    id: "node_spark_burst",
    name: "Spark Burst",
    description: "+8% APS",
    cost: 250,
    requires: ["node_spark_ignition"],
    branch: "spark",
    tier: 1,
    accent: "sky",
  },
  {
    id: "node_spark_fury",
    name: "Spark Fury",
    description: "+11% APS",
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
    name: "Tempo de Combate",
    description: "+14 Damage · +12% APS",
    cost: 35_000,
    requires: ["node_extra_arm"],
    branch: "spark",
    tier: 5,
    accent: "cyan",
  },
  {
    id: "node_spark_overdrive",
    name: "Overdrive",
    description: "+10% APS",
    cost: 100_000,
    requires: ["node_loot_magnet"],
    branch: "spark",
    tier: 6,
    accent: "sky",
  },
  {
    id: "node_haste",
    name: "Haste",
    description: "+6% APS",
    cost: 280_000,
    requires: ["node_spark_overdrive"],
    branch: "spark",
    tier: 7,
    accent: "sky",
  },
  {
    id: "node_spark_surge",
    name: "Spark Surge",
    description: "+7% APS",
    cost: 400_000,
    requires: ["node_haste"],
    branch: "spark",
    tier: 8,
    accent: "sky",
  },
  {
    id: "node_spark_tempest",
    name: "Spark Tempest",
    description: "+9% APS",
    cost: 700_000,
    requires: ["node_spark_surge"],
    branch: "spark",
    tier: 9,
    accent: "sky",
  },
  {
    id: "node_spark_apex",
    name: "Spark Apex",
    description: "+11% APS",
    cost: 1_150_000,
    requires: ["node_spark_tempest"],
    branch: "spark",
    tier: 10,
    accent: "sky",
  },

  // ── Synergy (multi-ramo) ──────────────────────────────────
  {
    id: "node_jab_specialist",
    name: "Jab Specialist",
    description: "+18 Range · +6% APS",
    cost: 22_000,
    requires: ["node_range_focus", "node_spark_burst"],
    branch: "synergy",
    tier: 0,
    accent: "sky",
  },
  {
    id: "node_iron_tempo",
    name: "Iron Tempo",
    description: "+40 Max HP · +6% APS",
    cost: 28_000,
    requires: ["node_iron_guard", "node_spark_burst"],
    branch: "synergy",
    tier: 1,
    accent: "rose",
  },
  {
    id: "node_prizefighter",
    name: "Prizefighter",
    description: "+12% ouro · +40 Max HP",
    cost: 38_000,
    requires: ["node_gold_gloves", "node_hp_2"],
    branch: "synergy",
    tier: 2,
    accent: "yellow",
  },
  {
    id: "node_ring_master",
    name: "Ring Master",
    description: "+35 Range · +15% ouro",
    cost: 45_000,
    requires: ["node_range_focus", "node_gold_gloves"],
    branch: "synergy",
    tier: 3,
    accent: "yellow",
  },
  {
    id: "node_bloodsport",
    name: "Bloodsport",
    description: "+14 Damage · +1% Life Steal",
    cost: 55_000,
    requires: ["node_dmg_2", "node_life_steal_1"],
    branch: "synergy",
    tier: 4,
    accent: "amber",
  },
  {
    id: "node_adrenaline",
    name: "Adrenaline",
    description: "+8% APS · +1% Life Steal",
    cost: 60_000,
    requires: ["node_spark_fury", "node_life_steal_1"],
    branch: "synergy",
    tier: 5,
    accent: "emerald",
  },
  {
    id: "node_crowd_control",
    name: "Crowd Control",
    description: "+2 empurrão · +8% APS",
    cost: 120_000,
    requires: ["node_knockout", "node_extra_arm"],
    branch: "synergy",
    tier: 6,
    accent: "silver",
  },
  {
    id: "node_golden_blood",
    name: "Golden Blood",
    description: "+15% ouro · +1% Life Steal",
    cost: 140_000,
    requires: ["node_gold_gloves", "node_life_steal_2"],
    branch: "synergy",
    tier: 7,
    accent: "emerald",
  },
  {
    id: "node_war_discipline",
    name: "War Discipline",
    description:
      "+6% chance crítica · +25% dano crítico · −8% dano recebido",
    cost: 180_000,
    requires: ["node_crit_power", "node_thick_skin"],
    branch: "synergy",
    tier: 8,
    accent: "yellow",
  },
  {
    id: "node_precision_storm",
    name: "Precision Storm",
    description: "+5% chance crítica · +7% APS",
    cost: 210_000,
    requires: ["node_crit_chance", "node_spark_overdrive"],
    branch: "synergy",
    tier: 9,
    accent: "yellow",
  },
  {
    id: "node_berserker",
    name: "Berserker",
    description: "+20 Damage · +80 Max HP",
    cost: 320_000,
    requires: ["node_dmg_3", "node_fortitude"],
    branch: "synergy",
    tier: 10,
    accent: "amber",
  },
  {
    id: "node_vampire_tempo",
    name: "Vampire Tempo",
    description: "+1% Life Steal · +7% APS",
    cost: 420_000,
    requires: ["node_life_steal_3", "node_haste"],
    branch: "synergy",
    tier: 11,
    accent: "emerald",
  },
  {
    id: "node_skill_fortune",
    name: "Skill Fortune",
    description:
      "+20% chance de cartas de skill na roleta · 40% de chance de 5 opções no level-up",
    cost: 550_000,
    requires: ["node_adrenaline", "node_ring_master"],
    branch: "synergy",
    tier: 12,
    accent: "violet",
  },
  {
    id: "node_heavyweight",
    name: "Heavyweight",
    description: "+100 Max HP · +16 Damage",
    cost: 580_000,
    requires: ["node_second_heart", "node_relentless"],
    branch: "synergy",
    tier: 13,
    accent: "rose",
  },
  {
    id: "node_immortal_champion",
    name: "Immortal Champion",
    description: "−8% dano recebido · +10 Damage · +1% Life Steal",
    cost: 750_000,
    requires: ["node_life_steal_3", "node_dmg_3", "node_spark_overdrive"],
    branch: "synergy",
    tier: 14,
    accent: "silver",
  },
  {
    id: "node_apex_predator",
    name: "Apex Predator",
    description: "+8% APS · −8% dano recebido",
    cost: 1_200_000,
    requires: ["node_spark_apex", "node_guardian_hide"],
    branch: "synergy",
    tier: 15,
    accent: "silver",
  },
  {
    id: "node_skill_slot",
    name: "Skill Arsenal",
    description: "+1 slot de habilidade especial na partida (2 → 3)",
    cost: 1_000_000,
    requires: [],
    requiresFullBoard: true,
    branch: "synergy",
    tier: 16,
    accent: "violet",
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

/** Todos os nós do board, exceto o capstone de slot extra. */
export function getSkillTreeCoreNodeIds(): SkillNodeId[] {
  return (Object.keys(DEFAULT_SKILL_TREE) as SkillNodeId[]).filter(
    (id) => id !== "node_skill_slot",
  );
}

/** Board completo = todos os nós principais comprados (antes do slot extra). */
export function isSkillTreeBoardComplete(
  skillTree: SkillTreeState,
): boolean {
  return getSkillTreeCoreNodeIds().every((id) => skillTree[id]);
}

/** +1 slot in-run se o nó Skill Arsenal estiver desbloqueado. */
export function getExtraActiveRunSkillSlots(
  skillTree: SkillTreeState,
): number {
  return skillTree.node_skill_slot ? 1 : 0;
}

/** Quantidade base de cartas no level-up. */
export const BASE_LEVEL_UP_OPTION_COUNT = 4;
/** Bônus absoluto na chance de carta de skill especial por slot da roleta. */
export const SKILL_FORTUNE_CARD_CHANCE_BONUS = 0.2;
/** Chance de oferecer 5 cartas no level-up com Skill Fortune. */
export const SKILL_FORTUNE_EXTRA_OPTION_CHANCE = 0.4;

/** Chance efetiva de tentar skill especial por slot (base 25% + fortuna). */
export function getSpecialSkillCardChance(
  skillTree: SkillTreeState,
  baseChance: number,
): number {
  const bonus = skillTree.node_skill_fortune
    ? SKILL_FORTUNE_CARD_CHANCE_BONUS
    : 0;
  return Math.min(0.75, Math.max(0, baseChance + bonus));
}

/** Quantas cartas no pack de level-up (4 base, ou 5 com Skill Fortune). */
export function rollLevelUpOptionCount(skillTree: SkillTreeState): number {
  if (!skillTree.node_skill_fortune) return BASE_LEVEL_UP_OPTION_COUNT;
  return Math.random() < SKILL_FORTUNE_EXTRA_OPTION_CHANCE
    ? BASE_LEVEL_UP_OPTION_COUNT + 1
    : BASE_LEVEL_UP_OPTION_COUNT;
}

/** Pré-requisitos ainda não desbloqueados. */
export function getMissingRequirements(
  skillTree: SkillTreeState,
  nodeId: SkillNodeId,
): SkillNodeId[] {
  const node = getSkillNode(nodeId);
  if (node.requiresFullBoard) {
    return getSkillTreeCoreNodeIds().filter((id) => !skillTree[id]);
  }
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

/** Nível de life steal (base + sinergias) a partir dos nós desbloqueados. */
export function getLifeStealLevel(skillTree: SkillTreeState): number {
  let level = 0;
  if (skillTree.node_life_steal_1) level += 1;
  if (skillTree.node_life_steal_2) level += 1;
  if (skillTree.node_life_steal_3) level += 1;
  if (skillTree.node_hemostasis) level += 1;
  if (skillTree.node_adrenaline) level += 1;
  if (skillTree.node_immortal_champion) level += 1;
  if (skillTree.node_bloodsport) level += 1;
  if (skillTree.node_golden_blood) level += 1;
  if (skillTree.node_vampire_tempo) level += 1;
  return level;
}

/** Fração do dano convertido em cura (ex.: nível 2 → 0.02). */
export function getLifeStealRatio(skillTree: SkillTreeState): number {
  let percent = 0;
  if (skillTree.node_life_steal_1) percent += LIFE_STEAL_PERCENT_PER_LEVEL;
  if (skillTree.node_life_steal_2) percent += LIFE_STEAL_PERCENT_PER_LEVEL;
  if (skillTree.node_life_steal_3) percent += 1.5;
  if (skillTree.node_hemostasis) percent += 1.5;
  if (skillTree.node_adrenaline) percent += 1;
  if (skillTree.node_immortal_champion) percent += 1;
  if (skillTree.node_bloodsport) percent += 1;
  if (skillTree.node_golden_blood) percent += 1;
  if (skillTree.node_vampire_tempo) percent += 1;
  return percent / 100;
}

/** Multiplicador de dano recebido (1 = normal; <1 = redução). */
export function getSkillDamageTakenMultiplier(
  skillTree: SkillTreeState,
): number {
  let mul = 1;
  if (skillTree.node_thick_skin) mul *= 0.88;
  if (skillTree.node_guardian_hide) mul *= 0.9;
  if (skillTree.node_war_discipline) mul *= 0.92;
  if (skillTree.node_immortal_champion) mul *= 0.92;
  if (skillTree.node_apex_predator) mul *= 0.92;
  return mul;
}

export function getSkillCritChanceBonus(skillTree: SkillTreeState): number {
  let bonus = 0;
  if (skillTree.node_crit_chance) bonus += 0.08;
  if (skillTree.node_war_discipline) bonus += 0.06;
  if (skillTree.node_precision_storm) bonus += 0.05;
  return bonus;
}

export function getSkillCritDamageBonus(skillTree: SkillTreeState): number {
  let bonus = 0;
  if (skillTree.node_crit_power) bonus += 0.4;
  if (skillTree.node_war_discipline) bonus += 0.25;
  return bonus;
}

export function getSkillKnockbackBonus(skillTree: SkillTreeState): number {
  let bonus = 0;
  if (skillTree.node_knockout) bonus += 3;
  if (skillTree.node_crowd_control) bonus += 2;
  return bonus;
}

export function getSkillGoldIncomeMultiplier(
  skillTree: SkillTreeState,
): number {
  let mul = 1;
  if (skillTree.node_gold_gloves) mul *= 1.2;
  if (skillTree.node_ring_master) mul *= 1.15;
  if (skillTree.node_prizefighter) mul *= 1.12;
  if (skillTree.node_golden_blood) mul *= 1.15;
  return mul;
}

export function getSkillExtraArms(skillTree: SkillTreeState): number {
  return skillTree.node_extra_arm ? 1 : 0;
}

export function getSkillMagnetRadiusMultiplier(
  _skillTree: SkillTreeState,
): number {
  return 1;
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
  if (skillTree.node_iron_tempo) bonus += 40;
  if (skillTree.node_prizefighter) bonus += 40;
  if (skillTree.node_heavyweight) bonus += 100;
  return bonus;
}

/** Bônus flat de dano vindos da árvore (inclui sinergias). */
export function getSkillTreeDamageBonus(skillTree: SkillTreeState): number {
  let bonus = 0;
  if (skillTree.node_dmg_1) bonus += 6;
  if (skillTree.node_dmg_2) bonus += 12;
  if (skillTree.node_dmg_3) bonus += 22;
  if (skillTree.node_relentless) bonus += 18;
  if (skillTree.node_loot_magnet) bonus += 14;
  if (skillTree.node_berserker) bonus += 20;
  if (skillTree.node_immortal_champion) bonus += 10;
  if (skillTree.node_bloodsport) bonus += 14;
  if (skillTree.node_heavyweight) bonus += 16;
  return bonus;
}

/** Bônus flat de alcance vindos da árvore. */
export function getSkillTreeRangeBonus(skillTree: SkillTreeState): number {
  let bonus = 0;
  if (skillTree.node_range_focus) bonus += 30;
  if (skillTree.node_ring_master) bonus += 35;
  if (skillTree.node_jab_specialist) bonus += 18;
  return bonus;
}

/** Multiplicador de ataques por segundo vindo da árvore. */
export function getSkillTreeAttackSpeedMultiplier(
  skillTree: SkillTreeState,
): number {
  let mul = 1;
  if (skillTree.node_spark_ignition) mul *= 1.05;
  if (skillTree.node_spark_burst) mul *= 1.08;
  if (skillTree.node_spark_fury) mul *= 1.11;
  if (skillTree.node_loot_magnet) mul *= 1.12;
  if (skillTree.node_spark_overdrive) mul *= 1.1;
  if (skillTree.node_haste) mul *= 1.06;
  if (skillTree.node_spark_surge) mul *= 1.07;
  if (skillTree.node_spark_tempest) mul *= 1.09;
  if (skillTree.node_spark_apex) mul *= 1.11;
  if (skillTree.node_adrenaline) mul *= 1.08;
  if (skillTree.node_jab_specialist) mul *= 1.06;
  if (skillTree.node_iron_tempo) mul *= 1.06;
  if (skillTree.node_crowd_control) mul *= 1.08;
  if (skillTree.node_precision_storm) mul *= 1.07;
  if (skillTree.node_vampire_tempo) mul *= 1.07;
  if (skillTree.node_apex_predator) mul *= 1.08;
  return mul;
}

/** @deprecated Mantido por compatibilidade; prefira APS em multiplicador. */
export function getSkillTreeCooldownReduction(skillTree: SkillTreeState): number {
  const mul = getSkillTreeAttackSpeedMultiplier(skillTree);
  return Math.round(1000 - 1000 / mul);
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
