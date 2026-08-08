/**
 * Seed de game_settings + difficulties + enemy_types no Neon.
 * Uso: npx tsx scripts/seed-game-config.ts
 * (ou npm run db:seed)
 */

import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { difficulties, enemyTypes, gameSettings } from "../db/schema";
import {
  ENEMY_TYPE_SEEDS,
  OBSOLETE_ENEMY_TYPE_NAMES,
} from "../db/seeds/enemyTypes";

const DEFAULT_SETTINGS = {
  baseAttackSpeed: 1500,
  baseDamage: 10,
  baseHp: 100,
  baseRange: 100,
};

const DIFFICULTY_ROWS = [
  {
    name: "Fácil",
    enemyHpMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    goldDropMultiplier: 1.0,
  },
  {
    name: "Médio",
    enemyHpMultiplier: 1.3,
    enemyDamageMultiplier: 1.2,
    enemySpeedMultiplier: 1.1,
    goldDropMultiplier: 1.15,
  },
  {
    name: "Difícil",
    enemyHpMultiplier: 1.8,
    enemyDamageMultiplier: 1.5,
    enemySpeedMultiplier: 1.25,
    goldDropMultiplier: 1.35,
  },
  {
    name: "Infernal",
    enemyHpMultiplier: 2.5,
    enemyDamageMultiplier: 2.0,
    enemySpeedMultiplier: 1.4,
    goldDropMultiplier: 1.6,
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

  const removed = await db
    .delete(enemyTypes)
    .where(inArray(enemyTypes.name, [...OBSOLETE_ENEMY_TYPE_NAMES]))
    .returning({ name: enemyTypes.name });
  for (const row of removed) {
    console.log(`[seed] enemy_types: removido legado "${row.name}"`);
  }

  for (const row of ENEMY_TYPE_SEEDS) {
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
          unlockTime: row.unlockTime,
          xpReward: row.xpReward,
          goldReward: row.goldReward,
          normalDiamondChance: row.normalDiamondChance,
          purpleDiamondChance: row.purpleDiamondChance,
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
