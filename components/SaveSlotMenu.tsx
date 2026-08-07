"use client";

import { useCallback, useState } from "react";
import type { SaveData } from "@/db/schema";
import { SAVE_SLOTS, type SaveSlotId } from "@/lib/saveSlots";
import { useGameStore } from "@/store/useGameStore";

type SaveSlotMenuProps = {
  onSlotReady: () => void;
};

function slotLabel(id: string) {
  return SAVE_SLOTS.find((s) => s.id === id)?.label ?? id;
}

/** Seleção de slots + reset no Neon DB. */
export function SaveSlotMenu({ onSlotReady }: SaveSlotMenuProps) {
  const hydrateFromSave = useGameStore((s) => s.hydrateFromSave);
  const activeSlotId = useGameStore((s) => s.activeSlotId);
  const [loadingSlot, setLoadingSlot] = useState<SaveSlotId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSlot = useCallback(
    async (slotId: SaveSlotId) => {
      setError(null);
      setLoadingSlot(slotId);
      try {
        const res = await fetch(`/api/saves/${slotId}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Falha ao carregar slot");
        }
        const data = (await res.json()) as {
          saveData: SaveData;
        };
        hydrateFromSave(slotId, data.saveData);
        onSlotReady();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoadingSlot(null);
      }
    },
    [hydrateFromSave, onSlotReady],
  );

  const resetSlot = useCallback(
    async (slotId: SaveSlotId) => {
      const ok = window.confirm(
        `Resetar ${slotLabel(slotId)}? Todo o progresso será apagado.`,
      );
      if (!ok) return;

      setError(null);
      setLoadingSlot(slotId);
      try {
        const res = await fetch(`/api/saves/${slotId}`, { method: "DELETE" });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Falha ao resetar slot");
        }
        const data = (await res.json()) as { saveData: SaveData };
        hydrateFromSave(slotId, data.saveData);
        onSlotReady();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoadingSlot(null);
      }
    },
    [hydrateFromSave, onSlotReady],
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        Saves
      </p>
      {SAVE_SLOTS.map((slot) => {
        const isActive = activeSlotId === slot.id;
        const isLoading = loadingSlot === slot.id;

        return (
          <div
            key={slot.id}
            className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${
              isActive
                ? "border-sky-400/60 bg-sky-500/10"
                : "border-white/10 bg-black/40"
            }`}
          >
            <button
              type="button"
              disabled={!!loadingSlot}
              onClick={() => void loadSlot(slot.id)}
              className="flex-1 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-zinc-50 transition hover:bg-white/5 disabled:opacity-50"
            >
              {isLoading ? "Carregando..." : slot.label}
              {isActive && !isLoading && (
                <span className="ml-2 text-[10px] font-medium text-sky-300">
                  ativo
                </span>
              )}
            </button>
            <button
              type="button"
              disabled={!!loadingSlot}
              onClick={() => void resetSlot(slot.id)}
              className="shrink-0 rounded-lg border border-rose-500/40 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        );
      })}
      {error && (
        <p className="text-center text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
