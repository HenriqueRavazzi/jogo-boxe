"use client";

import { useState, type ReactNode } from "react";
import {
  Coins,
  Crosshair,
  Hand,
  HeartPulse,
  Sparkles,
  Swords,
} from "lucide-react";
import {
  GOLD_DAMAGE_PCT_PER_LEVEL,
  GOLD_HP_PCT_PER_LEVEL,
  goldDamageMultiplier,
  goldHpMultiplier,
  INCOME_STEP,
  MAX_CRIT_CHANCE,
  MAX_UPGRADE_LEVELS,
  formatLevelLabel,
  getMetaMaxRangePx,
  isLevelCapped,
  useGameStore,
  type GoldUpgradeKind,
  type GoldUpgradeQuantity,
} from "@/store/useGameStore";
import { syncWithDB } from "@/lib/syncWithDB";

const QUANTITY_OPTIONS: { value: GoldUpgradeQuantity; label: string }[] = [
  { value: 1, label: "x1" },
  { value: 10, label: "x10" },
  { value: 100, label: "x100" },
  { value: "max", label: "Máx" },
];

/** Painel de upgrades com ouro (AS, crítico dano e knockback só in-run). */
export function UpgradePanel({ embedded = false }: { embedded?: boolean }) {
  const [quantity, setQuantity] = useState<GoldUpgradeQuantity>(1);

  const maxHpLevel = useGameStore((s) => s.maxHpLevel);
  const baseDamageLevel = useGameStore((s) => s.baseDamageLevel);
  const rangeLevel = useGameStore((s) => s.rangeLevel);
  const critChanceLevel = useGameStore((s) => s.critChanceLevel);
  const arms = useGameStore((s) => s.arms);
  const incomeMultiplier = useGameStore((s) => s.incomeMultiplier);
  const gold = useGameStore((s) => s.gold);
  const baseConfig = useGameStore((s) => s.baseConfig);

  const previewGoldUpgradeBulk = useGameStore((s) => s.previewGoldUpgradeBulk);
  const buyGoldUpgradeBulk = useGameStore((s) => s.buyGoldUpgradeBulk);
  const getCritChance = useGameStore((s) => s.getCritChance);
  const getMaxHp = useGameStore((s) => s.getMaxHp);
  const getBaseDamage = useGameStore((s) => s.getBaseDamage);
  const getUpgradeRangeAt = useGameStore((s) => s.getUpgradeRangeAt);

  const critChance = getCritChance();
  const incomeLevel = Math.max(
    0,
    Math.round((incomeMultiplier - 1) / INCOME_STEP),
  );

  const hpAtMax = isLevelCapped(maxHpLevel, MAX_UPGRADE_LEVELS.hp);
  const damageAtMax = isLevelCapped(baseDamageLevel, MAX_UPGRADE_LEVELS.damage);
  const incomeAtMax = isLevelCapped(incomeLevel, MAX_UPGRADE_LEVELS.income);
  const critChanceAtMax =
    isLevelCapped(critChanceLevel, MAX_UPGRADE_LEVELS.critChance) ||
    critChance >= MAX_CRIT_CHANCE;

  const metaRangeCeil = getMetaMaxRangePx(baseConfig.baseRange);
  const currentRange = getUpgradeRangeAt(rangeLevel);
  const nextRange = getUpgradeRangeAt(
    Math.min(rangeLevel + 1, MAX_UPGRADE_LEVELS.range),
  );
  const rangeDelta = nextRange - currentRange;
  const rangeAtMax =
    rangeLevel >= MAX_UPGRADE_LEVELS.range ||
    currentRange >= metaRangeCeil ||
    nextRange <= currentRange;

  const planFor = (kind: GoldUpgradeKind) =>
    previewGoldUpgradeBulk(kind, quantity);

  const buy = async (kind: GoldUpgradeKind) => {
    const bought = buyGoldUpgradeBulk(kind, quantity);
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
                ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/40"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  const hpBonusPct = Math.round((goldHpMultiplier(maxHpLevel) - 1) * 100);
  const dmgBonusPct = Math.round(
    (goldDamageMultiplier(baseDamageLevel) - 1) * 100,
  );
  const hpPctLabel = `${Math.round(GOLD_HP_PCT_PER_LEVEL * 100)}%`;
  const dmgPctLabel = `${Math.round(GOLD_DAMAGE_PCT_PER_LEVEL * 100)}%`;

  const grid = (
    <div
      className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${embedded ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
    >
      <UpgradeCard
        icon={<HeartPulse className="h-5 w-5 text-rose-400" />}
        title={`Max HP: ${formatLevelLabel(maxHpLevel, MAX_UPGRADE_LEVELS.hp)}`}
        subtitle={`HP atual: ${getMaxHp()} · +${hpBonusPct}% (+${hpPctLabel}/nv)`}
        plan={planFor("hp")}
        quantity={quantity}
        atMax={hpAtMax}
        onUpgrade={() => void buy("hp")}
      />
      <UpgradeCard
        icon={<Swords className="h-5 w-5 text-amber-400" />}
        title={`Dano: ${getBaseDamage()}`}
        subtitle={`${formatLevelLabel(baseDamageLevel, MAX_UPGRADE_LEVELS.damage)} · +${dmgBonusPct}% (+${dmgPctLabel}/nv)`}
        plan={planFor("damage")}
        quantity={quantity}
        atMax={damageAtMax}
        onUpgrade={() => void buy("damage")}
      />
      <UpgradeCard
        icon={<Crosshair className="h-5 w-5 text-orange-400" />}
        title={
          rangeAtMax
            ? `Alcance: ${currentRange}`
            : `Alcance: ${currentRange} (Próximo: +${rangeDelta})`
        }
        subtitle={
          rangeAtMax
            ? `MÁXIMO meta (${metaRangeCeil}px · 65%)`
            : `Nível ${rangeLevel}/${MAX_UPGRADE_LEVELS.range}`
        }
        plan={planFor("range")}
        quantity={quantity}
        atMax={rangeAtMax}
        onUpgrade={() => void buy("range")}
      />
      <UpgradeCard
        icon={<Sparkles className="h-5 w-5 text-yellow-300" />}
        title={`Crítico: ${Math.round(critChance * 100)}%`}
        subtitle={
          critChanceAtMax
            ? `MÁXIMO (${Math.round(MAX_CRIT_CHANCE * 100)}%)`
            : `Nível ${critChanceLevel}/${MAX_UPGRADE_LEVELS.critChance}`
        }
        plan={planFor("critChance")}
        quantity={quantity}
        atMax={critChanceAtMax}
        onUpgrade={() => void buy("critChance")}
      />
      <UpgradeCard
        icon={<Coins className="h-5 w-5 text-yellow-400" />}
        title={`Multiplicador: ${incomeMultiplier.toFixed(1)}x`}
        subtitle={formatLevelLabel(incomeLevel, MAX_UPGRADE_LEVELS.income)}
        plan={planFor("income")}
        quantity={quantity}
        atMax={incomeAtMax}
        onUpgrade={() => void buy("income")}
      />
      <UpgradeCard
        icon={<Hand className="h-5 w-5 text-sky-400" />}
        title={`Braços: ${arms}`}
        subtitle={
          arms < 6
            ? "Próximo: +1 braço"
            : "Próximo: +15% Dano Base (Reseta Braços)"
        }
        subtitleClassName={
          arms === 6 ? "font-semibold text-amber-300" : undefined
        }
        plan={planFor("arms")}
        quantity={quantity}
        atMax={false}
        onUpgrade={() => void buy("arms")}
      />
    </div>
  );

  if (embedded) {
    return (
      <div className="pointer-events-auto">
        {qtyBar}
        {grid}
      </div>
    );
  }

  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
      <div className="pointer-events-auto mx-auto max-w-5xl">
        {qtyBar}
        {grid}
      </div>
    </footer>
  );
}

type UpgradeCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  subtitleClassName?: string;
  plan: { count: number; totalCost: number };
  quantity: GoldUpgradeQuantity;
  atMax?: boolean;
  onUpgrade: () => void;
};

function UpgradeCard({
  icon,
  title,
  subtitle,
  subtitleClassName,
  plan,
  quantity,
  atMax = false,
  onUpgrade,
}: UpgradeCardProps) {
  const canAfford = !atMax && plan.count > 0;
  const qtyLabel =
    quantity === "max"
      ? plan.count > 0
        ? `Máx (${plan.count})`
        : "Máx"
      : `x${quantity}`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3 shadow-lg backdrop-blur-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-50">{title}</p>
        <p
          className={`truncate text-xs ${subtitleClassName ?? "text-zinc-400"}`}
        >
          {subtitle}
        </p>
        <p className="mt-0.5 text-xs text-amber-300/90">
          {atMax
            ? "MÁXIMO"
            : plan.count > 0
              ? `Custo ${qtyLabel}: ${plan.totalCost.toLocaleString("pt-BR")} Ouro`
              : "Ouro insuficiente"}
        </p>
      </div>
      <button
        type="button"
        disabled={atMax || !canAfford}
        onClick={onUpgrade}
        className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-50"
      >
        {atMax ? "MÁXIMO" : `Upgrade ${qtyLabel}`}
      </button>
    </div>
  );
}
