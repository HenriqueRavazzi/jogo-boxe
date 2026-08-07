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

/** Níveis de skills avançadas (Purple Diamonds). */
export type SkillsData = {
  ricochet: number;
  ice: number;
  lightning: number;
  fire: number;
};

export type SkillUpgradeType = keyof SkillsData;

export const DEFAULT_SKILLS_DATA: SkillsData = {
  ricochet: 0,
  ice: 0,
  lightning: 0,
  fire: 0,
};

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
  /** Níveis meta (Purple Diamonds) — teto de stacks in-run. */
  skillLevels: SkillsData;
  /** Skills liberadas na base (Diamantes Normais) para a roleta in-game. */
  unlockedSkills: UnlockedSkillsData;
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
  /** Níveis de skills avançadas (também espelhado em save_data.skillLevels). */
  skillsData: jsonb("skills_data")
    .$type<SkillsData>()
    .notNull()
    .default(
      sql`'{"ricochet":0,"ice":0,"lightning":0,"fire":0}'::jsonb`,
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
});
