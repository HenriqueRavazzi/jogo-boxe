"use client";

import { useArenaStore } from "@/store/useArenaStore";

/** Barra de vida gigante no topo quando há um boss vivo. */
export function BossHealthBar() {
  const boss = useArenaStore((s) =>
    s.enemies.find((e) => e.type === "boss"),
  );

  if (!boss) return null;

  const pct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="mb-1 flex items-end justify-between gap-3 text-xs tracking-wide text-violet-200/90">
          <span className="font-semibold uppercase text-violet-100">Boss</span>
          <span className="tabular-nums text-violet-100/80">
            {Math.max(0, Math.ceil(boss.hp)).toLocaleString("pt-BR")} /{" "}
            {boss.maxHp.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-sm border-2 border-violet-300/70 bg-black/70 shadow-[0_0_24px_rgba(126,34,206,0.35)]">
          <div
            className="h-full bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-400 transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
