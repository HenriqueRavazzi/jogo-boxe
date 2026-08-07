import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/** Progresso persistido (ouro, gemas, upgrades) — espelha o useGameStore. */
export type SaveData = {
  gold: number;
  gems: number;
  maxHpLevel: number;
  baseDamageLevel: number;
  incomeMultiplier: number;
};

export const gameSaves = pgTable("game_saves", {
  id: uuid("id").defaultRandom().primaryKey(),
  // ID fixo / gerado no localStorage para simular o usuário (por enquanto)
  userId: varchar("user_id", { length: 64 }).notNull().unique(),
  saveData: jsonb("save_data").$type<SaveData>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
