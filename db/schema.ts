import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { AscensionPassivesData } from "@/lib/ascensionPassives";
import type { GameVisualSettings } from "@/lib/gameVisualSettings";
import type { MilestoneQuestsState } from "@/lib/milestoneQuests";
import type { SkillTreeState } from "@/lib/skillTree";
import type {
  TeamMemberId,
  TeamMembersOwned,
  TeamPityState,
} from "@/lib/teamMembers";

/** Stats granulares por skill avançada (Diamantes Roxos / JSONB). */
export type RicochetSkillStats = {
  damage: number;
  cooldown: number;
  hits: number;
};

export type IceSkillStats = {
  duration: number;
  cooldown: number;
};

export type FireSkillStats = {
  damage: number;
  duration: number;
};

export type LightningSkillStats = {
  damage: number;
  hits: number;
  cooldown: number;
};

/** Aura elemental: raio da área, poder (DPS) e pulso (intervalo do stun de gelo). */
export type AuraSkillStats = {
  radius: number;
  damage: number;
  pulse: number;
};

/** Shadow Clone: poder do clone, duração e cooldown de invocação. */
export type ShadowSkillStats = {
  damage: number;
  duration: number;
  cooldown: number;
};

/** Pedra: dano do terremoto, duração do debuff e cooldown. */
export type StoneSkillStats = {
  damage: number;
  duration: number;
  cooldown: number;
};

/** Vendaval: dano do impacto, raio do vácuo e cooldown. */
export type VendavalSkillStats = {
  damage: number;
  radius: number;
  cooldown: number;
};

export type SkillsData = {
  ricochet: RicochetSkillStats;
  ice: IceSkillStats;
  fire: FireSkillStats;
  lightning: LightningSkillStats;
  aura: AuraSkillStats;
  shadow: ShadowSkillStats;
  stone: StoneSkillStats;
  vendaval: VendavalSkillStats;
};

export type SkillUpgradeType = keyof SkillsData;

export type SkillStatKey<T extends SkillUpgradeType> = keyof SkillsData[T] &
  string;

/** Formato legado (nível único por skill) — migrado no normalize. */
export type LegacyFlatSkillsData = {
  ricochet: number;
  ice: number;
  lightning: number;
  fire: number;
  aura?: number;
  shadow?: number;
  stone?: number;
  vendaval?: number;
};

/** Níveis in-run (cartas de level-up) — independente do meta granular. */
export type MatchSkillsData = {
  ricochet: number;
  ice: number;
  lightning: number;
  fire: number;
  aura: number;
  shadow: number;
  stone: number;
  vendaval: number;
};

export const DEFAULT_MATCH_SKILLS: MatchSkillsData = {
  ricochet: 0,
  ice: 0,
  lightning: 0,
  fire: 0,
  aura: 0,
  shadow: 0,
  stone: 0,
  vendaval: 0,
};

export const DEFAULT_SKILLS_DATA: SkillsData = {
  ricochet: { damage: 0, cooldown: 0, hits: 0 },
  ice: { duration: 0, cooldown: 0 },
  fire: { damage: 0, duration: 0 },
  lightning: { damage: 0, hits: 0, cooldown: 0 },
  aura: { radius: 0, damage: 0, pulse: 0 },
  shadow: { damage: 0, duration: 0, cooldown: 0 },
  stone: { damage: 0, duration: 0, cooldown: 0 },
  vendaval: { damage: 0, radius: 0, cooldown: 0 },
};

export const SKILL_STAT_KEYS = {
  ricochet: ["damage", "cooldown", "hits"],
  ice: ["duration", "cooldown"],
  fire: ["damage", "duration"],
  lightning: ["damage", "hits", "cooldown"],
  aura: ["radius", "damage", "pulse"],
  shadow: ["damage", "duration", "cooldown"],
  stone: ["damage", "duration", "cooldown"],
  vendaval: ["damage", "radius", "cooldown"],
} as const satisfies {
  [K in SkillUpgradeType]: readonly (keyof SkillsData[K] & string)[];
};

/** Teto permanente de cada atributo granular (Diamantes Roxos). */
export const MAX_PURPLE_SKILL_STAT_LEVEL = 20;

/** Teto in-run: piso 5 (roleta), até 8; meta roxa só empurra o teto. */
export function getSkillMetaCap(
  skill: SkillsData[SkillUpgradeType] | number | undefined,
): number {
  if (skill == null) return 0;
  if (typeof skill === "number") {
    return Math.min(
      MAX_PURPLE_SKILL_STAT_LEVEL,
      Math.max(0, Math.floor(skill)),
    );
  }
  const values = Object.values(skill as Record<string, number>);
  if (values.length === 0) return 0;
  return Math.min(
    MAX_PURPLE_SKILL_STAT_LEVEL,
    Math.max(0, ...values.map((v) => Math.floor(Number(v) || 0))),
  );
}

export function isSkillUpgradeType(value: string): value is SkillUpgradeType {
  return value in DEFAULT_SKILLS_DATA;
}

export function isSkillStatKey(
  skillId: SkillUpgradeType,
  statKey: string,
): boolean {
  return (SKILL_STAT_KEYS[skillId] as readonly string[]).includes(statKey);
}

/** Desbloqueio permanente na base (Diamantes Normais). */
export type UnlockedSkillsData = {
  ricochet: boolean;
  ice: boolean;
  fire: boolean;
  lightning: boolean;
  aura: boolean;
  shadow: boolean;
  stone: boolean;
  vendaval: boolean;
};

export const DEFAULT_UNLOCKED_SKILLS: UnlockedSkillsData = {
  ricochet: false,
  ice: false,
  fire: false,
  lightning: false,
  aura: false,
  shadow: false,
  stone: false,
  vendaval: false,
};

/** Elementos que a Aura pode usar como atributo principal/secundário. */
export type AuraElementKey =
  | "ice"
  | "lightning"
  | "fire"
  | "stone"
  | "shadow"
  | "ricochet"
  | "vendaval";

export const AURA_ELEMENT_KEYS: readonly AuraElementKey[] = [
  "fire",
  "ice",
  "lightning",
  "stone",
  "ricochet",
  "vendaval",
  "shadow",
] as const;

export function isAuraElementKey(value: string): value is AuraElementKey {
  return (AURA_ELEMENT_KEYS as readonly string[]).includes(value);
}

/** Árvore de atributos permanentes (Diamantes Normais). */
export type MetaTreeData = {
  metaDamageLevel: number;
  metaKnockbackLevel: number;
  metaHpLevel: number;
  metaLifeStealLevel: number;
  metaSkillRegenLevel: number;
  /** Níveis de chance de parry automático (0–50). */
  metaParryChance: number;
  /** Velocidade de ataque permanente (0–10 → até +40% APS). */
  metaAttackSpeedLevel: number;
};

export type MetaTreeUpgradeType = keyof MetaTreeData;

export const DEFAULT_META_TREE: MetaTreeData = {
  metaDamageLevel: 0,
  metaKnockbackLevel: 0,
  metaHpLevel: 0,
  metaLifeStealLevel: 0,
  metaSkillRegenLevel: 0,
  metaParryChance: 0,
  metaAttackSpeedLevel: 0,
};

/** Progresso persistido (ouro, gemas, upgrades) — espelha o useGameStore. */
export type SaveData = {
  gold: number;
  gems: number;
  /** Moeda premium para skills avançadas. */
  purpleDiamonds: number;
  maxHpLevel: number;
  baseDamageLevel: number;
  /** Dano base absoluto (inteiro); prestige de braços aplica ×1.15. */
  baseDamage: number;
  /** Nível 0–6: cooldown absoluto (−2% da base por nível, máx −12%). */
  attackSpeedLevel: number;
  /** Nível 0–6: range absoluto (+2% da base por nível, máx +12%). */
  rangeLevel: number;
  arms: number;
  /** Ciclos de prestige de braços (só contagem / custo legado). */
  armTier: number;
  /** Custo atual do próximo upgrade de braços (cresce ×1.4 por compra). */
  armsNextCost: number;
  /**
   * Nível do multiplicador de ouro (fonte da verdade).
   * Saves antigos migram via `(incomeMultiplier - 1) / 0.1`.
   */
  incomeLevel: number;
  /** Multiplicador de ouro derivado de `incomeLevel` (legado / combate). */
  incomeMultiplier: number;
  /** Nível de bônus de XP (+10% por nível). */
  xpBonusLevel: number;
  /** Nível do upgrade de knockback (ouro) — legado; progresso só in-run. */
  knockbackLevel: number;
  /** Poder base de empurrão dos socos. */
  baseKnockbackPower: number;
  /** Nível de chance crítica (+2%/nível, teto 50%). */
  critChanceLevel: number;
  /** Nível de dano crítico (+15% no multiplicador/nível). */
  critDamageLevel: number;
  skillTree: SkillTreeState;
  /** Stats meta granulares (Purple Diamonds) — JSONB. */
  skills: SkillsData;
  /** @deprecated Preferir `skills`; mantido só para migração de saves antigos. */
  skillLevels?: SkillsData | LegacyFlatSkillsData;
  /** Skills liberadas na base (Diamantes Normais) para a roleta in-game. */
  unlockedSkills: UnlockedSkillsData;
  /**
   * Maestria Suprema liberada no meta (após maxear attrs Lv.20).
   * Reseta na Ascensão — precisa liberar de novo; a carta lendária
   * ainda exige Lv.5 in-run.
   */
  skillMasteryUnlocked: UnlockedSkillsData;
  /**
   * Atributo principal da Aura (skill liberada).
   * Os demais atributos liberados atuam com 50% do efeito.
   */
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
  /** Nível de Ascensão / Prestígio (bônus permanente + mundo mais difícil). */
  prestigeLevel: number;
  /** Moeda de Ascensão (shards) — gasta na loja de passivas permanentes. */
  ascensionShards: number;
  /** Passivas permanentes compradas com Ascension Shards (não resetam). */
  ascensionPassives: AscensionPassivesData;
  /** Progresso de missões de marco / conquistas (persistido no JSONB save_data). */
  milestoneQuests: MilestoneQuestsState;
  /** Abates cumulativos de mobs (não-boss) — desbloqueio de skills. */
  totalMobsKilled: number;
  /** Abates cumulativos de bosses — desbloqueio de skills. */
  totalBossesKilled: number;
  /** Gacha da equipe: contador total de pulls (+ pity interno). */
  teamPity: TeamPityState;
  /** Níveis dos membros da equipe (0 = não possui). */
  teamMembersOwned: TeamMembersOwned;
  /** Até 3 membros equipados na esquina do ringue. */
  equippedTeamMemberIds: TeamMemberId[];
  /** Maior fase limpa (0 = nenhuma). */
  maxStageCleared: number;
  /** Endless liberado após limpar a fase 15. */
  endlessUnlocked: boolean;
  /** Última fase selecionada no menu (1–50). */
  selectedStage: number;
  /** Modo de run selecionado. */
  selectedRunMode: "stage" | "endless";
  /** Preferências de desempenho / visual do canvas (por save). */
  visualSettings: GameVisualSettings;
};

export const gameSaves = pgTable("game_saves", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Nome único do save (visível na lista). */
  saveName: varchar("save_name", { length: 64 }).notNull().unique(),
  /** Senha simples de autenticação do save. */
  password: varchar("password", { length: 128 }).notNull(),
  saveData: jsonb("save_data").$type<SaveData>().notNull(),
  /** Purple Diamonds (também espelhado em save_data). */
  purpleDiamonds: integer("purple_diamonds").notNull().default(0),
  /** Nível de Ascensão / Prestígio. */
  prestigeLevel: integer("prestige_level").notNull().default(0),
  /** Ascension Shards (moeda de passivas permanentes). */
  ascensionShards: integer("ascension_shards").notNull().default(0),
  /** Stats granulares de skills avançadas (também espelhado em save_data.skills). */
  skillsData: jsonb("skills_data")
    .$type<SkillsData>()
    .notNull()
    .default(
      sql`'{"ricochet":{"damage":0,"cooldown":0,"hits":0},"ice":{"duration":0,"cooldown":0},"fire":{"damage":0,"duration":0},"lightning":{"damage":0,"hits":0,"cooldown":0},"aura":{"radius":0,"damage":0,"pulse":0},"shadow":{"damage":0,"duration":0,"cooldown":0},"stone":{"damage":0,"duration":0,"cooldown":0},"vendaval":{"damage":0,"radius":0,"cooldown":0}}'::jsonb`,
    ),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * Configuração base do jogador (tabela de linha única).
 * Valores padrão espelham os números usados hoje no cliente.
 */
export const gameSettings = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  /** Cooldown base de ataque em ms (ex.: 1000–2000). */
  baseAttackSpeed: integer("base_attack_speed").notNull().default(1500),
  baseDamage: integer("base_damage").notNull().default(10),
  baseHp: integer("base_hp").notNull().default(100),
  baseRange: integer("base_range").notNull().default(100),
});

/** Níveis de dificuldade e multiplicadores de inimigos / loot. */
export const difficulties = pgTable("difficulties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 32 }).notNull().unique(),
  enemyHpMultiplier: real("enemy_hp_multiplier").notNull(),
  enemyDamageMultiplier: real("enemy_damage_multiplier").notNull(),
  enemySpeedMultiplier: real("enemy_speed_multiplier").notNull(),
  goldDropMultiplier: real("gold_drop_multiplier").notNull(),
});

/**
 * Configuração das 50 fases da campanha (espelhada em `lib/stages.ts` no cliente).
 */
export const stages = pgTable("stages", {
  stageNumber: integer("stage_number").primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  enemyCount: integer("enemy_count").notNull().default(20),
  enemyTierCap: integer("enemy_tier_cap").notNull(),
  /** Fração 0–1 da cota para spawn do chefe (obrigatório em toda fase). */
  bossSpawnProgress: real("boss_spawn_progress").notNull().default(0.65),
  difficultyMul: real("difficulty_mul").notNull().default(1),
  /** Multiplicador extra só no chefe (early game mais fraco). */
  bossStatMul: real("boss_stat_mul").notNull().default(1),
});

/**
 * Catálogo de tipos de inimigos / bosses (HP, speed, dano, CD, cor, escala).
 * `speed` é unidade de design (× ENEMY_SPEED_UNIT → px/s no spawner).
 */
export const enemyTypes = pgTable("enemy_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  isBoss: boolean("is_boss").notNull().default(false),
  hpBase: integer("hp_base").notNull(),
  speed: real("speed").notNull(),
  damage: real("damage").notNull(),
  /** Cooldown de ataque / disparo em ms. */
  attackSpeed: integer("attack_speed").notNull(),
  color: varchar("color", { length: 32 }).notNull().default("#ff0000"),
  /** Escala visual (raio ≈ 12 × scale). */
  scale: real("scale").notNull().default(1),
  /** Segundos de partida em que o inimigo entra na pool de spawn. */
  unlockTime: integer("unlock_time").notNull().default(0),
  /** XP base concedida ao morrer. */
  xpReward: integer("xp_reward").notNull().default(5),
  /** Moedas base dropadas ao morrer (antes de multiplicadores). */
  goldReward: real("gold_reward").notNull().default(1),
  /** Chance 0–1 de dropar diamante normal. */
  normalDiamondChance: real("normal_diamond_chance").notNull().default(0.02),
  /** Chance 0–1 de dropar diamante roxo (não-boss). */
  purpleDiamondChance: real("purple_diamond_chance").notNull().default(0),
});

/** Buff aplicado por membro da equipe (JSONB em `game_team_members_config`). */
export type TeamMemberBuffConfig = {
  type:
    | "hp_regen_pct_max"
    | "damage_mul_pct"
    | "max_hp_mul_pct"
    | "damage_taken_reduce"
    | "attack_speed_mul"
    | "xp_bonus"
    | "crit_chance"
    | "crit_damage"
    | "knockback_mul_pct"
    | "skill_damage_mul"
    | "gold_income_mul"
    | "diamond_luck"
    | "purple_diamond_luck";
  coefficient: number;
  /** Teto por membro (ex.: redução de dano recebido). */
  cap?: number;
};

/**
 * Catálogo de membros da equipe (gacha / esquina).
 * Buffs em JSONB — editável no Neon sem deploy.
 */
export const gameTeamMembersConfig = pgTable("game_team_members_config", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  tier: varchar("tier", { length: 16 }).notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  tagline: varchar("tagline", { length: 256 }).notNull(),
  buffs: jsonb("buffs").$type<TeamMemberBuffConfig[]>().notNull().default([]),
  /** Multiplicador de poder por tier (referência; pity usa tabela global). */
  tierPower: real("tier_power").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Stats de scaling por skill avançada + custos de desbloqueio. */
export const gameSkillsConfig = pgTable("game_skills_config", {
  skillKey: varchar("skill_key", { length: 32 }).primaryKey(),
  displayName: varchar("display_name", { length: 64 }).notNull(),
  unlockGoldCost: integer("unlock_gold_cost").notNull().default(0),
  unlockDiamondCost: integer("unlock_diamond_cost").notNull().default(0),
  unlockMobsRequired: integer("unlock_mobs_required").notNull().default(0),
  unlockBossesRequired: integer("unlock_bosses_required").notNull().default(0),
  masteryPurpleCost: integer("mastery_purple_cost").notNull().default(0),
  masteryShardCost: integer("mastery_shard_cost").notNull().default(0),
  /** Stats base por atributo (damage, cooldown, hits, …). */
  defaultStats: jsonb("default_stats")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  /** Incremento por nível de atributo roxo (opcional). */
  scalingPerLevel: jsonb("scaling_per_level")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Catálogo de inimigos para spawn/combate (autoritativo no Neon).
 * Espelha `enemy_types` com `behavior_kind` explícito.
 */
export const gameEnemiesConfig = pgTable("game_enemies_config", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  behaviorKind: varchar("behavior_kind", { length: 16 })
    .notNull()
    .default("normal"),
  isBoss: boolean("is_boss").notNull().default(false),
  hpBase: integer("hp_base").notNull(),
  speed: real("speed").notNull(),
  damage: real("damage").notNull(),
  attackSpeed: integer("attack_speed").notNull(),
  color: varchar("color", { length: 32 }).notNull().default("#ff0000"),
  scale: real("scale").notNull().default(1),
  unlockTime: integer("unlock_time").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(5),
  goldReward: real("gold_reward").notNull().default(1),
  normalDiamondChance: real("normal_diamond_chance").notNull().default(0.02),
  purpleDiamondChance: real("purple_diamond_chance").notNull().default(0),
});

/** Upgrades de meta-progresso (ouro, diamantes, ascensão, talents). */
export const gameUpgradesConfig = pgTable("game_upgrades_config", {
  upgradeKey: varchar("upgrade_key", { length: 64 }).primaryKey(),
  displayName: varchar("display_name", { length: 64 }).notNull(),
  currency: varchar("currency", { length: 16 }).notNull(),
  costBase: real("cost_base").notNull(),
  growthRate: real("growth_rate").notNull(),
  maxLevel: integer("max_level"),
  /** Parâmetros de efeito (%, caps, fórmulas auxiliares). */
  effectParams: jsonb("effect_params")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Delta de carta de skill especial in-run (raridade comum–lendária). */
export type MatchSkillEffectDelta = {
  damageMul?: number;
  cooldownMul?: number;
  durationMul?: number;
  radiusMul?: number;
  extraHits?: number;
  extraProjectiles?: number;
};

/** Multiplicadores e parâmetros de combate por skill × tier (inclui Supremo). */
export type SkillTierStatMultipliers = MatchSkillEffectDelta & {
  cloneCount?: number;
  cloneStatRatio?: number;
  auraSecondaryPower?: number;
  fireShareRatio?: number;
  fireShareRadius?: number;
  iceShatterRadius?: number;
  iceShatterDamageRatio?: number;
  iceShatterFreezeMs?: number;
  teslaDurationMs?: number;
  teslaRadius?: number;
  teslaDpsRatio?: number;
  fissureRadius?: number;
  fissureSlow?: number;
  fissureVuln?: number;
  vendavalImplosionRadius?: number;
  vendavalImplosionDamageRatio?: number;
  vendavalStunMs?: number;
  vendavalKnockback?: number;
  ricochetMaxTargets?: number;
};

export type SkillScalingTier =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "master";

/** Constantes globais da roleta in-run (linha única). */
export const gameMatchGlobals = pgTable("game_match_globals", {
  id: serial("id").primaryKey(),
  cooldownUpgradeFloor: integer("cooldown_upgrade_floor").notNull().default(300),
  critChanceCap: real("crit_chance_cap").notNull().default(1),
  damageTakenReductionCap: real("damage_taken_reduction_cap")
    .notNull()
    .default(0.3),
  thornsUnlockTimeSec: integer("thorns_unlock_time_sec").notNull().default(900),
  thornsMaxLevel: integer("thorns_max_level").notNull().default(3),
  thornsReflectCap: real("thorns_reflect_cap").notNull().default(0.3),
  /** Máx. de cartas Guard por run (mesmo teto dos Espinhos). */
  guardMaxLevel: integer("guard_max_level").notNull().default(3),
  /** +2% por degrau de raridade em Guard/Espinhos (lendário = 10%). */
  mitigationBonusPerTier: real("mitigation_bonus_per_tier")
    .notNull()
    .default(0.02),
  skillLevelCap: integer("skill_level_cap").notNull().default(8),
  baseActiveRunSkills: integer("base_active_run_skills").notNull().default(2),
  specialSkillCardChance: real("special_skill_card_chance")
    .notNull()
    .default(0.25),
  maxLuckBonus: real("max_luck_bonus").notNull().default(0.15),
  luckPerMinute: real("luck_per_minute").notNull().default(0.03),
  luckPerFiveLevels: real("luck_per_five_levels").notNull().default(0.025),
  matchXpGainMul: real("match_xp_gain_mul").notNull().default(0.65),
  matchBaseXpToLevel: integer("match_base_xp_to_level").notNull().default(110),
  matchXpToNextGrowth: real("match_xp_to_next_growth").notNull().default(1.32),
  matchXpOverflowLevels: integer("match_xp_overflow_levels").notNull().default(1),
  endlessXpBonusPerCycle: real("endless_xp_bonus_per_cycle")
    .notNull()
    .default(0.08),
  endlessXpMultiplierCap: real("endless_xp_multiplier_cap").notNull().default(3),
  endlessXpGraceCycles: integer("endless_xp_grace_cycles").notNull().default(4),
});

/** Pesos e bônus percentual por raridade das cartas in-run. */
export const gameMatchRarities = pgTable("game_match_rarities", {
  rarity: varchar("rarity", { length: 16 }).primaryKey(),
  weight: real("weight").notNull(),
  bonusValue: real("bonus_value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Parâmetros do bônus de uma carta de status × raridade. */
export type StatCardValues = {
  /** Magnitude do bônus. Se `isPercentage`, em pontos percentuais (15 = +15%). */
  value: number;
  isPercentage?: boolean;
  is_percentage?: boolean;
};

/** Cartas de status da roleta de level-up. */
export const gameMatchStatCards = pgTable("game_match_stat_cards", {
  category: varchar("category", { length: 32 }).primaryKey(),
  upgradeType: varchar("upgrade_type", { length: 64 }).notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  short: varchar("short", { length: 64 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Bônus e peso de cada carta de status por raridade.
 * Fonte autoritativa dos valores da roleta (Dano, APS, Crítico, …).
 */
export const gameStatCardsConfig = pgTable(
  "game_stat_cards_config",
  {
    cardId: varchar("card_id", { length: 32 }).notNull(),
    tier: varchar("tier", { length: 16 }).notNull(),
    displayName: varchar("display_name", { length: 64 }).notNull(),
    upgradeType: varchar("upgrade_type", { length: 64 }).notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    statValues: jsonb("stat_values")
      .$type<StatCardValues>()
      .notNull()
      .default({ value: 5, isPercentage: true }),
    weight: integer("weight").notNull().default(10),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.tier] })],
);

/** Skills especiais oferecidas como carta in-run. */
export const gameMatchSkillCards = pgTable("game_match_skill_cards", {
  skillKey: varchar("skill_key", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  short: varchar("short", { length: 256 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Efeitos por skill × raridade (legado; a fonte autoritativa é `game_skill_tier_scaling`). */
export const gameMatchSkillEffects = pgTable(
  "game_match_skill_effects",
  {
    skillKey: varchar("skill_key", { length: 32 }).notNull(),
    rarity: varchar("rarity", { length: 16 }).notNull(),
    delta: jsonb("delta").$type<MatchSkillEffectDelta>().notNull().default({}),
    effectLines: jsonb("effect_lines").$type<string[]>().notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.skillKey, t.rarity] })],
);

/**
 * Escalonamento de status por skill × tier (comum…lendário + Supremo).
 * `stat_multipliers` aceita chaves camelCase ou snake_case no JSONB.
 */
export const gameSkillTierScaling = pgTable(
  "game_skill_tier_scaling",
  {
    skillKey: varchar("skill_key", { length: 32 }).notNull(),
    tier: varchar("tier", { length: 16 }).notNull(),
    statMultipliers: jsonb("stat_multipliers")
      .$type<SkillTierStatMultipliers>()
      .notNull()
      .default({}),
    effectLines: jsonb("effect_lines").$type<string[]>().notNull().default([]),
    cardLabel: varchar("card_label", { length: 64 }),
    cardTitle: varchar("card_title", { length: 128 }),
    cardDescription: varchar("card_description", { length: 512 }),
  },
  (t) => [primaryKey({ columns: [t.skillKey, t.tier] })],
);
