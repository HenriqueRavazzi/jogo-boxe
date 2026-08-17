"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Coins,
  Crosshair,
  Dumbbell,
  Gem,
  HeartPulse,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import {
  QUEST_CLAIM_SCALE_PER_CLAIM,
  QUEST_LABELS,
} from "@/lib/quests";
import {
  getTeamMemberDef,
  getTeamMemberStars,
  TEAM_ROLE_LABEL,
  type TeamRole,
} from "@/lib/teamMembers";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

const ROLE_ICONS: Record<TeamRole, ReactNode> = {
  cutman: <HeartPulse className="h-3.5 w-3.5" aria-hidden />,
  sparring: <Dumbbell className="h-3.5 w-3.5" aria-hidden />,
  vitality: <Users className="h-3.5 w-3.5" aria-hidden />,
  coach: <Crosshair className="h-3.5 w-3.5" aria-hidden />,
  manager: <Wallet className="h-3.5 w-3.5" aria-hidden />,
};

function EsquinaPanel() {
  const teamMembersOwned = useGameStore((s) => s.teamMembersOwned);
  const equippedTeamMemberIds = useGameStore((s) => s.equippedTeamMemberIds);

  if (equippedTeamMemberIds.length === 0) return null;

  return (
    <div className="pointer-events-auto shrink-0 rounded-xl border border-orange-400/40 bg-orange-950/50 px-2.5 py-2 text-orange-100 shadow-lg backdrop-blur-md">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-200/70">
        Esquina
      </p>
      <ul className="space-y-1.5">
        {equippedTeamMemberIds.map((id) => {
          const def = getTeamMemberDef(id);
          return (
            <li key={id} className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-500/20 text-orange-200">
                {ROLE_ICONS[def.role]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold">{def.name}</p>
                <p className="truncate text-[9px] text-orange-200/75">
                  Nv.{teamMembersOwned[id] ?? 0}
                  {getTeamMemberStars(teamMembersOwned[id] ?? 0) > 0
                    ? ` · ${getTeamMemberStars(teamMembersOwned[id] ?? 0)}★`
                    : ""}{" "}
                  · {TEAM_ROLE_LABEL[def.role]}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Painel flutuante de quests + equipe (direita). */
export function QuestsPanel() {
  const activeQuests = useArenaStore((s) => s.activeQuests);
  const questsClaimedThisRun = useArenaStore((s) => s.questsClaimedThisRun);
  const claimQuest = useArenaStore((s) => s.claimQuest);
  const [collapsed, setCollapsed] = useState(false);

  const bonusPct = Math.round(
    questsClaimedThisRun * QUEST_CLAIM_SCALE_PER_CLAIM * 100,
  );

  // Segurança: se alguma quest já estiver completed (ex.: tick anterior), coleta.
  useEffect(() => {
    const pending = activeQuests.filter((q) => q.completed);
    for (const quest of pending) {
      claimQuest(quest.id);
    }
  }, [activeQuests, claimQuest]);

  if (activeQuests.length === 0) {
    return (
      <div className="pointer-events-none absolute right-4 top-36 z-20 flex w-60 flex-col gap-2">
        <EsquinaPanel />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute right-4 top-36 z-20 flex w-60 flex-col gap-2">
      <div className="pointer-events-auto max-h-[calc(100dvh-22rem)] min-h-0 overflow-y-auto overflow-hidden rounded-xl border border-white/10 bg-black/65 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/5"
        >
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            <ScrollText className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            Quests
            {questsClaimedThisRun > 0 && (
              <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold normal-case tracking-normal text-amber-300">
                +{bonusPct}%
              </span>
            )}
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

              return (
                <li
                  key={quest.id}
                  className="rounded-lg border border-white/10 bg-zinc-950/70 p-2.5"
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold leading-snug text-zinc-100">
                      {QUEST_LABELS[quest.type]}
                    </p>
                    <span className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] font-semibold tabular-nums">
                      <span className="inline-flex items-center gap-0.5 text-amber-300">
                        <Coins className="h-3 w-3" aria-hidden />
                        {quest.rewardGold}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-cyan-300">
                        <Gem className="h-3 w-3" aria-hidden />
                        {quest.rewardDiamonds}
                      </span>
                      {quest.rewardPurpleDiamonds > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-violet-300">
                          <Gem className="h-3 w-3" aria-hidden />
                          {quest.rewardPurpleDiamonds}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-[width] duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] tabular-nums text-zinc-400">
                      {quest.currentAmount}/{quest.targetAmount}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Auto-collect
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <EsquinaPanel />
    </div>
  );
}
