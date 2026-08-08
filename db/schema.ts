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

import type { SkillTreeState } from "@/lib/skillTree";

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

export type SkillsData = {
  ricochet: RicochetSkillStats;
  ice: IceSkillStats;
  fire: FireSkillStats;
  lightning: LightningSkillStats;
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
};

/** Níveis in-run (cartas de level-up) — independente do meta granular. */
export type MatchSkillsData = LegacyFlatSkillsData;

export const DEFAULT_MATCH_SKILLS: MatchSkillsData = {
  ricochet: 0,
  ice: 0,
  lightning: 0,
  fire: 0,
};

export const DEFAULT_SKILLS_DATA: SkillsData = {
  ricochet: { damage: 0, cooldown: 0, hits: 0 },
  ice: { duration: 0, cooldown: 0 },
  fire: { damage: 0, duration: 0 },
  lightning: { damage: 0, hits: 0, cooldown: 0 },
};

export const SKILL_STAT_KEYS = {
  ricochet: ["damage", "cooldown", "hits"],
  ice: ["duration", "cooldown"],
  fire: ["damage", "duration"],
  lightning: ["damage", "hits", "cooldown"],
} as const satisfies {
  [K in SkillUpgradeType]: readonly (keyof SkillsData[K] & string)[];
};

/** Teto in-run: maior nível entre os atributos meta da skill. */
export function getSkillMetaCap(
  skill: SkillsData[SkillUpgradeType] | number | undefined,
): number {
  if (skill == null) return 0;
  if (typeof skill === "number") return Math.max(0, Math.floor(skill));
  const values = Object.values(skill as Record<string, number>);
  if (values.length === 0) return 0;
  return Math.max(0, ...values.map((v) => Math.floor(Number(v) || 0)));
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
};

export const DEFAULT_UNLOCKED_SKILLS: UnlockedSkillsData = {
  ricochet: false,
  ice: false,
  fire: false,
  lightning: false,
};

/** Árvore de atributos permanentes (Diamantes Normais). */
export type MetaTreeData = {
  metaDamageLevel: number;
  metaKnockbackLevel: number;
  metaHpLevel: number;
  metaLifeStealLevel: number;
  metaSkillRegenLevel: number;
};

export type MetaTreeUpgradeType = keyof MetaTreeData;

export const DEFAULT_META_TREE: MetaTreeData = {
  metaDamageLevel: 0,
  metaKnockbackLevel: 0,
  metaHpLevel: 0,
  metaLifeStealLevel: 0,
  metaSkillRegenLevel: 0,
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
  /** Nível do upgrade de knockback (ouro). */
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
  /** Árvore de atributos permanentes (Diamantes Normais). */
  metaDamageLevel: number;
  metaKnockbackLevel: number;
  metaHpLevel: number;
  metaLifeStealLevel: number;
  metaSkillRegenLevel: number;
  /** Nível de Ascensão / Prestígio (bônus permanente + mundo mais difícil). */
  prestigeLevel: number;
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
  /** Stats granulares de skills avançadas (também espelhado em save_data.skills). */
  skillsData: jsonb("skills_data")
    .$type<SkillsData>()
    .notNull()
    .default(
      sql`'{"ricochet":{"damage":0,"cooldown":0,"hits":0},"ice":{"duration":0,"cooldown":0},"fire":{"damage":0,"duration":0},"lightning":{"damage":0,"hits":0,"cooldown":0}}'::jsonb`,
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
