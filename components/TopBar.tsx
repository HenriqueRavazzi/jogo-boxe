"use client";

import { Coins, Gem, Gauge, Heart, Star } from "lucide-react";
import { useArenaStore } from "@/store/useArenaStore";
import {
  GAME_SPEED_OPTIONS,
  clampGameSpeed,
  useGameStore,
} from "@/store/useGameStore";

/** Barra superior flutuante: recursos, XP e HP da partida. */
export function TopBar() {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const purpleDiamonds = useGameStore((s) => s.purpleDiamonds);
  const gameSpeedMultiplier = useGameStore((s) => s.gameSpeedMultiplier);
  const setGameSpeedMultiplier = useGameStore((s) => s.setGameSpeedMultiplier);
  const getMaxHp = useGameStore((s) => s.getMaxHp);
  const currentHp = useArenaStore((s) => s.currentHp);
  const currentXp = useArenaStore((s) => s.currentXp);
  const xpToNextLevel = useArenaStore((s) => s.xpToNextLevel);
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const runMode = useArenaStore((s) => s.runMode);
  const runStage = useArenaStore((s) => s.runStage);
  const timeAlive = useArenaStore((s) => s.timeAlive);
  const stageBossDefeated = useArenaStore((s) => s.stageBossDefeated);
  const stageEnemiesDefeated = useArenaStore((s) => s.stageEnemiesDefeated);
  const stageCommonsSpawned = useArenaStore((s) => s.stageCommonsSpawned);
  const bossesSpawned = useArenaStore((s) => s.bossesSpawned);
  const maxHp = getMaxHp();
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const xpPercent = Math.max(
    0,
    Math.min(100, (currentXp / xpToNextLevel) * 100),
  );
  const gameSpeed = clampGameSpeed(gameSpeedMultiplier);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-4">
      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-lg bg-black/55 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur-sm">
          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
            <Coins className="h-4 w-4 text-amber-400" aria-hidden />
            {gold.toLocaleString("pt-BR")}
          </span>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
            <Gem className="h-4 w-4 text-cyan-400" aria-hidden />
            {gems.toLocaleString("pt-BR")}
          </span>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-violet-200">
            <Gem className="h-4 w-4 text-violet-400" aria-hidden />
            {purpleDiamonds.toLocaleString("pt-BR")}
          </span>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg bg-black/55 p-1 shadow-lg backdrop-blur-sm">
          <span className="inline-flex items-center gap-1 px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <Gauge className="h-3 w-3" aria-hidden />
            Vel
          </span>
          {GAME_SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setGameSpeedMultiplier(speed)}
              className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                gameSpeed === speed
                  ? "bg-emerald-500/30 text-emerald-200"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              }`}
              aria-label={`Velocidade ${speed}x`}
              aria-pressed={gameSpeed === speed}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="pointer-events-auto flex min-w-[10rem] flex-col gap-2">
        <div className="rounded-lg bg-black/55 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              Nv {matchLevel}
            </span>
            <span className="tabular-nums">
              {currentXp}/{xpToNextLevel}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-zinc-800">
            <div
              className="h-full rounded bg-amber-400 transition-[width] duration-200"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>

        {runMode === "endless" ? (
          <div className="rounded-lg bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-fuchsia-200/90 shadow-lg backdrop-blur-sm">
            Endless · {Math.floor(timeAlive)}s
          </div>
        ) : runStage ? (
          <div className="rounded-lg bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-sky-200/90 shadow-lg backdrop-blur-sm">
            Fase {runStage.stageNumber}: {runStage.name}
            <span className="ml-1.5 tabular-nums text-zinc-400">
              {stageEnemiesDefeated}/{runStage.enemyCount + 1}
              {stageBossDefeated
                ? " · chefe ✓"
                : bossesSpawned >= 1 ||
                    stageCommonsSpawned >=
                      runStage.enemyCount * runStage.bossSpawnProgress
                  ? " · chefe!"
                  : " · chefe"}
            </span>
          </div>
        ) : null}

        <div className="rounded-lg bg-black/55 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-400" aria-hidden />
              HP
            </span>
            <span className="tabular-nums">
              {Math.ceil(currentHp)}/{maxHp}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-zinc-800">
            <div
              className="h-full rounded bg-rose-500 transition-[width] duration-200"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
