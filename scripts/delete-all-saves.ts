/**
 * Remove todos os saves do Neon.
 * Uso: npx tsx scripts/delete-all-saves.ts
 */

import "dotenv/config";
import { db } from "../db";
import { gameSaves } from "../db/schema";

async function main() {
  const rows = await db
    .select({ id: gameSaves.id, saveName: gameSaves.saveName })
    .from(gameSaves);

  if (rows.length === 0) {
    console.log("Nenhum save encontrado.");
    return;
  }

  await db.delete(gameSaves);

  for (const row of rows) {
    console.log(`Excluído: ${row.saveName} (${row.id})`);
  }

  console.log(`\n${rows.length} save(s) removido(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
