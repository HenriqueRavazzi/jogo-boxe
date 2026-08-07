"use client";

import { SaveSlotMenu } from "@/components/SaveSlotMenu";
import { UpgradePanel } from "@/components/UpgradePanel";

type MainMenuProps = {
  canPlay: boolean;
  isGameOver: boolean;
  onStart: () => void;
  onOpenTalents: () => void;
  onSlotReady: () => void;
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
}: MainMenuProps) {
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
