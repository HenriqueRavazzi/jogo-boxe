"use client";

import { useState, type ReactNode } from "react";
import {
  Flame,
  Gauge,
  Gem,
  Heart,
  HeartPulse,
  Shield,
  Swords,
} from "lucide-react";
import type { MetaTreeUpgradeType } from "@/db/schema";
import { formatSciNumber } from "@/lib/formatNumber";
import { syncWithDB } from "@/lib/syncWithDB";
import {
  formatLevelLabel,
  getMetaTreeMaxLevel,
  isLevelCapped,
  META_ATTACK_SPEED_PCT_PER_LEVEL,
  META_DAMAGE_PCT_PER_LEVEL,
  META_HP_PCT_PER_LEVEL,
  META_LIFE_STEAL_MAX_RATIO,
  META_LIFE_STEAL_PERCENT_PER_LEVEL,
  META_PARRY_BASE_CHANCE,
  META_PARRY_CHANCE_PER_LEVEL,
  META_SKILL_REGEN_DAMAGE_RATIO,
  META_SKILL_REGEN_HIT_HEAL,
  META_SKILL_REGEN_MAX_RATIO,
  metaAttackSpeedMultiplier,
  metaDamageMultiplier,
  metaHpMultiplier,
  useGameStore,
  type BulkUpgradePlan,
  type GoldUpgradeQuantity,
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

const QUANTITY_OPTIONS: { value: GoldUpgradeQuantity; label: string }[] = [
  { value: 1, label: "x1" },
  { value: 10, label: "x10" },
  { value: 100, label: "x100" },
  { value: "max", label: "Máx" },
];

const CARDS: MetaCardDef[] = [
  {
    type: "metaDamageLevel",
    title: "Dano",
    icon: <Swords className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) => {
      const pct = Math.round((metaDamageMultiplier(level) - 1) * 100);
      return level <= 0
        ? `+${Math.round(META_DAMAGE_PCT_PER_LEVEL * 100)}% dano / nv. (máx +${Math.round(META_DAMAGE_PCT_PER_LEVEL * 40 * 100)}%)`
        : `+${pct}% dano base (+${Math.round(META_DAMAGE_PCT_PER_LEVEL * 100)}%/nv)`;
    },
  },
  {
    type: "metaHpLevel",
    title: "Vida",
    icon: <Heart className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) => {
      const pct = Math.round((metaHpMultiplier(level) - 1) * 100);
      return level <= 0
        ? `+${Math.round(META_HP_PCT_PER_LEVEL * 100)}% HP / nv. (máx +${Math.round(META_HP_PCT_PER_LEVEL * 40 * 100)}%)`
        : `+${pct}% HP máx. (+${Math.round(META_HP_PCT_PER_LEVEL * 100)}%/nv)`;
    },
  },
  {
    type: "metaAttackSpeedLevel",
    title: "Vel. Ataque",
    icon: <Gauge className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) => {
      const pct = Math.round((metaAttackSpeedMultiplier(level) - 1) * 100);
      return level <= 0
        ? `+${Math.round(META_ATTACK_SPEED_PCT_PER_LEVEL * 100)}% APS / nv. (máx +40%)`
        : `+${pct}% velocidade de ataque (+${Math.round(META_ATTACK_SPEED_PCT_PER_LEVEL * 100)}%/nv)`;
    },
  },
  {
    type: "metaLifeStealLevel",
    title: "Roubo de Vida",
    icon: <HeartPulse className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) => {
      const total = Math.min(
        META_LIFE_STEAL_MAX_RATIO * 100,
        level * META_LIFE_STEAL_PERCENT_PER_LEVEL,
      );
      return `+${total.toFixed(1)}% do dano (máx ${META_LIFE_STEAL_MAX_RATIO * 100}%)`;
    },
  },
  {
    type: "metaSkillRegenLevel",
    title: "Regen. de Skill",
    icon: <Flame className="h-4 w-4" aria-hidden />,
    bonusLabel: (level) => {
      const skillPct = Math.min(
        META_SKILL_REGEN_MAX_RATIO * 100,
        level * META_SKILL_REGEN_DAMAGE_RATIO * 100,
      );
      return `+${skillPct.toFixed(1)}% dano skill (máx ${META_SKILL_REGEN_MAX_RATIO * 100}%) · +${(
        level * META_SKILL_REGEN_HIT_HEAL
      ).toFixed(1)} HP/hit`;
    },
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
  const [quantity, setQuantity] = useState<GoldUpgradeQuantity>(1);
  const levels = {
    metaDamageLevel: useGameStore((s) => s.metaDamageLevel),
    metaHpLevel: useGameStore((s) => s.metaHpLevel),
    metaAttackSpeedLevel: useGameStore((s) => s.metaAttackSpeedLevel),
    metaLifeStealLevel: useGameStore((s) => s.metaLifeStealLevel),
    metaSkillRegenLevel: useGameStore((s) => s.metaSkillRegenLevel),
    metaParryChance: useGameStore((s) => s.metaParryChance),
  };
  const previewMetaTreeBulk = useGameStore((s) => s.previewMetaTreeBulk);
  const buyMetaTreeBulk = useGameStore((s) => s.buyMetaTreeBulk);

  const buy = async (type: ShopMetaUpgradeType) => {
    const bought = buyMetaTreeBulk(type, quantity);
    if (bought > 0) await syncWithDB();
  };

  const qtyBar = (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 px-0.5">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        Comprar
      </span>
      {QUANTITY_OPTIONS.map((opt) => {
        const active = quantity === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => setQuantity(opt.value)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold tabular-nums transition ${
              active
                ? "bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/40"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={embedded ? "" : "rounded-2xl border border-white/10 p-3"}>
      {!embedded && (
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Árvore de Atributos (Diamantes)
        </p>
      )}
      <p className="mb-3 px-1 text-[11px] leading-snug text-zinc-500">
        Upgrades permanentes mais caros e potentes. Roubo de vida até 10%; regen
        de skill até 5%.
      </p>
      {qtyBar}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARDS.map((card) => {
          const level = levels[card.type];
          const maxLevel = getMetaTreeMaxLevel(card.type);
          const atMax = isLevelCapped(level, maxLevel);
          const plan = previewMetaTreeBulk(card.type, quantity);

          return (
            <MetaUpgradeCard
              key={card.type}
              icon={card.icon}
              title={card.title}
              levelLabel={atMax ? "Máx" : formatLevelLabel(level, maxLevel)}
              bonus={card.bonusLabel(level)}
              plan={plan}
              atMax={atMax}
              onUpgrade={() => void buy(card.type)}
            />
          );
        })}
      </div>
    </div>
  );
}

type MetaUpgradeCardProps = {
  icon: ReactNode;
  title: string;
  levelLabel: string;
  bonus: string;
  plan: BulkUpgradePlan;
  atMax: boolean;
  onUpgrade: () => void;
};

function MetaUpgradeCard({
  icon,
  title,
  levelLabel,
  bonus,
  plan,
  atMax,
  onUpgrade,
}: MetaUpgradeCardProps) {
  const canAfford = !atMax && plan.count > 0;
  const displayCost = canAfford ? plan.totalCost : plan.nextCost;
  const buttonLabel = atMax
    ? "MÁXIMO"
    : plan.count > 0
      ? `Upgrade x${plan.count}`
      : "Upgrade";

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/5 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-100">
          <span className="text-cyan-300">{icon}</span>
          {title}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/60">
          {levelLabel}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-zinc-400">{bonus}</p>
      {atMax ? (
        <p className="text-xs text-zinc-500">MÁXIMO</p>
      ) : (
        <>
          <p
            className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums ${
              canAfford ? "text-cyan-200" : "text-rose-400"
            }`}
          >
            <Gem className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Custo: {formatSciNumber(displayCost)} Diamantes
          </p>
          {!canAfford && (
            <p className="text-[10px] font-semibold text-rose-400/90">
              Diamantes insuficientes
            </p>
          )}
        </>
      )}
      <button
        type="button"
        disabled={atMax || !canAfford}
        onClick={onUpgrade}
        className="mt-auto rounded-lg bg-cyan-600/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
