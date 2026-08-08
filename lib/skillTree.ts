/** Definição estática da árvore de talents. */

export type SkillNodeId =
  | "node_hp_1"
  | "node_hp_2"
  | "node_iron_guard"
  | "node_life_steal_1"
  | "node_life_steal_2"
  | "node_life_steal_3"
  | "node_dmg_1"
  | "node_dmg_2"
  | "node_range_focus"
  | "node_ricochet"
  | "node_spark_ignition"
  | "node_spark_burst"
  | "node_spark_fury"
  | "node_frost_chance"
  | "node_shock_chance";

export type SkillTreeState = Record<SkillNodeId, boolean>;

export type SkillNodeDef = {
  id: SkillNodeId;
  name: string;
  description: string;
  cost: number;
  /** null = nó raiz (sem pré-requisito). */
  requires: SkillNodeId | null;
  branch: "vitality" | "power" | "spark" | "elements";
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
  node_life_steal_2: false,
  node_life_steal_3: false,
  node_dmg_1: false,
  node_dmg_2: false,
  node_range_focus: false,
  node_ricochet: false,
  node_spark_ignition: false,
  node_spark_burst: false,
  node_spark_fury: false,
  node_frost_chance: false,
  node_shock_chance: false,
};

export const SKILL_NODES: SkillNodeDef[] = [
  // Vitality — custos em diamantes (gems)
  {
    id: "node_hp_1",
    name: "Tough Hide",
    description: "+25 Max HP",
    cost: 5,
    requires: null,
    branch: "vitality",
    tier: 0,
    accent: "rose",
  },
  {
    id: "node_hp_2",
    name: "Iron Lungs",
    description: "+50 Max HP",
    cost: 12,
    requires: "node_hp_1",
    branch: "vitality",
    tier: 1,
    accent: "rose",
  },
  {
    id: "node_iron_guard",
    name: "Iron Guard",
    description: "+40 Max HP",
    cost: 20,
    requires: "node_hp_2",
    branch: "vitality",
    tier: 2,
    accent: "rose",
  },
  {
    id: "node_life_steal_1",
    name: "Blood Siphon",
    description: "+1% Life Steal",
    cost: 12,
    requires: "node_iron_guard",
    branch: "vitality",
    tier: 3,
    accent: "emerald",
  },
  {
    id: "node_life_steal_2",
    name: "Crimson Drain",
    description: "+1% Life Steal",
    cost: 20,
    requires: "node_life_steal_1",
    branch: "vitality",
    tier: 4,
    accent: "emerald",
  },
  {
    id: "node_life_steal_3",
    name: "Vampire Fist",
    description: "+1% Life Steal",
    cost: 30,
    requires: "node_life_steal_2",
    branch: "vitality",
    tier: 5,
    accent: "emerald",
  },
  // Power
  {
    id: "node_dmg_1",
    name: "Heavy Hands",
    description: "+5 Base Damage",
    cost: 5,
    requires: null,
    branch: "power",
    tier: 0,
    accent: "amber",
  },
  {
    id: "node_dmg_2",
    name: "Bone Crusher",
    description: "+10 Base Damage",
    cost: 12,
    requires: "node_dmg_1",
    branch: "power",
    tier: 1,
    accent: "amber",
  },
  {
    id: "node_range_focus",
    name: "Long Reach",
    description: "+25 Range",
    cost: 20,
    requires: "node_dmg_2",
    branch: "power",
    tier: 2,
    accent: "amber",
  },
  {
    id: "node_ricochet",
    name: "Ricochet Punch",
    description: "Soco ricocheteia em até 4 alvos (75% dano, CD 8s)",
    cost: 28,
    requires: "node_range_focus",
    branch: "power",
    tier: 3,
    accent: "silver",
  },
  // Spark
  {
    id: "node_spark_ignition",
    name: "Spark Ignition",
    description: "-50ms Attack Cooldown",
    cost: 8,
    requires: null,
    branch: "spark",
    tier: 0,
    accent: "sky",
  },
  {
    id: "node_spark_burst",
    name: "Spark Burst",
    description: "-75ms Attack Cooldown",
    cost: 15,
    requires: "node_spark_ignition",
    branch: "spark",
    tier: 1,
    accent: "sky",
  },
  {
    id: "node_spark_fury",
    name: "Spark Fury",
    description: "-100ms Attack Cooldown",
    cost: 25,
    requires: "node_spark_burst",
    branch: "spark",
    tier: 2,
    accent: "sky",
  },
  // Elements — procs em socos (diamantes)
  {
    id: "node_frost_chance",
    name: "Chance de Gelo",
    description: "15% de congelar o alvo por 2s",
    cost: 10,
    requires: null,
    branch: "elements",
    tier: 0,
    accent: "cyan",
  },
  {
    id: "node_shock_chance",
    name: "Chance de Raio",
    description: "15% de raio: estouro no alvo + mini-stun",
    cost: 18,
    requires: "node_frost_chance",
    branch: "elements",
    tier: 1,
    accent: "yellow",
  },
];

export const SKILL_BRANCHES = [
  { id: "vitality" as const, title: "Vitality", color: "text-rose-300" },
  { id: "power" as const, title: "Power", color: "text-amber-300" },
  { id: "spark" as const, title: "Spark", color: "text-sky-300" },
  { id: "elements" as const, title: "Elements", color: "text-cyan-300" },
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
  return getLifeStealLevel(skillTree) * (LIFE_STEAL_PERCENT_PER_LEVEL / 100);
}

export function isRicochetUnlocked(skillTree: SkillTreeState): boolean {
  return Boolean(skillTree.node_ricochet);
}

export type RicochetConfig = {
  unlocked: boolean;
  cooldownMs: number;
  maxBounces: number;
  bounceDamagePercent: number;
};

/**
 * Config de ricochete (UI / meta): ciclo 25s, janela 2s.
 * Bounces = min(5, 2+lv), dano = 60% + 15%/lv (com falloff 0.85 por salto no combate).
 */
export function getRicochetConfig(
  skillTree: SkillTreeState,
  ricochetLevel = 0,
): RicochetConfig {
  const level = Math.max(0, Math.floor(ricochetLevel));
  return {
    unlocked: isRicochetUnlocked(skillTree) || level > 0,
    cooldownMs: 25_000,
    maxBounces: Math.min(5, 2 + level),
    bounceDamagePercent: 0.6 + level * 0.15,
  };
}
