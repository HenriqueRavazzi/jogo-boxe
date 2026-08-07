"use client";

import { Gem, Lock, Sparkles, Unlock } from "lucide-react";
import {
  SKILL_BRANCHES,
  SKILL_NODES,
  canUnlockSkill,
  type SkillNodeDef,
} from "@/lib/skillTree";
import { syncWithDB } from "@/lib/syncWithDB";
import { getXpMultiplier, useGameStore } from "@/store/useGameStore";

type SkillTreeProps = {
  onClose: () => void;
};

const ACCENT_UNLOCKED: Record<string, string> = {
  rose: "border-rose-400 bg-rose-950 text-rose-100 shadow-rose-500/30",
  amber: "border-amber-400 bg-amber-950 text-amber-100 shadow-amber-500/30",
  sky: "border-sky-400 bg-sky-950 text-sky-100 shadow-sky-500/30",
  cyan: "border-cyan-400 bg-cyan-950 text-cyan-100 shadow-cyan-500/30",
  yellow: "border-yellow-400 bg-yellow-950 text-yellow-100 shadow-yellow-500/30",
  emerald:
    "border-emerald-400 bg-emerald-950 text-emerald-100 shadow-emerald-500/30",
  silver:
    "border-slate-300 bg-slate-800 text-slate-50 shadow-slate-400/30",
};

const ACCENT_AVAILABLE: Record<string, string> = {
  rose: "border-rose-500/60 bg-zinc-900 text-rose-200 hover:border-rose-400",
  amber: "border-amber-500/60 bg-zinc-900 text-amber-200 hover:border-amber-400",
  sky: "border-sky-500/60 bg-zinc-900 text-sky-200 hover:border-sky-400",
  cyan: "border-cyan-500/60 bg-zinc-900 text-cyan-200 hover:border-cyan-400",
  yellow:
    "border-yellow-500/60 bg-zinc-900 text-yellow-200 hover:border-yellow-400",
  emerald:
    "border-emerald-500/60 bg-zinc-900 text-emerald-200 hover:border-emerald-400",
  silver:
    "border-slate-400/60 bg-zinc-900 text-slate-200 hover:border-slate-300",
};

const LINE_UNLOCKED: Record<string, string> = {
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  cyan: "bg-cyan-400",
  yellow: "bg-yellow-400",
  emerald: "bg-emerald-400",
  silver: "bg-slate-300",
};

/** Overlay da árvore de talents (custa diamantes). */
export function SkillTree({ onClose }: SkillTreeProps) {
  const gems = useGameStore((s) => s.gems);
  const purpleDiamonds = useGameStore((s) => s.purpleDiamonds);
  const skillTree = useGameStore((s) => s.skillTree);
  const xpBonusLevel = useGameStore((s) => s.xpBonusLevel);
  const unlockSkill = useGameStore((s) => s.unlockSkill);
  const upgradeXpBonus = useGameStore((s) => s.upgradeXpBonus);
  const getXpBonusUpgradeCost = useGameStore((s) => s.getXpBonusUpgradeCost);

  const xpCost = getXpBonusUpgradeCost();
  const xpBonusPct = Math.round(xpBonusLevel * 10);
  const canBuyXp = gems >= xpCost;

  const handleUnlock = async (nodeId: SkillNodeDef["id"], cost: number) => {
    const ok = unlockSkill(nodeId, cost);
    if (ok) {
      await syncWithDB();
    }
  };

  const handleXpUpgrade = async () => {
    const ok = upgradeXpBonus();
    if (ok) {
      await syncWithDB();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[90dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Talents
            </p>
            <h2 className="text-2xl font-black text-zinc-50">
              Árvore de Habilidades
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-cyan-300">
              <Gem className="h-4 w-4" />
              {gems.toLocaleString("pt-BR")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-violet-300">
              <Gem className="h-4 w-4" />
              {purpleDiamonds.toLocaleString("pt-BR")} Roxos
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
            >
              Fechar
            </button>
          </div>
        </header>

        <div className="overflow-y-auto p-5">
          <div className="mb-8 rounded-2xl border border-violet-500/40 bg-violet-950/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-violet-100">
                    Aumento de XP
                  </p>
                  <p className="text-xs text-violet-200/80">
                    Nível {xpBonusLevel} · bônus atual{" "}
                    <span className="font-semibold text-violet-200">
                      +{xpBonusPct}% XP
                    </span>{" "}
                    (×{getXpMultiplier(xpBonusLevel).toFixed(1)})
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Cada nível: +10% de ganho de XP na partida
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={!canBuyXp}
                onClick={() => void handleXpUpgrade()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                <Gem className="h-4 w-4" />
                {xpCost.toLocaleString("pt-BR")} Diamantes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {SKILL_BRANCHES.map((branch) => {
              const nodes = SKILL_NODES.filter(
                (n) => n.branch === branch.id,
              ).sort((a, b) => a.tier - b.tier);

              return (
                <div key={branch.id} className="flex flex-col items-center">
                  <h3
                    className={`mb-4 text-sm font-bold uppercase tracking-[0.18em] ${branch.color}`}
                  >
                    {branch.title}
                  </h3>

                  <div className="flex w-full flex-col items-center">
                    {nodes.map((node, index) => (
                      <div
                        key={node.id}
                        className="flex w-full flex-col items-center"
                      >
                        {index > 0 && (
                          <div
                            className={`h-8 w-1 rounded-full ${
                              skillTree[node.requires!]
                                ? LINE_UNLOCKED[node.accent]
                                : "bg-zinc-700"
                            }`}
                          />
                        )}
                        <SkillNodeButton
                          node={node}
                          unlocked={skillTree[node.id]}
                          available={canUnlockSkill(
                            skillTree,
                            node.id,
                            gems,
                          )}
                          locked={
                            !skillTree[node.id] &&
                            !!node.requires &&
                            !skillTree[node.requires]
                          }
                          onUnlock={() => void handleUnlock(node.id, node.cost)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillNodeButton({
  node,
  unlocked,
  available,
  locked,
  onUnlock,
}: {
  node: SkillNodeDef;
  unlocked: boolean;
  available: boolean;
  locked: boolean;
  onUnlock: () => void;
}) {
  let className =
    "w-full max-w-[14rem] rounded-xl border-2 px-4 py-3 text-left transition shadow-lg ";

  if (unlocked) {
    className += ACCENT_UNLOCKED[node.accent];
  } else if (locked || !available) {
    className +=
      "border-zinc-700 bg-zinc-900/80 text-zinc-500 cursor-not-allowed opacity-70";
  } else {
    className += `${ACCENT_AVAILABLE[node.accent]} cursor-pointer`;
  }

  return (
    <button
      type="button"
      disabled={unlocked || !available}
      onClick={onUnlock}
      className={className}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{node.name}</span>
        {unlocked ? (
          <Unlock className="h-3.5 w-3.5 shrink-0 opacity-80" />
        ) : (
          <Lock className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </div>
      <p className="text-xs opacity-80">{node.description}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold tabular-nums opacity-90">
        {unlocked ? (
          "Desbloqueado"
        ) : (
          <>
            <Gem className="h-3.5 w-3.5 text-cyan-300" />
            {node.cost.toLocaleString("pt-BR")} Diamantes
          </>
        )}
      </p>
    </button>
  );
}
