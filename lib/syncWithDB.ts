"use client";

import { useGameStore } from "@/store/useGameStore";

/**
 * Empurra o snapshot atual do Zustand para o Neon (PUT).
 * NÃO hidrata / NÃO relê o banco — evita sobrescrever progresso local em memória.
 * Usa Route Handler (fetch) em vez de Server Action para não disparar refresh do Next.
 */
export async function syncWithDB(): Promise<boolean> {
  const { activeSlotId, getSaveSnapshot } = useGameStore.getState();
  if (!activeSlotId) return false;

  // Congela o snapshot no momento da chamada (antes de qualquer await).
  const saveData = getSaveSnapshot();

  try {
    const res = await fetch(`/api/saves/${activeSlotId}`, {
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

    // Intencionalmente ignora o body — push only, sem hydrate.
    return true;
  } catch (error) {
    console.error("[syncWithDB]", error);
    return false;
  }
}
