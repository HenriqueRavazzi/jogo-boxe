/**
 * Seed de game_settings + difficulties + enemy_types no Neon.
 * Uso: npx tsx scripts/seed-game-config.ts
 * (ou npm run db:seed)
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { difficulties, enemyTypes, gameSettings } from "../db/schema";

const DEFAULT_SETTINGS = {
  baseAttackSpeed: 1500,
  baseDamage: 10,
  baseHp: 100,
  baseRange: 100,
};

const DIFFICULTY_ROWS = [
  {
    name: "Fácil",
    enemyHpMultiplier: 0.8,
    enemyDamageMultiplier: 0.8,
    enemySpeedMultiplier: 0.8,
    goldDropMultiplier: 0.8,
  },
  {
    name: "Médio",
    enemyHpMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    goldDropMultiplier: 1.0,
  },
  {
    name: "Difícil",
    enemyHpMultiplier: 1.5,
    enemyDamageMultiplier: 1.5,
    enemySpeedMultiplier: 1.5,
    goldDropMultiplier: 1.5,
  },
  {
    name: "Infernal",
    enemyHpMultiplier: 3.0,
    enemyDamageMultiplier: 3.0,
    enemySpeedMultiplier: 3.0,
    goldDropMultiplier: 3.0,
  },
] as const;

const ENEMY_TYPE_ROWS = [
  {
    name: "Normal",
    isBoss: false,
    hpBase: 30,
    speed: 2,
    damage: 1.0,
    attackSpeed: 1000,
    color: "#ff0000",
    scale: 1,
  },
  {
    name: "Dasher",
    isBoss: false,
    hpBase: 15,
    speed: 4,
    damage: 0.8,
    attackSpeed: 800,
    color: "#f97316",
    scale: 0.75,
  },
  {
    name: "Ranged",
    isBoss: false,
    hpBase: 25,
    speed: 1.5,
    damage: 1.5,
    attackSpeed: 2000,
    color: "#2dd4bf",
    scale: 0.92,
  },
  {
    name: "Boss 1 (O Titã)",
    isBoss: true,
    hpBase: 1000,
    speed: 0.8,
    damage: 3.0,
    attackSpeed: 1500,
    color: "#5b21b6",
    scale: 2.5,
  },
  {
    name: "Boss 2 (O Ceifador)",
    isBoss: true,
    hpBase: 3500,
    speed: 1.1,
    damage: 5.0,
    attackSpeed: 1000,
    color: "#a16207",
    scale: 3.0,
  },
] as const;

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida no .env");
  }

  const existingSettings = await db.select().from(gameSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(gameSettings).values(DEFAULT_SETTINGS);
    console.log("[seed] game_settings: linha inicial inserida");
  } else {
    await db
      .update(gameSettings)
      .set(DEFAULT_SETTINGS)
      .where(eq(gameSettings.id, existingSettings[0]!.id));
    console.log("[seed] game_settings: atualizado");
  }

  for (const row of DIFFICULTY_ROWS) {
    const found = await db
      .select()
      .from(difficulties)
      .where(eq(difficulties.name, row.name))
      .limit(1);

    if (found.length === 0) {
      await db.insert(difficulties).values(row);
      console.log(`[seed] difficulties: inserido "${row.name}"`);
    } else {
      await db
        .update(difficulties)
        .set({
          enemyHpMultiplier: row.enemyHpMultiplier,
          enemyDamageMultiplier: row.enemyDamageMultiplier,
          enemySpeedMultiplier: row.enemySpeedMultiplier,
          goldDropMultiplier: row.goldDropMultiplier,
        })
        .where(eq(difficulties.name, row.name));
      console.log(`[seed] difficulties: atualizado "${row.name}"`);
    }
  }

  for (const row of ENEMY_TYPE_ROWS) {
    const found = await db
      .select()
      .from(enemyTypes)
      .where(eq(enemyTypes.name, row.name))
      .limit(1);

    if (found.length === 0) {
      await db.insert(enemyTypes).values(row);
      console.log(`[seed] enemy_types: inserido "${row.name}"`);
    } else {
      await db
        .update(enemyTypes)
        .set({
          isBoss: row.isBoss,
          hpBase: row.hpBase,
          speed: row.speed,
          damage: row.damage,
          attackSpeed: row.attackSpeed,
          color: row.color,
          scale: row.scale,
        })
        .where(eq(enemyTypes.name, row.name));
      console.log(`[seed] enemy_types: atualizado "${row.name}"`);
    }
  }

  console.log("[seed] concluído");
}

seed().catch((err) => {
  console.error("[seed] falhou:", err);
  process.exit(1);
});
