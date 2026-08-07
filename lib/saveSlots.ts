import { DEFAULT_SKILL_TREE } from "@/lib/skillTree";
import {
  DEFAULT_SKILLS_DATA,
  DEFAULT_UNLOCKED_SKILLS,
  DEFAULT_META_TREE,
  type SaveData,
  type SkillsData,
  type UnlockedSkillsData,
  type MetaTreeData,
} from "@/db/schema";

function normalizeSkills(skills?: Partial<SkillsData> | null): SkillsData {
  return {
    ...DEFAULT_SKILLS_DATA,
    ...(skills ?? {}),
  };
}

function normalizeUnlocked(
  unlocked?: Partial<UnlockedSkillsData> | null,
): UnlockedSkillsData {
  return {
    ...DEFAULT_UNLOCKED_SKILLS,
    ...(unlocked ?? {}),
  };
}

function normalizeMetaTree(
  data: Partial<MetaTreeData> & Partial<SaveData>,
): MetaTreeData {
  return {
    metaDamageLevel:
      data.metaDamageLevel ?? DEFAULT_META_TREE.metaDamageLevel,
    metaKnockbackLevel:
      data.metaKnockbackLevel ?? DEFAULT_META_TREE.metaKnockbackLevel,
    metaHpLevel: data.metaHpLevel ?? DEFAULT_META_TREE.metaHpLevel,
    metaLifeStealLevel:
      data.metaLifeStealLevel ?? DEFAULT_META_TREE.metaLifeStealLevel,
    metaSkillRegenLevel:
      data.metaSkillRegenLevel ?? DEFAULT_META_TREE.metaSkillRegenLevel,
  };
}

/** Progresso inicial de um save novo. */
export function createDefaultSaveData(): SaveData {
  return {
    gold: 200,
    gems: 25,
    purpleDiamonds: 0,
    maxHpLevel: 1,
    baseDamageLevel: 1,
    baseDamage: 10,
    attackSpeedLevel: 0,
    rangeLevel: 0,
    arms: 2,
    armTier: 1,
    armsNextCost: 80,
    incomeMultiplier: 1,
    xpBonusLevel: 0,
    knockbackLevel: 0,
    baseKnockbackPower: 5,
    critChanceLevel: 0,
    critDamageLevel: 0,
    skillTree: { ...DEFAULT_SKILL_TREE },
    skillLevels: { ...DEFAULT_SKILLS_DATA },
    unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS },
    ...DEFAULT_META_TREE,
  };
}

/** Hidrata saves antigos sem campos novos. */
export function normalizeSaveData(
  data: SaveData & { skills?: SkillsData },
): SaveData {
  const level = data.baseDamageLevel ?? 1;
  const baseDamage =
    data.baseDamage ?? Math.round(10 + (level - 1) * 5);

  const skillLevels = normalizeSkills(
    data.skillLevels ?? data.skills ?? DEFAULT_SKILLS_DATA,
  );

  const skillTree = {
    ...createDefaultSaveData().skillTree,
    ...data.skillTree,
  };

  const unlockedSkills = normalizeUnlocked(data.unlockedSkills);
  if (skillTree.node_ricochet) unlockedSkills.ricochet = true;
  if (skillTree.node_frost_chance) unlockedSkills.ice = true;
  if (skillTree.node_shock_chance) unlockedSkills.lightning = true;

  const meta = normalizeMetaTree(data);

  return {
    ...createDefaultSaveData(),
    ...data,
    baseDamage,
    armsNextCost: data.armsNextCost ?? 80,
    xpBonusLevel: data.xpBonusLevel ?? 0,
    knockbackLevel: data.knockbackLevel ?? 0,
    baseKnockbackPower: data.baseKnockbackPower ?? 5,
    critChanceLevel: data.critChanceLevel ?? 0,
    critDamageLevel: data.critDamageLevel ?? 0,
    purpleDiamonds: data.purpleDiamonds ?? 0,
    skillTree,
    skillLevels,
    unlockedSkills,
    ...meta,
  };
}

/** Junta colunas dedicadas + JSONB save_data em um SaveData completo. */
export function mergeSaveRow(row: {
  saveData: SaveData & { skills?: SkillsData };
  purpleDiamonds?: number | null;
  skillsData?: SkillsData | null;
}): SaveData {
  return normalizeSaveData({
    ...row.saveData,
    purpleDiamonds: row.purpleDiamonds ?? row.saveData.purpleDiamonds ?? 0,
    skillLevels:
      row.skillsData ??
      row.saveData.skillLevels ??
      row.saveData.skills ??
      DEFAULT_SKILLS_DATA,
  });
}

/** Validação leve de UUID (id do save). */
export function isSaveId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export type SaveListItem = {
  id: string;
  saveName: string;
  gold: number;
  gems: number;
  purpleDiamonds: number;
  updatedAt: string;
};
