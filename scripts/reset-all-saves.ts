/**
 * Zera o progresso de todos os saves no Neon (mantém nome + senha).
 * Uso: npx tsx scripts/reset-all-saves.ts
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { DEFAULT_SKILLS_DATA, gameSaves } from "../db/schema";
import { createDefaultSaveData } from "../lib/saveSlots";

async function main() {
  const fresh = createDefaultSaveData();
  const rows = await db
    .select({ id: gameSaves.id, saveName: gameSaves.saveName })
    .from(gameSaves);

  if (rows.length === 0) {
    console.log("Nenhum save encontrado.");
    return;
  }

  for (const row of rows) {
    await db
      .update(gameSaves)
      .set({
        saveData: fresh,
        purpleDiamonds: fresh.purpleDiamonds,
        prestigeLevel: fresh.prestigeLevel ?? 0,
        ascensionShards: fresh.ascensionShards ?? 0,
        skillsData: fresh.skills ?? DEFAULT_SKILLS_DATA,
        updatedAt: new Date(),
      })
      .where(eq(gameSaves.id, row.id));
    console.log(`Reset: ${row.saveName} (${row.id})`);
  }

  console.log(`\n${rows.length} save(s) zerado(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
