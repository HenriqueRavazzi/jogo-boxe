"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Gem, ScrollText } from "lucide-react";
import { QUEST_LABELS, type ActiveQuest } from "@/lib/quests";
import { syncWithDB } from "@/lib/syncWithDB";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

/** Painel flutuante de quests ativas (direita). */
export function QuestsPanel() {
  const activeQuests = useArenaStore((s) => s.activeQuests);
  const claimQuest = useArenaStore((s) => s.claimQuest);
  const addGems = useGameStore((s) => s.addGems);
  const [collapsed, setCollapsed] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (quest: ActiveQuest) => {
    if (!quest.completed || claimingId) return;
    setClaimingId(quest.id);
    try {
      const reward = claimQuest(quest.id);
      if (reward == null || reward <= 0) return;
      addGems(reward);
      await syncWithDB();
    } finally {
      setClaimingId(null);
    }
  };

  if (activeQuests.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-36 z-20 w-56 max-h-[calc(100dvh-10rem)] overflow-y-auto">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-white/10 bg-black/65 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/5"
        >
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            <ScrollText className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            Quests
          </span>
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          )}
        </button>

        {!collapsed && (
          <ul className="flex flex-col gap-2 border-t border-white/10 px-3 py-3">
            {activeQuests.map((quest) => {
              const pct = Math.max(
                0,
                Math.min(
                  100,
                  (quest.currentAmount / quest.targetAmount) * 100,
                ),
              );
              const busy = claimingId === quest.id;

              return (
                <li
                  key={quest.id}
                  className="rounded-lg border border-white/10 bg-zinc-950/70 p-2.5"
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold leading-snug text-zinc-100">
                      {QUEST_LABELS[quest.type]}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold tabular-nums text-cyan-300">
                      <Gem className="h-3 w-3" aria-hidden />
                      {quest.rewardDiamonds}
                    </span>
                  </div>

                  <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-[width] duration-200 ${
                        quest.completed ? "bg-emerald-400" : "bg-cyan-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] tabular-nums text-zinc-400">
                      {quest.currentAmount}/{quest.targetAmount}
                    </span>
                    {quest.completed ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleClaim(quest)}
                        className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-70"
                      >
                        {busy ? "..." : "Coletar (Claim)"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-500">Ativa</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
