"use client";

import { useEffect, useRef } from "react";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

/**
 * Canvas fullscreen — camada de fundo do jogo.
 * O tema visual da arena muda com `prestigeLevel` via BackgroundRenderer
 * (chamado no início de cada frame em `useGameLoop`).
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useGameLoop(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    const maxHp = useGameStore.getState().getEffectiveStats().maxHp;
    useArenaStore.getState().resetArena(maxHp, w / 2, h / 2);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      draggable={false}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full touch-none select-none"
      aria-label="Arena de combate"
    />
  );
}
