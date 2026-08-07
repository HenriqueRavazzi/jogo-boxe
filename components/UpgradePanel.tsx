"use client";

import type { ReactNode } from "react";
import {
  Coins,
  Crosshair,
  Gauge,
  Hand,
  HeartPulse,
  Swords,
} from "lucide-react";
import { MAX_STAT_LEVEL, useGameStore } from "@/store/useGameStore";

/** Painel de upgrades com ouro. */
export function UpgradePanel({ embedded = false }: { embedded?: boolean }) {
  const maxHpLevel = useGameStore((s) => s.maxHpLevel);
  const baseDamageLevel = useGameStore((s) => s.baseDamageLevel);
  const attackSpeedLevel = useGameStore((s) => s.attackSpeedLevel);
  const rangeLevel = useGameStore((s) => s.rangeLevel);
  const arms = useGameStore((s) => s.arms);
  const armTier = useGameStore((s) => s.armTier);
  const incomeMultiplier = useGameStore((s) => s.incomeMultiplier);
  const gold = useGameStore((s) => s.gold);

  const getHpUpgradeCost = useGameStore((s) => s.getHpUpgradeCost);
  const getDamageUpgradeCost = useGameStore((s) => s.getDamageUpgradeCost);
  const getAttackSpeedUpgradeCost = useGameStore(
    (s) => s.getAttackSpeedUpgradeCost,
  );
  const getRangeUpgradeCost = useGameStore((s) => s.getRangeUpgradeCost);
  const getIncomeUpgradeCost = useGameStore((s) => s.getIncomeUpgradeCost);
  const getArmsUpgradeCost = useGameStore((s) => s.getArmsUpgradeCost);
  const upgradeHP = useGameStore((s) => s.upgradeHP);
  const upgradeDamage = useGameStore((s) => s.upgradeDamage);
  const upgradeAttackSpeed = useGameStore((s) => s.upgradeAttackSpeed);
  const upgradeRange = useGameStore((s) => s.upgradeRange);
  const upgradeIncome = useGameStore((s) => s.upgradeIncome);
  const upgradeArms = useGameStore((s) => s.upgradeArms);
  const getMaxHp = useGameStore((s) => s.getMaxHp);
  const getBaseDamage = useGameStore((s) => s.getBaseDamage);
  const getUpgradeCooldownAt = useGameStore((s) => s.getUpgradeCooldownAt);
  const getUpgradeRangeAt = useGameStore((s) => s.getUpgradeRangeAt);

  const hpCost = getHpUpgradeCost();
  const damageCost = getDamageUpgradeCost();
  const speedCost = getAttackSpeedUpgradeCost();
  const rangeCost = getRangeUpgradeCost();
  const incomeCost = getIncomeUpgradeCost();
  const armsCost = getArmsUpgradeCost();

  const currentCd = getUpgradeCooldownAt(attackSpeedLevel);
  const nextCd = getUpgradeCooldownAt(
    Math.min(attackSpeedLevel + 1, MAX_STAT_LEVEL),
  );
  const cdDelta = nextCd - currentCd;
  const speedAtMax = attackSpeedLevel >= MAX_STAT_LEVEL;

  const currentRange = getUpgradeRangeAt(rangeLevel);
  const nextRange = getUpgradeRangeAt(
    Math.min(rangeLevel + 1, MAX_STAT_LEVEL),
  );
  const rangeDelta = nextRange - currentRange;
  const rangeAtMax = rangeLevel >= MAX_STAT_LEVEL;

  const grid = (
    <div
      className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${embedded ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
    >
      <UpgradeCard
        icon={<HeartPulse className="h-5 w-5 text-rose-400" />}
        title={`Max HP: Nível ${maxHpLevel}`}
        subtitle={`HP atual: ${getMaxHp()}`}
        cost={hpCost}
        canAfford={gold >= hpCost}
        onUpgrade={upgradeHP}
      />
      <UpgradeCard
        icon={<Swords className="h-5 w-5 text-amber-400" />}
        title={`Dano: Nível ${baseDamageLevel}`}
        subtitle={`Dano base: ${getBaseDamage()}`}
        cost={damageCost}
        canAfford={gold >= damageCost}
        onUpgrade={upgradeDamage}
      />
      <UpgradeCard
        icon={<Gauge className="h-5 w-5 text-lime-400" />}
        title={
          speedAtMax
            ? `Velocidade: ${currentCd}ms`
            : `Velocidade: ${currentCd}ms (Próximo: ${cdDelta}ms)`
        }
        subtitle={
          speedAtMax
            ? `Nível máximo (${MAX_STAT_LEVEL})`
            : `Nível ${attackSpeedLevel}/${MAX_STAT_LEVEL}`
        }
        cost={speedCost}
        canAfford={!speedAtMax && gold >= speedCost}
        onUpgrade={upgradeAttackSpeed}
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
            ? `Nível máximo (${MAX_STAT_LEVEL})`
            : `Nível ${rangeLevel}/${MAX_STAT_LEVEL}`
        }
        cost={rangeCost}
        canAfford={!rangeAtMax && gold >= rangeCost}
        onUpgrade={upgradeRange}
      />
      <UpgradeCard
        icon={<Coins className="h-5 w-5 text-yellow-400" />}
        title={`Multiplicador: ${incomeMultiplier.toFixed(1)}x`}
        subtitle="Renda de ouro por kill"
        cost={incomeCost}
        canAfford={gold >= incomeCost}
        onUpgrade={upgradeIncome}
      />
      <UpgradeCard
        icon={<Hand className="h-5 w-5 text-sky-400" />}
        title={`Braços: ${arms} (Tier ${armTier})`}
        subtitle={arms < 6 ? "Próximo: +1 braço" : "Próximo: sobe Tier"}
        cost={armsCost}
        canAfford={gold >= armsCost}
        onUpgrade={upgradeArms}
      />
    </div>
  );

  if (embedded) {
    return <div className="pointer-events-auto">{grid}</div>;
  }

  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
      <div className="pointer-events-auto mx-auto max-w-5xl">{grid}</div>
    </footer>
  );
}

type UpgradeCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  cost: number;
  canAfford: boolean;
  onUpgrade: () => boolean;
};

function UpgradeCard({
  icon,
  title,
  subtitle,
  cost,
  canAfford,
  onUpgrade,
}: UpgradeCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-3 shadow-lg backdrop-blur-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-50">{title}</p>
        <p className="truncate text-xs text-zinc-400">{subtitle}</p>
        <p className="mt-0.5 text-xs text-amber-300/90">
          Custo: {cost.toLocaleString("pt-BR")} Ouro
        </p>
      </div>
      <button
        type="button"
        disabled={!canAfford}
        onClick={() => onUpgrade()}
        className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        Upgrade
      </button>
    </div>
  );
}
