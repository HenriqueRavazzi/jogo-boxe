"use client";

import {
  Coins,
  Gem,
  Sparkles,
  Swords,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  ASCENSION_PASSIVES,
  getAscensionPassiveMaxLevel,
  type AscensionPassiveId,
} from "@/lib/ascensionPassives";
import { syncWithDB } from "@/lib/syncWithDB";
import { useGameStore } from "@/store/useGameStore";

const PASSIVE_ICONS: Record<AscensionPassiveId, ReactNode> = {
  extraArms: <Swords className="h-4 w-4" aria-hidden />,
  startingStats: <TrendingUp className="h-4 w-4" aria-hidden />,
  startingGold: <Coins className="h-4 w-4" aria-hidden />,
  diamondLuck: <Gem className="h-4 w-4" aria-hidden />,
};

/** Loja de passivas permanentes (Ascension Shards). */
export function AscensionPanel({ embedded = false }: { embedded?: boolean }) {
  const ascensionShards = useGameStore((s) => s.ascensionShards);
  const ascensionPassives = useGameStore((s) => s.ascensionPassives);
  const prestigeLevel = useGameStore((s) => s.prestigeLevel);
  const upgradeAscensionPassive = useGameStore((s) => s.upgradeAscensionPassive);
  const getAscensionPassiveCost = useGameStore((s) => s.getAscensionPassiveCost);
  const previewAscensionShards = useGameStore((s) => s.previewAscensionShards);

  const buy = async (id: AscensionPassiveId) => {
    if (!upgradeAscensionPassive(id)) return;
    await syncWithDB();
  };

  return (
    <div className={embedded ? "" : "rounded-2xl border border-white/10 p-3"}>
      {!embedded && (
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Ascensão
        </p>
      )}
      <p className="mb-3 px-1 text-[11px] leading-snug text-zinc-500">
        Passivas permanentes compradas com Ascension Shards. Não resetam ao
        ascender. Shards vêm do prestígio (com base no progresso resetado).
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-3 px-1 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-fuchsia-200">
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" aria-hidden />
          {ascensionShards.toLocaleString("pt-BR")} shards
        </span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">
          Prestígio nv. {prestigeLevel}
        </span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-500">
          Próx. ascensão ≈ +{previewAscensionShards().toLocaleString("pt-BR")}{" "}
          shards
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {ASCENSION_PASSIVES.map((def) => {
          const level = ascensionPassives[def.id] ?? 0;
          const maxLevel = getAscensionPassiveMaxLevel(def.id);
          const atMax = level >= maxLevel;
          const cost = getAscensionPassiveCost(def.id);
          const canBuy =
            !atMax && Number.isFinite(cost) && ascensionShards >= cost;

          return (
            <li
              key={def.id}
              className={`rounded-xl border px-3 py-2.5 ${
                atMax
                  ? "border-amber-400/30 bg-amber-500/5"
                  : "border-fuchsia-400/30 bg-fuchsia-500/[0.07]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm font-bold text-fuchsia-50">
                    <span className="text-fuchsia-300">
                      {PASSIVE_ICONS[def.id]}
                    </span>
                    {def.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                    {def.description}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-fuchsia-200/85">
                    Nv. {level}/{maxLevel} · {def.bonusLabel(level)}
                  </p>
                </div>
              </div>
              {atMax ? (
                <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1.5 text-center text-[11px] font-bold text-amber-100">
                  Nível máximo
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => void buy(def.id)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-fuchsia-400/50 bg-fuchsia-500/25 px-2.5 py-2 text-xs font-bold text-fuchsia-50 transition hover:bg-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" aria-hidden />
                  Upgrade · {cost.toLocaleString("pt-BR")} shards
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
