"use client";

import { create } from "zustand";
import type {
  AuraElementKey,
  MetaTreeUpgradeType,
  SaveData,
  SkillsData,
  SkillUpgradeType,
  UnlockedSkillsData,
} from "@/db/schema";
import {
  DEFAULT_META_TREE,
  DEFAULT_SKILLS_DATA,
  DEFAULT_UNLOCKED_SKILLS,
  isAuraElementKey,
  MAX_PURPLE_SKILL_STAT_LEVEL,
  SKILL_STAT_KEYS,
  isSkillStatKey,
  isSkillUpgradeType,
} from "@/db/schema";
import {
  areAllSkillStatsMaxed,
  normalizeSkillMasteryUnlocked,
  SKILL_MASTERY_PURPLE_COST,
  SKILL_MASTERY_SHARD_COST,
  type SkillMasteryUnlockedData,
} from "@/lib/skillMastery";
import {
  DEFAULT_GAME_VISUAL_SETTINGS,
  normalizeGameVisualSettings,
  type GameVisualSettings,
} from "@/lib/gameVisualSettings";
import {
  listUnlockedAuraElements,
  resolveAuraPrimaryElement,
} from "@/src/game/systems/AuraSystem";
import {
  calcAscensionShardsGained,
  getAscensionPassiveCostAt,
  getAscensionPassiveMaxLevel,
  getDiamondLuckBonus as diamondLuckBonusAt,
  getExtraArmsBonus,
  getStartingStatsMultiplier,
  getStartingGoldBonus as startingGoldBonusAt,
  normalizeAscensionPassives,
  type AscensionPassiveId,
  type AscensionPassivesData,
} from "@/lib/ascensionPassives";
import {
  getAdvancedSkillUnlockRequirements as advancedSkillUnlockRequirementsOf,
  type AdvancedSkillUnlockRequirements,
} from "@/lib/advancedSkillUnlock";
import {
  FALLBACK_BALANCE_CONFIG,
  getUpgradeCostParams,
  setBalanceConfig,
  type BalanceConfigBundle,
} from "@/lib/balanceConfig";
import {
  applyMilestoneProgress,
  canClaimMilestone,
  listNewlyClaimableMilestones,
  createDefaultMilestoneQuests,
  getMilestonePhaseRewards,
  getMilestoneQuestDef,
  advanceMilestonePhase,
  normalizeMilestoneQuests,
  type MilestoneProgressEvent,
  type MilestoneQuestId,
  type MilestoneQuestRewards,
  type MilestoneQuestsState,
} from "@/lib/milestoneQuests";
import { buildMilestoneToastItems, type MilestoneToastItem } from "@/lib/milestoneToasts";
import {
  DIFFICULTY_STAT_SCALE,
  FALLBACK_DIFFICULTIES,
  FALLBACK_ENEMY_TYPES,
  FALLBACK_GAME_SETTINGS,
  NEUTRAL_DIFFICULTY,
  type DifficultyConfig,
  type DifficultyMultipliers,
  type EnemyTypeConfig,
  type GameBaseSettings,
} from "@/lib/gameConfig";
import {
  createDefaultSaveData,
  normalizeSaveData,
  normalizeSkills,
} from "@/lib/saveSlots";
import {
  INCOME_STEP,
  INCOME_STEP_SCALE_PER_LEVEL,
  incomeLevelFromLegacyMultiplier,
  incomeMultiplierAt,
  incomeStepGainAt,
} from "@/lib/goldIncome";
export {
  INCOME_STEP,
  INCOME_STEP_SCALE_PER_LEVEL,
  incomeLevelFromLegacyMultiplier,
  incomeMultiplierAt,
  incomeStepGainAt,
} from "@/lib/goldIncome";
import {
  DEFAULT_SKILL_TREE,
  areRequirementsMet,
  getLifeStealLevel,
  getLifeStealRatio,
  getSkillCritChanceBonus,
  getSkillCritDamageBonus,
  getSkillDamageTakenMultiplier,
  getSkillExtraArms,
  getSkillGoldIncomeMultiplier,
  getSkillKnockbackBonus,
  getSkillMagnetRadiusMultiplier,
  getSkillNode,
  getSkillTreeAttackSpeedMultiplier,
  getSkillTreeDamageBonus,
  getSkillTreeHpBonus,
  getSkillTreeRangeBonus,
  type SkillNodeId,
  type SkillTreeState,
} from "@/lib/skillTree";
import {
  ENDLESS_UNLOCK_STAGE,
  getMaxSelectableStage,
  getStageClearRewards,
  getStageDef,
  isEndlessUnlocked,
  TOTAL_STAGES,
  type RunMode,
} from "@/lib/stages";
import {
  advancePityAfterPull,
  getEquippedTeamBuffs as calcEquippedTeamBuffs,
  getTeamRecruitCost as calcTeamRecruitCost,
  getTeamMultiRecruitCost as calcTeamMultiRecruitCost,
  MAX_EQUIPPED_TEAM_MEMBERS,
  MAX_TEAM_MEMBER_LEVEL,
  normalizeEquippedTeamIds,
  normalizeTeamMembersOwned,
  normalizeTeamPity,
  resetOwnedTeamMembersToBase,
  rollTeamMemberId,
  TEAM_MULTI_PULL_COUNT,
  type EquippedTeamBuffs,
  type RecruitTeamBatchResult,
  type RecruitTeamPullEntry,
  type RecruitTeamResult,
  type TeamMemberId,
  type TeamMembersOwned,
  type TeamPityState,
} from "@/lib/teamMembers";

export {
  getSkillDamageTakenMultiplier,
  getSkillGoldIncomeMultiplier,
};

export {
  getArmDistribution,
  getArmPunchOrder,
  getArmRestPosition,
} from "@/src/game/entities/Player";
export type { ArmDistribution, ArmSide } from "@/src/game/entities/Player";

/** Stats finais = upgrades de ouro + bônus da árvore de skills. */
export type EffectiveStats = {
  maxHp: number;
  damage: number;
  attackRange: number;
  attackCooldownMs: number;
  xpMultiplier: number;
  arms: number;
  /** Nível de life steal (cada nível = +1% do dano causado). */
  lifeStealLevel: number;
  /** Fração de cura sobre dano físico (árvore + meta diamantes). */
  lifeStealPercent: number;
  /** Nível meta de regeneração por skill. */
  metaSkillRegenLevel: number;
  /** Chance crítica efetiva (0–0.5). */
  critChance: number;
  /** Multiplicador de dano crítico. */
  critDamageMultiplier: number;
  /** Skill de ricochete (meta-progresso). */
  ricochetUnlocked: boolean;
  ricochetCooldown: number;
  maxBounces: number;
  bounceDamagePercent: number;
  /** Poder total de knockback dos socos. */
  knockbackPower: number;
  skillBonus: {
    hp: number;
    damage: number;
    range: number;
    cooldownReductionMs: number;
  };
};

/** Estado persistente — espelha o JSONB `save_data` no banco (por save autenticado). */
export type GameStoreState = {
  /** UUID do save autenticado no Neon. */
  activeSaveId: string | null;
  /** Nome do save autenticado. */
  activeSaveName: string | null;
  gold: number;
  gems: number;
  /** Moeda para skills avançadas (ricochet/ice/lightning/fire). */
  purpleDiamonds: number;
  maxHpLevel: number;
  baseDamageLevel: number;
  /** Dano base absoluto (inteiro). */
  baseDamage: number;
  /** Nível legado de attack speed (ouro); AS só via cartas in-run. */
  attackSpeedLevel: number;
  /** Nível do upgrade de range (0–6, +2% alcance por nível). */
  rangeLevel: number;
  arms: number;
  armTier: number;
  /** Próximo custo do upgrade de braços (×1.4 a cada compra). */
  armsNextCost: number;
  /** Nível do multiplicador de ouro (fonte da verdade). */
  incomeLevel: number;
  /** Multiplicador de ouro derivado de `incomeLevel`. */
  incomeMultiplier: number;
  /** Nível de bônus de XP (+10% por nível). */
  xpBonusLevel: number;
  /** Nível do upgrade de knockback (ouro) — só via cartas in-run. */
  knockbackLevel: number;
  /** Poder base de empurrão dos socos. */
  baseKnockbackPower: number;
  /** Nível de chance crítica (+2%/nível, teto 50%). */
  critChanceLevel: number;
  /** Nível de dano crítico (+15% no multiplicador/nível). */
  critDamageLevel: number;
  skillTree: SkillTreeState;
  /** Stats meta granulares (Diamantes Roxos). */
  skills: SkillsData;
  /** Desbloqueio permanente na base (Diamantes Normais). */
  unlockedSkills: UnlockedSkillsData;
  /** Maestria Suprema liberada no meta (reseta na Ascensão). */
  skillMasteryUnlocked: SkillMasteryUnlockedData;
  /** Atributo principal da Aura (skills liberadas → 100%; demais 50%). */
  auraPrimaryElement: AuraElementKey | null;
  /** Árvore de atributos permanentes (Diamantes Normais). */
  metaDamageLevel: number;
  metaKnockbackLevel: number;
  metaHpLevel: number;
  metaLifeStealLevel: number;
  metaSkillRegenLevel: number;
  /** Níveis de chance de parry automático (Diamantes). */
  metaParryChance: number;
  /** Velocidade de ataque permanente (Diamantes). */
  metaAttackSpeedLevel: number;
  /**
   * Nível de Ascensão. Cada nível: +15% dano/ouro/XP passivos
   * e inimigos mais fortes (formas geométricas).
   */
  prestigeLevel: number;
  /** Ascension Shards (moeda da loja de passivas permanentes). */
  ascensionShards: number;
  /** Passivas permanentes — não resetam no prestígio. */
  ascensionPassives: AscensionPassivesData;
  /** Missões de marco / conquistas (persistidas no save). */
  milestoneQuests: MilestoneQuestsState;
  /** Fila de toasts de marco (volátil — não vai no save). */
  milestoneToasts: MilestoneToastItem[];
  dismissMilestoneToast: (uid: string) => void;
  /** Abates cumulativos de mobs (não-boss). */
  totalMobsKilled: number;
  /** Abates cumulativos de bosses. */
  totalBossesKilled: number;
  /** Pity / contador de pulls do gacha da equipe. */
  teamPity: TeamPityState;
  /** Níveis dos membros da equipe. */
  teamMembersOwned: TeamMembersOwned;
  /** Até 3 membros equipados. */
  equippedTeamMemberIds: TeamMemberId[];
  /** Progresso da campanha (fases 1–50). */
  maxStageCleared: number;
  endlessUnlocked: boolean;
  selectedStage: number;
  selectedRunMode: "stage" | "endless";
  /** Preferências de desempenho / visual (persistidas no save). */
  visualSettings: GameVisualSettings;
  /** Status iniciais vindos do Neon (`game_settings`). */
  baseConfig: GameBaseSettings;
  /** Lista de dificuldades do Neon. */
  difficulties: DifficultyConfig[];
  /** Catálogo de inimigos/bosses do Neon (`enemy_types`). */
  enemyTypes: EnemyTypeConfig[];
  /** Id da dificuldade selecionada no menu. */
  selectedDifficultyId: number | null;
  configsLoaded: boolean;
  /** Bundle de balanceamento (equipe, skills, inimigos, upgrades) do Neon. */
  balanceConfig: BalanceConfigBundle;
  /** Multiplicador de velocidade da simulação (1–5). */
  gameSpeedMultiplier: number;
  setGameSpeedMultiplier: (speed: number) => void;
  /** Cicla 1 → 2 → 3 → 4 → 5 → 1. */
  cycleGameSpeed: () => void;
  hydrateFromSave: (
    saveId: string,
    data: SaveData,
    saveName?: string,
  ) => void;
  clearActiveSlot: () => void;
  getSaveSnapshot: () => SaveData;
  setGameConfigs: (
    settings: GameBaseSettings,
    difficulties: DifficultyConfig[],
    enemyTypes?: EnemyTypeConfig[],
    balance?: BalanceConfigBundle,
  ) => void;
  setSelectedDifficulty: (id: number) => void;
  getSelectedDifficulty: () => DifficultyConfig | null;
  getDifficultyMultipliers: () => DifficultyMultipliers;
  addGold: (baseAmount: number, options?: { applyIncome?: boolean }) => void;
  addGems: (amount: number) => void;
  addPurpleDiamonds: (amount: number) => void;
  /** Aplica eventos de progresso nas missões de marco. */
  progressMilestoneQuests: (events: MilestoneProgressEvent[]) => void;
  /** Resgata recompensa de missão concluída. */
  claimMilestoneQuest: (id: MilestoneQuestId) => MilestoneQuestRewards | null;
  unlockSkill: (nodeId: SkillNodeId, cost: number) => boolean;
  /** Desbloqueia skill avançada na base (Diamantes Normais / gems). */
  unlockAdvancedSkill: (skillType: SkillUpgradeType) => boolean;
  /**
   * Libera Maestria Suprema (attrs Lv.20 + diamantes roxos + shards).
   * Persiste na Ascensão.
   */
  unlockSkillMastery: (skillType: SkillUpgradeType) => boolean;
  canUnlockSkillMastery: (skillType: SkillUpgradeType) => boolean;
  getSkillMasteryUnlockCost: () => {
    purpleDiamonds: number;
    ascensionShards: number;
  };
  /** Define o atributo principal da Aura (deve estar liberado). */
  setAuraPrimaryElement: (element: AuraElementKey) => boolean;
  getAdvancedSkillUnlockRequirements: (
    skillType: SkillUpgradeType,
  ) => AdvancedSkillUnlockRequirements;
  canUnlockAdvancedSkill: (skillType: SkillUpgradeType) => boolean;
  /** Soma abates cumulativos (mobs / bosses) no save. */
  recordLifetimeKills: (mobs: number, bosses?: number) => void;
  getAdvancedSkillUnlockCost: (skillType: SkillUpgradeType) => number;
  /**
   * Upgrade de um atributo granular da skill (Diamantes Roxos + sync DB).
   * `skillId` / `statKey` são strings validadas em runtime.
   */
  upgradeSkillStat: (skillId: string, statKey: string) => boolean;
  getSkillStatUpgradeCost: (skillId: string, statKey: string) => number;
  /**
   * Respec: zera stats granulares da árvore roxa e devolve diamantes roxos gastos.
   * Retorna a quantidade reembolsada (0 se não havia investimento).
   */
  resetSkillTree: () => number;
  /** Total de diamantes roxos investidos nos sub-níveis atuais. */
  getPurpleSkillInvestment: () => number;
  /**
   * Corta atributos > MAX e devolve o excedente. Retorna o refund aplicado.
   */
  enforcePurpleSkillCap: () => number;
  /**
   * Ascensão: +1 prestige, reseta ouro/diamantes/upgrades de ouro/níveis roxos
   * (skills liberadas permanecem; atributos voltam ao Nv.1) e Maestrias
   * Supremas (precisam ser liberadas de novo). Mantém upgrades de diamante
   * (meta, XP, skill tree), desbloqueios de skill avançada e passivas de
   * Ascensão. Equipe: Nv.1 + pity zerado.
   */
  triggerPrestige: () => boolean;
  canTriggerPrestige: () => boolean;
  getPrestigeMultiplier: () => number;
  /** Compra nível de passiva permanente com Ascension Shards. */
  upgradeAscensionPassive: (id: AscensionPassiveId) => boolean;
  getAscensionPassiveCost: (id: AscensionPassiveId) => number;
  /** Multiplicador de raio de coleta (ímã removido — sempre 1). */
  getMagnetRadiusMultiplier: () => number;
  /** Braços extras permanentes da Ascensão. */
  getAscensionExtraArms: () => number;
  /** Ouro bônus ao iniciar run (Herança de Ouro). */
  getStartingGoldBonus: () => number;
  /** Bônus absoluto na chance de diamante (Sorte do Campeão + equipe). */
  getDiamondLuckBonus: () => number;
  /** Buffs agregados dos membros equipados. */
  getEquippedTeamBuffs: () => EquippedTeamBuffs;
  /** Custo atual do recrutamento da equipe. */
  getTeamRecruitCost: () => { gold: number; gems: number };
  /** Custo do pacote 10× com desconto. */
  getTeamMultiRecruitCost: () => {
    gold: number;
    gems: number;
    rawGold: number;
    rawGems: number;
    count: number;
    discount: number;
  };
  /** Pull do gacha da equipe (ouro + diamantes). */
  recruitTeamMember: () => RecruitTeamResult;
  /** Pacote multi-pull (padrão 10× com desconto). */
  recruitTeamMembers: (count?: number) => RecruitTeamBatchResult;
  /** Equipa membro (máx. 3 slots). */
  equipTeamMember: (id: TeamMemberId) => boolean;
  /** Remove membro do slot. */
  unequipTeamMember: (id: TeamMemberId) => void;
  setSelectedStage: (stage: number) => void;
  setSelectedRunMode: (mode: "stage" | "endless") => void;
  setVisualSettings: (patch: Partial<GameVisualSettings>) => void;
  /** Marca fase limpa + recompensas; libera Endless em ≥15. */
  completeStageClear: (stageNumber: number) => {
    firstClear: boolean;
    gold: number;
    gems: number;
  };
  /** Shards que seriam ganhos se ascender agora. */
  previewAscensionShards: () => number;
  upgradeHP: () => boolean;
  upgradeDamage: () => boolean;
  upgradeAttackSpeed: () => boolean;
  upgradeRange: () => boolean;
  upgradeIncome: () => boolean;
  upgradeArms: () => boolean;
  /** Upgrade de knockback com ouro. */
  upgradeKnockback: () => boolean;
  /** Upgrade de chance crítica com ouro. */
  upgradeCritChance: () => boolean;
  /** Upgrade de dano crítico com ouro. */
  upgradeCritDamage: () => boolean;
  /**
   * Compra em lote (x1 / x10 / x100 / max).
   * Retorna quantos níveis foram comprados.
   */
  buyGoldUpgradeBulk: (
    kind: GoldUpgradeKind,
    quantity: GoldUpgradeQuantity,
  ) => number;
  /** Prévia: níveis possíveis e custo total para a quantidade pedida. */
  previewGoldUpgradeBulk: (
    kind: GoldUpgradeKind,
    quantity: GoldUpgradeQuantity,
  ) => BulkUpgradePlan;
  /** Compra em lote da árvore de diamantes. Retorna níveis comprados. */
  buyMetaTreeBulk: (
    type: MetaTreeUpgradeType,
    quantity: GoldUpgradeQuantity,
  ) => number;
  /** Prévia de lote da árvore de diamantes. */
  previewMetaTreeBulk: (
    type: MetaTreeUpgradeType,
    quantity: GoldUpgradeQuantity,
  ) => BulkUpgradePlan;
  /** Upgrade de XP com diamantes. */
  upgradeXpBonus: () => boolean;
  /** Upgrade da árvore de atributos (Diamantes Normais). */
  upgradeMetaTree: (type: MetaTreeUpgradeType) => boolean;
  getMetaTreeUpgradeCost: (type: MetaTreeUpgradeType) => number;
  getHpUpgradeCost: () => number;
  getDamageUpgradeCost: () => number;
  getAttackSpeedUpgradeCost: () => number;
  getRangeUpgradeCost: () => number;
  getIncomeUpgradeCost: () => number;
  getArmsUpgradeCost: () => number;
  getKnockbackUpgradeCost: () => number;
  getCritChanceUpgradeCost: () => number;
  getCritDamageUpgradeCost: () => number;
  getXpBonusUpgradeCost: () => number;
  getXpMultiplier: () => number;
  /** Poder total de empurrão: base + nível × 2. */
  getKnockbackPower: () => number;
  /** Chance crítica (0–0.5). */
  getCritChance: () => number;
  /** Multiplicador de dano crítico (≥ 1.5). */
  getCritDamageMultiplier: () => number;
  /** Atributos finais (ouro + skills) usados na partida e na UI. */
  getEffectiveStats: () => EffectiveStats;
  getMaxHp: () => number;
  getBaseDamage: () => number;
  getAttackRange: () => number;
  getAttackCooldown: () => number;
  /** Cooldown base só do upgrade (sem talents / cards), em ms. */
  getUpgradeCooldownAt: (level: number) => number;
  /** Range base só do upgrade (sem talents / cards), em px. */
  getUpgradeRangeAt: (level: number) => number;
  /** Alias: CD meta atual (respeita teto 65%). */
  getBaseAttackSpeed: () => number;
  /** Alias: range meta atual (respeita teto 65%). */
  getBaseRange: () => number;
};

/**
 * Bônus % base no 1º upgrade de ouro (nível 1→2).
 * Níveis seguintes ganham mais: base × (1 + (n−1) × scale).
 */
export const GOLD_HP_PCT_PER_LEVEL = 0.08;
export const GOLD_DAMAGE_PCT_PER_LEVEL = 0.07;
/** Escala do %/nível — faz o retorno acompanhar o custo crescente. */
export const GOLD_HP_PCT_SCALE_PER_LEVEL = 0.012;
export const GOLD_DAMAGE_PCT_SCALE_PER_LEVEL = 0.012;

/** % de HP ganho ao comprar o próximo nível a partir de `currentLevel`. */
export function goldHpPctGainAt(currentLevel: number): number {
  const steps = Math.max(0, Math.floor(currentLevel) - 1);
  return GOLD_HP_PCT_PER_LEVEL * (1 + steps * GOLD_HP_PCT_SCALE_PER_LEVEL);
}

/** % de dano ganho ao comprar o próximo nível a partir de `currentLevel`. */
export function goldDamagePctGainAt(currentLevel: number): number {
  const steps = Math.max(0, Math.floor(currentLevel) - 1);
  return (
    GOLD_DAMAGE_PCT_PER_LEVEL *
    (1 + steps * GOLD_DAMAGE_PCT_SCALE_PER_LEVEL)
  );
}

/**
 * Multiplicador de HP dos upgrades de ouro (nível 1 = 1×).
 * Soma aritmética crescente: cada nível vale mais que o anterior.
 */
export function goldHpMultiplier(level: number): number {
  const n = Math.max(0, Math.floor(level) - 1);
  if (n <= 0) return 1;
  const base = GOLD_HP_PCT_PER_LEVEL;
  const scale = GOLD_HP_PCT_SCALE_PER_LEVEL;
  return 1 + base * (n + (scale * n * (n - 1)) / 2);
}

/**
 * Multiplicador de dano dos upgrades de ouro (nível 1 = 1×).
 * Mesma curva crescente do HP.
 */
export function goldDamageMultiplier(level: number): number {
  const n = Math.max(0, Math.floor(level) - 1);
  if (n <= 0) return 1;
  const base = GOLD_DAMAGE_PCT_PER_LEVEL;
  const scale = GOLD_DAMAGE_PCT_SCALE_PER_LEVEL;
  return 1 + base * (n + (scale * n * (n - 1)) / 2);
}

/** Base de custo compartilhada (income/outros). */
const UPGRADE_COST_BASE = 50;
/**
 * HP e dano: base menor + crescimento mais suave que 1.25,
 * para o ouro render mais efeito por nível.
 */
const COMBAT_UPGRADE_COST_BASE = 40;
const COMBAT_UPGRADE_COST_GROWTH = 1.05;
const INCOME_COST_BASE = 75;
const ARMS_COST_GROWTH = 1.2;
const ARMS_PRESTIGE_DAMAGE = 1.15;
const ARMS_MAX = 6;
const ARMS_MIN = 2;

/** Crescimento de custo meta (ouro/diamantes) na fase inicial. */
export const UPGRADE_COST_GROWTH = 1.2;
/** Multiplicador extra por nível de prestígio (mais suave que 1.25). */
export const PRESTIGE_COST_GROWTH = 1.12;
/**
 * Até este nível o custo usa `growth` cheio; depois entra o soft-tail
 * para HP/dano/income não explodirem em centenas de níveis.
 */
export const UPGRADE_COST_SOFT_TAIL_START = 25;
/** Fração de (growth−1) mantida após o soft-tail (ex.: 1.2 → ~1.06). */
export const UPGRADE_COST_SOFT_TAIL_FACTOR = 0.3;

/** ×PRESTIGE_COST_GROWTH^n — encarece upgrades conforme a Ascensão. */
export function getPrestigeCostMultiplier(prestigeLevel: number): number {
  return Math.pow(
    PRESTIGE_COST_GROWTH,
    Math.max(0, Math.floor(prestigeLevel)),
  );
}

/**
 * Custo com soft-tail:
 * floor(base × growth^min(nível,25) × softGrowth^max(0,nível−25) × prestige)
 */
export function getUpgradeCost(
  baseCost: number,
  currentLevel: number,
  prestigeLevel = 0,
  growthRate: number = UPGRADE_COST_GROWTH,
): number {
  const lv = Math.max(0, Math.floor(currentLevel));
  const early = Math.min(lv, UPGRADE_COST_SOFT_TAIL_START);
  const late = Math.max(0, lv - UPGRADE_COST_SOFT_TAIL_START);
  const softGrowth =
    1 + Math.max(0, growthRate - 1) * UPGRADE_COST_SOFT_TAIL_FACTOR;
  return Math.max(
    1,
    Math.floor(
      baseCost *
        Math.pow(growthRate, early) *
        Math.pow(softGrowth, late) *
        getPrestigeCostMultiplier(prestigeLevel),
    ),
  );
}

export type GoldUpgradeKind =
  | "hp"
  | "damage"
  | "range"
  | "income"
  | "critChance"
  | "arms";

export type GoldUpgradeQuantity = 1 | 10 | 100 | "max";

const GOLD_BULK_HARD_CAP = 10_000;

function resolveBulkWanted(quantity: GoldUpgradeQuantity): number {
  if (quantity === "max") return GOLD_BULK_HARD_CAP;
  return quantity;
}

export type BulkUpgradePlan = {
  /** Níveis que o saldo atual permite no lote (já capped por teto). */
  count: number;
  /** Custo total do lote `count` (0 se count === 0). */
  totalCost: number;
  /** Custo do próximo nível único, mesmo sem saldo (0 se no teto). */
  nextCost: number;
};

/**
 * Soma custos sequenciais até qty, saldo ou teto.
 * `getCostAt(level)` = custo para subir do nível atual.
 * `currency` = ouro ou diamantes disponíveis.
 */
export function planSequentialGoldUpgrades(options: {
  startLevel: number;
  gold: number;
  quantity: GoldUpgradeQuantity;
  getCostAt: (level: number) => number;
  canBuyAt: (level: number) => boolean;
}): BulkUpgradePlan {
  const wanted = resolveBulkWanted(options.quantity);
  let count = 0;
  let totalCost = 0;
  let level = options.startLevel;

  const nextCost =
    options.canBuyAt(options.startLevel)
      ? Math.max(0, options.getCostAt(options.startLevel))
      : 0;

  while (count < wanted) {
    if (!options.canBuyAt(level)) break;
    const cost = options.getCostAt(level);
    if (!Number.isFinite(cost) || cost <= 0) break;
    if (totalCost + cost > options.gold) break;
    totalCost += cost;
    count += 1;
    level += 1;
  }

  return { count, totalCost, nextCost };
}

export function getMetaTreeCostAt(
  level: number,
  prestigeLevel = 0,
  type?: MetaTreeUpgradeType,
): number {
  if (type === "metaParryChance") {
    return getUpgradeCost(
      META_PARRY_COST_BASE,
      level,
      prestigeLevel,
      META_PARRY_COST_GROWTH,
    );
  }
  if (type === "metaLifeStealLevel" || type === "metaSkillRegenLevel") {
    return getUpgradeCost(
      META_UTILITY_COST_BASE,
      level,
      prestigeLevel,
      META_UTILITY_COST_GROWTH,
    );
  }
  return getUpgradeCost(
    META_TREE_COST_BASE,
    level,
    prestigeLevel,
    META_TREE_COST_GROWTH,
  );
}

/**
 * Margem meta vs in-game: ouro cobre o caminho até o hard cap de alcance
 * (cartas in-run de range foram removidas).
 */
export const META_PROGRESS_SHARE = 1;
/** Attack speed meta mais fraco — exige cartas in-run para chegar perto do teto. */
export const META_ATTACK_SPEED_SHARE = 0.4;

/** Níveis máximos de meta-progresso (ouro). `Infinity` = sem teto. */
export const MAX_UPGRADE_LEVELS = {
  hp: Number.POSITIVE_INFINITY,
  damage: Number.POSITIVE_INFINITY,
  income: Number.POSITIVE_INFINITY,
  knockback: 0,
  /** 5% + 22×2% = 49%; nível 23 fecha no teto 50%. */
  critChance: 23,
  /** Só via cartas in-run (`matchBuffs.critDamageMultiplier`). */
  critDamage: 0,
  /** Só via cartas in-run (`matchBuffs.attackSpeed`). */
  attackSpeed: 0,
  range: 10,
  /** Bônus de XP com diamantes (+10%/nível), até Lv.30. */
  xpBonus: 30,
} as const;

/** Árvore de atributos permanentes (Diamantes Normais). */
export const MAX_META_TREE_LEVEL = 20;
/** Teto de Dano / Vida permanentes (Diamantes). */
export const MAX_META_DAMAGE_HP_LEVEL = 40;
/** Teto de chance de parry (Diamantes). */
export const MAX_META_PARRY_LEVEL = 50;
/** Roubo de vida: máx. 10 níveis → 10% total. */
export const MAX_META_LIFE_STEAL_LEVEL = 10;
/** Regen de skill: máx. 10 níveis → 5% dano skill. */
export const MAX_META_SKILL_REGEN_LEVEL = 10;
/** Velocidade de ataque: máx. 10 níveis → +40% APS. */
export const MAX_META_ATTACK_SPEED_LEVEL = 10;
/** Por nó: dano/vida 40; AS/life steal/skill regen 10; parry 50. */
export const MAX_META_TREE_LEVELS: Record<
  MetaTreeUpgradeType,
  number
> = {
  metaDamageLevel: MAX_META_DAMAGE_HP_LEVEL,
  metaHpLevel: MAX_META_DAMAGE_HP_LEVEL,
  metaKnockbackLevel: MAX_META_TREE_LEVEL,
  metaLifeStealLevel: MAX_META_LIFE_STEAL_LEVEL,
  metaSkillRegenLevel: MAX_META_SKILL_REGEN_LEVEL,
  metaParryChance: MAX_META_PARRY_LEVEL,
  metaAttackSpeedLevel: MAX_META_ATTACK_SPEED_LEVEL,
};

/** Custo base de Dano/Vida (mais caro, mais impacto). */
export const META_TREE_COST_BASE = 18;
export const META_TREE_COST_GROWTH = 1.28;
/** Life steal / skill regen: ainda mais caros. */
export const META_UTILITY_COST_BASE = 28;
export const META_UTILITY_COST_GROWTH = 1.38;
/** Parry: custo base alto e crescimento íngreme (até nível 50). */
export const META_PARRY_COST_BASE = 40;
export const META_PARRY_COST_GROWTH = 1.34;

/** +% dano base por nível de diamante (aditivo; nv.40 → +100%). */
export const META_DAMAGE_PCT_PER_LEVEL = 0.025;
/** +% HP máx. por nível de diamante (aditivo; nv.40 → +120%). */
export const META_HP_PCT_PER_LEVEL = 0.03;
/** +% velocidade de ataque (APS) por nível; nv.10 → +40%. */
export const META_ATTACK_SPEED_PCT_PER_LEVEL = 0.04;
/** @deprecated flat — prefer META_DAMAGE_PCT_PER_LEVEL */
export const META_DAMAGE_PER_LEVEL = 6;
/** @deprecated flat — prefer META_HP_PCT_PER_LEVEL */
export const META_HP_PER_LEVEL = 30;
export const META_KNOCKBACK_PER_LEVEL = 1.5;

/** Pontos percentuais por nível (1.0 → 1%); teto 10% no total. */
export const META_LIFE_STEAL_PERCENT_PER_LEVEL = 1;
export const META_LIFE_STEAL_MAX_RATIO = 0.1;

/**
 * Fração do dano de skill convertida em cura por nível (0.5% / nv.).
 * Teto total 5% no nível máximo.
 */
export const META_SKILL_REGEN_DAMAGE_RATIO = 0.005;
export const META_SKILL_REGEN_MAX_RATIO = 0.05;
/** HP fixo por hit de skill por nível (secundário). */
export const META_SKILL_REGEN_HIT_HEAL = 0.4;

/** Chance base de parry (sempre ativa). */
export const META_PARRY_BASE_CHANCE = 0.01;
/** +0.12% de chance de parry por nível (nível 50 → +6%). */
export const META_PARRY_CHANCE_PER_LEVEL = 0.0012;

export function metaDamageMultiplier(level: number): number {
  return 1 + Math.max(0, Math.floor(level)) * META_DAMAGE_PCT_PER_LEVEL;
}

export function metaHpMultiplier(level: number): number {
  return 1 + Math.max(0, Math.floor(level)) * META_HP_PCT_PER_LEVEL;
}

/** Multiplicador de APS (cooldown ÷ este valor). */
export function metaAttackSpeedMultiplier(level: number): number {
  const capped = Math.min(
    MAX_META_ATTACK_SPEED_LEVEL,
    Math.max(0, Math.floor(level)),
  );
  return 1 + capped * META_ATTACK_SPEED_PCT_PER_LEVEL;
}

export function isLevelCapped(level: number, maxLevel: number): boolean {
  return Number.isFinite(maxLevel) && level >= maxLevel;
}

export function formatLevelLabel(level: number, maxLevel: number): string {
  if (!Number.isFinite(maxLevel)) return `Nível ${level}`;
  return `Nível ${level}/${maxLevel}`;
}

export function getMetaTreeMaxLevel(type: MetaTreeUpgradeType): number {
  return MAX_META_TREE_LEVELS[type];
}

/** @deprecated Prefer MAX_UPGRADE_LEVELS.attackSpeed / .range */
const MAX_STAT_LEVEL = MAX_UPGRADE_LEVELS.attackSpeed;

const ATTACK_SPEED_COST_BASE = 60;
const RANGE_COST_BASE = 150;
const RANGE_COST_GROWTH = 1.5;
const KNOCKBACK_COST_BASE = 55;
const KNOCKBACK_POWER_PER_LEVEL = 2;
const CRIT_CHANCE_BASE = 0.05;
const CRIT_CHANCE_PER_LEVEL = 0.02;
export const MAX_CRIT_CHANCE = 0.5;
const CRIT_DAMAGE_BASE = 1.5;
const CRIT_DAMAGE_PER_LEVEL = 0.15;
const CRIT_CHANCE_COST_BASE = 65;
const CRIT_DAMAGE_COST_BASE = 70;
/** Custo base por atributo de skill (Diamantes Roxos). */
const PURPLE_SKILL_STAT_COST_BASE = 3;
/** Custo base em diamantes do 1º nível de bônus de XP. */
const XP_BONUS_COST_BASE = 40;
/** Crescimento mais suave para permitir upar até Lv.50 sem custo absurdo. */
const XP_BONUS_COST_GROWTH = 1.3;

export function getMetaLifeStealRatio(level: number): number {
  const capped = Math.min(
    MAX_META_LIFE_STEAL_LEVEL,
    Math.max(0, Math.floor(level)),
  );
  return Math.min(
    META_LIFE_STEAL_MAX_RATIO,
    capped * (META_LIFE_STEAL_PERCENT_PER_LEVEL / 100),
  );
}

/** Chance efetiva de parry: 1% base + 0.12% × nível (teto 50). */
export function getMetaParryChance(level: number): number {
  const capped = Math.min(
    MAX_META_PARRY_LEVEL,
    Math.max(0, Math.floor(level)),
  );
  return META_PARRY_BASE_CHANCE + capped * META_PARRY_CHANCE_PER_LEVEL;
}

/** Cura por dano/hits de skills especiais (Gelo/Fogo/Raio/Ricochete). */
export function getMetaSkillRegenHealing(
  level: number,
  skillDamageDealt: number,
  skillHitsLanded: number,
): number {
  if (level <= 0) return 0;
  const capped = Math.min(
    MAX_META_SKILL_REGEN_LEVEL,
    Math.max(0, Math.floor(level)),
  );
  const damageRatio = Math.min(
    META_SKILL_REGEN_MAX_RATIO,
    META_SKILL_REGEN_DAMAGE_RATIO * capped,
  );
  return (
    Math.max(0, skillDamageDealt) * damageRatio +
    Math.max(0, skillHitsLanded) * (META_SKILL_REGEN_HIT_HEAL * capped)
  );
}

function getMetaTreeLevel(
  state: {
    metaDamageLevel: number;
    metaKnockbackLevel: number;
    metaHpLevel: number;
    metaLifeStealLevel: number;
    metaSkillRegenLevel: number;
    metaParryChance: number;
    metaAttackSpeedLevel: number;
  },
  type: MetaTreeUpgradeType,
): number {
  return state[type];
}

/** Custo de um atributo: floor(base × growth^nível × prestígio), com soft-tail. */
export function getPurpleSkillCostAt(
  level: number,
  prestigeLevel = 0,
): number {
  return getUpgradeCost(PURPLE_SKILL_STAT_COST_BASE, level, prestigeLevel);
}

/**
 * Soma dos custos pagos para chegar ao nível `level`
 * (níveis 0→1 + 1→2 + … + (level-1)→level).
 */
export function getPurpleSkillSpentForLevel(
  level: number,
  prestigeLevel = 0,
): number {
  const lv = Math.max(0, Math.floor(level));
  let total = 0;
  for (let i = 0; i < lv; i++) {
    total += getPurpleSkillCostAt(i, prestigeLevel);
  }
  return total;
}

/** Fração devolvida no respec da árvore roxa (1 = 100%). */
export const SKILL_TREE_RESPEC_REFUND_RATE = 1;

/** Total de diamantes roxos investidos em todos os atributos granulares. */
export function getTotalPurpleSkillInvestment(
  skills: SkillsData,
  prestigeLevel = 0,
): number {
  let total = 0;
  for (const skillId of Object.keys(SKILL_STAT_KEYS) as SkillUpgradeType[]) {
    for (const statKey of SKILL_STAT_KEYS[skillId]) {
      total += getPurpleSkillSpentForLevel(
        getSkillStatLevel(skills, skillId, statKey),
        prestigeLevel,
      );
    }
  }
  return total;
}

export function getSkillStatLevel(
  skills: SkillsData,
  skillId: SkillUpgradeType,
  statKey: string,
): number {
  const skill = skills[skillId] as Record<string, number>;
  return Math.min(
    MAX_PURPLE_SKILL_STAT_LEVEL,
    Math.max(0, Math.floor(Number(skill[statKey]) || 0)),
  );
}

/**
 * Após Ascensão: skills já liberadas permanecem; atributos granulares voltam ao Nv.1.
 * Skills ainda bloqueadas ficam em 0.
 */
export function resetUnlockedSkillsToLevel1(
  unlocked: UnlockedSkillsData,
): SkillsData {
  const next: SkillsData = {
    ricochet: { ...DEFAULT_SKILLS_DATA.ricochet },
    ice: { ...DEFAULT_SKILLS_DATA.ice },
    fire: { ...DEFAULT_SKILLS_DATA.fire },
    lightning: { ...DEFAULT_SKILLS_DATA.lightning },
    aura: { ...DEFAULT_SKILLS_DATA.aura },
    shadow: { ...DEFAULT_SKILLS_DATA.shadow },
    stone: { ...DEFAULT_SKILLS_DATA.stone },
    vendaval: { ...DEFAULT_SKILLS_DATA.vendaval },
  };
  for (const skillId of Object.keys(SKILL_STAT_KEYS) as SkillUpgradeType[]) {
    if (!unlocked[skillId]) continue;
    const stats = next[skillId] as Record<string, number>;
    for (const statKey of SKILL_STAT_KEYS[skillId]) {
      stats[statKey] = 1;
    }
  }
  return next;
}

/**
 * Corta atributos acima do teto e devolve diamantes roxos do excedente.
 */
export function clampSkillsToMaxLevel(
  skills: SkillsData,
  prestigeLevel = 0,
): {
  skills: SkillsData;
  refund: number;
} {
  let refund = 0;
  const next: SkillsData = {
    ricochet: { ...skills.ricochet },
    ice: { ...skills.ice },
    fire: { ...skills.fire },
    lightning: { ...skills.lightning },
    aura: { ...skills.aura },
    shadow: { ...skills.shadow },
    stone: { ...skills.stone },
    vendaval: { ...skills.vendaval },
  };

  for (const skillId of Object.keys(SKILL_STAT_KEYS) as SkillUpgradeType[]) {
    const row = next[skillId] as Record<string, number>;
    for (const statKey of SKILL_STAT_KEYS[skillId]) {
      const raw = Math.max(0, Math.floor(Number(row[statKey]) || 0));
      if (raw > MAX_PURPLE_SKILL_STAT_LEVEL) {
        refund +=
          getPurpleSkillSpentForLevel(raw, prestigeLevel) -
          getPurpleSkillSpentForLevel(
            MAX_PURPLE_SKILL_STAT_LEVEL,
            prestigeLevel,
          );
        row[statKey] = MAX_PURPLE_SKILL_STAT_LEVEL;
      }
    }
  }

  return { skills: next, refund: Math.max(0, refund) };
}

/** Poder de knockback: base + nível × 2. */
export function getKnockbackPowerAt(
  baseKnockbackPower: number,
  knockbackLevel: number,
): number {
  return (
    Math.max(0, baseKnockbackPower) +
    Math.max(0, knockbackLevel) * KNOCKBACK_POWER_PER_LEVEL
  );
}

export function getKnockbackCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(KNOCKBACK_COST_BASE, level, prestigeLevel);
}

/** Chance crítica: 5% + 2%/nível, teto 50% (ouro / upgrades permanentes). */
export function getCritChanceAt(critChanceLevel: number): number {
  const capped = Number.isFinite(MAX_UPGRADE_LEVELS.critChance)
    ? Math.min(MAX_UPGRADE_LEVELS.critChance, Math.max(0, critChanceLevel))
    : Math.max(0, critChanceLevel);
  return Math.min(
    MAX_CRIT_CHANCE,
    CRIT_CHANCE_BASE + capped * CRIT_CHANCE_PER_LEVEL,
  );
}

/** Multiplicador de crítico: 1.5 + 0.15 × nível (sem teto). */
export function getCritDamageMultiplierAt(critDamageLevel: number): number {
  const level = Number.isFinite(MAX_UPGRADE_LEVELS.critDamage)
    ? Math.min(MAX_UPGRADE_LEVELS.critDamage, Math.max(0, critDamageLevel))
    : Math.max(0, critDamageLevel);
  return CRIT_DAMAGE_BASE + level * CRIT_DAMAGE_PER_LEVEL;
}

export function getCritChanceCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(CRIT_CHANCE_COST_BASE, level, prestigeLevel);
}

export function getCritDamageCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(CRIT_DAMAGE_COST_BASE, level, prestigeLevel);
}

/** Multiplicador de XP: nível 0 = 1.0, nível 1 = 1.1, … (+10% por nível). */
export function getXpMultiplier(level: number): number {
  const capped = Math.min(
    MAX_UPGRADE_LEVELS.xpBonus,
    Math.max(0, Math.floor(level)),
  );
  return 1 + capped * 0.1;
}

export function getXpBonusCostAt(level: number, prestigeLevel = 0): number {
  return getUpgradeCost(
    XP_BONUS_COST_BASE,
    level,
    prestigeLevel,
    XP_BONUS_COST_GROWTH,
  );
}

/** Referência estável para o getter da store (evita shadowing). */
const xpMultiplierAt = getXpMultiplier;
const xpBonusCostAt = getXpBonusCostAt;

function skillHpBonus(tree: SkillTreeState): number {
  return getSkillTreeHpBonus(tree);
}

function skillDamageBonus(tree: SkillTreeState): number {
  return getSkillTreeDamageBonus(tree);
}

function skillRangeBonus(tree: SkillTreeState): number {
  return getSkillTreeRangeBonus(tree);
}

function skillAttackSpeedMultiplier(tree: SkillTreeState): number {
  return getSkillTreeAttackSpeedMultiplier(tree);
}

/**
 * Floor absoluto de cooldown (ms) — só evita CD ≤0.
 * Cartas in-run de velocidade param de aparecer em
 * `MATCH_COOLDOWN_UPGRADE_FLOOR` (300ms); meta/equipe/cartas podem ir abaixo disso.
 */
export const MIN_ATTACK_COOLDOWN_MS = 50;
/** Referência de design do “chão” de CD para a fatia meta (ouro). */
export const ATTACK_COOLDOWN_DESIGN_FLOOR_MS = 300;
/** Teto duro de alcance (px) — hard cap absoluto. */
export const MAX_ATTACK_RANGE = 650;

/**
 * Teto de meta-progresso (ouro) para CD: só 40% do caminho até o design floor.
 * Ex.: base 1500 → meta floor = 1500 − 1200×0.4 = 1020ms.
 */
export function getMetaMaxCooldownMs(
  baseAttackSpeedMs = FALLBACK_GAME_SETTINGS.baseAttackSpeed,
): number {
  const span = Math.max(0, baseAttackSpeedMs - ATTACK_COOLDOWN_DESIGN_FLOOR_MS);
  return Math.round(baseAttackSpeedMs - span * META_ATTACK_SPEED_SHARE);
}

/**
 * Teto de meta-progresso (ouro) para range: os 10 níveis cobrem até o hard cap.
 * Ex.: base 100 → 650px no Lv.10 (~+55px por nível).
 */
export function getMetaMaxRangePx(
  baseRange = FALLBACK_GAME_SETTINGS.baseRange,
): number {
  const span = Math.max(0, MAX_ATTACK_RANGE - baseRange);
  return Math.round(baseRange + span * META_PROGRESS_SHARE);
}

/**
 * Cooldown só com upgrades de ouro (sem cards in-game).
 * Interpola linearmente até o teto meta (40%).
 */
export function cooldownAtLevel(
  level: number,
  baseAttackSpeedMs = FALLBACK_GAME_SETTINGS.baseAttackSpeed,
): number {
  const maxLv = MAX_UPGRADE_LEVELS.attackSpeed;
  const lv = Math.min(Math.max(0, level), maxLv);
  const metaFloor = getMetaMaxCooldownMs(baseAttackSpeedMs);
  if (maxLv <= 0) return Math.round(baseAttackSpeedMs);
  const t = lv / maxLv;
  return Math.round(baseAttackSpeedMs + (metaFloor - baseAttackSpeedMs) * t);
}

/**
 * Range só com upgrades de ouro (10 níveis até o hard cap).
 */
export function rangeAtLevel(
  level: number,
  baseRange = FALLBACK_GAME_SETTINGS.baseRange,
): number {
  const maxLv = MAX_UPGRADE_LEVELS.range;
  const lv = Math.min(Math.max(0, level), maxLv);
  const metaCeil = getMetaMaxRangePx(baseRange);
  if (maxLv <= 0) return Math.round(baseRange);
  const t = lv / maxLv;
  return Math.round(baseRange + (metaCeil - baseRange) * t);
}

export {
  MAX_STAT_LEVEL,
  FALLBACK_GAME_SETTINGS as DEFAULT_BASE_CONFIG,
};

/** Velocidades de simulação disponíveis. */
export const GAME_SPEED_OPTIONS = [1, 2, 3, 4, 5] as const;
export type GameSpeedOption = (typeof GAME_SPEED_OPTIONS)[number];

export function clampGameSpeed(speed: number): GameSpeedOption {
  const rounded = Math.round(speed);
  if ((GAME_SPEED_OPTIONS as readonly number[]).includes(rounded)) {
    return rounded as GameSpeedOption;
  }
  return 1;
}

/** @deprecated Use baseConfig.baseAttackSpeed da store. */
export const BASE_ATTACK_SPEED_MS = FALLBACK_GAME_SETTINGS.baseAttackSpeed;
/** @deprecated Use baseConfig.baseRange da store. */
export const BASE_RANGE = FALLBACK_GAME_SETTINGS.baseRange;

const defaults = createDefaultSaveData();

function pickDefaultDifficultyId(list: DifficultyConfig[]): number | null {
  const medium = list.find((d) => d.name === "Médio");
  return medium?.id ?? list[0]?.id ?? null;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  activeSaveId: null,
  activeSaveName: null,
  gold: defaults.gold,
  gems: defaults.gems,
  purpleDiamonds: defaults.purpleDiamonds,
  maxHpLevel: defaults.maxHpLevel,
  baseDamageLevel: defaults.baseDamageLevel,
  baseDamage: defaults.baseDamage,
  attackSpeedLevel: defaults.attackSpeedLevel,
  rangeLevel: defaults.rangeLevel,
  arms: defaults.arms,
  armTier: defaults.armTier,
  armsNextCost: defaults.armsNextCost,
  incomeLevel: defaults.incomeLevel ?? 0,
  incomeMultiplier: defaults.incomeMultiplier,
  xpBonusLevel: defaults.xpBonusLevel,
  knockbackLevel: defaults.knockbackLevel,
  baseKnockbackPower: defaults.baseKnockbackPower,
  critChanceLevel: defaults.critChanceLevel,
  critDamageLevel: defaults.critDamageLevel,
  skillTree: { ...DEFAULT_SKILL_TREE },
  skills: normalizeSkills(DEFAULT_SKILLS_DATA),
  unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS },
  skillMasteryUnlocked: { ...DEFAULT_UNLOCKED_SKILLS },
  auraPrimaryElement: defaults.auraPrimaryElement ?? null,
  metaDamageLevel: defaults.metaDamageLevel,
  metaKnockbackLevel: defaults.metaKnockbackLevel,
  metaHpLevel: defaults.metaHpLevel,
  metaLifeStealLevel: defaults.metaLifeStealLevel,
  metaSkillRegenLevel: defaults.metaSkillRegenLevel,
  metaParryChance: defaults.metaParryChance,
  metaAttackSpeedLevel: defaults.metaAttackSpeedLevel ?? 0,
  prestigeLevel: defaults.prestigeLevel ?? 0,
  ascensionShards: defaults.ascensionShards ?? 0,
  ascensionPassives: normalizeAscensionPassives(defaults.ascensionPassives),
  milestoneQuests: createDefaultMilestoneQuests(),
  milestoneToasts: [],
  totalMobsKilled: defaults.totalMobsKilled ?? 0,
  totalBossesKilled: defaults.totalBossesKilled ?? 0,
  teamPity: normalizeTeamPity(defaults.teamPity),
  teamMembersOwned: normalizeTeamMembersOwned(defaults.teamMembersOwned),
  equippedTeamMemberIds: normalizeEquippedTeamIds(
    defaults.equippedTeamMemberIds,
    normalizeTeamMembersOwned(defaults.teamMembersOwned),
  ),
  maxStageCleared: defaults.maxStageCleared ?? 0,
  endlessUnlocked:
    defaults.endlessUnlocked ||
    isEndlessUnlocked(defaults.maxStageCleared ?? 0),
  selectedStage: defaults.selectedStage ?? 1,
  selectedRunMode: defaults.selectedRunMode ?? "stage",
  visualSettings: normalizeGameVisualSettings(defaults.visualSettings),
  baseConfig: { ...FALLBACK_GAME_SETTINGS },
  difficulties: [...FALLBACK_DIFFICULTIES],
  enemyTypes: [...FALLBACK_ENEMY_TYPES],
  selectedDifficultyId: pickDefaultDifficultyId(FALLBACK_DIFFICULTIES),
  configsLoaded: false,
  balanceConfig: { ...FALLBACK_BALANCE_CONFIG },
  gameSpeedMultiplier: 1,

  setGameSpeedMultiplier: (speed) =>
    set({ gameSpeedMultiplier: clampGameSpeed(speed) }),

  cycleGameSpeed: () =>
    set((s) => {
      const current = clampGameSpeed(s.gameSpeedMultiplier);
      const idx = GAME_SPEED_OPTIONS.indexOf(current);
      const next =
        GAME_SPEED_OPTIONS[(idx + 1) % GAME_SPEED_OPTIONS.length] ?? 1;
      return { gameSpeedMultiplier: next };
    }),

  hydrateFromSave: (saveId, data, saveName) => {
    const n = normalizeSaveData(data);
    const prestige = Math.max(0, Math.floor(n.prestigeLevel ?? 0));
    const { skills, refund } = clampSkillsToMaxLevel(
      normalizeSkills(n.skills),
      prestige,
    );
    set({
      activeSaveId: saveId,
      activeSaveName: saveName ?? null,
      gold: n.gold,
      gems: n.gems,
      purpleDiamonds: n.purpleDiamonds + refund,
      maxHpLevel: n.maxHpLevel,
      baseDamageLevel: n.baseDamageLevel,
      baseDamage: n.baseDamage,
      attackSpeedLevel: 0,
      rangeLevel: n.rangeLevel,
      arms: n.arms,
      armTier: n.armTier,
      armsNextCost: n.armsNextCost,
      incomeLevel: n.incomeLevel ?? 0,
      incomeMultiplier: n.incomeMultiplier,
      xpBonusLevel: Math.min(
        MAX_UPGRADE_LEVELS.xpBonus,
        Math.max(0, Math.floor(n.xpBonusLevel)),
      ),
      knockbackLevel: 0,
      baseKnockbackPower: n.baseKnockbackPower,
      critChanceLevel: n.critChanceLevel,
      critDamageLevel: 0,
      skillTree: { ...DEFAULT_SKILL_TREE, ...n.skillTree },
      skills,
      unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS, ...n.unlockedSkills },
      skillMasteryUnlocked: normalizeSkillMasteryUnlocked(
        n.skillMasteryUnlocked,
      ),
      auraPrimaryElement: resolveAuraPrimaryElement(
        n.auraPrimaryElement,
        { ...DEFAULT_UNLOCKED_SKILLS, ...n.unlockedSkills },
      ),
      metaDamageLevel: Math.min(
        MAX_META_DAMAGE_HP_LEVEL,
        Math.max(0, Math.floor(n.metaDamageLevel ?? 0)),
      ),
      metaKnockbackLevel: n.metaKnockbackLevel,
      metaHpLevel: Math.min(
        MAX_META_DAMAGE_HP_LEVEL,
        Math.max(0, Math.floor(n.metaHpLevel ?? 0)),
      ),
      metaLifeStealLevel: Math.min(
        MAX_META_LIFE_STEAL_LEVEL,
        Math.max(0, Math.floor(n.metaLifeStealLevel ?? 0)),
      ),
      metaSkillRegenLevel: Math.min(
        MAX_META_SKILL_REGEN_LEVEL,
        Math.max(0, Math.floor(n.metaSkillRegenLevel ?? 0)),
      ),
      metaParryChance: Math.min(
        MAX_META_PARRY_LEVEL,
        Math.max(0, Math.floor(n.metaParryChance ?? 0)),
      ),
      metaAttackSpeedLevel: Math.min(
        MAX_META_ATTACK_SPEED_LEVEL,
        Math.max(0, Math.floor(n.metaAttackSpeedLevel ?? 0)),
      ),
      prestigeLevel: Math.max(0, Math.floor(n.prestigeLevel ?? 0)),
      ascensionShards: Math.max(0, Math.floor(n.ascensionShards ?? 0)),
      ascensionPassives: normalizeAscensionPassives(n.ascensionPassives),
      milestoneQuests: applyMilestoneProgress(
        normalizeMilestoneQuests(n.milestoneQuests),
        [
          {
            type: "prestige_level",
            amount: Math.max(0, Math.floor(n.prestigeLevel ?? 0)),
          },
        ],
      ),
      totalMobsKilled: Math.max(0, Math.floor(n.totalMobsKilled ?? 0)),
      totalBossesKilled: Math.max(0, Math.floor(n.totalBossesKilled ?? 0)),
      teamPity: normalizeTeamPity(n.teamPity),
      teamMembersOwned: normalizeTeamMembersOwned(n.teamMembersOwned),
      equippedTeamMemberIds: normalizeEquippedTeamIds(
        n.equippedTeamMemberIds,
        normalizeTeamMembersOwned(n.teamMembersOwned),
      ),
      maxStageCleared: Math.min(
        TOTAL_STAGES,
        Math.max(0, Math.floor(n.maxStageCleared ?? 0)),
      ),
      endlessUnlocked:
        Boolean(n.endlessUnlocked) ||
        isEndlessUnlocked(n.maxStageCleared ?? 0),
      selectedStage: Math.min(
        TOTAL_STAGES,
        Math.max(1, Math.floor(n.selectedStage ?? 1)),
      ),
      selectedRunMode:
        n.selectedRunMode === "endless" &&
        (Boolean(n.endlessUnlocked) ||
          isEndlessUnlocked(n.maxStageCleared ?? 0))
          ? "endless"
          : "stage",
      visualSettings: normalizeGameVisualSettings(n.visualSettings),
    });
    if (refund > 0) {
      void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
        void syncWithDB();
      });
    }
  },

  clearActiveSlot: () =>
    set({
      activeSaveId: null,
      activeSaveName: null,
      ...createDefaultSaveData(),
      skillTree: { ...DEFAULT_SKILL_TREE },
      skills: normalizeSkills(DEFAULT_SKILLS_DATA),
      unlockedSkills: { ...DEFAULT_UNLOCKED_SKILLS },
      skillMasteryUnlocked: { ...DEFAULT_UNLOCKED_SKILLS },
      auraPrimaryElement: null,
      ...DEFAULT_META_TREE,
    }),

  getSaveSnapshot: () => {
    const s = get();
    const { skills } = clampSkillsToMaxLevel(
      normalizeSkills(s.skills),
      s.prestigeLevel,
    );
    return {
      gold: s.gold,
      gems: s.gems,
      purpleDiamonds: s.purpleDiamonds,
      maxHpLevel: s.maxHpLevel,
      baseDamageLevel: s.baseDamageLevel,
      baseDamage: s.baseDamage,
      attackSpeedLevel: 0,
      rangeLevel: s.rangeLevel,
      arms: s.arms,
      armTier: s.armTier,
      armsNextCost: s.armsNextCost,
      incomeLevel: s.incomeLevel,
      incomeMultiplier: incomeMultiplierAt(s.incomeLevel),
      xpBonusLevel: Math.min(
        MAX_UPGRADE_LEVELS.xpBonus,
        Math.max(0, Math.floor(s.xpBonusLevel)),
      ),
      knockbackLevel: 0,
      baseKnockbackPower: s.baseKnockbackPower,
      critChanceLevel: s.critChanceLevel,
      critDamageLevel: 0,
      skillTree: { ...s.skillTree },
      skills,
      unlockedSkills: { ...s.unlockedSkills },
      skillMasteryUnlocked: normalizeSkillMasteryUnlocked(
        s.skillMasteryUnlocked,
      ),
      auraPrimaryElement: resolveAuraPrimaryElement(
        s.auraPrimaryElement,
        s.unlockedSkills,
      ),
      metaDamageLevel: s.metaDamageLevel,
      metaKnockbackLevel: s.metaKnockbackLevel,
      metaHpLevel: s.metaHpLevel,
      metaLifeStealLevel: s.metaLifeStealLevel,
      metaSkillRegenLevel: s.metaSkillRegenLevel,
      metaParryChance: s.metaParryChance,
      metaAttackSpeedLevel: s.metaAttackSpeedLevel,
      prestigeLevel: s.prestigeLevel,
      ascensionShards: s.ascensionShards,
      ascensionPassives: normalizeAscensionPassives(s.ascensionPassives),
      milestoneQuests: normalizeMilestoneQuests(s.milestoneQuests),
      totalMobsKilled: Math.max(0, Math.floor(s.totalMobsKilled)),
      totalBossesKilled: Math.max(0, Math.floor(s.totalBossesKilled)),
      teamPity: normalizeTeamPity(s.teamPity),
      teamMembersOwned: normalizeTeamMembersOwned(s.teamMembersOwned),
      equippedTeamMemberIds: normalizeEquippedTeamIds(
        s.equippedTeamMemberIds,
        normalizeTeamMembersOwned(s.teamMembersOwned),
      ),
      maxStageCleared: s.maxStageCleared,
      endlessUnlocked: s.endlessUnlocked || isEndlessUnlocked(s.maxStageCleared),
      selectedStage: s.selectedStage,
      selectedRunMode: s.selectedRunMode,
      visualSettings: normalizeGameVisualSettings(s.visualSettings),
    };
  },

  setGameConfigs: (settings, difficultiesList, enemyTypesList, balance) => {
    const list =
      difficultiesList.length > 0
        ? difficultiesList
        : [...FALLBACK_DIFFICULTIES];
    const types =
      enemyTypesList && enemyTypesList.length > 0
        ? enemyTypesList
        : [...FALLBACK_ENEMY_TYPES];
    const balanceBundle = balance ?? { ...FALLBACK_BALANCE_CONFIG };
    setBalanceConfig(balanceBundle);
    const currentId = get().selectedDifficultyId;
    const stillValid = list.some((d) => d.id === currentId);
    set({
      baseConfig: { ...settings },
      difficulties: list,
      enemyTypes: types,
      balanceConfig: balanceBundle,
      selectedDifficultyId: stillValid
        ? currentId
        : pickDefaultDifficultyId(list),
      configsLoaded: true,
    });
  },

  setSelectedDifficulty: (id) => {
    const exists = get().difficulties.some((d) => d.id === id);
    if (!exists) return;
    set({ selectedDifficultyId: id });
  },

  getSelectedDifficulty: () => {
    const { difficulties: list, selectedDifficultyId } = get();
    return list.find((d) => d.id === selectedDifficultyId) ?? null;
  },

  getDifficultyMultipliers: () => {
    const selected = get().getSelectedDifficulty();
    if (!selected) return { ...NEUTRAL_DIFFICULTY };
    const scale = DIFFICULTY_STAT_SCALE[selected.name];
    return {
      // HP/dano: tabela canônica (Easy→Insane); speed/gold do DB/config
      enemyHpMultiplier: scale?.hp ?? selected.enemyHpMultiplier,
      enemyDamageMultiplier: scale?.damage ?? selected.enemyDamageMultiplier,
      enemySpeedMultiplier: selected.enemySpeedMultiplier,
      goldDropMultiplier: selected.goldDropMultiplier,
    };
  },

  addGold: (amount, options) => {
    const applyIncome = options?.applyIncome !== false;
    const prestigeMul = get().getPrestigeMultiplier();
    set((s) => ({
      gold:
        s.gold +
        Math.round(
          amount * (applyIncome ? s.incomeMultiplier : 1) * prestigeMul,
        ),
    }));
  },

  getPrestigeMultiplier: () => 1 + Math.max(0, get().prestigeLevel) * 0.15,

  /**
   * Liberado após progresso alto de base (fim de jogo / build madura).
   */
  canTriggerPrestige: () => {
    const s = get();
    if (!s.activeSaveId) return false;
    return (
      s.maxHpLevel >= 10 ||
      s.baseDamageLevel >= 8 ||
      s.armTier >= 2 ||
      s.rangeLevel >= MAX_UPGRADE_LEVELS.range
    );
  },

  previewAscensionShards: () => {
    const s = get();
    return calcAscensionShardsGained({
      maxHpLevel: s.maxHpLevel,
      baseDamageLevel: s.baseDamageLevel,
      armTier: s.armTier,
      xpBonusLevel: s.xpBonusLevel,
      gold: s.gold,
      prestigeLevel: s.prestigeLevel,
    });
  },

  getMagnetRadiusMultiplier: () =>
    getSkillMagnetRadiusMultiplier(get().skillTree),

  getAscensionExtraArms: () =>
    getExtraArmsBonus(get().ascensionPassives.extraArms),

  getStartingGoldBonus: () =>
    startingGoldBonusAt(get().ascensionPassives.startingGold),

  getDiamondLuckBonus: () =>
    diamondLuckBonusAt(get().ascensionPassives.diamondLuck) +
    calcEquippedTeamBuffs(
      get().teamMembersOwned,
      get().equippedTeamMemberIds,
    ).diamondLuckBonus,

  getEquippedTeamBuffs: () =>
    calcEquippedTeamBuffs(
      get().teamMembersOwned,
      get().equippedTeamMemberIds,
    ),

  getTeamRecruitCost: () =>
    calcTeamRecruitCost(get().teamPity.totalPulls),

  getTeamMultiRecruitCost: () =>
    calcTeamMultiRecruitCost(
      get().teamPity.totalPulls,
      TEAM_MULTI_PULL_COUNT,
    ),

  recruitTeamMember: () => {
    const pity = normalizeTeamPity(get().teamPity);
    const cost = calcTeamRecruitCost(pity.totalPulls);
    if (get().gold < cost.gold || get().gems < cost.gems) {
      return { ok: false, reason: "funds" };
    }

    const { memberId, tier } = rollTeamMemberId(pity);
    const owned = normalizeTeamMembersOwned(get().teamMembersOwned);
    const previous = owned[memberId] ?? 0;
    const nextLevel =
      previous <= 0
        ? 1
        : Math.min(MAX_TEAM_MEMBER_LEVEL, previous + 1);
    const nextOwned = { ...owned, [memberId]: nextLevel };
    const nextPity = advancePityAfterPull(pity, tier);

    set((s) => {
      let equipped = [...s.equippedTeamMemberIds];
      if (
        previous <= 0 &&
        equipped.length < MAX_EQUIPPED_TEAM_MEMBERS &&
        !equipped.includes(memberId)
      ) {
        equipped = [...equipped, memberId];
      }
      return {
        gold: s.gold - cost.gold,
        gems: s.gems - cost.gems,
        teamMembersOwned: nextOwned,
        teamPity: nextPity,
        equippedTeamMemberIds: equipped,
      };
    });

    return {
      ok: true,
      memberId,
      tier,
      isDuplicate: previous > 0,
      level: nextLevel,
      goldSpent: cost.gold,
      gemsSpent: cost.gems,
      totalPulls: nextPity.totalPulls,
    };
  },

  recruitTeamMembers: (count = TEAM_MULTI_PULL_COUNT) => {
    const pullCount = Math.max(1, Math.floor(count));
    const pityStart = normalizeTeamPity(get().teamPity);
    const cost = calcTeamMultiRecruitCost(pityStart.totalPulls, pullCount);
    if (get().gold < cost.gold || get().gems < cost.gems) {
      return { ok: false, reason: "funds" };
    }

    let pity = pityStart;
    let owned = normalizeTeamMembersOwned(get().teamMembersOwned);
    let equipped = [...get().equippedTeamMemberIds];
    const pulls: RecruitTeamPullEntry[] = [];

    for (let i = 0; i < pullCount; i++) {
      const { memberId, tier } = rollTeamMemberId(pity);
      const previous = owned[memberId] ?? 0;
      const nextLevel =
        previous <= 0
          ? 1
          : Math.min(MAX_TEAM_MEMBER_LEVEL, previous + 1);
      owned = { ...owned, [memberId]: nextLevel };
      pity = advancePityAfterPull(pity, tier);

      if (
        previous <= 0 &&
        equipped.length < MAX_EQUIPPED_TEAM_MEMBERS &&
        !equipped.includes(memberId)
      ) {
        equipped = [...equipped, memberId];
      }

      pulls.push({
        memberId,
        tier,
        isDuplicate: previous > 0,
        level: nextLevel,
      });
    }

    set((s) => ({
      gold: s.gold - cost.gold,
      gems: s.gems - cost.gems,
      teamMembersOwned: owned,
      teamPity: pity,
      equippedTeamMemberIds: equipped,
    }));

    return {
      ok: true,
      pulls,
      goldSpent: cost.gold,
      gemsSpent: cost.gems,
      totalPulls: pity.totalPulls,
      discount: cost.discount,
    };
  },

  equipTeamMember: (id) => {
    const owned = get().teamMembersOwned;
    if ((owned[id] ?? 0) <= 0) return false;
    const current = get().equippedTeamMemberIds;
    if (current.includes(id)) return true;
    if (current.length >= MAX_EQUIPPED_TEAM_MEMBERS) return false;
    set({ equippedTeamMemberIds: [...current, id] });
    return true;
  },

  unequipTeamMember: (id) =>
    set((s) => ({
      equippedTeamMemberIds: s.equippedTeamMemberIds.filter((x) => x !== id),
    })),

  setSelectedStage: (stage) => {
    const max = getMaxSelectableStage(get().maxStageCleared);
    const n = Math.min(max, Math.max(1, Math.floor(stage)));
    set({ selectedStage: n, selectedRunMode: "stage" });
  },

  setSelectedRunMode: (mode) => {
    if (mode === "endless") {
      if (!get().endlessUnlocked && !isEndlessUnlocked(get().maxStageCleared)) {
        return;
      }
      set({ selectedRunMode: "endless" });
      return;
    }
    set({ selectedRunMode: "stage" });
  },

  setVisualSettings: (patch) => {
    set((s) => ({
      visualSettings: normalizeGameVisualSettings({
        ...s.visualSettings,
        ...patch,
      }),
    }));
    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
  },

  completeStageClear: (stageNumber) => {
    const stage = Math.min(
      TOTAL_STAGES,
      Math.max(1, Math.floor(stageNumber)),
    );
    const prev = get().maxStageCleared;
    const firstClear = stage > prev;
    const rewards = firstClear
      ? getStageClearRewards(stage)
      : { gold: Math.floor(getStageClearRewards(stage).gold * 0.25), gems: 0 };

    set((s) => {
      const nextCleared = Math.max(s.maxStageCleared, stage);
      return {
        maxStageCleared: nextCleared,
        endlessUnlocked:
          s.endlessUnlocked || nextCleared >= ENDLESS_UNLOCK_STAGE,
        gold: s.gold + rewards.gold,
        gems: s.gems + rewards.gems,
        // Só avança a seleção na 1ª clear — replay de fase antiga não deve
        // pular para o frontier (ex.: limpar 14 com max 26 → selected 27).
        selectedStage: firstClear
          ? Math.min(TOTAL_STAGES, nextCleared + 1)
          : s.selectedStage,
      };
    });

    return { firstClear, ...rewards };
  },

  getAscensionPassiveCost: (id) => {
    const level = get().ascensionPassives[id] ?? 0;
    const max = getAscensionPassiveMaxLevel(id);
    if (level >= max) return Number.POSITIVE_INFINITY;
    return getAscensionPassiveCostAt(level, id);
  },

  upgradeAscensionPassive: (id) => {
    const current = get().ascensionPassives[id] ?? 0;
    const max = getAscensionPassiveMaxLevel(id);
    if (current >= max) return false;
    const cost = getAscensionPassiveCostAt(current, id);
    if (get().ascensionShards < cost) return false;

    set((s) => ({
      ascensionShards: s.ascensionShards - cost,
      ascensionPassives: {
        ...s.ascensionPassives,
        [id]: current + 1,
      },
    }));

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  /**
   * Ascensão: +1 prestige + Ascension Shards; reseta ouro, diamantes (normais e
   * roxos), upgrades de base (ouro) e atributos granulares das skills (voltam
   * ao Nv.1). Desbloqueios de skills avançadas permanecem; Maestrias Supremas
   * resetam e precisam ser liberadas de novo. Mantém upgrades de diamante
   * (meta tree, XP, skill tree) e passivas de Ascensão. Equipe: membros
   * obtidos voltam ao Nv.1 e o custo de recrutamento (pity) zera.
   */
  triggerPrestige: () => {
    if (!get().canTriggerPrestige()) return false;

    const fresh = createDefaultSaveData();
    const current = get();
    const startingGoldBonus = startingGoldBonusAt(
      current.ascensionPassives.startingGold,
    );
    const shardsGained = calcAscensionShardsGained({
      maxHpLevel: current.maxHpLevel,
      baseDamageLevel: current.baseDamageLevel,
      armTier: current.armTier,
      // XP de diamante não reseta — não conta como progresso sacrificado
      xpBonusLevel: 0,
      gold: current.gold,
      prestigeLevel: current.prestigeLevel,
    });

    set((s) => {
      const resetTeam = resetOwnedTeamMembersToBase(s.teamMembersOwned);
      const unlockedSkills = { ...s.unlockedSkills };
      return {
      prestigeLevel: s.prestigeLevel + 1,
      ascensionShards: s.ascensionShards + shardsGained,
      // Passivas de Ascensão são permanentes — reafirma no snapshot do prestige
      ascensionPassives: normalizeAscensionPassives(s.ascensionPassives),
      // Herança de Ouro: ouro base do save + bônus permanente ao resetar
      gold: fresh.gold + startingGoldBonus,
      gems: fresh.gems,
      purpleDiamonds: fresh.purpleDiamonds,
      maxHpLevel: fresh.maxHpLevel,
      baseDamageLevel: fresh.baseDamageLevel,
      baseDamage: fresh.baseDamage,
      attackSpeedLevel: fresh.attackSpeedLevel,
      rangeLevel: fresh.rangeLevel,
      arms: fresh.arms,
      armTier: fresh.armTier,
      armsNextCost: fresh.armsNextCost,
      incomeLevel: fresh.incomeLevel ?? 0,
      incomeMultiplier: fresh.incomeMultiplier,
      knockbackLevel: fresh.knockbackLevel,
      baseKnockbackPower: fresh.baseKnockbackPower,
      critChanceLevel: fresh.critChanceLevel,
      critDamageLevel: fresh.critDamageLevel,
      // Upgrades de diamante (normais) permanentes — não resetam
      // xpBonusLevel, skillTree e meta tree são preservados
      // Skills avançadas: desbloqueio permanente; attrs → Nv.1
      unlockedSkills,
      // Maestrias Supremas: resetam na Ascensão (recomprar após maxar attrs)
      skillMasteryUnlocked: { ...DEFAULT_UNLOCKED_SKILLS },
      auraPrimaryElement: resolveAuraPrimaryElement(
        s.auraPrimaryElement,
        unlockedSkills,
      ),
      skills: resetUnlockedSkillsToLevel1(unlockedSkills),
      totalMobsKilled: 0,
      totalBossesKilled: 0,
      teamMembersOwned: resetTeam,
      teamPity: normalizeTeamPity(null),
      equippedTeamMemberIds: normalizeEquippedTeamIds(
        s.equippedTeamMemberIds,
        resetTeam,
      ),
      milestoneQuests: applyMilestoneProgress(s.milestoneQuests, [
        { type: "prestige_level", amount: s.prestigeLevel + 1 },
      ]),
    };
    });

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  addGems: (amount) => set((s) => ({ gems: s.gems + amount })),

  addPurpleDiamonds: (amount) =>
    set((s) => ({
      purpleDiamonds: Math.max(0, s.purpleDiamonds + amount),
    })),

  progressMilestoneQuests: (events) => {
    if (events.length === 0) return;
    const before = get().milestoneQuests;
    const after = applyMilestoneProgress(before, events);
    const newly = listNewlyClaimableMilestones(before, after);
    const toasts =
      newly.length > 0 ? buildMilestoneToastItems(newly, after) : [];
    set((s) => ({
      milestoneQuests: after,
      milestoneToasts:
        toasts.length > 0
          ? [...toasts, ...s.milestoneToasts].slice(0, 8)
          : s.milestoneToasts,
    }));
  },

  dismissMilestoneToast: (uid) => {
    set((s) => ({
      milestoneToasts: s.milestoneToasts.filter((t) => t.uid !== uid),
    }));
  },

  claimMilestoneQuest: (id) => {
    const state = get().milestoneQuests;
    if (!canClaimMilestone(state, id)) return null;
    const def = getMilestoneQuestDef(id);
    if (!def) return null;
    const row = state[id] ?? { phase: 0, current: 0 };
    const rewards = getMilestonePhaseRewards(def, row.phase);

    set((s) => {
      let mq = advanceMilestonePhase(s.milestoneQuests, id);
      // Prestígio já alcançado conta para a próxima fase de Ascendido
      if (id === "ascended") {
        mq = applyMilestoneProgress(mq, [
          { type: "prestige_level", amount: s.prestigeLevel },
        ]);
      }
      return {
        milestoneQuests: mq,
        gold: s.gold + rewards.gold,
        gems: s.gems + rewards.gems,
        purpleDiamonds: s.purpleDiamonds + rewards.purpleDiamonds,
        ascensionShards: s.ascensionShards + rewards.ascensionShards,
        milestoneToasts: s.milestoneToasts.filter((t) => t.questId !== id),
      };
    });

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return rewards;
  },

  /** Skills custam diamantes (gems), não ouro. Só altera gems + skillTree. */
  unlockSkill: (nodeId, _cost) => {
    const current = get();
    const node = getSkillNode(nodeId);
    const cost = Math.max(
      1,
      Math.floor(
        node.cost * getPrestigeCostMultiplier(current.prestigeLevel),
      ),
    );
    if (current.skillTree[nodeId]) return false;
    if (!areRequirementsMet(current.skillTree, nodeId)) return false;
    if (current.gems < cost) return false;

    set((state) => ({
      gems: state.gems - cost,
      skillTree: { ...state.skillTree, [nodeId]: true },
    }));
    return true;
  },

  getSkillStatUpgradeCost: (skillId, statKey) => {
    if (!isSkillUpgradeType(skillId) || !isSkillStatKey(skillId, statKey)) {
      return Number.POSITIVE_INFINITY;
    }
    const level = getSkillStatLevel(get().skills, skillId, statKey);
    if (level >= MAX_PURPLE_SKILL_STAT_LEVEL) return Number.POSITIVE_INFINITY;
    return getPurpleSkillCostAt(level, get().prestigeLevel);
  },

  getAdvancedSkillUnlockRequirements: (skillType) => {
    const base = advancedSkillUnlockRequirementsOf(skillType);
    const mul = getPrestigeCostMultiplier(get().prestigeLevel);
    return {
      goldCost: Math.max(1, Math.floor(base.goldCost * mul)),
      diamondCost: Math.max(1, Math.floor(base.diamondCost * mul)),
      requiredMobs: Math.max(1, Math.floor(base.requiredMobs * mul)),
      requiredBosses: Math.max(1, Math.floor(base.requiredBosses * mul)),
    };
  },

  /** @deprecated Preferir getAdvancedSkillUnlockRequirements — retorna só diamantes. */
  getAdvancedSkillUnlockCost: (skillType) =>
    get().getAdvancedSkillUnlockRequirements(skillType).diamondCost,

  canUnlockAdvancedSkill: (skillType) => {
    if (get().unlockedSkills[skillType]) return false;
    const s = get();
    const req = get().getAdvancedSkillUnlockRequirements(skillType);
    return (
      s.gold >= req.goldCost &&
      s.gems >= req.diamondCost &&
      s.totalMobsKilled >= req.requiredMobs &&
      s.totalBossesKilled >= req.requiredBosses
    );
  },

  recordLifetimeKills: (mobs, bosses = 0) => {
    const addMobs = Math.max(0, Math.floor(mobs));
    const addBosses = Math.max(0, Math.floor(bosses));
    if (addMobs <= 0 && addBosses <= 0) return;
    set((s) => ({
      totalMobsKilled: s.totalMobsKilled + addMobs,
      totalBossesKilled: s.totalBossesKilled + addBosses,
    }));
  },

  /**
   * Desbloqueia skill avançada: ouro + diamantes + marcos de abates.
   * Necessário para a carta aparecer na roleta in-game.
   */
  unlockAdvancedSkill: (skillType) => {
    if (get().unlockedSkills[skillType]) return false;
    const req = get().getAdvancedSkillUnlockRequirements(skillType);
    const s = get();
    if (
      s.gold < req.goldCost ||
      s.gems < req.diamondCost ||
      s.totalMobsKilled < req.requiredMobs ||
      s.totalBossesKilled < req.requiredBosses
    ) {
      return false;
    }

    set((state) => {
      const unlockedSkills = {
        ...state.unlockedSkills,
        [skillType]: true,
      };
      let auraPrimaryElement = state.auraPrimaryElement;
      // Ao liberar Aura (ou 1º elemento), garante um primário válido
      if (skillType === "aura" || listUnlockedAuraElements(unlockedSkills).length === 1) {
        auraPrimaryElement = resolveAuraPrimaryElement(
          auraPrimaryElement,
          unlockedSkills,
        );
      } else if (
        auraPrimaryElement &&
        !unlockedSkills[auraPrimaryElement]
      ) {
        auraPrimaryElement = resolveAuraPrimaryElement(null, unlockedSkills);
      }
      return {
        gold: state.gold - req.goldCost,
        gems: state.gems - req.diamondCost,
        unlockedSkills,
        auraPrimaryElement,
      };
    });

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  getSkillMasteryUnlockCost: () => ({
    purpleDiamonds: SKILL_MASTERY_PURPLE_COST,
    ascensionShards: SKILL_MASTERY_SHARD_COST,
  }),

  canUnlockSkillMastery: (skillType) => {
    if (!isSkillUpgradeType(skillType)) return false;
    const s = get();
    if (!s.unlockedSkills[skillType]) return false;
    if (s.skillMasteryUnlocked[skillType]) return false;
    if (!areAllSkillStatsMaxed(s.skills, skillType)) return false;
    return (
      s.purpleDiamonds >= SKILL_MASTERY_PURPLE_COST &&
      s.ascensionShards >= SKILL_MASTERY_SHARD_COST
    );
  },

  unlockSkillMastery: (skillType) => {
    if (!get().canUnlockSkillMastery(skillType)) return false;
    set((state) => ({
      purpleDiamonds: state.purpleDiamonds - SKILL_MASTERY_PURPLE_COST,
      ascensionShards: state.ascensionShards - SKILL_MASTERY_SHARD_COST,
      skillMasteryUnlocked: {
        ...state.skillMasteryUnlocked,
        [skillType]: true,
      },
    }));
    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  setAuraPrimaryElement: (element) => {
    if (!isAuraElementKey(element)) return false;
    if (!get().unlockedSkills[element]) return false;
    if (!get().unlockedSkills.aura) return false;
    set({ auraPrimaryElement: element });
    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  /**
   * Incrementa um atributo específico da skill com Diamantes Roxos.
   * Custo: base × growth^nível (com soft-tail) × prestígio. Teto: MAX_PURPLE_SKILL_STAT_LEVEL.
   */
  upgradeSkillStat: (skillId, statKey) => {
    if (!isSkillUpgradeType(skillId) || !isSkillStatKey(skillId, statKey)) {
      return false;
    }
    if (!get().unlockedSkills[skillId]) return false;

    const currentLevel = getSkillStatLevel(get().skills, skillId, statKey);
    if (currentLevel >= MAX_PURPLE_SKILL_STAT_LEVEL) return false;

    const cost = getPurpleSkillCostAt(currentLevel, get().prestigeLevel);
    if (get().purpleDiamonds < cost) return false;

    set((s) => {
      const prevSkill = s.skills[skillId] as Record<string, number>;
      return {
        purpleDiamonds: s.purpleDiamonds - cost,
        skills: {
          ...s.skills,
          [skillId]: {
            ...prevSkill,
            [statKey]: currentLevel + 1,
          },
        },
      };
    });

    get().progressMilestoneQuests([
      { type: "purple_upgrades_bought", amount: 1 },
    ]);

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return true;
  },

  getPurpleSkillInvestment: () =>
    getTotalPurpleSkillInvestment(get().skills, get().prestigeLevel),

  enforcePurpleSkillCap: () => {
    const { skills, refund } = clampSkillsToMaxLevel(
      get().skills,
      get().prestigeLevel,
    );
    if (refund <= 0) return 0;
    set((s) => ({
      skills,
      purpleDiamonds: s.purpleDiamonds + refund,
    }));
    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return refund;
  },

  /**
   * Respec da árvore roxa: zera atributos granulares e devolve diamantes roxos.
   * Desbloqueios (diamantes normais) e a skill tree verde não são afetados.
   */
  resetSkillTree: () => {
    const invested = getTotalPurpleSkillInvestment(
      get().skills,
      get().prestigeLevel,
    );
    if (invested <= 0) return 0;

    const refund = Math.floor(invested * SKILL_TREE_RESPEC_REFUND_RATE);
    set((s) => ({
      purpleDiamonds: s.purpleDiamonds + refund,
      skills: {
        ricochet: { ...DEFAULT_SKILLS_DATA.ricochet },
        ice: { ...DEFAULT_SKILLS_DATA.ice },
        fire: { ...DEFAULT_SKILLS_DATA.fire },
        lightning: { ...DEFAULT_SKILLS_DATA.lightning },
        aura: { ...DEFAULT_SKILLS_DATA.aura },
        shadow: { ...DEFAULT_SKILLS_DATA.shadow },
        stone: { ...DEFAULT_SKILLS_DATA.stone },
        vendaval: { ...DEFAULT_SKILLS_DATA.vendaval },
      },
    }));

    void import("@/lib/syncWithDB").then(({ syncWithDB }) => {
      void syncWithDB();
    });
    return refund;
  },

  getHpUpgradeCost: () => {
    const hp = getUpgradeCostParams("hp", COMBAT_UPGRADE_COST_BASE, COMBAT_UPGRADE_COST_GROWTH);
    return getUpgradeCost(
      hp.costBase,
      get().maxHpLevel,
      get().prestigeLevel,
      hp.growthRate,
    );
  },

  getDamageUpgradeCost: () => {
    const dmg = getUpgradeCostParams(
      "damage",
      COMBAT_UPGRADE_COST_BASE,
      COMBAT_UPGRADE_COST_GROWTH,
    );
    return getUpgradeCost(
      dmg.costBase,
      get().baseDamageLevel,
      get().prestigeLevel,
      dmg.growthRate,
    );
  },

  getAttackSpeedUpgradeCost: () =>
    getUpgradeCost(
      ATTACK_SPEED_COST_BASE,
      get().attackSpeedLevel,
      get().prestigeLevel,
    ),

  getRangeUpgradeCost: () =>
    getUpgradeCost(
      RANGE_COST_BASE,
      get().rangeLevel,
      get().prestigeLevel,
      RANGE_COST_GROWTH,
    ),

  getIncomeUpgradeCost: () => {
    return getUpgradeCost(
      INCOME_COST_BASE,
      get().incomeLevel,
      get().prestigeLevel,
    );
  },

  getArmsUpgradeCost: () =>
    Math.max(
      1,
      Math.floor(
        get().armsNextCost * getPrestigeCostMultiplier(get().prestigeLevel),
      ),
    ),

  getKnockbackUpgradeCost: () =>
    getKnockbackCostAt(get().knockbackLevel, get().prestigeLevel),

  getKnockbackPower: () => {
    const s = get();
    const prestigeMul = s.getPrestigeMultiplier();
    const team = calcEquippedTeamBuffs(
      s.teamMembersOwned,
      s.equippedTeamMemberIds,
    );
    return (
      getKnockbackPowerAt(s.baseKnockbackPower, s.knockbackLevel) +
      Math.max(0, s.metaKnockbackLevel) *
        META_KNOCKBACK_PER_LEVEL *
        prestigeMul +
      getSkillKnockbackBonus(s.skillTree) * prestigeMul
    ) * team.knockbackMultiplier;
  },

  getCritChanceUpgradeCost: () =>
    getCritChanceCostAt(get().critChanceLevel, get().prestigeLevel),

  getCritDamageUpgradeCost: () =>
    getCritDamageCostAt(get().critDamageLevel, get().prestigeLevel),

  getCritChance: () => {
    const team = calcEquippedTeamBuffs(
      get().teamMembersOwned,
      get().equippedTeamMemberIds,
    );
    const prestigeMul = get().getPrestigeMultiplier();
    return Math.min(
      MAX_CRIT_CHANCE,
      getCritChanceAt(get().critChanceLevel) +
        getSkillCritChanceBonus(get().skillTree) * prestigeMul +
        team.critChanceBonus,
    );
  },

  getCritDamageMultiplier: () => {
    const team = calcEquippedTeamBuffs(
      get().teamMembersOwned,
      get().equippedTeamMemberIds,
    );
    const prestigeMul = get().getPrestigeMultiplier();
    return (
      getCritDamageMultiplierAt(get().critDamageLevel) +
      getSkillCritDamageBonus(get().skillTree) * prestigeMul +
      team.critDamageBonus
    );
  },

  getXpBonusUpgradeCost: () => {
    const level = get().xpBonusLevel;
    if (isLevelCapped(level, MAX_UPGRADE_LEVELS.xpBonus)) {
      return Number.POSITIVE_INFINITY;
    }
    return xpBonusCostAt(level, get().prestigeLevel);
  },

  getXpMultiplier: () => xpMultiplierAt(get().xpBonusLevel),

  getMetaTreeUpgradeCost: (type) =>
    getMetaTreeCostAt(
      getMetaTreeLevel(get(), type),
      get().prestigeLevel,
      type,
    ),

  previewMetaTreeBulk: (type, quantity) => {
    const s = get();
    const maxLevel = getMetaTreeMaxLevel(type);
    return planSequentialGoldUpgrades({
      startLevel: getMetaTreeLevel(s, type),
      gold: s.gems,
      quantity,
      getCostAt: (lv) => getMetaTreeCostAt(lv, s.prestigeLevel, type),
      canBuyAt: (lv) => !isLevelCapped(lv, maxLevel),
    });
  },

  buyMetaTreeBulk: (type, quantity) => {
    const plan = get().previewMetaTreeBulk(type, quantity);
    if (plan.count <= 0 || plan.totalCost <= 0) return 0;
    if (get().gems < plan.totalCost) return 0;
    const current = getMetaTreeLevel(get(), type);
    set((s) => ({
      gems: s.gems - plan.totalCost,
      [type]: current + plan.count,
    }));
    get().progressMilestoneQuests([
      { type: "meta_upgrades_bought", amount: plan.count },
    ]);
    return plan.count;
  },

  upgradeMetaTree: (type) => {
    const current = getMetaTreeLevel(get(), type);
    const maxLevel = getMetaTreeMaxLevel(type);
    if (isLevelCapped(current, maxLevel)) return false;
    const cost = getMetaTreeCostAt(current, get().prestigeLevel, type);
    if (get().gems < cost) return false;
    set((s) => ({
      gems: s.gems - cost,
      [type]: current + 1,
    }));
    get().progressMilestoneQuests([
      { type: "meta_upgrades_bought", amount: 1 },
    ]);
    return true;
  },

  /**
   * Derived state: upgrades de ouro + bônus da skill tree + árvore de diamantes.
   * Bases de CD/range/HP vêm de `baseConfig` (Neon).
   */
  getEffectiveStats: () => {
    const s = get();
    const tree = s.skillTree;
    const cfg = s.baseConfig;
    const skillHp = skillHpBonus(tree);
    const skillDmg = skillDamageBonus(tree);
    const skillRange = skillRangeBonus(tree);
    const skillAsMul = skillAttackSpeedMultiplier(tree);
    const lifeStealLevel = getLifeStealLevel(tree);
    const metaLifeSteal = getMetaLifeStealRatio(s.metaLifeStealLevel);
    const team = calcEquippedTeamBuffs(
      s.teamMembersOwned,
      s.equippedTeamMemberIds,
    );

    const goldHpMul = goldHpMultiplier(s.maxHpLevel);
    const goldDmgMul = goldDamageMultiplier(s.baseDamageLevel);
    const metaHpMul = metaHpMultiplier(s.metaHpLevel);
    const metaDmgMul = metaDamageMultiplier(s.metaDamageLevel);
    const metaAsMul = metaAttackSpeedMultiplier(s.metaAttackSpeedLevel);
    const startingStatsMul = getStartingStatsMultiplier(
      s.ascensionPassives.startingStats,
    );
    const goldRange = rangeAtLevel(s.rangeLevel, cfg.baseRange);
    const goldCooldown = cooldownAtLevel(
      s.attackSpeedLevel,
      cfg.baseAttackSpeed,
    );
    const prestigeMul = 1 + Math.max(0, s.prestigeLevel) * 0.15;
    const cooldownBeforeTeam = Math.max(
      MIN_ATTACK_COOLDOWN_MS,
      Math.round(goldCooldown / Math.max(0.1, skillAsMul * prestigeMul)),
    );

    // Stats iniciais (ouro + skill tree): recebem Fundação Primordial.
    // Meta de diamantes entra à parte — não é amplificada pelo bônus.
    const hpCore =
      (cfg.baseHp + skillHp * prestigeMul) * goldHpMul * startingStatsMul;
    const hpMetaExtra =
      (cfg.baseHp + skillHp * prestigeMul) * goldHpMul * (metaHpMul - 1);
    const hpBeforeTeam = hpCore + hpMetaExtra;

    const damageBase =
      (s.baseDamage + skillDmg) * prestigeMul * goldDmgMul;

    return {
      maxHp: Math.round(hpBeforeTeam * team.maxHpMultiplier),
      damage: Math.round(
        damageBase *
          team.damageMultiplier *
          (startingStatsMul + metaDmgMul - 1),
      ),
      attackRange: Math.min(
        MAX_ATTACK_RANGE,
        Math.round(goldRange + skillRange * prestigeMul),
      ),
      attackCooldownMs: Math.max(
        MIN_ATTACK_COOLDOWN_MS,
        Math.round(
          cooldownBeforeTeam /
            (team.attackSpeedMultiplier * startingStatsMul * metaAsMul),
        ),
      ),
      xpMultiplier:
        xpMultiplierAt(s.xpBonusLevel) * (1 + team.xpMultiplierBonus),
      arms: s.arms + getSkillExtraArms(tree) + getExtraArmsBonus(s.ascensionPassives.extraArms),
      lifeStealLevel,
      lifeStealPercent:
        (getLifeStealRatio(tree) + metaLifeSteal) * prestigeMul,
      metaSkillRegenLevel: s.metaSkillRegenLevel,
      critChance: Math.min(
        MAX_CRIT_CHANCE,
        getCritChanceAt(s.critChanceLevel) +
          getSkillCritChanceBonus(tree) * prestigeMul +
          team.critChanceBonus,
      ),
      critDamageMultiplier:
        getCritDamageMultiplierAt(s.critDamageLevel) +
        getSkillCritDamageBonus(tree) * prestigeMul +
        team.critDamageBonus,
      ricochetUnlocked: s.unlockedSkills.ricochet,
      ricochetCooldown: Math.max(
        2_000,
        7_000 - s.skills.ricochet.cooldown * 500 * prestigeMul,
      ),
      maxBounces: Math.min(
        5,
        2 + Math.round(s.skills.ricochet.hits * prestigeMul),
      ),
      bounceDamagePercent:
        (0.6 + s.skills.ricochet.damage * 0.15) * Math.min(1.5, prestigeMul),
      knockbackPower:
        (getKnockbackPowerAt(s.baseKnockbackPower, s.knockbackLevel) +
          Math.max(0, s.metaKnockbackLevel) *
            META_KNOCKBACK_PER_LEVEL *
            prestigeMul +
          getSkillKnockbackBonus(tree) * prestigeMul) *
        team.knockbackMultiplier,
      skillBonus: {
        hp: skillHp,
        damage: skillDmg,
        range: skillRange,
        cooldownReductionMs: Math.max(0, goldCooldown - cooldownBeforeTeam),
      },
    };
  },

  getMaxHp: () => get().getEffectiveStats().maxHp,

  getBaseDamage: () => get().getEffectiveStats().damage,

  getUpgradeCooldownAt: (level) =>
    cooldownAtLevel(level, get().baseConfig.baseAttackSpeed),

  getUpgradeRangeAt: (level) =>
    rangeAtLevel(level, get().baseConfig.baseRange),

  getBaseAttackSpeed: () =>
    cooldownAtLevel(
      get().attackSpeedLevel,
      get().baseConfig.baseAttackSpeed,
    ),

  getBaseRange: () =>
    rangeAtLevel(get().rangeLevel, get().baseConfig.baseRange),

  getAttackRange: () => get().getEffectiveStats().attackRange,

  getAttackCooldown: () => get().getEffectiveStats().attackCooldownMs,

  previewGoldUpgradeBulk: (kind, quantity) => {
    const s = get();
    const prestige = s.prestigeLevel;
    const gold = s.gold;

    if (kind === "arms") {
      const wanted = resolveBulkWanted(quantity);
      let count = 0;
      let totalCost = 0;
      let stored = s.armsNextCost;
      const nextCost = Math.max(
        1,
        Math.floor(stored * getPrestigeCostMultiplier(prestige)),
      );
      while (count < wanted) {
        const cost = Math.max(
          1,
          Math.floor(stored * getPrestigeCostMultiplier(prestige)),
        );
        if (totalCost + cost > gold) break;
        totalCost += cost;
        stored = Math.floor(stored * ARMS_COST_GROWTH);
        count += 1;
      }
      return { count, totalCost, nextCost };
    }

    if (kind === "hp") {
      return planSequentialGoldUpgrades({
        startLevel: s.maxHpLevel,
        gold,
        quantity,
        getCostAt: (lv) =>
          getUpgradeCost(
            COMBAT_UPGRADE_COST_BASE,
            lv,
            prestige,
            COMBAT_UPGRADE_COST_GROWTH,
          ),
        canBuyAt: (lv) => !isLevelCapped(lv, MAX_UPGRADE_LEVELS.hp),
      });
    }

    if (kind === "damage") {
      return planSequentialGoldUpgrades({
        startLevel: s.baseDamageLevel,
        gold,
        quantity,
        getCostAt: (lv) =>
          getUpgradeCost(
            COMBAT_UPGRADE_COST_BASE,
            lv,
            prestige,
            COMBAT_UPGRADE_COST_GROWTH,
          ),
        canBuyAt: (lv) => !isLevelCapped(lv, MAX_UPGRADE_LEVELS.damage),
      });
    }

    if (kind === "range") {
      const metaCeil = getMetaMaxRangePx(s.baseConfig.baseRange);
      return planSequentialGoldUpgrades({
        startLevel: s.rangeLevel,
        gold,
        quantity,
        getCostAt: (lv) =>
          getUpgradeCost(RANGE_COST_BASE, lv, prestige, RANGE_COST_GROWTH),
        canBuyAt: (lv) => {
          if (lv >= MAX_UPGRADE_LEVELS.range) return false;
          const cur = rangeAtLevel(lv, s.baseConfig.baseRange);
          if (cur >= metaCeil) return false;
          const next = rangeAtLevel(lv + 1, s.baseConfig.baseRange);
          return next > cur;
        },
      });
    }

    if (kind === "income") {
      return planSequentialGoldUpgrades({
        startLevel: s.incomeLevel,
        gold,
        quantity,
        getCostAt: (lv) => getUpgradeCost(INCOME_COST_BASE, lv, prestige),
        canBuyAt: (lv) => !isLevelCapped(lv, MAX_UPGRADE_LEVELS.income),
      });
    }

    // critChance
    return planSequentialGoldUpgrades({
      startLevel: s.critChanceLevel,
      gold,
      quantity,
      getCostAt: (lv) => getCritChanceCostAt(lv, prestige),
      canBuyAt: (lv) => {
        if (isLevelCapped(lv, MAX_UPGRADE_LEVELS.critChance)) return false;
        return getCritChanceAt(lv) < MAX_CRIT_CHANCE;
      },
    });
  },

  buyGoldUpgradeBulk: (kind, quantity) => {
    const plan = get().previewGoldUpgradeBulk(kind, quantity);
    if (plan.count <= 0 || plan.totalCost <= 0) return 0;
    if (get().gold < plan.totalCost) return 0;

    const n = plan.count;
    const cost = plan.totalCost;

    if (kind === "hp") {
      set((s) => ({
        gold: s.gold - cost,
        maxHpLevel: s.maxHpLevel + n,
      }));
    } else if (kind === "damage") {
      set((s) => ({
        gold: s.gold - cost,
        baseDamageLevel: s.baseDamageLevel + n,
      }));
    } else if (kind === "range") {
      set((s) => ({
        gold: s.gold - cost,
        rangeLevel: Math.min(MAX_UPGRADE_LEVELS.range, s.rangeLevel + n),
      }));
    } else if (kind === "income") {
      set((s) => {
        const nextLevel = s.incomeLevel + n;
        return {
          gold: s.gold - cost,
          incomeLevel: nextLevel,
          incomeMultiplier: incomeMultiplierAt(nextLevel),
        };
      });
    } else if (kind === "critChance") {
      set((s) => ({
        gold: s.gold - cost,
        critChanceLevel: Math.min(
          MAX_UPGRADE_LEVELS.critChance,
          s.critChanceLevel + n,
        ),
      }));
    } else {
      // arms — simula ciclo braço / prestige de braços
      set((s) => {
        let arms = s.arms;
        let armTier = s.armTier;
        let baseDamage = s.baseDamage;
        let armsNextCost = s.armsNextCost;
        for (let i = 0; i < n; i++) {
          if (arms < ARMS_MAX) {
            arms += 1;
          } else {
            arms = ARMS_MIN;
            armTier += 1;
            baseDamage = Math.round(baseDamage * ARMS_PRESTIGE_DAMAGE);
          }
          armsNextCost = Math.floor(armsNextCost * ARMS_COST_GROWTH);
        }
        return {
          gold: s.gold - cost,
          arms,
          armTier,
          baseDamage,
          armsNextCost,
        };
      });
    }

    get().progressMilestoneQuests([
      { type: "gold_upgrades_bought", amount: n },
    ]);
    return n;
  },

  upgradeHP: () => {
    return get().buyGoldUpgradeBulk("hp", 1) > 0;
  },

  upgradeDamage: () => {
    return get().buyGoldUpgradeBulk("damage", 1) > 0;
  },

  upgradeAttackSpeed: () => {
    if (get().attackSpeedLevel >= MAX_UPGRADE_LEVELS.attackSpeed) return false;
    const metaFloor = getMetaMaxCooldownMs(get().baseConfig.baseAttackSpeed);
    const currentCd = get().getUpgradeCooldownAt(get().attackSpeedLevel);
    if (currentCd <= metaFloor) return false;
    const nextCd = get().getUpgradeCooldownAt(get().attackSpeedLevel + 1);
    if (nextCd >= currentCd) return false;
    const cost = get().getAttackSpeedUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      attackSpeedLevel: Math.min(
        MAX_UPGRADE_LEVELS.attackSpeed,
        s.attackSpeedLevel + 1,
      ),
    }));
    return true;
  },

  upgradeRange: () => {
    if (get().rangeLevel >= MAX_UPGRADE_LEVELS.range) return false;
    const metaCeil = getMetaMaxRangePx(get().baseConfig.baseRange);
    const currentRange = get().getUpgradeRangeAt(get().rangeLevel);
    if (currentRange >= metaCeil) return false;
    const nextRange = get().getUpgradeRangeAt(get().rangeLevel + 1);
    if (nextRange <= currentRange) return false;
    const cost = get().getRangeUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      rangeLevel: Math.min(MAX_UPGRADE_LEVELS.range, s.rangeLevel + 1),
    }));
    return true;
  },

  upgradeIncome: () => {
    if (isLevelCapped(get().incomeLevel, MAX_UPGRADE_LEVELS.income))
      return false;
    const cost = get().getIncomeUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => {
      const nextLevel = s.incomeLevel + 1;
      return {
        gold: s.gold - cost,
        incomeLevel: nextLevel,
        incomeMultiplier: incomeMultiplierAt(nextLevel),
      };
    });
    return true;
  },

  /**
   * Ciclo de braços (prestige):
   * - arms < 6 → +1 braço
   * - arms === 6 → volta a 2 e baseDamage × 1.15 (arredondado)
   * Em ambos: próximo custo × 1.4
   */
  upgradeArms: () => {
    const baseStored = get().armsNextCost;
    const cost = get().getArmsUpgradeCost();
    if (get().gold < cost) return false;

    const nextCost = Math.floor(baseStored * ARMS_COST_GROWTH);

    set((s) => {
      if (s.arms < ARMS_MAX) {
        return {
          gold: s.gold - cost,
          arms: s.arms + 1,
          armsNextCost: nextCost,
        };
      }
      return {
        gold: s.gold - cost,
        arms: ARMS_MIN,
        armTier: s.armTier + 1,
        baseDamage: Math.round(s.baseDamage * ARMS_PRESTIGE_DAMAGE),
        armsNextCost: nextCost,
      };
    });
    return true;
  },

  upgradeKnockback: () => {
    // Knockback não sobe mais via cartas in-run.
    return false;
  },

  upgradeCritChance: () => {
    if (isLevelCapped(get().critChanceLevel, MAX_UPGRADE_LEVELS.critChance))
      return false;
    if (get().getCritChance() >= MAX_CRIT_CHANCE) return false;
    const cost = get().getCritChanceUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      critChanceLevel: s.critChanceLevel + 1,
    }));
    return true;
  },

  upgradeCritDamage: () => {
    if (isLevelCapped(get().critDamageLevel, MAX_UPGRADE_LEVELS.critDamage))
      return false;
    const cost = get().getCritDamageUpgradeCost();
    if (get().gold < cost) return false;
    set((s) => ({
      gold: s.gold - cost,
      critDamageLevel: s.critDamageLevel + 1,
    }));
    return true;
  },

  /** Compra nível de bônus de XP com diamantes (só gems + xpBonusLevel). */
  upgradeXpBonus: () => {
    if (isLevelCapped(get().xpBonusLevel, MAX_UPGRADE_LEVELS.xpBonus)) {
      return false;
    }
    const cost = get().getXpBonusUpgradeCost();
    if (!Number.isFinite(cost) || get().gems < cost) return false;
    set((state) => ({
      gems: state.gems - cost,
      xpBonusLevel: Math.min(
        MAX_UPGRADE_LEVELS.xpBonus,
        state.xpBonusLevel + 1,
      ),
    }));
    return true;
  },
}));
