import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameSaves, type SaveData } from "@/db/schema";
import { createDefaultSaveData } from "@/lib/saveSlots";

const HEALTH_SAVE_NAME = "__db_check_probe__";

/**
 * Health check: valida conexão Neon + schema `game_saves`.
 */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: "DATABASE_URL não definida" },
        { status: 500 },
      );
    }

    const tables = await db.execute<{
      table_name: string;
    }>(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const columns = await db.execute<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'game_saves'
      ORDER BY ordinal_position
    `);

    const probeSaveData: SaveData = {
      ...createDefaultSaveData(),
      gold: 999,
      gems: 42,
    };

    const existing = await db.query.gameSaves.findFirst({
      where: eq(gameSaves.saveName, HEALTH_SAVE_NAME),
    });

    let probe;
    if (existing) {
      const [updated] = await db
        .update(gameSaves)
        .set({
          saveData: probeSaveData,
          purpleDiamonds: probeSaveData.purpleDiamonds,
          prestigeLevel: probeSaveData.prestigeLevel ?? 0,
          ascensionShards: probeSaveData.ascensionShards ?? 0,
          skillsData: probeSaveData.skills,
          updatedAt: new Date(),
        })
        .where(eq(gameSaves.saveName, HEALTH_SAVE_NAME))
        .returning();
      probe = updated;
    } else {
      const [inserted] = await db
        .insert(gameSaves)
        .values({
          saveName: HEALTH_SAVE_NAME,
          password: "probe",
          saveData: probeSaveData,
          purpleDiamonds: probeSaveData.purpleDiamonds,
          prestigeLevel: probeSaveData.prestigeLevel ?? 0,
          ascensionShards: probeSaveData.ascensionShards ?? 0,
          skillsData: probeSaveData.skills,
        })
        .returning();
      probe = inserted;
    }

    const readBack = await db.query.gameSaves.findFirst({
      where: eq(gameSaves.saveName, HEALTH_SAVE_NAME),
    });

    const expectedKeys: (keyof SaveData)[] = [
      "gold",
      "gems",
      "maxHpLevel",
      "baseDamageLevel",
      "baseDamage",
      "attackSpeedLevel",
      "rangeLevel",
      "arms",
      "armTier",
      "armsNextCost",
      "incomeMultiplier",
      "xpBonusLevel",
      "knockbackLevel",
      "baseKnockbackPower",
      "critChanceLevel",
      "critDamageLevel",
      "purpleDiamonds",
      "skills",
      "unlockedSkills",
      "skillTree",
      "metaDamageLevel",
      "metaKnockbackLevel",
      "metaHpLevel",
      "metaLifeStealLevel",
      "metaSkillRegenLevel",
      "metaParryChance",
      "prestigeLevel",
      "ascensionShards",
      "ascensionPassives",
      "milestoneQuests",
      "totalMobsKilled",
      "totalBossesKilled",
      "teamPity",
      "teamMembersOwned",
      "equippedTeamMemberIds",
      "maxStageCleared",
      "endlessUnlocked",
      "selectedStage",
      "selectedRunMode",
    ];

    const saveData = readBack?.saveData;
    const missingKeys = expectedKeys.filter(
      (k) => saveData == null || !(k in saveData),
    );

    const expectedColumns = [
      "id",
      "save_name",
      "password",
      "save_data",
      "purple_diamonds",
      "prestige_level",
      "ascension_shards",
      "skills_data",
      "updated_at",
    ];
    const columnNames = new Set(
      (columns.rows ?? []).map((c) => c.column_name),
    );
    const missingColumns = expectedColumns.filter((c) => !columnNames.has(c));

    return NextResponse.json({
      ok: missingKeys.length === 0 && missingColumns.length === 0,
      message:
        missingKeys.length === 0 && missingColumns.length === 0
          ? "Conexão Neon OK — schema game_saves alinhado"
          : "Conexão OK, mas faltam chaves/colunas",
      tables: tables.rows?.map((r) => r.table_name) ?? tables,
      game_saves_columns: columns.rows ?? columns,
      missingKeys,
      missingColumns,
      probe: {
        id: readBack?.id,
        saveName: readBack?.saveName,
        updatedAt: readBack?.updatedAt,
      },
    });
  } catch (error) {
    console.error("[db-check]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
