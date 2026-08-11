"use client";

/**
 * Toast flutuante para marcos concluídos (fila + auto-dismiss).
 */

import { useEffect, useState } from "react";
import { Award, Coins, Gem, Sparkles, X } from "lucide-react";
import type { MilestoneQuestRewards } from "@/lib/milestoneQuests";
import type { MilestoneToastItem } from "@/lib/milestoneToasts";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

export type { MilestoneToastItem };

const AUTO_DISMISS_MS = 3_500;
const MAX_VISIBLE = 3;

function formatRewards(r: MilestoneQuestRewards): string {
  const parts: string[] = [];
  if (r.gold > 0) parts.push(`+${r.gold.toLocaleString("pt-BR")} ouro`);
  if (r.gems > 0) parts.push(`+${r.gems} diam.`);
  if (r.purpleDiamonds > 0) parts.push(`+${r.purpleDiamonds} roxos`);
  if (r.ascensionShards > 0) parts.push(`+${r.ascensionShards} shards`);
  return parts.join(" · ");
}

function ToastCard({
  item,
  onDismiss,
  onClaim,
}: {
  item: MilestoneToastItem;
  onDismiss: () => void;
  onClaim: () => void;
}) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const enterId = window.requestAnimationFrame(() => setEntered(true));
    const leaveTimer = window.setTimeout(() => {
      setLeaving(true);
    }, AUTO_DISMISS_MS);
    return () => {
      window.cancelAnimationFrame(enterId);
      window.clearTimeout(leaveTimer);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDismiss, 280);
    return () => window.clearTimeout(t);
  }, [leaving, onDismiss]);

  return (
    <div
      role="status"
      className={`pointer-events-auto w-[min(100vw-2rem,22rem)] rounded-xl border border-amber-400/40 bg-zinc-950/95 p-3 shadow-2xl shadow-amber-950/40 backdrop-blur-md transition-all duration-300 ${
        entered && !leaving
          ? "translate-x-0 opacity-100"
          : "translate-x-8 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-500/15 text-amber-300">
          <Award className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/80">
            Marco concluído
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-zinc-50">
            {item.title}
            <span className="ml-1 text-xs font-semibold text-zinc-500">
              · fase {item.phase + 1}
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">{formatRewards(item.rewards)}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClaim}
              className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-400"
            >
              Resgatar
            </button>
            <button
              type="button"
              onClick={() => setLeaving(true)}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
            >
              Depois
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLeaving(true)}
          className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex gap-2 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <Coins className="h-3 w-3 text-amber-300" aria-hidden />
          {item.rewards.gold}
        </span>
        <span className="inline-flex items-center gap-1">
          <Gem className="h-3 w-3 text-cyan-300" aria-hidden />
          {item.rewards.gems}
        </span>
        <span className="inline-flex items-center gap-1">
          <Gem className="h-3 w-3 text-violet-300" aria-hidden />
          {item.rewards.purpleDiamonds}
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-fuchsia-300" aria-hidden />
          {item.rewards.ascensionShards}
        </span>
      </div>
    </div>
  );
}

/**
 * Pilha de toasts de marco — canto superior direito, fila limitada.
 */
export function MilestoneToastStack() {
  const queue = useGameStore((s) => s.milestoneToasts);
  const dismissMilestoneToast = useGameStore((s) => s.dismissMilestoneToast);
  const claimMilestoneQuest = useGameStore((s) => s.claimMilestoneQuest);
  const visible = queue.slice(0, MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-16 z-[90] flex flex-col gap-2 sm:right-5 sm:top-20">
      {visible.map((item) => (
        <ToastCard
          key={item.uid}
          item={item}
          onDismiss={() => dismissMilestoneToast(item.uid)}
          onClaim={() => {
            const rewards = claimMilestoneQuest(item.questId);
            if (rewards?.ascensionShards) {
              const arena = useArenaStore.getState();
              if (
                arena.gameState === "playing" ||
                arena.gameState === "level_up" ||
                arena.gameState === "gameover" ||
                arena.gameState === "victory"
              ) {
                arena.recordAscensionShardsGained(rewards.ascensionShards);
              }
            }
            dismissMilestoneToast(item.uid);
          }}
        />
      ))}
    </div>
  );
}
