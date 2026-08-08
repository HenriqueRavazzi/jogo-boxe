"use client";

import { useEffect, useState } from "react";
import { useArenaStore } from "@/store/useArenaStore";

/**
 * Alerta de boss surpresa na horda: bordas vermelhas pulsantes + banner.
 */
export function BossHordeAlert() {
  const bossHordeAlertUntil = useArenaStore((s) => s.bossHordeAlertUntil);
  const [now, setNow] = useState(() => Date.now());

  const active = bossHordeAlertUntil > now;

  useEffect(() => {
    if (!active && bossHordeAlertUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(id);
  }, [active, bossHordeAlertUntil]);

  if (!active) return null;

  const remaining = Math.max(0, bossHordeAlertUntil - now);
  const pulse = 0.45 + 0.55 * Math.abs(Math.sin((2_000 - remaining) / 180));

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <div
        className="absolute inset-0 rounded-[2px]"
        style={{
          boxShadow: `inset 0 0 ${24 + pulse * 28}px ${8 + pulse * 10}px rgba(220, 38, 38, ${0.35 + pulse * 0.45})`,
          border: `3px solid rgba(248, 113, 113, ${0.4 + pulse * 0.55})`,
        }}
        aria-hidden
      />
      <div className="absolute inset-x-0 top-[22%] flex justify-center px-4">
        <div
          className="rounded-xl border border-rose-400/70 bg-rose-950/90 px-5 py-3 text-center shadow-2xl shadow-rose-950/60 backdrop-blur-sm"
          style={{ opacity: 0.75 + pulse * 0.25 }}
          role="alert"
        >
          <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-100 sm:text-base">
            ALERTA: CHEFE NA HORDA!
          </p>
          <p className="mt-1 text-[11px] font-medium text-rose-200/80">
            Um boss invadiu a onda
          </p>
        </div>
      </div>
    </div>
  );
}
