"use client";

import type { ReactNode } from "react";
import { Flame, Snowflake, Spline, Zap } from "lucide-react";
import {
  MAX_ACTIVE_RUN_SKILLS,
  SPECIAL_SKILL_KEYS,
  type SpecialSkillKey,
} from "@/lib/matchUpgrades";
import { useArenaStore } from "@/store/useArenaStore";

const SKILL_UI: Record<
  SpecialSkillKey,
  { name: string; icon: ReactNode; accent: string }
> = {
  ricochet: {
    name: "Ricochete",
    icon: <Spline className="h-3.5 w-3.5" aria-hidden />,
    accent: "border-violet-400/50 bg-violet-500/20 text-violet-100",
  },
  ice: {
    name: "Gelo",
    icon: <Snowflake className="h-3.5 w-3.5" aria-hidden />,
    accent: "border-sky-400/50 bg-sky-500/20 text-sky-100",
  },
  fire: {
    name: "Fogo",
    icon: <Flame className="h-3.5 w-3.5" aria-hidden />,
    accent: "border-orange-400/50 bg-orange-500/20 text-orange-100",
  },
  lightning: {
    name: "Raio",
    icon: <Zap className="h-3.5 w-3.5" aria-hidden />,
    accent: "border-yellow-400/50 bg-yellow-500/20 text-yellow-100",
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

/**
 * HUD in-game: skills especiais escolhidas na run + slots livres restantes.
 */
export function ActiveSkillsHud() {
  const activeRunSkills = useArenaStore((s) => s.activeRunSkills);
  const matchSkills = useArenaStore((s) => s.matchSkills);

  const equipped = resolveActiveSkills(activeRunSkills, matchSkills);
  const remaining = Math.max(0, MAX_ACTIVE_RUN_SKILLS - equipped.length);

  const slots: (SpecialSkillKey | null)[] = Array.from(
    { length: MAX_ACTIVE_RUN_SKILLS },
    (_, i) => equipped[i] ?? null,
  );

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-2.5 py-2 shadow-lg backdrop-blur-md">
        <div className="hidden px-1 sm:block">
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

        <div className="flex items-center gap-1.5">
          {slots.map((key, index) => {
            if (key == null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="flex h-11 min-w-[4.5rem] flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-2"
                  title="Slot livre para nova skill"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Livre
                  </span>
                  <span className="text-[9px] text-zinc-600">
                    slot {index + 1}
                  </span>
                </div>
              );
            }

            const ui = SKILL_UI[key];
            const level = matchSkills[key] ?? 0;
            return (
              <div
                key={key}
                className={`flex h-11 min-w-[4.5rem] items-center gap-1.5 rounded-lg border px-2 ${ui.accent}`}
                title={`${ui.name} · Nv. ${level}`}
              >
                <span className="shrink-0 opacity-90">{ui.icon}</span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[11px] font-bold">{ui.name}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
                    Nv. {level}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contador compacto no mobile */}
        <p className="px-1 text-[10px] font-bold tabular-nums text-zinc-400 sm:hidden">
          {equipped.length}/{MAX_ACTIVE_RUN_SKILLS}
        </p>
      </div>
    </div>
  );
}
