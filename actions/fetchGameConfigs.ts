"use server";

import { db } from "@/db";
import { difficulties, enemyTypes, gameSettings } from "@/db/schema";
import {
  FALLBACK_DIFFICULTIES,
  FALLBACK_ENEMY_TYPES,
  FALLBACK_GAME_SETTINGS,
  mapEnemyTypeRow,
  type DifficultyConfig,
  type EnemyTypeConfig,
  type GameBaseSettings,
} from "@/lib/gameConfig";

export type FetchGameConfigsResult = {
  ok: boolean;
  settings: GameBaseSettings;
  difficulties: DifficultyConfig[];
  enemyTypes: EnemyTypeConfig[];
  error?: string;
};

/**
 * Carrega status iniciais, dificuldades e tipos de inimigo do Neon.
 */
export async function fetchGameConfigs(): Promise<FetchGameConfigsResult> {
  try {
    const [settingsRows, difficultyRows, enemyTypeRows] = await Promise.all([
      db.select().from(gameSettings).limit(1),
      db.select().from(difficulties).orderBy(difficulties.id),
      db.select().from(enemyTypes).orderBy(enemyTypes.id),
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

    const types: EnemyTypeConfig[] =
      enemyTypeRows.length > 0
        ? enemyTypeRows.map(mapEnemyTypeRow)
        : [...FALLBACK_ENEMY_TYPES];

    return { ok: true, settings, difficulties: list, enemyTypes: types };
  } catch (error) {
    console.error("[fetchGameConfigs]", error);
    return {
      ok: false,
      settings: { ...FALLBACK_GAME_SETTINGS },
      difficulties: [...FALLBACK_DIFFICULTIES],
      enemyTypes: [...FALLBACK_ENEMY_TYPES],
      error: "Falha ao carregar configurações; usando defaults locais",
    };
  }
}
