"use client";

import type { ReactNode } from "react";
import {
  Flame,
  Gem,
  Heart,
  HeartPulse,
  Shield,
  Swords,
} from "lucide-react";
import type { MetaTreeUpgradeType } from "@/db/schema";
import { syncWithDB } from "@/lib/syncWithDB";
import {
  formatLevelLabel,
  getMetaTreeMaxLevel,
  isLevelCapped,
  META_DAMAGE_PER_LEVEL,
  META_HP_PER_LEVEL,
  META_LIFE_STEAL_PERCENT_PER_LEVEL,
  META_PARRY_BASE_CHANCE,
  META_PARRY_CHANCE_PER_LEVEL,
  META_SKILL_REGEN_DAMAGE_RATIO,
  META_SKILL_REGEN_HIT_HEAL,
  useGameStore,
} from "@/store/useGameStore";

type ShopMetaUpgradeType = Exclude<
  MetaTreeUpgradeType,
  "metaKnockbackLevel"
>;

type MetaCardDef = {
  type: ShopMetaUpgradeType;
  title: string;
  icon: ReactNode;
  bonusLabel: (level: number) => string;
};

const CARDS: MetaCardDef[] = [
  {
    type: "metaDamageLevel",
    title: "Dano",
    icon: <Swords className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) => `+${level * META_DAMAGE_PER_LEVEL} dano base`,
  },
  {
    type: "metaHpLevel",
    title: "Vida",
    icon: <Heart className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) => `+${level * META_HP_PER_LEVEL} HP máx.`,
  },
  {
    type: "metaLifeStealLevel",
    title: "Roubo de Vida",
    icon: <HeartPulse className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) =>
      `+${(level * META_LIFE_STEAL_PERCENT_PER_LEVEL).toFixed(1)}% do dano físico`,
  },
  {
    type: "metaSkillRegenLevel",
    title: "Regen. de Skill",
    icon: <Flame className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) =>
      `+${(level * META_SKILL_REGEN_DAMAGE_RATIO * 100).toFixed(0)}% dano skill · +${(
        level * META_SKILL_REGEN_HIT_HEAL
      ).toFixed(1)} HP/hit`,
  },
  {
    type: "metaParryChance",
    title: "Parry",
    icon: <Shield className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) => {
      const bonusPct = level * META_PARRY_CHANCE_PER_LEVEL * 100;
      const totalPct =
        (META_PARRY_BASE_CHANCE + level * META_PARRY_CHANCE_PER_LEVEL) * 100;
      return `+${bonusPct.toFixed(1)}% · total ${totalPct.toFixed(1)}% (base 1%)`;
    },
  },
];

/** Painel da árvore de atributos permanentes (Diamantes Normais). */
export function MetaTreePanel({ embedded = false }: { embedded?: boolean }) {
  const gems = useGameStore((s) => s.gems);
  const levels = {
    metaDamageLevel: useGameStore((s) => s.metaDamageLevel),
    metaHpLevel: useGameStore((s) => s.metaHpLevel),
    metaLifeStealLevel: useGameStore((s) => s.metaLifeStealLevel),
    metaSkillRegenLevel: useGameStore((s) => s.metaSkillRegenLevel),
    metaParryChance: useGameStore((s) => s.metaParryChance),
  };
  const getMetaTreeUpgradeCost = useGameStore((s) => s.getMetaTreeUpgradeCost);
  const upgradeMetaTree = useGameStore((s) => s.upgradeMetaTree);

  const buy = (type: ShopMetaUpgradeType) => {
    if (!upgradeMetaTree(type)) return;
    void syncWithDB();
  };

  return (
    <div className={embedded ? "" : "rounded-2xl border border-white/10 p-3"}>
      {!embedded && (
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Árvore de Atributos (Diamantes)
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARDS.map((card) => {
          const level = levels[card.type];
          const cost = getMetaTreeUpgradeCost(card.type);
          const maxLevel = getMetaTreeMaxLevel(card.type);
          const atMax = isLevelCapped(level, maxLevel);
          const canAfford = !atMax && gems >= cost;

          return (
            <button
              key={card.type}
              type="button"
              disabled={!canAfford}
              onClick={() => buy(card.type)}
              className="flex flex-col gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/5 px-3 py-2.5 text-left transition hover:border-cyan-300/50 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-100">
                  <span className="text-cyan-300">{card.icon}</span>
                  {card.title}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/60">
                  {atMax ? "Máx" : formatLevelLabel(level, maxLevel)}
                </span>
              </div>
              <p className="text-[11px] leading-snug text-zinc-400">
                {card.bonusLabel(level)}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold tabular-nums text-cyan-200">
                <Gem className="h-3.5 w-3.5" aria-hidden />
                {atMax ? "—" : cost.toLocaleString("pt-BR")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
