"use client";

import { Clock, Coins, Gem, Skull } from "lucide-react";
import { useArenaStore } from "@/store/useArenaStore";

type GameOverModalProps = {
  onRestart: () => void;
  onReturnToMenu: () => void;
  busy?: boolean;
};

function formatSurviveTime(timeAlive: number): string {
  const total = Math.max(0, Math.floor(timeAlive));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

/** Modal centralizado de Game Over com estatísticas da run. */
export function GameOverModal({
  onRestart,
  onReturnToMenu,
  busy = false,
}: GameOverModalProps) {
  const timeAlive = useArenaStore((s) => s.timeAlive);
  const runStats = useArenaStore((s) => s.runStats);

  const rows = [
    {
      icon: <Clock className="h-4 w-4 text-zinc-300" aria-hidden />,
      label: "Tempo Sobrevivido",
      value: formatSurviveTime(timeAlive),
    },
    {
      icon: <Skull className="h-4 w-4 text-rose-300" aria-hidden />,
      label: "Inimigos Nocauteados",
      value: runStats.enemiesDefeated.toLocaleString("pt-BR"),
    },
    {
      icon: <Coins className="h-4 w-4 text-amber-300" aria-hidden />,
      label: "Ouro Obtido",
      value: runStats.goldCollected.toLocaleString("pt-BR"),
    },
    {
      icon: <Gem className="h-4 w-4 text-cyan-300" aria-hidden />,
      label: "Diamantes Obtidos",
      value: runStats.diamondsCollected.toLocaleString("pt-BR"),
    },
  ];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-400/80">
            Derrota
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-rose-500 sm:text-5xl">
            GAME OVER
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Resumo da partida atual
          </p>
        </div>

        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3"
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
          <button
            type="button"
            disabled={busy}
            onClick={onRestart}
            className="w-full rounded-xl bg-sky-500 py-3.5 text-base font-black uppercase tracking-wider text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Jogar Novamente
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReturnToMenu}
            className="w-full rounded-xl border border-white/15 bg-zinc-800/80 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700/80 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Voltar ao Menu
          </button>
        </div>
      </div>
    </div>
  );
}
