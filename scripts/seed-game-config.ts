/**
 * Seed de game_settings + difficulties no Neon.
 * Uso: npx tsx scripts/seed-game-config.ts
 * (ou npm run db:seed)
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { difficulties, gameSettings } from "../db/schema";

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

  console.log("[seed] concluído");
}

seed().catch((err) => {
  console.error("[seed] falhou:", err);
  process.exit(1);
});
