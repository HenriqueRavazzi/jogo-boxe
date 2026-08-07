"use client";

import { saveGame } from "@/actions/saveGame";
import { useGameStore } from "@/store/useGameStore";

/** Envia o snapshot atual do useGameStore para o Neon via Server Action. */
export async function syncWithDB(): Promise<boolean> {
  const { activeSlotId, getSaveSnapshot } = useGameStore.getState();
  if (!activeSlotId) return false;

  const result = await saveGame(activeSlotId, getSaveSnapshot());
  if (!result.ok) {
    console.error("[syncWithDB]", result.error);
    return false;
  }
  return true;
}
