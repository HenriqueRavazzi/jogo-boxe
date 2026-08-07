/** Definição estática da árvore de talents. */

export type SkillNodeId =
  | "node_hp_1"
  | "node_hp_2"
  | "node_iron_guard"
  | "node_dmg_1"
  | "node_dmg_2"
  | "node_range_focus"
  | "node_spark_ignition"
  | "node_spark_burst"
  | "node_spark_fury";

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

export const DEFAULT_SKILL_TREE: SkillTreeState = {
  node_hp_1: false,
  node_hp_2: false,
  node_iron_guard: false,
  node_dmg_1: false,
  node_dmg_2: false,
  node_range_focus: false,
  node_spark_ignition: false,
  node_spark_burst: false,
  node_spark_fury: false,
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
