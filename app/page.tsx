"use client";

import { useEffect, useState } from "react";
import { ActiveSkillsHud } from "@/components/ActiveSkillsHud";
import { BossHealthBar } from "@/components/BossHealthBar";
import { BossHordeAlert } from "@/components/BossHordeAlert";
import { GameCanvas } from "@/components/GameCanvas";
import { InGameStats } from "@/components/InGameStats";
import { LevelUpModal } from "@/components/LevelUpModal";
import { MainMenu } from "@/components/MainMenu";
import { MilestoneToastStack } from "@/components/MilestoneToast";
import { PostRunSummaryModal } from "@/components/PostRunSummaryModal";
import { QuestsPanel } from "@/components/QuestsPanel";
import { SkillTree } from "@/components/SkillTree";
import { TopBar } from "@/components/TopBar";
import { syncWithDB } from "@/lib/syncWithDB";
import { TOTAL_STAGES } from "@/lib/stages";
import { fetchGameConfigs } from "@/actions/fetchGameConfigs";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

/**
 * Página principal
 * - menu: sidebar + upgrades + talents
 * - playing: canvas + TopBar + InGameStats (+ pause ESC)
 * - gameover: modal com runStats
 */
export default function Home() {
  const gameState = useArenaStore((s) => s.gameState);
  const isPaused = useArenaStore((s) => s.isPaused);
  const startGame = useArenaStore((s) => s.startGame);
  const exitMatch = useArenaStore((s) => s.exitMatch);
  const togglePause = useArenaStore((s) => s.togglePause);
  const activeSaveId = useGameStore((s) => s.activeSaveId);
  const setGameConfigs = useGameStore((s) => s.setGameConfigs);
  const [showTalents, setShowTalents] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const canPlay = Boolean(activeSaveId) && saveReady;
  const inMatch =
    gameState === "playing" ||
    gameState === "level_up";
  const showRunSummary =
    gameState === "gameover" || gameState === "victory";

  // Persiste save ao entrar no resumo (recompensas já no store)
  useEffect(() => {
    if (!showRunSummary || !activeSaveId) return;
    void syncWithDB();
  }, [showRunSummary, activeSaveId]);

  // Carrega game_settings + difficulties do Neon
  useEffect(() => {
    let cancelled = false;
    void fetchGameConfigs().then((result) => {
      if (cancelled) return;
      setGameConfigs(
        result.settings,
        result.difficulties,
        result.enemyTypes,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [setGameConfigs]);

  // Sync com Neon ao voltar ao menu
  useEffect(() => {
    if (gameState === "menu" && activeSaveId) {
      void syncWithDB();
    }
  }, [gameState, activeSaveId]);

  // ESC pausa / despausa durante playing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (useArenaStore.getState().gameState !== "playing") return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePause]);

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
      // completeStageClear pode avançar selectedStage; Repetir Fase deve
      // reiniciar a mesma fase da run atual, não o frontier desbloqueado.
      const arena = useArenaStore.getState();
      if (arena.runMode === "stage" && arena.runStageNumber > 0) {
        useGameStore.getState().setSelectedStage(arena.runStageNumber);
      }
      await syncWithDB();
      startGame();
    } finally {
      setBusy(false);
    }
  };

  const handleNextStage = async () => {
    if (busy) return;
    const arena = useArenaStore.getState();
    if (arena.runMode !== "stage" || arena.runStageNumber >= TOTAL_STAGES) return;
    const next = arena.runStageNumber + 1;
    setBusy(true);
    try {
      useGameStore.getState().setSelectedStage(next);
      await syncWithDB();
      startGame();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-dvh w-full select-none overflow-hidden bg-zinc-950">
      <GameCanvas />

      {/* HUD de partida (só durante match / summary — menu tem barra própria) */}
      {(inMatch || showRunSummary) && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <TopBar />
        </div>
      )}

      {/* Stats + sair da partida */}
      {inMatch && (
        <>
          <BossHealthBar />
          <ActiveSkillsHud />
          <BossHordeAlert />
          <InGameStats onExitMatch={() => void handleExitMatch()} />
          <QuestsPanel />
        </>
      )}

      {/* Overlay de pause (ESC) */}
      {gameState === "playing" && isPaused && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-3xl font-black tracking-wide text-zinc-50 sm:text-4xl">
              JOGO PAUSADO
            </h2>
            <p className="text-sm text-zinc-400">
              Pressione ESC ou Continuar para retomar
            </p>
            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => togglePause()}
                className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white transition hover:bg-emerald-500"
              >
                Continuar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleExitMatch()}
                className="w-full rounded-xl border border-rose-500/60 bg-rose-950/50 px-6 py-3.5 text-base font-bold text-rose-200 transition hover:border-rose-400 hover:bg-rose-900/60 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "Saindo..." : "Sair da Partida"}
              </button>
            </div>
          </div>
        </div>
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
          onSaveReady={() => setSaveReady(true)}
        />
      )}

      {showRunSummary && (
        <PostRunSummaryModal
          outcome={gameState === "victory" ? "victory" : "defeat"}
          busy={busy}
          onRestart={() => void handleRestart()}
          onNextStage={() => void handleNextStage()}
          onReturnToMenu={() => void handleExitMatch()}
        />
      )}

      <MilestoneToastStack />

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
