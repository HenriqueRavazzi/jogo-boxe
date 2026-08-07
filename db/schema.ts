import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import type { SkillTreeState } from "@/lib/skillTree";

/** Progresso persistido (ouro, gemas, upgrades) — espelha o useGameStore. */
export type SaveData = {
  gold: number;
  gems: number;
  maxHpLevel: number;
  baseDamageLevel: number;
  /** Nível 0–6: cooldown absoluto (−2% da base por nível, máx −12%). */
  attackSpeedLevel: number;
  /** Nível 0–6: range absoluto (+2% da base por nível, máx +12%). */
  rangeLevel: number;
  arms: number;
  armTier: number;
  incomeMultiplier: number;
  skillTree: SkillTreeState;
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
