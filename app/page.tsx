"use client";

import { useEffect, useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { InGameStats } from "@/components/InGameStats";
import { LevelUpModal } from "@/components/LevelUpModal";
import { MainMenu } from "@/components/MainMenu";
import { SkillTree } from "@/components/SkillTree";
import { TopBar } from "@/components/TopBar";
import { syncWithDB } from "@/lib/syncWithDB";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

/**
 * Página principal
 * - menu: sidebar + upgrades + talents
 * - playing: canvas + TopBar + InGameStats
 */
export default function Home() {
  const gameState = useArenaStore((s) => s.gameState);
  const startGame = useArenaStore((s) => s.startGame);
  const exitMatch = useArenaStore((s) => s.exitMatch);
  const activeSlotId = useGameStore((s) => s.activeSlotId);
  const [showTalents, setShowTalents] = useState(false);
  const [slotReady, setSlotReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  const canPlay = Boolean(activeSlotId) && slotReady;
  const showMenu = gameState === "menu" || gameState === "gameover";
  const inMatch = gameState === "playing" || gameState === "level_up";

  // Sync com Neon ao voltar ao menu
  useEffect(() => {
    if (gameState === "menu" && activeSlotId) {
      void syncWithDB();
    }
  }, [gameState, activeSlotId]);

  const handleExitMatch = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      exitMatch();
      await syncWithDB();
    } finally {
      setExiting(false);
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-zinc-950">
      <GameCanvas />

      {/* HUD global (sempre): recursos */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <TopBar />
      </div>

      {/* Stats + sair da partida */}
      {inMatch && (
        <InGameStats onExitMatch={() => void handleExitMatch()} />
      )}

      {/* Menu principal */}
      {showMenu && !showTalents && (
        <MainMenu
          canPlay={canPlay}
          isGameOver={gameState === "gameover"}
          onStart={() => {
            void syncWithDB().finally(() => startGame());
          }}
          onOpenTalents={() => setShowTalents(true)}
          onSlotReady={() => setSlotReady(true)}
        />
      )}

      {showTalents && gameState === "menu" && canPlay && (
        <SkillTree
          onClose={() => {
            setShowTalents(false);
            void syncWithDB();
          }}
        />
      )}

      {gameState === "level_up" && <LevelUpModal />}
    </div>
  );
}
