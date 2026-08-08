"use client";

import type { ReactNode } from "react";
import {
  Coins,
  Crosshair,
  Gauge,
  Hand,
  HeartPulse,
  Move,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import {
  MAX_CRIT_CHANCE,
  MAX_UPGRADE_LEVELS,
  formatLevelLabel,
  getMetaMaxCooldownMs,
  getMetaMaxRangePx,
  isLevelCapped,
  useGameStore,
} from "@/store/useGameStore";
import { syncWithDB } from "@/lib/syncWithDB";

/** Painel de upgrades com ouro. */
export function UpgradePanel({ embedded = false }: { embedded?: boolean }) {
  const maxHpLevel = useGameStore((s) => s.maxHpLevel);
  const baseDamageLevel = useGameStore((s) => s.baseDamageLevel);
  const attackSpeedLevel = useGameStore((s) => s.attackSpeedLevel);
  const rangeLevel = useGameStore((s) => s.rangeLevel);
  const knockbackLevel = useGameStore((s) => s.knockbackLevel);
  const critChanceLevel = useGameStore((s) => s.critChanceLevel);
  const critDamageLevel = useGameStore((s) => s.critDamageLevel);
  const arms = useGameStore((s) => s.arms);
  const incomeMultiplier = useGameStore((s) => s.incomeMultiplier);
  const gold = useGameStore((s) => s.gold);
  const baseConfig = useGameStore((s) => s.baseConfig);

  const getHpUpgradeCost = useGameStore((s) => s.getHpUpgradeCost);
  const getDamageUpgradeCost = useGameStore((s) => s.getDamageUpgradeCost);
  const getAttackSpeedUpgradeCost = useGameStore(
    (s) => s.getAttackSpeedUpgradeCost,
  );
  const getRangeUpgradeCost = useGameStore((s) => s.getRangeUpgradeCost);
  const getIncomeUpgradeCost = useGameStore((s) => s.getIncomeUpgradeCost);
  const getArmsUpgradeCost = useGameStore((s) => s.getArmsUpgradeCost);
  const getKnockbackUpgradeCost = useGameStore((s) => s.getKnockbackUpgradeCost);
  const getKnockbackPower = useGameStore((s) => s.getKnockbackPower);
  const getCritChanceUpgradeCost = useGameStore(
    (s) => s.getCritChanceUpgradeCost,
  );
  const getCritDamageUpgradeCost = useGameStore(
    (s) => s.getCritDamageUpgradeCost,
  );
  const getCritChance = useGameStore((s) => s.getCritChance);
  const getCritDamageMultiplier = useGameStore(
    (s) => s.getCritDamageMultiplier,
  );
  const upgradeHP = useGameStore((s) => s.upgradeHP);
  const upgradeDamage = useGameStore((s) => s.upgradeDamage);
  const upgradeAttackSpeed = useGameStore((s) => s.upgradeAttackSpeed);
  const upgradeRange = useGameStore((s) => s.upgradeRange);
  const upgradeIncome = useGameStore((s) => s.upgradeIncome);
  const upgradeArms = useGameStore((s) => s.upgradeArms);
  const upgradeKnockback = useGameStore((s) => s.upgradeKnockback);
  const upgradeCritChance = useGameStore((s) => s.upgradeCritChance);
  const upgradeCritDamage = useGameStore((s) => s.upgradeCritDamage);
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
  const knockbackCost = getKnockbackUpgradeCost();
  const knockbackPower = getKnockbackPower();
  const critChanceCost = getCritChanceUpgradeCost();
  const critDamageCost = getCritDamageUpgradeCost();
  const critChance = getCritChance();
  const critDamageMult = getCritDamageMultiplier();

  const incomeLevel = Math.max(
    0,
    Math.round((incomeMultiplier - 1) / 0.2),
  );

  const hpAtMax = isLevelCapped(maxHpLevel, MAX_UPGRADE_LEVELS.hp);
  const damageAtMax = isLevelCapped(baseDamageLevel, MAX_UPGRADE_LEVELS.damage);
  const incomeAtMax = isLevelCapped(incomeLevel, MAX_UPGRADE_LEVELS.income);
  const knockbackAtMax = isLevelCapped(
    knockbackLevel,
    MAX_UPGRADE_LEVELS.knockback,
  );
  const critChanceAtMax =
    isLevelCapped(critChanceLevel, MAX_UPGRADE_LEVELS.critChance) ||
    critChance >= MAX_CRIT_CHANCE;
  const critDamageAtMax = isLevelCapped(
    critDamageLevel,
    MAX_UPGRADE_LEVELS.critDamage,
  );

  const metaCdFloor = getMetaMaxCooldownMs(baseConfig.baseAttackSpeed);
  const metaRangeCeil = getMetaMaxRangePx(baseConfig.baseRange);

  const currentCd = getUpgradeCooldownAt(attackSpeedLevel);
  const nextCd = getUpgradeCooldownAt(
    Math.min(attackSpeedLevel + 1, MAX_UPGRADE_LEVELS.attackSpeed),
  );
  const cdDelta = nextCd - currentCd;
  const speedAtMax =
    attackSpeedLevel >= MAX_UPGRADE_LEVELS.attackSpeed ||
    currentCd <= metaCdFloor ||
    nextCd >= currentCd;

  const currentRange = getUpgradeRangeAt(rangeLevel);
  const nextRange = getUpgradeRangeAt(
    Math.min(rangeLevel + 1, MAX_UPGRADE_LEVELS.range),
  );
  const rangeDelta = nextRange - currentRange;
  const rangeAtMax =
    rangeLevel >= MAX_UPGRADE_LEVELS.range ||
    currentRange >= metaRangeCeil ||
    nextRange <= currentRange;

  const grid = (
    <div
      className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${embedded ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
    >
      <UpgradeCard
        icon={<HeartPulse className="h-5 w-5 text-rose-400" />}
        title={`Max HP: ${formatLevelLabel(maxHpLevel, MAX_UPGRADE_LEVELS.hp)}`}
        subtitle={`HP atual: ${getMaxHp()}`}
        cost={hpCost}
        canAfford={!hpAtMax && gold >= hpCost}
        atMax={hpAtMax}
        onUpgrade={upgradeHP}
      />
      <UpgradeCard
        icon={<Swords className="h-5 w-5 text-amber-400" />}
        title={`Dano: ${getBaseDamage()}`}
        subtitle={formatLevelLabel(baseDamageLevel, MAX_UPGRADE_LEVELS.damage)}
        cost={damageCost}
        canAfford={!damageAtMax && gold >= damageCost}
        atMax={damageAtMax}
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
            ? `MÁXIMO meta (${metaCdFloor}ms · 65%)`
            : `Nível ${attackSpeedLevel}/${MAX_UPGRADE_LEVELS.attackSpeed}`
        }
        cost={speedCost}
        canAfford={!speedAtMax && gold >= speedCost}
        atMax={speedAtMax}
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
            ? `MÁXIMO meta (${metaRangeCeil}px · 65%)`
            : `Nível ${rangeLevel}/${MAX_UPGRADE_LEVELS.range}`
        }
        cost={rangeCost}
        canAfford={!rangeAtMax && gold >= rangeCost}
        atMax={rangeAtMax}
        onUpgrade={upgradeRange}
      />
      <UpgradeCard
        icon={<Sparkles className="h-5 w-5 text-yellow-300" />}
        title={`Crítico: ${Math.round(critChance * 100)}%`}
        subtitle={
          critChanceAtMax
            ? `MÁXIMO (${Math.round(MAX_CRIT_CHANCE * 100)}%)`
            : `Nível ${critChanceLevel}/${MAX_UPGRADE_LEVELS.critChance}`
        }
        cost={critChanceCost}
        canAfford={!critChanceAtMax && gold >= critChanceCost}
        atMax={critChanceAtMax}
        onUpgrade={upgradeCritChance}
      />
      <UpgradeCard
        icon={<Zap className="h-5 w-5 text-orange-400" />}
        title={`Dano Crítico: ${critDamageMult.toFixed(2)}x`}
        subtitle={formatLevelLabel(
          critDamageLevel,
          MAX_UPGRADE_LEVELS.critDamage,
        )}
        cost={critDamageCost}
        canAfford={!critDamageAtMax && gold >= critDamageCost}
        atMax={critDamageAtMax}
        onUpgrade={upgradeCritDamage}
      />
      <UpgradeCard
        icon={<Move className="h-5 w-5 text-violet-400" />}
        title={`Knockback: ${knockbackPower}`}
        subtitle={
          knockbackAtMax
            ? "MÁXIMO"
            : formatLevelLabel(knockbackLevel, MAX_UPGRADE_LEVELS.knockback)
        }
        cost={knockbackCost}
        canAfford={!knockbackAtMax && gold >= knockbackCost}
        atMax={knockbackAtMax}
        onUpgrade={upgradeKnockback}
      />
      <UpgradeCard
        icon={<Coins className="h-5 w-5 text-yellow-400" />}
        title={`Multiplicador: ${incomeMultiplier.toFixed(1)}x`}
        subtitle={formatLevelLabel(incomeLevel, MAX_UPGRADE_LEVELS.income)}
        cost={incomeCost}
        canAfford={!incomeAtMax && gold >= incomeCost}
        atMax={incomeAtMax}
        onUpgrade={upgradeIncome}
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
  subtitleClassName?: string;
  cost: number;
  canAfford: boolean;
  atMax?: boolean;
  onUpgrade: () => boolean;
};

function UpgradeCard({
  icon,
  title,
  subtitle,
  subtitleClassName,
  cost,
  canAfford,
  atMax = false,
  onUpgrade,
}: UpgradeCardProps) {
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
            : `Custo: ${cost.toLocaleString("pt-BR")} Ouro`}
        </p>
      </div>
      <button
        type="button"
        disabled={atMax || !canAfford}
        onClick={() => {
          if (atMax) return;
          const ok = onUpgrade();
          if (ok) void syncWithDB();
        }}
        className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-50"
      >
        {atMax ? "MÁXIMO" : "Upgrade"}
      </button>
    </div>
  );
}
