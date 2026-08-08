"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Flame, Snowflake, Spline, Zap } from "lucide-react";
import {
  MAX_ACTIVE_RUN_SKILLS,
  SPECIAL_SKILL_KEYS,
  type SpecialSkillKey,
} from "@/lib/matchUpgrades";
import { getSkillCooldownInfo } from "@/src/game/systems/ActiveSkillsSystem";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

const SKILL_UI: Record<
  SpecialSkillKey,
  { name: string; icon: ReactNode; ring: string; fill: string }
> = {
  ricochet: {
    name: "Ricochete",
    icon: <Spline className="h-5 w-5" aria-hidden />,
    ring: "stroke-violet-400",
    fill: "text-violet-200",
  },
  ice: {
    name: "Gelo",
    icon: <Snowflake className="h-5 w-5" aria-hidden />,
    ring: "stroke-sky-400",
    fill: "text-sky-200",
  },
  fire: {
    name: "Fogo",
    icon: <Flame className="h-5 w-5" aria-hidden />,
    ring: "stroke-orange-400",
    fill: "text-orange-200",
  },
  lightning: {
    name: "Raio",
    icon: <Zap className="h-5 w-5" aria-hidden />,
    ring: "stroke-yellow-300",
    fill: "text-yellow-100",
  },
};

function resolveActiveSkills(
  activeRunSkills: SpecialSkillKey[],
  matchSkills: Record<SpecialSkillKey, number>,
): SpecialSkillKey[] {
  const fromLevels = SPECIAL_SKILL_KEYS.filter((k) => (matchSkills[k] ?? 0) > 0);
  return Array.from(new Set([...activeRunSkills, ...fromLevels])).slice(
    0,
    MAX_ACTIVE_RUN_SKILLS,
  );
}

function CooldownRing({
  progress,
  mode,
  ringClass,
}: {
  progress: number;
  mode: string;
  ringClass: string;
}) {
  const size = 52;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  const active = mode === "active";

  return (
    <svg
      width={size}
      height={size}
      className="pointer-events-none absolute inset-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className={
          active
            ? "stroke-emerald-300"
            : mode === "ready" || mode === "passive"
              ? ringClass
              : ringClass
        }
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          opacity: mode === "cooldown" ? 0.85 : 1,
          filter: active ? "drop-shadow(0 0 4px rgba(52,211,153,0.7))" : undefined,
        }}
      />
    </svg>
  );
}

/**
 * HUD de combate: 2 slots de skills especiais + anel de cooldown.
 */
export function HUD() {
  const activeRunSkills = useArenaStore((s) => s.activeRunSkills);
  const matchSkills = useArenaStore((s) => s.matchSkills);
  const pulse = useArenaStore((s) => s.activeSkillPulse);
  const gameClockMs = useArenaStore((s) => s.gameClockMs);
  const skills = useGameStore((s) => s.skills);
  const [, setTick] = useState(0);

  // Atualiza anéis ~10fps sem depender do game loop React
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, []);

  const equipped = resolveActiveSkills(activeRunSkills, matchSkills);
  const remaining = Math.max(0, MAX_ACTIVE_RUN_SKILLS - equipped.length);
  const gameNow = gameClockMs;

  const slots: (SpecialSkillKey | null)[] = Array.from(
    { length: MAX_ACTIVE_RUN_SKILLS },
    (_, i) => equipped[i] ?? null,
  );

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/65 px-3 py-2.5 shadow-lg backdrop-blur-md">
        <div className="hidden min-w-[4.5rem] px-1 sm:block">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Skills
          </p>
          <p className="text-[10px] tabular-nums text-zinc-400">
            {equipped.length}/{MAX_ACTIVE_RUN_SKILLS}
            {remaining > 0 ? (
              <span className="text-zinc-500">
                {" "}
                · {remaining} livre{remaining > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-amber-300/80"> · cheio</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {slots.map((key, index) => {
            if (key == null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full border border-dashed border-zinc-600/70 bg-zinc-900/80"
                  title="Slot livre"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-600">
                    Livre
                  </span>
                </div>
              );
            }

            const ui = SKILL_UI[key];
            const info = getSkillCooldownInfo(key, pulse, skills, gameNow);
            const level = matchSkills[key] ?? 0;

            return (
              <div
                key={key}
                className="relative flex h-[52px] w-[52px] items-center justify-center"
                title={
                  info.mode === "passive"
                    ? `${ui.name} · Nv. ${level} · passivo`
                    : `${ui.name} · Nv. ${level} · ${info.mode}`
                }
              >
                <CooldownRing
                  progress={info.progress}
                  mode={info.mode}
                  ringClass={ui.ring}
                />
                <div
                  className={`relative z-[1] flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-zinc-950/90 ${ui.fill}`}
                >
                  {ui.icon}
                </div>
                <span className="absolute -bottom-1 rounded bg-black/80 px-1 text-[8px] font-bold tabular-nums text-zinc-200">
                  {level}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer `HUD` — mantido para imports antigos. */
export { HUD as ActiveSkillsHud };
