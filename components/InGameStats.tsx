"use client";

import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

/** Painel lateral de stats em tempo real durante a partida. */
export function InGameStats() {
  const currentHp = useArenaStore((s) => s.currentHp);
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const timeAlive = useArenaStore((s) => s.timeAlive);
  const matchBuffs = useArenaStore((s) => s.matchBuffs);

  const arms = useGameStore((s) => s.arms);
  const armTier = useGameStore((s) => s.armTier);
  const incomeMultiplier = useGameStore((s) => s.incomeMultiplier);
  const getMaxHp = useGameStore((s) => s.getMaxHp);
  const getBaseDamage = useGameStore((s) => s.getBaseDamage);
  const getAttackRange = useGameStore((s) => s.getAttackRange);
  const getAttackCooldown = useGameStore((s) => s.getAttackCooldown);

  const maxHp = getMaxHp();
  const damage = Math.round(
    getBaseDamage() * armTier * matchBuffs.damageMultiplier,
  );
  const range = Math.round(getAttackRange() * matchBuffs.attackRange);
  const cooldown = Math.round(
    getAttackCooldown() / matchBuffs.attackSpeed,
  );

  const rows: { label: string; value: string }[] = [
    { label: "HP", value: `${currentHp}/${maxHp}` },
    { label: "Dano", value: `${damage} (T${armTier})` },
    { label: "Braços", value: String(arms) },
    { label: "Velocidade", value: `${cooldown}ms` },
    { label: "Alcance", value: String(range) },
    { label: "Nível", value: String(matchLevel) },
    { label: "Renda", value: incomeMultiplier.toFixed(1) },
    { label: "Tempo", value: `${Math.floor(timeAlive)}s` },
  ];

  return (
    <aside className="pointer-events-none absolute left-4 top-1/2 z-10 w-44 -translate-y-1/2 rounded-xl border border-white/10 bg-black/60 p-3 text-zinc-100 shadow-lg backdrop-blur-md">
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
  );
}
