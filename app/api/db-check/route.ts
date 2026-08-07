import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameSaves, type SaveData } from "@/db/schema";
import { createDefaultSaveData } from "@/lib/saveSlots";

const HEALTH_USER_ID = "__db_check_probe__";

/**
 * Health check temporário: valida conexão Neon + schema `game_saves`.
 * Acesse `/api/db-check` no navegador para confirmar.
 */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: "DATABASE_URL não definida" },
        { status: 500 },
      );
    }

    // Lista tabelas no schema public
    const tables = await db.execute<{
      table_name: string;
    }>(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    // Colunas de game_saves
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

    // Upsert de registro de teste
    const existing = await db.query.gameSaves.findFirst({
      where: eq(gameSaves.userId, HEALTH_USER_ID),
    });

    let probe;
    if (existing) {
      const [updated] = await db
        .update(gameSaves)
        .set({ saveData: probeSaveData, updatedAt: new Date() })
        .where(eq(gameSaves.userId, HEALTH_USER_ID))
        .returning();
      probe = updated;
    } else {
      const [inserted] = await db
        .insert(gameSaves)
        .values({ userId: HEALTH_USER_ID, saveData: probeSaveData })
        .returning();
      probe = inserted;
    }

    // Leitura de volta
    const readBack = await db.query.gameSaves.findFirst({
      where: eq(gameSaves.userId, HEALTH_USER_ID),
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
      "skillTree",
    ];

    const saveData = readBack?.saveData;
    const missingKeys = expectedKeys.filter(
      (k) => saveData == null || !(k in saveData),
    );

    return NextResponse.json({
      ok: missingKeys.length === 0,
      message:
        missingKeys.length === 0
          ? "Conexão Neon OK — schema game_saves alinhado com SaveData"
          : "Conexão OK, mas faltam chaves no JSONB",
      tables: tables.rows?.map((r) => r.table_name) ?? tables,
      game_saves_columns: columns.rows ?? columns,
      probe: {
        id: readBack?.id,
        userId: readBack?.userId,
        updatedAt: readBack?.updatedAt,
        saveData: readBack?.saveData,
      },
      expectedSaveDataKeys: expectedKeys,
      missingKeys,
      note: "Rota temporária — pode remover após validar.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
