"use client";

import { LogOut } from "lucide-react";
import { useArenaStore } from "@/store/useArenaStore";
import {
  GAME_SPEED_OPTIONS,
  clampGameSpeed,
  useGameStore,
} from "@/store/useGameStore";

/** Painel lateral de stats em tempo real durante a partida. */
export function InGameStats({ onExitMatch }: { onExitMatch: () => void }) {
  const currentHp = useArenaStore((s) => s.currentHp);
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const timeAlive = useArenaStore((s) => s.timeAlive);
  const matchBuffs = useArenaStore((s) => s.matchBuffs);
  const gameSpeedMultiplier = useGameStore((s) => s.gameSpeedMultiplier);
  const setGameSpeedMultiplier = useGameStore((s) => s.setGameSpeedMultiplier);
  const cycleGameSpeed = useGameStore((s) => s.cycleGameSpeed);

  // Dependências dos derived stats (ouro + skills) — força re-render quando mudam
  const skillTree = useGameStore((s) => s.skillTree);
  const maxHpLevel = useGameStore((s) => s.maxHpLevel);
  const baseDamage = useGameStore((s) => s.baseDamage);
  const attackSpeedLevel = useGameStore((s) => s.attackSpeedLevel);
  const rangeLevel = useGameStore((s) => s.rangeLevel);
  const xpBonusLevel = useGameStore((s) => s.xpBonusLevel);
  const incomeMultiplier = useGameStore((s) => s.incomeMultiplier);
  const getEffectiveStats = useGameStore((s) => s.getEffectiveStats);

  void skillTree;
  void maxHpLevel;
  void baseDamage;
  void attackSpeedLevel;
  void rangeLevel;
  void xpBonusLevel;

  const gameSpeed = clampGameSpeed(gameSpeedMultiplier);
  const stats = getEffectiveStats();
  const damage = Math.round(stats.damage * matchBuffs.damageMultiplier);
  const range = Math.round(stats.attackRange * matchBuffs.attackRange);
  const cooldown = Math.round(stats.attackCooldownMs / matchBuffs.attackSpeed);
  const xpPct = Math.round((stats.xpMultiplier - 1) * 100);
  const critDamage =
    stats.critDamageMultiplier * (matchBuffs.critDamageMultiplier ?? 1);
  const skillDamagePct = Math.round(
    ((matchBuffs.skillDamageMultiplier ?? 1) - 1) * 100,
  );

  const rows: { label: string; value: string }[] = [
    { label: "HP", value: `${Math.ceil(currentHp)}/${stats.maxHp}` },
    { label: "Dano", value: String(damage) },
    { label: "Braços", value: String(stats.arms) },
    { label: "Velocidade", value: `${cooldown}ms` },
    { label: "Alcance", value: String(range) },
    { label: "Dano Crít.", value: `${critDamage.toFixed(2)}x` },
    {
      label: "Dano Skill",
      value: skillDamagePct > 0 ? `+${skillDamagePct}%` : "0%",
    },
    { label: "XP", value: xpPct > 0 ? `+${xpPct}%` : "0%" },
    { label: "Nível", value: String(matchLevel) },
    { label: "Renda", value: incomeMultiplier.toFixed(1) },
    { label: "Tempo", value: `${Math.floor(timeAlive)}s` },
  ];

  return (
    <div className="pointer-events-none absolute left-4 top-20 z-20 flex w-44 flex-col gap-2">
      <div className="pointer-events-auto flex gap-2">
        <button
          type="button"
          onClick={onExitMatch}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/50 bg-black/60 px-2 py-2 text-xs font-semibold text-rose-300 shadow-lg backdrop-blur-md transition hover:border-rose-400 hover:bg-rose-950/50 hover:text-rose-200"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Sair
        </button>
        <button
          type="button"
          onClick={() => cycleGameSpeed()}
          className={`inline-flex w-14 shrink-0 items-center justify-center rounded-xl border px-2 py-2 text-xs font-black shadow-lg backdrop-blur-md transition ${
            gameSpeed > 1
              ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-200 hover:bg-emerald-500/35"
              : "border-white/20 bg-black/60 text-zinc-300 hover:border-white/40 hover:text-zinc-100"
          }`}
          aria-label={`Velocidade ${gameSpeed}x`}
          title="Alternar velocidade (1x–5x)"
        >
          {gameSpeed}x
        </button>
      </div>

      <div className="pointer-events-auto flex gap-1 rounded-xl border border-white/10 bg-black/60 p-1 shadow-lg backdrop-blur-md">
        {GAME_SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => setGameSpeedMultiplier(speed)}
            className={`flex-1 rounded-lg py-1 text-[10px] font-bold transition ${
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

      <aside className="rounded-xl border border-white/10 bg-black/60 p-3 text-zinc-100 shadow-lg backdrop-blur-md">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Stats
        </p>
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-zinc-400">{row.label}</span>
              <span className="font-semibold tabular-nums text-zinc-50">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
