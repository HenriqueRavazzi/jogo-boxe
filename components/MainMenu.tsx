"use client";

import { Coins, Gem } from "lucide-react";
import { SaveSlotMenu } from "@/components/SaveSlotMenu";
import { UpgradePanel } from "@/components/UpgradePanel";
import { useGameStore } from "@/store/useGameStore";

type MainMenuProps = {
  canPlay: boolean;
  isGameOver: boolean;
  onStart: () => void;
  onOpenTalents: () => void;
  onSlotReady: () => void;
  /** Game Over → menu + sync (mesmo fluxo de Sair da Partida). */
  onReturnToMenu?: () => void;
};

/**
 * Menu principal: slots, START, upgrades (ouro) e acesso à skill tree (diamantes).
 * Não bloqueia a interação com os painéis.
 */
export function MainMenu({
  canPlay,
  isGameOver,
  onStart,
  onOpenTalents,
  onSlotReady,
  onReturnToMenu,
}: MainMenuProps) {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);

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

        {!isGameOver && <SaveSlotMenu onSlotReady={onSlotReady} />}

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

      {/* Área central: upgrades com ouro (interativos no menu) */}
      {!isGameOver && (
        <div className="pointer-events-none relative hidden flex-1 sm:block">
          <div className="pointer-events-auto absolute inset-x-4 bottom-4 top-auto max-h-[55%] overflow-y-auto rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-sm">
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
              Upgrades (Ouro)
            </p>
            <UpgradePanel embedded />
          </div>
        </div>
      )}
    </div>
  );
}
