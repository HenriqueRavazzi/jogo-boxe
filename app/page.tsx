"use client";

import { GameCanvas } from "@/components/GameCanvas";
import { TopBar } from "@/components/TopBar";
import { UpgradePanel } from "@/components/UpgradePanel";
import { useArenaStore } from "@/store/useArenaStore";

/**
 * Página principal: duas camadas (z-index)
 * - Background: canvas da arena
 * - Foreground: UI flutuante (TopBar + UpgradePanel + Menu)
 */
export default function Home() {
  const gameState = useArenaStore((s) => s.gameState);
  const startGame = useArenaStore((s) => s.startGame);
  const showMenu = gameState === "menu" || gameState === "gameover";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-zinc-950">
      {/* Camada do jogo */}
      <GameCanvas />

      {/* Camada da interface */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <TopBar />
        <UpgradePanel />
      </div>

      {/* Overlay de menu / game over */}
      {showMenu && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 px-6 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
              {gameState === "gameover" ? "Game Over" : "Arena Idle"}
            </p>
            <h1 className="text-4xl font-black tracking-tight text-zinc-50 sm:text-5xl">
              Joguin Boxe
            </h1>
            <button
              type="button"
              onClick={startGame}
              className="rounded-2xl bg-sky-500 px-12 py-4 text-2xl font-black uppercase tracking-wider text-white shadow-[0_0_40px_rgba(14,165,233,0.45)] transition hover:scale-105 hover:bg-sky-400 active:scale-95"
            >
              {gameState === "gameover" ? "RESTART" : "START"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
