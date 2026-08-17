"use client";

import { Coins, Gem, Gauge, Sparkles, Star } from "lucide-react";
import { useArenaStore } from "@/store/useArenaStore";
import {
  getDimensionDisplayName,
  getMultiverseCycleProgress,
  isMultiverseLoopActive,
  resolveVisualDimension,
} from "@/src/game/multiverseLoop";
import {
  GAME_SPEED_OPTIONS,
  clampGameSpeed,
  useGameStore,
} from "@/store/useGameStore";
import { formatSciNumber } from "@/lib/formatNumber";

function formatRunClock(timeAlive: number): string {
  const total = Math.max(0, Math.floor(timeAlive));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}h${pad(minutes)}m${pad(seconds)}s`;
}

/** Barra superior flutuante: recursos e XP da partida. */
export function TopBar() {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const purpleDiamonds = useGameStore((s) => s.purpleDiamonds);
  const gameSpeedMultiplier = useGameStore((s) => s.gameSpeedMultiplier);
  const setGameSpeedMultiplier = useGameStore((s) => s.setGameSpeedMultiplier);
  const currentXp = useArenaStore((s) => s.currentXp);
  const xpToNextLevel = useArenaStore((s) => s.xpToNextLevel);
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const runMode = useArenaStore((s) => s.runMode);
  const runStage = useArenaStore((s) => s.runStage);
  const runStageNumber = useArenaStore((s) => s.runStageNumber);
  const timeAlive = useArenaStore((s) => s.timeAlive);
  const prestigeLevel = useGameStore((s) => s.prestigeLevel);
  const stageBossDefeated = useArenaStore((s) => s.stageBossDefeated);
  const stageEnemiesDefeated = useArenaStore((s) => s.stageEnemiesDefeated);
  const stageCommonsSpawned = useArenaStore((s) => s.stageCommonsSpawned);
  const bossesSpawned = useArenaStore((s) => s.bossesSpawned);
  const goldCollected = useArenaStore((s) => s.runStats.goldCollected);
  const diamondsCollected = useArenaStore((s) => s.runStats.diamondsCollected);
  const purpleCollected = useArenaStore(
    (s) => s.runStats.purpleDiamondsCollected,
  );
  const xpPercent = Math.max(
    0,
    Math.min(100, (currentXp / xpToNextLevel) * 100),
  );
  const gameSpeed = clampGameSpeed(gameSpeedMultiplier);

  const multiverseCtx = {
    runMode,
    timeAliveMs: timeAlive * 1000,
    runStageNumber,
    prestigeLevel,
  };
  const multiverseActive = isMultiverseLoopActive(multiverseCtx);
  const dimensionName = getDimensionDisplayName(
    resolveVisualDimension(multiverseCtx),
  );
  const riftProgress = multiverseActive
    ? Math.round(getMultiverseCycleProgress(multiverseCtx) * 100)
    : 0;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-4">
      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-lg bg-black/55 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur-sm">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium tabular-nums">
            <Coins className="h-4 w-4 text-amber-400" aria-hidden />
            {formatSciNumber(gold)}
          </span>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium tabular-nums">
            <Gem className="h-4 w-4 text-cyan-400" aria-hidden />
            {formatSciNumber(gems)}
          </span>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium tabular-nums text-violet-200">
            <Gem className="h-4 w-4 text-violet-400" aria-hidden />
            {formatSciNumber(purpleDiamonds)}
          </span>
        </div>

        <div
          className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-black/55 px-4 py-1.5 text-xs text-zinc-200 shadow-lg backdrop-blur-sm"
          title="Recursos adquiridos nesta partida"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-400/90">
            Partida
          </span>
          <span className="h-3.5 w-px bg-white/15" aria-hidden />
          <span className="inline-flex items-center gap-1 font-medium tabular-nums text-amber-200">
            <Coins className="h-3.5 w-3.5 text-amber-400" aria-hidden />
            +{formatSciNumber(goldCollected)}
          </span>
          <span className="h-3.5 w-px bg-white/15" aria-hidden />
          <span className="inline-flex items-center gap-1 font-medium tabular-nums text-cyan-200">
            <Gem className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
            +{formatSciNumber(diamondsCollected)}
          </span>
          <span className="h-3.5 w-px bg-white/15" aria-hidden />
          <span className="inline-flex items-center gap-1 font-medium tabular-nums text-violet-200">
            <Gem className="h-3.5 w-3.5 text-violet-400" aria-hidden />
            +{formatSciNumber(purpleCollected)}
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
            <span className="whitespace-nowrap tabular-nums">
              {formatSciNumber(currentXp)}/{formatSciNumber(xpToNextLevel)}
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
            Endless · {formatRunClock(timeAlive)}
            {multiverseActive && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-violet-200/90">
                <Sparkles className="h-3 w-3" aria-hidden />
                {dimensionName} · {riftProgress}%
              </span>
            )}
          </div>
        ) : runStage ? (
          <div className="rounded-lg bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-sky-200/90 shadow-lg backdrop-blur-sm">
            Fase {runStage.stageNumber}: {runStage.name}
            {multiverseActive && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-violet-200/90">
                <Sparkles className="h-3 w-3" aria-hidden />
                {dimensionName}
              </span>
            )}
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
      </div>
    </header>
  );
}
