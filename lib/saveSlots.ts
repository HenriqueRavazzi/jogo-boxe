import {
  DEFAULT_ASCENSION_PASSIVES,
  normalizeAscensionPassives,
} from "@/lib/ascensionPassives";
import {
  createDefaultMilestoneQuests,
  normalizeMilestoneQuests,
} from "@/lib/milestoneQuests";
import { DEFAULT_SKILL_TREE } from "@/lib/skillTree";
import {
  ENDLESS_UNLOCK_STAGE,
  isEndlessUnlocked,
  TOTAL_STAGES,
  type RunMode,
} from "@/lib/stages";
import {
  DEFAULT_TEAM_MEMBERS_OWNED,
  normalizeEquippedTeamIds,
  normalizeTeamMembersOwned,
  normalizeTeamPity,
} from "@/lib/teamMembers";
import {
  DEFAULT_MATCH_SKILLS,
  DEFAULT_META_TREE,
  DEFAULT_SKILLS_DATA,
  DEFAULT_UNLOCKED_SKILLS,
  isAuraElementKey,
  SKILL_STAT_KEYS,
  type LegacyFlatSkillsData,
  type MatchSkillsData,
  type MetaTreeData,
  type SaveData,
  type SkillsData,
  type SkillUpgradeType,
  type UnlockedSkillsData,
} from "@/db/schema";
import { normalizeSkillMasteryUnlocked } from "@/lib/skillMastery";
import { resolveAuraPrimaryElement } from "@/src/game/systems/AuraSystem";

function isFlatLegacySkills(
  value: unknown,
): value is LegacyFlatSkillsData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.ricochet === "number";
}

function statsFromLevel(
  skillId: SkillUpgradeType,
  level: number,
): SkillsData[SkillUpgradeType] {
  const lv = Math.max(0, Math.floor(level));
  const keys = SKILL_STAT_KEYS[skillId];
  const out: Record<string, number> = {};
  for (const key of keys) out[key] = lv;
  return out as SkillsData[SkillUpgradeType];
}

function mergeSkillStats<T extends SkillUpgradeType>(
  skillId: T,
  partial?: Partial<SkillsData[T]> | null,
): SkillsData[T] {
  return {
    ...DEFAULT_SKILLS_DATA[skillId],
    ...(partial ?? {}),
  } as SkillsData[T];
}

/** Normaliza JSONB legado (flat) ou parcial → estrutura granular. */
export function normalizeSkills(
  skills?: Partial<SkillsData> | LegacyFlatSkillsData | null,
): SkillsData {
  if (!skills) return { ...cloneSkills(DEFAULT_SKILLS_DATA) };

  if (isFlatLegacySkills(skills)) {
    return {
      ricochet: statsFromLevel("ricochet", skills.ricochet) as SkillsData["ricochet"],
      ice: statsFromLevel("ice", skills.ice) as SkillsData["ice"],
      fire: statsFromLevel("fire", skills.fire) as SkillsData["fire"],
      lightning: statsFromLevel(
        "lightning",
        skills.lightning,
      ) as SkillsData["lightning"],
      aura: statsFromLevel(
        "aura",
        skills.aura ?? 0,
      ) as SkillsData["aura"],
      shadow: statsFromLevel(
        "shadow",
        skills.shadow ?? 0,
      ) as SkillsData["shadow"],
      stone: statsFromLevel(
        "stone",
        skills.stone ?? 0,
      ) as SkillsData["stone"],
      vendaval: statsFromLevel(
        "vendaval",
        skills.vendaval ?? 0,
      ) as SkillsData["vendaval"],
    };
  }

  return {
    ricochet: mergeSkillStats("ricochet", skills.ricochet),
    ice: mergeSkillStats("ice", skills.ice),
    fire: mergeSkillStats("fire", skills.fire),
    lightning: mergeSkillStats("lightning", skills.lightning),
    aura: mergeSkillStats("aura", skills.aura),
    shadow: mergeSkillStats("shadow", skills.shadow),
    stone: mergeSkillStats("stone", skills.stone),
    vendaval: mergeSkillStats("vendaval", skills.vendaval),
  };
}

function cloneSkills(skills: SkillsData): SkillsData {
  return {
    ricochet: { ...skills.ricochet },
    ice: { ...skills.ice },
    fire: { ...skills.fire },
    lightning: { ...skills.lightning },
    aura: { ...skills.aura },
    shadow: { ...skills.shadow },
    stone: { ...skills.stone },
    vendaval: { ...skills.vendaval },
  };
}

export function normalizeMatchSkills(
  skills?: Partial<MatchSkillsData> | null,
): MatchSkillsData {
  return {
    ...DEFAULT_MATCH_SKILLS,
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
    metaDamageLevel: Math.min(
      40,
      Math.max(0, Math.floor(data.metaDamageLevel ?? DEFAULT_META_TREE.metaDamageLevel)),
    ),
    metaKnockbackLevel: Math.max(
      0,
      Math.floor(data.metaKnockbackLevel ?? DEFAULT_META_TREE.metaKnockbackLevel),
    ),
    metaHpLevel: Math.min(
      40,
      Math.max(0, Math.floor(data.metaHpLevel ?? DEFAULT_META_TREE.metaHpLevel)),
    ),
    metaLifeStealLevel: Math.min(
      10,
      Math.max(
        0,
        Math.floor(
          data.metaLifeStealLevel ?? DEFAULT_META_TREE.metaLifeStealLevel,
        ),
      ),
    ),
    metaSkillRegenLevel: Math.min(
      10,
      Math.max(
        0,
        Math.floor(
          data.metaSkillRegenLevel ?? DEFAULT_META_TREE.metaSkillRegenLevel,
        ),
      ),
    ),
    metaParryChance: Math.min(
      50,
      Math.max(
        0,
        Math.floor(data.metaParryChance ?? DEFAULT_META_TREE.metaParryChance),
      ),
    ),
    metaAttackSpeedLevel: Math.min(
      10,
      Math.max(
        0,
        Math.floor(
          data.metaAttackSpeedLevel ?? DEFAULT_META_TREE.metaAttackSpeedLevel,
        ),
      ),
    ),
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
    skills: cloneSkills(DEFAULT_SKILLS_DATA),
    unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS },
    skillMasteryUnlocked: { ...DEFAULT_UNLOCKED_SKILLS },
    auraPrimaryElement: null,
    ...DEFAULT_META_TREE,
    prestigeLevel: 0,
    ascensionShards: 0,
    ascensionPassives: { ...DEFAULT_ASCENSION_PASSIVES },
    milestoneQuests: createDefaultMilestoneQuests(),
    totalMobsKilled: 0,
    totalBossesKilled: 0,
    teamPity: normalizeTeamPity(null),
    teamMembersOwned: { ...DEFAULT_TEAM_MEMBERS_OWNED },
    equippedTeamMemberIds: [],
    maxStageCleared: 0,
    endlessUnlocked: false,
    selectedStage: 1,
    selectedRunMode: "stage",
  };
}

/** Hidrata saves antigos sem campos novos. */
export function normalizeSaveData(
  data: SaveData & {
    skills?: SkillsData | LegacyFlatSkillsData;
    skillLevels?: SkillsData | LegacyFlatSkillsData;
  },
): SaveData {
  const baseDamage = data.baseDamage ?? 10;

  const skills = normalizeSkills(
    data.skills ?? data.skillLevels ?? DEFAULT_SKILLS_DATA,
  );

  const rawTree = (data.skillTree ?? {}) as Record<string, boolean>;
  const skillTree = { ...createDefaultSaveData().skillTree };
  for (const id of Object.keys(skillTree) as (keyof typeof skillTree)[]) {
    if (rawTree[id]) skillTree[id] = true;
  }
  // Nós novos intercalados: quem já passou deles mantém a cadeia coerente
  if (
    skillTree.node_life_steal_2 ||
    skillTree.node_fortitude ||
    skillTree.node_life_steal_3
  ) {
    skillTree.node_thick_skin = true;
  }
  if (skillTree.node_life_steal_3) {
    skillTree.node_fortitude = true;
  }

  const unlockedSkills = normalizeUnlocked(data.unlockedSkills);
  // Migração: nós removidos da árvore → preserva desbloqueios em Skills Roxas
  if (rawTree.node_ricochet) unlockedSkills.ricochet = true;
  if (rawTree.node_frost_chance) unlockedSkills.ice = true;
  if (rawTree.node_shock_chance) unlockedSkills.lightning = true;

  const meta = normalizeMetaTree(data);
  const teamMembersOwned = normalizeTeamMembersOwned(data.teamMembersOwned);
  const legacyPulls = (data as SaveData & { teamTotalPulls?: number })
    .teamTotalPulls;
  const teamPity = normalizeTeamPity(
    data.teamPity ??
      (typeof legacyPulls === "number"
        ? {
            totalPulls: legacyPulls,
            pullsSinceEpic: 0,
            pullsSinceLegendary: 0,
          }
        : null),
  );

  const { skillLevels: _legacyLevels, ...rest } = data;

  return {
    ...createDefaultSaveData(),
    ...rest,
    baseDamage,
    armsNextCost: data.armsNextCost ?? 80,
    xpBonusLevel: data.xpBonusLevel ?? 0,
    knockbackLevel: data.knockbackLevel ?? 0,
    baseKnockbackPower: data.baseKnockbackPower ?? 5,
    critChanceLevel: data.critChanceLevel ?? 0,
    critDamageLevel: data.critDamageLevel ?? 0,
    purpleDiamonds: data.purpleDiamonds ?? 0,
    prestigeLevel: Math.max(0, Math.floor(data.prestigeLevel ?? 0)),
    ascensionShards: Math.max(0, Math.floor(data.ascensionShards ?? 0)),
    ascensionPassives: normalizeAscensionPassives(data.ascensionPassives),
    milestoneQuests: normalizeMilestoneQuests(
      (data as SaveData).milestoneQuests,
    ),
    totalMobsKilled: Math.max(
      0,
      Math.floor(Number(data.totalMobsKilled) || 0),
    ),
    totalBossesKilled: Math.max(
      0,
      Math.floor(Number(data.totalBossesKilled) || 0),
    ),
    skillTree,
    skills,
    unlockedSkills,
    skillMasteryUnlocked: normalizeSkillMasteryUnlocked(
      (data as SaveData).skillMasteryUnlocked,
    ),
    auraPrimaryElement: (() => {
      const raw = (data as SaveData).auraPrimaryElement;
      if (typeof raw === "string" && isAuraElementKey(raw) && unlockedSkills[raw]) {
        return raw;
      }
      return resolveAuraPrimaryElement(null, unlockedSkills);
    })(),
    ...meta,
    teamPity,
    teamMembersOwned,
    equippedTeamMemberIds: normalizeEquippedTeamIds(
      data.equippedTeamMemberIds,
      teamMembersOwned,
    ),
    maxStageCleared: Math.min(
      TOTAL_STAGES,
      Math.max(0, Math.floor(Number(data.maxStageCleared) || 0)),
    ),
    endlessUnlocked: (() => {
      const cleared = Math.min(
        TOTAL_STAGES,
        Math.max(0, Math.floor(Number(data.maxStageCleared) || 0)),
      );
      return Boolean(data.endlessUnlocked) || isEndlessUnlocked(cleared);
    })(),
    selectedStage: Math.min(
      TOTAL_STAGES,
      Math.max(1, Math.floor(Number(data.selectedStage) || 1)),
    ),
    selectedRunMode: (() => {
      const cleared = Math.min(
        TOTAL_STAGES,
        Math.max(0, Math.floor(Number(data.maxStageCleared) || 0)),
      );
      const unlocked =
        Boolean(data.endlessUnlocked) || isEndlessUnlocked(cleared);
      if (data.selectedRunMode === "endless" && unlocked) return "endless";
      return "stage";
    })(),
  };
}

/** Junta colunas dedicadas + JSONB save_data em um SaveData completo. */
export function mergeSaveRow(row: {
  saveData: SaveData & {
    skills?: SkillsData | LegacyFlatSkillsData;
    skillLevels?: SkillsData | LegacyFlatSkillsData;
  };
  purpleDiamonds?: number | null;
  prestigeLevel?: number | null;
  ascensionShards?: number | null;
  skillsData?: SkillsData | LegacyFlatSkillsData | null;
}): SaveData {
  return normalizeSaveData({
    ...row.saveData,
    purpleDiamonds: row.purpleDiamonds ?? row.saveData.purpleDiamonds ?? 0,
    prestigeLevel:
      row.prestigeLevel ?? row.saveData.prestigeLevel ?? 0,
    ascensionShards:
      row.ascensionShards ?? row.saveData.ascensionShards ?? 0,
    skills: normalizeSkills(
      row.skillsData ??
        row.saveData.skills ??
        row.saveData.skillLevels ??
        DEFAULT_SKILLS_DATA,
    ),
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
