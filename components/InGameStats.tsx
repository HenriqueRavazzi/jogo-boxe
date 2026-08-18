"use client";

import {
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  clampCameraZoom,
} from "@/lib/gameVisualSettings";
import { formatSciNumber } from "@/lib/formatNumber";
import { getEndlessXpMultiplier } from "@/src/game/systems/Spawner";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

/** Painel lateral de stats em tempo real durante a partida. */
export function InGameStats() {
  const currentHp = useArenaStore((s) => Math.ceil(s.currentHp));
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const timeAlive = useArenaStore((s) => Math.floor(s.timeAlive));
  const matchBuffs = useArenaStore((s) => s.matchBuffs);
  const runMode = useArenaStore((s) => s.runMode);
  const runStage = useArenaStore((s) => s.runStage);
  const stageBossDefeated = useArenaStore((s) => s.stageBossDefeated);
  const stageEnemiesDefeated = useArenaStore((s) => s.stageEnemiesDefeated);
  const stageCommonsSpawned = useArenaStore((s) => s.stageCommonsSpawned);
  const enemiesDefeated = useArenaStore((s) => s.runStats.enemiesDefeated);
  const bossesKilled = useArenaStore((s) => s.runStats.bossesKilled);

  const skillTree = useGameStore((s) => s.skillTree);
  const maxHpLevel = useGameStore((s) => s.maxHpLevel);
  const baseDamage = useGameStore((s) => s.baseDamage);
  const attackSpeedLevel = useGameStore((s) => s.attackSpeedLevel);
  const rangeLevel = useGameStore((s) => s.rangeLevel);
  const xpBonusLevel = useGameStore((s) => s.xpBonusLevel);
  const incomeMultiplier = useGameStore((s) => s.incomeMultiplier);
  const getEffectiveStats = useGameStore((s) => s.getEffectiveStats);
  const getEquippedTeamBuffs = useGameStore((s) => s.getEquippedTeamBuffs);
  const visualSettings = useGameStore((s) => s.visualSettings);
  const setVisualSettings = useGameStore((s) => s.setVisualSettings);
  const cameraZoom = clampCameraZoom(visualSettings.cameraZoom);

  void skillTree;
  void maxHpLevel;
  void baseDamage;
  void attackSpeedLevel;
  void rangeLevel;
  void xpBonusLevel;

  const stats = getEffectiveStats();
  const teamBuffs = getEquippedTeamBuffs();

  const damage = Math.round(stats.damage * matchBuffs.damageMultiplier);
  const cooldown = Math.max(
    1,
    Math.round(stats.attackCooldownMs / matchBuffs.attackSpeed),
  );
  const attacksPerSecond = 1000 / cooldown;
  const xpPct = Math.round((stats.xpMultiplier - 1) * 100);
  const critDamage =
    stats.critDamageMultiplier * (matchBuffs.critDamageMultiplier ?? 1);
  const critChancePct = Math.round(
    Math.min(
      1,
      stats.critChance + (matchBuffs.critChanceBonus ?? 0),
    ) * 100,
  );
  const skillDamagePct = Math.round(
    ((matchBuffs.skillDamageMultiplier ?? 1) - 1) * 100,
  );
  const damageReductionPct = Math.round(
    (1 - (matchBuffs.damageTakenMultiplier ?? 1)) * 100,
  );
  const thornsPct = Math.round((matchBuffs.thornsReflectRatio ?? 0) * 100);
  const incomeDisplay = (
    incomeMultiplier * teamBuffs.goldIncomeMultiplier
  ).toFixed(1);

  const endlessXpMul =
    runMode === "endless" ? getEndlessXpMultiplier(timeAlive) : 1;
  const endlessXpBonusPct = Math.round((endlessXpMul - 1) * 100);

  const rows: { label: string; value: string }[] = [
    ...(runMode === "endless"
      ? [
          { label: "Modo", value: "Endless" },
          {
            label: "Abates",
            value: enemiesDefeated.toLocaleString("pt-BR"),
          },
          {
            label: "Chefes",
            value: bossesKilled.toLocaleString("pt-BR"),
          },
          ...(endlessXpBonusPct > 0
            ? [
                {
                  label: "XP Endless",
                  value: `+${endlessXpBonusPct}%`,
                },
              ]
            : []),
        ]
      : runStage
        ? [
            {
              label: "Fase",
              value: String(runStage.stageNumber),
            },
            {
              label: "Abates",
              value: `${stageEnemiesDefeated}/${runStage.enemyCount + 1}`,
            },
            {
              label: "Spawn",
              value: `${stageCommonsSpawned}/${runStage.enemyCount}`,
            },
            {
              label: "Chefe",
              value: stageBossDefeated ? "OK" : "vivo/pendente",
            },
            {
              label: "Diff",
              value: `${runStage.difficultyMul.toFixed(2)}×`,
            },
          ]
        : []),
    { label: "HP", value: `${formatSciNumber(Math.ceil(currentHp))}/${formatSciNumber(stats.maxHp)}` },
    { label: "Dano", value: formatSciNumber(damage) },
    { label: "APS", value: attacksPerSecond.toFixed(2) },
    { label: "Chance Crít.", value: `${critChancePct}%` },
    { label: "Dano Crít.", value: `${critDamage.toFixed(2)}x` },
    {
      label: "Dano Skill",
      value: skillDamagePct > 0 ? `+${skillDamagePct}%` : "0%",
    },
    {
      label: "Redução Dano",
      value: damageReductionPct > 0 ? `-${damageReductionPct}%` : "0%",
    },
    {
      label: "Espinhos",
      value: thornsPct > 0 ? `${thornsPct}%` : "0%",
    },
    { label: "XP", value: xpPct > 0 ? `+${xpPct}%` : "0%" },
    { label: "Nível", value: String(matchLevel) },
    { label: "Renda", value: incomeDisplay },
  ];

  return (
    <div className="pointer-events-none absolute left-4 top-36 z-20 flex w-44 flex-col gap-2 sm:top-40">
      <aside className="pointer-events-auto rounded-xl border border-white/10 bg-black/60 p-2.5 text-zinc-100 shadow-lg backdrop-blur-md">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Zoom
          </p>
          <span className="text-[10px] font-semibold tabular-nums text-sky-300">
            {Math.round(cameraZoom * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={Math.round(CAMERA_ZOOM_MIN * 100)}
          max={Math.round(CAMERA_ZOOM_MAX * 100)}
          step={5}
          value={Math.round(cameraZoom * 100)}
          onChange={(e) =>
            setVisualSettings({ cameraZoom: Number(e.target.value) / 100 })
          }
          className="w-full accent-sky-500"
          aria-label="Zoom da câmera"
        />
        <p className="mt-1 text-[9px] leading-snug text-zinc-500">
          Longe esconde ícones de loot
        </p>
      </aside>

      <aside className="rounded-xl border border-white/10 bg-black/60 p-3 text-zinc-100 shadow-lg backdrop-blur-md">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Stats
        </p>
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="text-zinc-400">{row.label}</span>
              <span className="font-semibold tabular-nums text-zinc-50">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
