"use client";

import { useEffect, useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { GameOverModal } from "@/components/GameOverModal";
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
 * - gameover: modal com runStats
 */
export default function Home() {
  const gameState = useArenaStore((s) => s.gameState);
  const startGame = useArenaStore((s) => s.startGame);
  const exitMatch = useArenaStore((s) => s.exitMatch);
  const activeSlotId = useGameStore((s) => s.activeSlotId);
  const [showTalents, setShowTalents] = useState(false);
  const [slotReady, setSlotReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const canPlay = Boolean(activeSlotId) && slotReady;
  const inMatch = gameState === "playing" || gameState === "level_up";

  // Sync com Neon ao voltar ao menu
  useEffect(() => {
    if (gameState === "menu" && activeSlotId) {
      void syncWithDB();
    }
  }, [gameState, activeSlotId]);

  const handleExitMatch = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await syncWithDB();
      exitMatch();
    } finally {
      setBusy(false);
    }
  };

  const handleRestart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await syncWithDB();
      startGame();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-dvh w-full select-none overflow-hidden bg-zinc-950">
      <GameCanvas />

      {/* HUD global (sempre): recursos */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <TopBar />
      </div>

      {/* Stats + sair da partida */}
      {inMatch && (
        <InGameStats onExitMatch={() => void handleExitMatch()} />
      )}

      {/* Menu principal (não no game over) — permanece montado sob a skill tree */}
      {gameState === "menu" && (
        <MainMenu
          canPlay={canPlay}
          isGameOver={false}
          onStart={() => {
            void syncWithDB().finally(() => startGame());
          }}
          onOpenTalents={() => {
            void syncWithDB().finally(() => setShowTalents(true));
          }}
          onSlotReady={() => setSlotReady(true)}
        />
      )}

      {gameState === "gameover" && (
        <GameOverModal
          busy={busy}
          onRestart={() => void handleRestart()}
          onReturnToMenu={() => void handleExitMatch()}
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
