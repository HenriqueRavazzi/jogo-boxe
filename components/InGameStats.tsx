"use client";

import { LogOut } from "lucide-react";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

/** Painel lateral de stats em tempo real durante a partida. */
export function InGameStats({ onExitMatch }: { onExitMatch: () => void }) {
  const currentHp = useArenaStore((s) => s.currentHp);
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const timeAlive = useArenaStore((s) => s.timeAlive);
  const matchBuffs = useArenaStore((s) => s.matchBuffs);

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
  const knockbackPct = Math.round(
    ((matchBuffs.knockbackMultiplier ?? 1) - 1) * 100,
  );

  const totalSeconds = Math.max(0, Math.floor(timeAlive));
  const timeLabel = `${Math.floor(totalSeconds / 60)}m ${String(
    totalSeconds % 60,
  ).padStart(2, "0")}s`;

  const rows: { label: string; value: string }[] = [
    { label: "HP", value: `${Math.ceil(currentHp)}/${stats.maxHp}` },
    { label: "Dano", value: String(damage) },
    { label: "Braços", value: String(stats.arms) },
    { label: "Velocidade", value: `${cooldown}ms` },
    { label: "Alcance", value: String(range) },
    { label: "Dano Crít.", value: `${critDamage.toFixed(2)}x` },
    {
      label: "Knockback",
      value: knockbackPct > 0 ? `+${knockbackPct}%` : "0%",
    },
    {
      label: "Dano Skill",
      value: skillDamagePct > 0 ? `+${skillDamagePct}%` : "0%",
    },
    { label: "XP", value: xpPct > 0 ? `+${xpPct}%` : "0%" },
    { label: "Nível", value: String(matchLevel) },
    { label: "Renda", value: incomeMultiplier.toFixed(1) },
    { label: "Tempo", value: timeLabel },
  ];

  return (
    // Abaixo do TopBar (recursos + seletor Vel) para não sobrepor
    <div className="pointer-events-none absolute left-4 top-36 z-20 flex w-44 flex-col gap-2 sm:top-40">
      <button
        type="button"
        onClick={onExitMatch}
        className="pointer-events-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500/50 bg-black/60 px-2 py-2 text-xs font-semibold text-rose-300 shadow-lg backdrop-blur-md transition hover:border-rose-400 hover:bg-rose-950/50 hover:text-rose-200"
      >
        <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Sair
      </button>

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
