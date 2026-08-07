import { DEFAULT_SKILL_TREE } from "@/lib/skillTree";
import type { SaveData } from "@/db/schema";

export const SAVE_SLOTS = [
  { id: "save_slot_1", label: "Slot 1" },
  { id: "save_slot_2", label: "Slot 2" },
  { id: "save_slot_3", label: "Slot 3" },
] as const;

export type SaveSlotId = (typeof SAVE_SLOTS)[number]["id"];

export function isSaveSlotId(value: string): value is SaveSlotId {
  return SAVE_SLOTS.some((s) => s.id === value);
}

/** Progresso inicial de um slot novo. */
export function createDefaultSaveData(): SaveData {
  return {
    gold: 200,
    gems: 25,
    maxHpLevel: 1,
    baseDamageLevel: 1,
    attackSpeedLevel: 0,
    rangeLevel: 0,
    arms: 2,
    armTier: 1,
    incomeMultiplier: 1,
    skillTree: { ...DEFAULT_SKILL_TREE },
  };
}
