"use client";

import { useGameStore } from "@/store/useGameStore";

/**
 * Empurra o snapshot atual do Zustand para o Neon (PUT).
 * Vinculado ao save autenticado (`activeSaveId`).
 */
export async function syncWithDB(): Promise<boolean> {
  const { activeSaveId, getSaveSnapshot } = useGameStore.getState();
  if (!activeSaveId) return false;

  const saveData = getSaveSnapshot();

  try {
    const res = await fetch(`/api/saves/${activeSaveId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saveData }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      console.error("[syncWithDB]", body?.error ?? res.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[syncWithDB]", error);
    return false;
  }
}
