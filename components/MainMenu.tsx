"use client";

import { useState } from "react";
import { Coins, Gem } from "lucide-react";
import { MetaTreePanel } from "@/components/MetaTreePanel";
import { SaveMenu } from "@/components/SaveMenu";
import { UpgradePanel } from "@/components/UpgradePanel";
import { useGameStore } from "@/store/useGameStore";

type MainMenuProps = {
  canPlay: boolean;
  isGameOver: boolean;
  onStart: () => void;
  onOpenTalents: () => void;
  onSaveReady: () => void;
  /** Game Over → menu + sync (mesmo fluxo de Sair da Partida). */
  onReturnToMenu?: () => void;
};

type UpgradeTab = "gold" | "diamonds";

/**
 * Menu principal: saves dinâmicos, START, upgrades e skill tree.
 */
export function MainMenu({
  canPlay,
  isGameOver,
  onStart,
  onOpenTalents,
  onSaveReady,
  onReturnToMenu,
}: MainMenuProps) {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const difficulties = useGameStore((s) => s.difficulties);
  const selectedDifficultyId = useGameStore((s) => s.selectedDifficultyId);
  const setSelectedDifficulty = useGameStore((s) => s.setSelectedDifficulty);
  const configsLoaded = useGameStore((s) => s.configsLoaded);
  const [upgradeTab, setUpgradeTab] = useState<UpgradeTab>("gold");

  const selected = difficulties.find((d) => d.id === selectedDifficultyId);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex">
      {/* Sidebar esquerda */}
      <aside className="pointer-events-auto flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-r border-white/10 bg-zinc-950/90 p-5 backdrop-blur-md sm:w-[22rem]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            {isGameOver ? "Game Over" : "Menu Principal"}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-50">
            Joguin Boxe
          </h1>
        </div>

        {/* Recursos do slot ativo */}
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <Coins className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-amber-200/70">
                Ouro
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-amber-200">
                {gold.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2">
            <Gem className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-200/70">
                Diamantes
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-cyan-200">
                {gems.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        {!isGameOver && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
            <label
              htmlFor="difficulty-select"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500"
            >
              Dificuldade
            </label>
            <select
              id="difficulty-select"
              value={selectedDifficultyId ?? ""}
              disabled={difficulties.length === 0}
              onChange={(e) => {
                const id = Number(e.target.value);
                if (!Number.isFinite(id)) return;
                setSelectedDifficulty(id);
              }}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none transition focus:border-sky-400/60"
            >
              {difficulties.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.enemyHpMultiplier.toFixed(1)}×)
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                Inimigos {selected.enemyHpMultiplier.toFixed(1)}× HP · Ouro{" "}
                {selected.goldDropMultiplier.toFixed(1)}×
                {!configsLoaded ? " · defaults locais" : null}
              </p>
            )}
          </div>
        )}

        {!isGameOver && <SaveMenu onSaveReady={onSaveReady} />}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={!canPlay && !isGameOver}
            onClick={onStart}
            className="w-full rounded-xl bg-sky-500 py-3.5 text-lg font-black uppercase tracking-wider text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {isGameOver ? "RESTART" : "START GAME"}
          </button>

          {isGameOver && (
            <button
              type="button"
              onClick={onReturnToMenu}
              className="w-full rounded-xl border border-white/15 bg-zinc-800/80 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700/80 hover:text-zinc-100"
            >
              Voltar ao Menu Principal
            </button>
          )}

          {!isGameOver && (
            <button
              type="button"
              disabled={!canPlay}
              onClick={onOpenTalents}
              className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 py-3 text-sm font-bold uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Árvore de Skills
              <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-cyan-300/70">
                Custa diamantes
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* Área central: upgrades ouro / árvore de diamantes */}
      {!isGameOver && (
        <div className="pointer-events-none relative hidden flex-1 sm:block">
          <div className="pointer-events-auto absolute inset-x-4 bottom-4 top-auto max-h-[60%] overflow-y-auto rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-1 px-1">
              <button
                type="button"
                onClick={() => setUpgradeTab("gold")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  upgradeTab === "gold"
                    ? "bg-amber-500/20 text-amber-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Ouro
              </button>
              <button
                type="button"
                onClick={() => setUpgradeTab("diamonds")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  upgradeTab === "diamonds"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Diamantes
              </button>
            </div>
            {upgradeTab === "gold" ? (
              <UpgradePanel embedded />
            ) : (
              <MetaTreePanel embedded />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
