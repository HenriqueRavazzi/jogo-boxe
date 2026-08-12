"use client";

import { useArenaStore } from "@/store/useArenaStore";

/** Barras de vida no topo — uma por boss vivo. */
export function BossHealthBar() {
  const bosses = useArenaStore((s) =>
    s.enemies.filter((e) => e.type === "boss" && e.hp > 0),
  );

  if (bosses.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 sm:top-3">
      <div className="flex w-full max-w-md flex-col gap-2 sm:max-w-xl">
        {bosses.map((boss, index) => {
          const pct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
          const label =
            bosses.length === 1 ? "Boss" : `Boss ${index + 1}`;

          return (
            <div key={boss.id}>
              <div className="mb-1 flex items-end justify-between gap-3 text-xs tracking-wide text-violet-200/90">
                <span className="font-semibold uppercase text-violet-100">
                  {label}
                </span>
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
          );
        })}
      </div>
    </div>
  );
}
