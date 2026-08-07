"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gameSaves, type SaveData } from "@/db/schema";
import { isSaveSlotId } from "@/lib/saveSlots";

/**
 * Upsert do progresso persistente no Neon (por slot / userId).
 */
export async function saveGame(
  slotId: string,
  saveData: SaveData,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSaveSlotId(slotId)) {
    return { ok: false, error: "Slot inválido" };
  }

  try {
    const rows = await db
      .select({ id: gameSaves.id })
      .from(gameSaves)
      .where(eq(gameSaves.userId, slotId))
      .limit(1);

    if (rows[0]) {
      await db
        .update(gameSaves)
        .set({ saveData, updatedAt: new Date() })
        .where(eq(gameSaves.userId, slotId));
    } else {
      await db.insert(gameSaves).values({
        userId: slotId,
        saveData,
      });
    }

    return { ok: true };
  } catch (error) {
    console.error("[saveGame]", error);
    return { ok: false, error: "Falha ao salvar no banco" };
  }
}
