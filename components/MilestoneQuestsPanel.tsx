"use client";

import { useState } from "react";
import { Coins, Gem, ScrollText, Sparkles, Trophy } from "lucide-react";
import {
  MILESTONE_QUESTS,
  canClaimMilestone,
  getMilestonePhaseRewards,
  getMilestonePhaseTarget,
  type MilestoneQuestId,
} from "@/lib/milestoneQuests";
import { syncWithDB } from "@/lib/syncWithDB";
import { useGameStore } from "@/store/useGameStore";

function formatTarget(id: MilestoneQuestId, current: number, target: number) {
  if (id === "implacable_survivor") {
    const curMin = Math.floor(current / 60);
    const curSec = current % 60;
    const tgtMin = Math.floor(target / 60);
    return `${curMin}:${String(curSec).padStart(2, "0")} / ${tgtMin}:00`;
  }
  return `${current.toLocaleString("pt-BR")} / ${target.toLocaleString("pt-BR")}`;
}

function phaseDescription(
  id: MilestoneQuestId,
  baseDescription: string,
  target: number,
): string {
  const n = target.toLocaleString("pt-BR");
  switch (id) {
    case "implacable_survivor": {
      const min = Math.max(1, Math.floor(target / 60));
      return `Sobreviva ${min} min em Difícil ou Infernal.`;
    }
    case "ascended":
      return `Alcance o Nível ${target} de Prestígio.`;
    case "boss_hunter":
      return `Derrote ${n} bosses em uma única run.`;
    case "grunt_slayer":
      return `Derrote ${n} inimigos básicos.`;
    case "dasher_hunter":
      return `Derrote ${n} inimigos Dasher.`;
    case "ranged_exterminator":
      return `Derrote ${n} inimigos Ranged.`;
    case "flame_master":
      return `Derrote ${n} inimigos sob efeito de Fogo.`;
    case "frost_executor":
      return `Derrote ${n} inimigos congelados.`;
    case "storm_executioner":
      return `Derrote ${n} inimigos sob efeito de Raio.`;
    case "ricochet_rampage":
      return `Elimine ${n} inimigos na janela de Ricochete.`;
    case "quake_bringer":
      return `Dispare o terremoto da Pedra ${n} vezes.`;
    case "vacuum_master":
      return `Dispare o Vendaval ${n} vezes.`;
    case "shadow_summoner":
      return `Invoque ${n} Shadow Clones.`;
    case "ice_wave_adept":
      return `Dispare ${n} ondas de Gelo.`;
    case "gold_rush":
      return `Colete ${n} de ouro no total.`;
    case "diamond_digger":
      return `Colete ${n} diamantes normais no total.`;
    case "purple_hoarder":
      return `Colete ${n} diamantes roxos no total.`;
    case "gold_spender":
      return `Compre ${n} níveis de upgrades com ouro.`;
    case "purple_scholar":
      return `Melhore ${n} atributos de skills com diamantes roxos.`;
    case "gem_craftsman":
      return `Compre ${n} níveis da árvore de diamantes.`;
    default:
      return baseDescription;
  }
}

/** Painel de Missões / Conquistas no menu principal. */
export function MilestoneQuestsPanel({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const milestoneQuests = useGameStore((s) => s.milestoneQuests);
  const claimMilestoneQuest = useGameStore((s) => s.claimMilestoneQuest);
  const [claimingId, setClaimingId] = useState<MilestoneQuestId | null>(null);

  const claimableCount = MILESTONE_QUESTS.filter((q) =>
    canClaimMilestone(milestoneQuests, q.id),
  ).length;

  const handleClaim = async (id: MilestoneQuestId) => {
    if (claimingId) return;
    setClaimingId(id);
    try {
      const rewards = claimMilestoneQuest(id);
      if (!rewards) return;
      await syncWithDB();
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className={embedded ? "" : "rounded-2xl border border-white/10 p-3"}>
      {!embedded && (
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-amber-300" aria-hidden />
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
            Missões / Conquistas
          </h2>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] leading-snug text-zinc-400">
          Missões eternas: a cada fase a meta e a recompensa sobem.
        </p>
        {claimableCount > 0 && (
          <span className="shrink-0 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            {claimableCount} pronta{claimableCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {MILESTONE_QUESTS.map((quest) => {
          const row = milestoneQuests[quest.id] ?? {
            phase: 0,
            current: 0,
          };
          const phase = row.phase ?? 0;
          const target = getMilestonePhaseTarget(quest, phase);
          const rewards = getMilestonePhaseRewards(quest, phase);
          const pct = Math.max(
            0,
            Math.min(100, (row.current / target) * 100),
          );
          const complete = row.current >= target;
          const claimable = canClaimMilestone(milestoneQuests, quest.id);
          const busy = claimingId === quest.id;

          return (
            <li
              key={quest.id}
              className={`rounded-xl border p-3 transition ${
                claimable
                  ? "border-emerald-400/50 bg-emerald-950/40 shadow-[0_0_20px_-6px_rgba(52,211,153,0.55)]"
                  : "border-white/10 bg-zinc-950/60"
              }`}
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-50">
                    <Trophy
                      className={`h-3.5 w-3.5 shrink-0 ${
                        claimable ? "text-emerald-300" : "text-amber-300"
                      }`}
                      aria-hidden
                    />
                    {quest.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                    {phaseDescription(quest.id, quest.description, target)}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Fase {phase + 1}
                </span>
              </div>

              <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    claimable
                      ? "bg-emerald-400"
                      : complete
                        ? "bg-amber-400"
                        : "bg-sky-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] tabular-nums text-zinc-400">
                  {formatTarget(quest.id, row.current, target)}
                  {quest.progressMode === "add" && row.current > target && (
                    <span className="ml-1.5 text-emerald-400/90">
                      (+
                      {(row.current - target).toLocaleString("pt-BR")} p/
                      próxima)
                    </span>
                  )}
                </span>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tabular-nums">
                  <span className="inline-flex items-center gap-0.5 text-amber-300">
                    <Coins className="h-3 w-3" aria-hidden />
                    {rewards.gold.toLocaleString("pt-BR")}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-cyan-300">
                    <Gem className="h-3 w-3" aria-hidden />
                    {rewards.gems}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-violet-300">
                    <Gem className="h-3 w-3" aria-hidden />
                    {rewards.purpleDiamonds}
                  </span>
                  {rewards.ascensionShards > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-fuchsia-300">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {rewards.ascensionShards}
                    </span>
                  )}
                </div>
              </div>

              {claimable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleClaim(quest.id)}
                  className="mt-2.5 w-full animate-pulse rounded-lg bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-500 py-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-950 shadow-[0_0_24px_-4px_rgba(52,211,153,0.8)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                >
                  {busy ? "Resgatando…" : "Resgatar Recompensa"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
