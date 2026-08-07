"use client";

import type { ReactNode } from "react";
import {
  Flame,
  Gem,
  Lock,
  Snowflake,
  Spline,
  Zap,
} from "lucide-react";
import type { SkillUpgradeType } from "@/db/schema";
import { getMatchSkillMaxLevel } from "@/lib/matchUpgrades";
import { syncWithDB } from "@/lib/syncWithDB";
import { useGameStore } from "@/store/useGameStore";

type SkillCardDef = {
  type: SkillUpgradeType;
  title: string;
  description: string;
  icon: ReactNode;
  bonusAt: (metaLevel: number) => string;
};

const CARDS: SkillCardDef[] = [
  {
    type: "ricochet",
    title: "Ricochete",
    description: "Socos saltam entre inimigos na janela ativa.",
    icon: <Spline className="h-4 w-4" aria-hidden />,
    bonusAt: (lv) =>
      `+${2 + lv} saltos · ${(60 + lv * 15).toFixed(0)}% dano no bounce`,
  },
  {
    type: "ice",
    title: "Gelo",
    description: "Onda periódica que congela inimigos próximos.",
    icon: <Snowflake className="h-4 w-4" aria-hidden />,
    bonusAt: (lv) => `Congelamento ${(1 + lv * 0.5).toFixed(1)}s`,
  },
  {
    type: "fire",
    title: "Fogo",
    description: "Queima a arena e aplica burn nos socos.",
    icon: <Flame className="h-4 w-4" aria-hidden />,
    bonusAt: (lv) => `Burn ${(20 * (1 + lv * 0.5)).toFixed(0)}% do dano base`,
  },
  {
    type: "lightning",
    title: "Raio",
    description: "Cadeia periódica de dano e slow.",
    icon: <Zap className="h-4 w-4" aria-hidden />,
    bonusAt: (lv) =>
      `${2 + lv} alvos · slow ${Math.min(85, 20 + lv * 10)}%`,
  },
];

/** Painel: desbloqueio (diamantes) + teto meta (diamantes roxos). */
export function AdvancedSkillsPanel({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const gems = useGameStore((s) => s.gems);
  const purpleDiamonds = useGameStore((s) => s.purpleDiamonds);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const skillLevels = useGameStore((s) => s.skillLevels);
  const unlockAdvancedSkill = useGameStore((s) => s.unlockAdvancedSkill);
  const upgradeSkill = useGameStore((s) => s.upgradeSkill);
  const getAdvancedSkillUnlockCost = useGameStore(
    (s) => s.getAdvancedSkillUnlockCost,
  );
  const getSkillUpgradeCost = useGameStore((s) => s.getSkillUpgradeCost);

  const unlock = async (type: SkillUpgradeType) => {
    if (!unlockAdvancedSkill(type)) return;
    await syncWithDB();
  };

  const upgrade = async (type: SkillUpgradeType) => {
    if (!upgradeSkill(type)) return;
    await syncWithDB();
  };

  return (
    <div className={embedded ? "" : "rounded-2xl border border-white/10 p-3"}>
      {!embedded && (
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Skills Avançadas
        </p>
      )}
      <p className="mb-3 px-1 text-[11px] leading-snug text-zinc-500">
        Desbloqueie com diamantes normais para aparecer na roleta. Suba o teto
        in-run com diamantes roxos.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARDS.map((card) => {
          const unlocked = unlockedSkills[card.type];
          const metaLevel = skillLevels[card.type] ?? 0;
          const unlockCost = getAdvancedSkillUnlockCost(card.type);
          const upgradeCost = getSkillUpgradeCost(card.type);
          const matchMax = getMatchSkillMaxLevel(metaLevel);
          const canUnlock = !unlocked && gems >= unlockCost;
          const canUpgrade = unlocked && purpleDiamonds >= upgradeCost;

          return (
            <div
              key={card.type}
              className="flex flex-col gap-2 rounded-xl border border-violet-400/25 bg-violet-500/5 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-100">
                    <span className="text-violet-300">{card.icon}</span>
                    {card.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                    {card.description}
                  </p>
                </div>
                {!unlocked && (
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-zinc-500"
                    aria-hidden
                  />
                )}
              </div>

              {unlocked ? (
                <>
                  <p className="text-[11px] text-violet-200/80">
                    Meta Nv. {metaLevel} · teto in-run {matchMax} ·{" "}
                    {card.bonusAt(metaLevel)}
                  </p>
                  <button
                    type="button"
                    disabled={!canUpgrade}
                    onClick={() => void upgrade(card.type)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/15 px-2.5 py-1.5 text-xs font-bold text-violet-100 transition hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Gem className="h-3.5 w-3.5 text-violet-300" aria-hidden />
                    Upar teto · {upgradeCost.toLocaleString("pt-BR")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!canUnlock}
                  onClick={() => void unlock(card.type)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Gem className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                  Desbloquear · {unlockCost.toLocaleString("pt-BR")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
