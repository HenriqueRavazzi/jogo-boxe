"use client";

import {
  Clock,
  Coins,
  Gem,
  Skull,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { TOTAL_STAGES, getStageDef } from "@/lib/stages";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

type GameOverModalProps = {
  outcome?: "defeat" | "victory";
  onRestart: () => void;
  onReturnToMenu: () => void;
  /** Avança para a próxima fase (só na vitória de campanha). */
  onNextStage?: () => void;
  busy?: boolean;
};

function formatSurviveTime(timeAlive: number): string {
  const total = Math.max(0, Math.floor(timeAlive));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Modal de resumo da run (derrota ou vitória). */
export function GameOverModal({
  outcome = "defeat",
  onRestart,
  onReturnToMenu,
  onNextStage,
  busy = false,
}: GameOverModalProps) {
  const timeAlive = useArenaStore((s) => s.timeAlive);
  const runStats = useArenaStore((s) => s.runStats);
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const currentXp = useArenaStore((s) => s.currentXp);
  const xpToNextLevel = useArenaStore((s) => s.xpToNextLevel);
  const runMode = useArenaStore((s) => s.runMode);
  const runStageNumber = useArenaStore((s) => s.runStageNumber);
  const runStage = useArenaStore((s) => s.runStage);
  const stageClearReward = useArenaStore((s) => s.stageClearReward);
  const selectedStage = useGameStore((s) => s.selectedStage);

  const isVictory = outcome === "victory";
  const canAdvance =
    isVictory &&
    runMode === "stage" &&
    runStageNumber > 0 &&
    runStageNumber < TOTAL_STAGES &&
    typeof onNextStage === "function";
  const nextStageLabel =
    canAdvance ? getStageDef(runStageNumber + 1).name : null;

  const rows = [
    ...(runMode === "stage" && runStage
      ? [
          {
            icon: <Trophy className="h-4 w-4 text-emerald-300" aria-hidden />,
            label: "Fase",
            value: `${runStage.stageNumber}. ${runStage.name}`,
          },
        ]
      : runMode === "endless"
        ? [
            {
              icon: <Sparkles className="h-4 w-4 text-fuchsia-300" aria-hidden />,
              label: "Modo",
              value: "Endless",
            },
          ]
        : []),
    {
      icon: <Clock className="h-4 w-4 text-zinc-300" aria-hidden />,
      label: "Tempo sobrevivido",
      value: formatSurviveTime(timeAlive),
    },
    {
      icon: <Skull className="h-4 w-4 text-rose-300" aria-hidden />,
      label: "Inimigos derrotados",
      value: runStats.enemiesDefeated.toLocaleString("pt-BR"),
    },
    {
      icon: <Trophy className="h-4 w-4 text-amber-300" aria-hidden />,
      label: "Bosses mortos",
      value: runStats.bossesKilled.toLocaleString("pt-BR"),
    },
    {
      icon: <Coins className="h-4 w-4 text-amber-300" aria-hidden />,
      label: "Ouro coletado",
      value: runStats.goldCollected.toLocaleString("pt-BR"),
    },
    {
      icon: <Gem className="h-4 w-4 text-cyan-300" aria-hidden />,
      label: "Diamantes",
      value: runStats.diamondsCollected.toLocaleString("pt-BR"),
    },
    {
      icon: <Gem className="h-4 w-4 text-violet-300" aria-hidden />,
      label: "Diamantes roxos",
      value: runStats.purpleDiamondsCollected.toLocaleString("pt-BR"),
    },
    {
      icon: <Star className="h-4 w-4 text-amber-200" aria-hidden />,
      label: "Nível final",
      value: String(matchLevel),
    },
    {
      icon: <Sparkles className="h-4 w-4 text-sky-300" aria-hidden />,
      label: "XP na barra",
      value: `${currentXp.toLocaleString("pt-BR")} / ${xpToNextLevel.toLocaleString("pt-BR")}`,
    },
  ];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div
        className={`w-full max-w-md rounded-2xl border bg-zinc-950/95 p-6 shadow-2xl sm:p-8 ${
          isVictory ? "border-emerald-400/35" : "border-white/10"
        }`}
      >
        <div className="text-center">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.28em] ${
              isVictory ? "text-emerald-400/80" : "text-rose-400/80"
            }`}
          >
            {isVictory ? "Vitória" : "Derrota"}
          </p>
          <h2
            className={`mt-2 text-4xl font-black tracking-tight sm:text-5xl ${
              isVictory ? "text-emerald-400" : "text-rose-500"
            }`}
          >
            {isVictory
              ? runMode === "stage"
                ? "FASE CONCLUÍDA"
                : "VITÓRIA"
              : "GAME OVER"}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">Resumo da partida atual</p>
          {isVictory && stageClearReward && (
            <p className="mt-2 text-sm font-semibold text-emerald-300/90">
              {stageClearReward.firstClear ? "1ª vitória" : "Replay"} · +
              {stageClearReward.gold.toLocaleString("pt-BR")} ouro
              {stageClearReward.gems > 0
                ? ` · +${stageClearReward.gems} diamantes`
                : ""}
              {selectedStage > runStageNumber
                ? ` · próxima: ${selectedStage}`
                : ""}
            </p>
          )}
        </div>

        <ul className="mt-6 max-h-[min(50vh,360px)] space-y-2 overflow-y-auto">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-2.5"
            >
              <span className="inline-flex items-center gap-2 text-sm text-zinc-300">
                {row.icon}
                {row.label}
              </span>
              <span className="font-bold tabular-nums text-zinc-50">
                {row.value}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2">
          {canAdvance && (
            <button
              type="button"
              disabled={busy}
              onClick={onNextStage}
              className="w-full rounded-xl bg-emerald-500 py-3.5 text-base font-black uppercase tracking-wider text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Próxima Fase
              {nextStageLabel ? ` · ${nextStageLabel}` : ""}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onRestart}
            className={`w-full rounded-xl py-3.5 text-base font-black uppercase tracking-wider text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isVictory && !canAdvance
                ? "bg-emerald-500 hover:bg-emerald-400"
                : canAdvance
                  ? "bg-sky-600 hover:bg-sky-500"
                  : "bg-sky-500 hover:bg-sky-400"
            }`}
          >
            {isVictory ? "Repetir Fase" : "Tentar Novamente"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReturnToMenu}
            className="w-full rounded-xl border border-white/15 bg-zinc-800/80 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700/80 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Voltar ao Menu Principal
          </button>
        </div>
      </div>
    </div>
  );
}
