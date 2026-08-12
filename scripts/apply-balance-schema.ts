/**
 * Aplica só tabelas/colunas de balanceamento (não toca em game_saves).
 * Uso: npx tsx scripts/apply-balance-schema.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../db";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS stages (
    stage_number integer PRIMARY KEY,
    name varchar(64) NOT NULL,
    duration_seconds integer NOT NULL,
    enemy_count integer NOT NULL DEFAULT 20,
    enemy_tier_cap integer NOT NULL,
    boss_spawn_progress real NOT NULL DEFAULT 0.65,
    difficulty_mul real NOT NULL DEFAULT 1,
    boss_stat_mul real NOT NULL DEFAULT 1
  )`,
  `ALTER TABLE stages ADD COLUMN IF NOT EXISTS boss_stat_mul real NOT NULL DEFAULT 1`,

  `CREATE TABLE IF NOT EXISTS game_team_members_config (
    id varchar(64) PRIMARY KEY,
    name varchar(64) NOT NULL,
    tier varchar(16) NOT NULL,
    role varchar(16) NOT NULL,
    tagline varchar(256) NOT NULL,
    buffs jsonb NOT NULL DEFAULT '[]'::jsonb,
    tier_power real NOT NULL DEFAULT 1,
    sort_order integer NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS game_skills_config (
    skill_key varchar(32) PRIMARY KEY,
    display_name varchar(64) NOT NULL,
    unlock_gold_cost integer NOT NULL DEFAULT 0,
    unlock_diamond_cost integer NOT NULL DEFAULT 0,
    unlock_mobs_required integer NOT NULL DEFAULT 0,
    unlock_bosses_required integer NOT NULL DEFAULT 0,
    mastery_purple_cost integer NOT NULL DEFAULT 0,
    mastery_shard_cost integer NOT NULL DEFAULT 0,
    default_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
    scaling_per_level jsonb NOT NULL DEFAULT '{}'::jsonb,
    sort_order integer NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS game_enemies_config (
    id serial PRIMARY KEY,
    name varchar(64) NOT NULL UNIQUE,
    behavior_kind varchar(16) NOT NULL DEFAULT 'normal',
    is_boss boolean NOT NULL DEFAULT false,
    hp_base integer NOT NULL,
    speed real NOT NULL,
    damage real NOT NULL,
    attack_speed integer NOT NULL,
    color varchar(32) NOT NULL DEFAULT '#ff0000',
    scale real NOT NULL DEFAULT 1,
    unlock_time integer NOT NULL DEFAULT 0,
    xp_reward integer NOT NULL DEFAULT 5,
    gold_reward real NOT NULL DEFAULT 1,
    normal_diamond_chance real NOT NULL DEFAULT 0.02,
    purple_diamond_chance real NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS game_upgrades_config (
    upgrade_key varchar(64) PRIMARY KEY,
    display_name varchar(64) NOT NULL,
    currency varchar(16) NOT NULL,
    cost_base real NOT NULL,
    growth_rate real NOT NULL,
    max_level integer,
    effect_params jsonb NOT NULL DEFAULT '{}'::jsonb,
    sort_order integer NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS game_match_globals (
    id serial PRIMARY KEY,
    cooldown_upgrade_floor integer NOT NULL DEFAULT 300,
    crit_chance_cap real NOT NULL DEFAULT 1,
    damage_taken_reduction_cap real NOT NULL DEFAULT 0.3,
    thorns_unlock_time_sec integer NOT NULL DEFAULT 900,
    thorns_max_level integer NOT NULL DEFAULT 3,
    thorns_reflect_cap real NOT NULL DEFAULT 0.3,
    guard_max_level integer NOT NULL DEFAULT 3,
    mitigation_bonus_per_tier real NOT NULL DEFAULT 0.02,
    skill_level_cap integer NOT NULL DEFAULT 8,
    base_active_run_skills integer NOT NULL DEFAULT 2,
    special_skill_card_chance real NOT NULL DEFAULT 0.15,
    max_luck_bonus real NOT NULL DEFAULT 0.15,
    luck_per_minute real NOT NULL DEFAULT 0.03,
    luck_per_five_levels real NOT NULL DEFAULT 0.025
  )`,

  `ALTER TABLE game_match_globals ADD COLUMN IF NOT EXISTS guard_max_level integer NOT NULL DEFAULT 3`,
  `ALTER TABLE game_match_globals ADD COLUMN IF NOT EXISTS mitigation_bonus_per_tier real NOT NULL DEFAULT 0.02`,

  `CREATE TABLE IF NOT EXISTS game_match_rarities (
    rarity varchar(16) PRIMARY KEY,
    weight real NOT NULL,
    bonus_value real NOT NULL,
    sort_order integer NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS game_match_stat_cards (
    category varchar(32) PRIMARY KEY,
    upgrade_type varchar(64) NOT NULL,
    name varchar(64) NOT NULL,
    short varchar(64) NOT NULL,
    sort_order integer NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS game_stat_cards_config (
    card_id varchar(32) NOT NULL,
    tier varchar(16) NOT NULL,
    display_name varchar(64) NOT NULL,
    upgrade_type varchar(64) NOT NULL,
    category varchar(32) NOT NULL,
    stat_values jsonb NOT NULL DEFAULT '{"value":5,"isPercentage":true}'::jsonb,
    weight integer NOT NULL DEFAULT 10,
    sort_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (card_id, tier)
  )`,

  `CREATE TABLE IF NOT EXISTS game_match_skill_cards (
    skill_key varchar(32) PRIMARY KEY,
    name varchar(64) NOT NULL,
    short varchar(256) NOT NULL,
    sort_order integer NOT NULL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS game_match_skill_effects (
    skill_key varchar(32) NOT NULL,
    rarity varchar(16) NOT NULL,
    delta jsonb NOT NULL DEFAULT '{}'::jsonb,
    effect_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
    PRIMARY KEY (skill_key, rarity)
  )`,

  `CREATE TABLE IF NOT EXISTS game_skill_tier_scaling (
    skill_key varchar(32) NOT NULL,
    tier varchar(16) NOT NULL,
    stat_multipliers jsonb NOT NULL DEFAULT '{}'::jsonb,
    effect_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
    card_label varchar(64),
    card_title varchar(128),
    card_description varchar(512),
    PRIMARY KEY (skill_key, tier)
  )`,
];

async function main() {
  const existing = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log(
    "[schema] tabelas atuais:",
    (existing.rows as { table_name: string }[]).map((r) => r.table_name).join(", "),
  );

  for (const statement of STATEMENTS) {
    const preview = statement.replace(/\s+/g, " ").slice(0, 80);
    await db.execute(sql.raw(statement));
    console.log("[schema] ok:", preview);
  }

  console.log("[schema] balanceamento aplicado (saves intactos)");
}

main().catch((err) => {
  console.error("[schema] falhou:", err);
  process.exit(1);
});
