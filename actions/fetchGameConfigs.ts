"use server";

import { db } from "@/db";
import { difficulties, gameSettings } from "@/db/schema";
import {
  FALLBACK_DIFFICULTIES,
  FALLBACK_GAME_SETTINGS,
  type DifficultyConfig,
  type GameBaseSettings,
} from "@/lib/gameConfig";

export type FetchGameConfigsResult = {
  ok: boolean;
  settings: GameBaseSettings;
  difficulties: DifficultyConfig[];
  error?: string;
};

/**
 * Carrega status iniciais do jogador e níveis de dificuldade do Neon.
 */
export async function fetchGameConfigs(): Promise<FetchGameConfigsResult> {
  try {
    const [settingsRows, difficultyRows] = await Promise.all([
      db.select().from(gameSettings).limit(1),
      db.select().from(difficulties).orderBy(difficulties.id),
    ]);

    const row = settingsRows[0];
    const settings: GameBaseSettings = row
      ? {
          baseAttackSpeed: row.baseAttackSpeed,
          baseDamage: row.baseDamage,
          baseHp: row.baseHp,
          baseRange: row.baseRange,
        }
      : { ...FALLBACK_GAME_SETTINGS };

    const list: DifficultyConfig[] =
      difficultyRows.length > 0
        ? difficultyRows.map((d) => ({
            id: d.id,
            name: d.name,
            enemyHpMultiplier: d.enemyHpMultiplier,
            enemyDamageMultiplier: d.enemyDamageMultiplier,
            enemySpeedMultiplier: d.enemySpeedMultiplier,
            goldDropMultiplier: d.goldDropMultiplier,
          }))
        : [...FALLBACK_DIFFICULTIES];

    return { ok: true, settings, difficulties: list };
  } catch (error) {
    console.error("[fetchGameConfigs]", error);
    return {
      ok: false,
      settings: { ...FALLBACK_GAME_SETTINGS },
      difficulties: [...FALLBACK_DIFFICULTIES],
      error: "Falha ao carregar configurações; usando defaults locais",
    };
  }
}
