import {
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type { SkillTreeState } from "@/lib/skillTree";

/** Progresso persistido (ouro, gemas, upgrades) — espelha o useGameStore. */
export type SaveData = {
  gold: number;
  gems: number;
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
  skillTree: SkillTreeState;
};

export const gameSaves = pgTable("game_saves", {
  id: uuid("id").defaultRandom().primaryKey(),
  // ID fixo / gerado no localStorage para simular o usuário (por enquanto)
  userId: varchar("user_id", { length: 64 }).notNull().unique(),
  saveData: jsonb("save_data").$type<SaveData>().notNull(),
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
