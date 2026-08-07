"use client";

import { Lock, Unlock } from "lucide-react";
import {
  SKILL_BRANCHES,
  SKILL_NODES,
  canUnlockSkill,
  type SkillNodeDef,
} from "@/lib/skillTree";
import { useGameStore } from "@/store/useGameStore";

type SkillTreeProps = {
  onClose: () => void;
};

const ACCENT_UNLOCKED: Record<string, string> = {
  rose: "border-rose-400 bg-rose-950 text-rose-100 shadow-rose-500/30",
  amber: "border-amber-400 bg-amber-950 text-amber-100 shadow-amber-500/30",
  sky: "border-sky-400 bg-sky-950 text-sky-100 shadow-sky-500/30",
};

const ACCENT_AVAILABLE: Record<string, string> = {
  rose: "border-rose-500/60 bg-zinc-900 text-rose-200 hover:border-rose-400",
  amber: "border-amber-500/60 bg-zinc-900 text-amber-200 hover:border-amber-400",
  sky: "border-sky-500/60 bg-zinc-900 text-sky-200 hover:border-sky-400",
};

const LINE_UNLOCKED: Record<string, string> = {
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
};

/** Overlay da árvore de talents (menu). */
export function SkillTree({ onClose }: SkillTreeProps) {
  const gold = useGameStore((s) => s.gold);
  const skillTree = useGameStore((s) => s.skillTree);
  const unlockSkill = useGameStore((s) => s.unlockSkill);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Talents
            </p>
            <h2 className="text-2xl font-black text-zinc-50">Árvore de Habilidades</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-amber-300">
              {gold.toLocaleString("pt-BR")} Ouro
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
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {SKILL_BRANCHES.map((branch) => {
              const nodes = SKILL_NODES.filter((n) => n.branch === branch.id).sort(
                (a, b) => a.tier - b.tier,
              );

              return (
                <div key={branch.id} className="flex flex-col items-center">
                  <h3
                    className={`mb-4 text-sm font-bold uppercase tracking-[0.18em] ${branch.color}`}
                  >
                    {branch.title}
                  </h3>

                  <div className="flex w-full flex-col items-center">
                    {nodes.map((node, index) => (
                      <div key={node.id} className="flex w-full flex-col items-center">
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
                          available={canUnlockSkill(skillTree, node.id, gold)}
                          locked={
                            !skillTree[node.id] &&
                            !!node.requires &&
                            !skillTree[node.requires]
                          }
                          onUnlock={() => unlockSkill(node.id, node.cost)}
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
      <p className="mt-2 text-xs font-semibold tabular-nums opacity-90">
        {unlocked ? "Desbloqueado" : `${node.cost.toLocaleString("pt-BR")} Ouro`}
      </p>
    </button>
  );
}
