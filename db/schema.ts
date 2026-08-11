import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { AscensionPassivesData } from "@/lib/ascensionPassives";
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

/** Teto in-run derivado do meta (maior atributo); limitado a 8 na roleta. */
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
   * Persiste na Ascensão — a carta lendária ainda exige Lv.5 in-run.
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
