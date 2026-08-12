"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Circle,
  Crown,
  Flame,
  Ghost,
  Mountain,
  Snowflake,
  Spline,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  DEFAULT_MATCH_SKILL_BONUS,
  getMaxActiveRunSkills,
  MAX_ACTIVE_RUN_SKILLS,
  SPECIAL_SKILL_KEYS,
  type MatchSkillBonusState,
  type SpecialSkillKey,
} from "@/lib/matchUpgrades";
import { getMasteryCardInfo } from "@/lib/skillMastery";
import { getExtraActiveRunSkillSlots } from "@/lib/skillTree";
import {
  AURA_ELEMENT_LABELS,
  AURA_LIGHTNING_SLOW,
  AURA_NEUTRAL_SLOW,
  AURA_RICOCHET_SPLASH_RATIO,
  AURA_STONE_OUTGOING_DAMAGE_MUL,
  AURA_VENDAVAL_PULL_STRENGTH,
  buildAuraElementPowersFromRun,
  getAuraFireDps,
  getAuraIceStunIntervalMs,
  getAuraNeutralDps,
  getAuraRadius,
  getAuraShadowBurstDamage,
  getAuraShadowBurstIntervalMs,
  listRunAuraElements,
} from "@/src/game/systems/AuraSystem";
import {
  getLightningBurstDamage,
  getSkillCooldownInfo,
  getSkillCycleMs,
  LIGHTNING_AOE_RADIUS,
  STONE_DEBUFF_BASE_MS,
  STONE_ENEMY_POWER_MUL,
  STONE_QUAKE_DAMAGE_RATIO,
  VENDAVAL_BASE_RADIUS,
  VENDAVAL_DAMAGE_RATIO,
  VENDAVAL_PULL_DURATION_MS,
  VENDAVAL_RADIUS_PER_MATCH,
  VENDAVAL_RADIUS_PER_META,
} from "@/src/game/systems/ActiveSkillsSystem";
import {
  getShadowCloneCooldownMs,
  getShadowCloneStatRatio,
  getShadowCloneTtlMs,
  SHADOW_CLONE_STAT_RATIO,
} from "@/src/game/systems/ShadowCloneSystem";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

const SKILL_UI: Record<
  SpecialSkillKey,
  { name: string; icon: ReactNode; ring: string; fill: string; blurb: string }
> = {
  ice: {
    name: "Gelo",
    icon: <Snowflake className="h-5 w-5" aria-hidden />,
    ring: "stroke-sky-400",
    fill: "text-sky-200",
    blurb: "Onda periódica: congela e deixa vulnerável (+30% dano).",
  },
  lightning: {
    name: "Raio",
    icon: <Zap className="h-5 w-5" aria-hidden />,
    ring: "stroke-yellow-300",
    fill: "text-yellow-100",
    blurb:
      "Só dispara com alvo. Homing + explosão em área (dano e eletrificação).",
  },
  fire: {
    name: "Fogo",
    icon: <Flame className="h-5 w-5" aria-hidden />,
    ring: "stroke-orange-400",
    fill: "text-orange-200",
    blurb: "Queimadura passiva on-hit com stacks cumulativos.",
  },
  stone: {
    name: "Pedra",
    icon: <Mountain className="h-5 w-5" aria-hidden />,
    ring: "stroke-stone-400",
    fill: "text-stone-200",
    blurb:
      "Terremoto: dano em todos os inimigos e −50% AS/dano deles por 10s.",
  },
  shadow: {
    name: "Shadow Clone",
    icon: <Ghost className="h-5 w-5" aria-hidden />,
    ring: "stroke-violet-400",
    fill: "text-violet-200",
    blurb:
      "Clone com 15% dos stats, sem heal/skills. Alvos diferentes (exceto boss).",
  },
  ricochet: {
    name: "Ricochete",
    icon: <Spline className="h-5 w-5" aria-hidden />,
    ring: "stroke-violet-400",
    fill: "text-violet-200",
    blurb: "Socos saltam entre inimigos na janela ativa.",
  },
  aura: {
    name: "Aura",
    icon: <Circle className="h-5 w-5" aria-hidden />,
    ring: "stroke-fuchsia-400",
    fill: "text-fuchsia-200",
    blurb:
      "Sinergia só com skills ativas na run. 1 parceira = 100%; 2 = 100%/50%. Sozinha = neutra.",
  },
  vendaval: {
    name: "Vendaval",
    icon: <Wind className="h-5 w-5" aria-hidden />,
    ring: "stroke-cyan-400",
    fill: "text-cyan-100",
    blurb:
      "Cria um vácuo periódico que puxa os inimigos para o centro.",
  },
};

function resolveActiveSkills(
  activeRunSkills: SpecialSkillKey[],
  matchSkills: Record<SpecialSkillKey, number>,
  maxSlots: number = MAX_ACTIVE_RUN_SKILLS,
): SpecialSkillKey[] {
  const fromLevels = SPECIAL_SKILL_KEYS.filter((k) => (matchSkills[k] ?? 0) > 0);
  return Array.from(new Set([...activeRunSkills, ...fromLevels])).slice(
    0,
    maxSlots,
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
          filter: active
            ? "drop-shadow(0 0 4px rgba(52,211,153,0.7))"
            : undefined,
        }}
      />
    </svg>
  );
}

function formatMs(ms: number): string {
  if (ms <= 0) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

type StatRow = { label: string; value: string; accent?: boolean };

function formatBonusPct(mul: number, invert = false): string | null {
  if (Math.abs(mul - 1) < 0.001) return null;
  if (invert) {
    const pct = Math.round((1 - mul) * 100);
    return pct === 0 ? null : `−${pct}%`;
  }
  const pct = Math.round((mul - 1) * 100);
  return pct === 0 ? null : `+${pct}%`;
}

function buildRunBonusNote(bonus: MatchSkillBonusState): string | null {
  const parts: string[] = [];
  const dmg = formatBonusPct(bonus.damageMul);
  const cd = formatBonusPct(bonus.cooldownMul, true);
  const dur = formatBonusPct(bonus.durationMul);
  const rad = formatBonusPct(bonus.radiusMul ?? 1);
  if (dmg) parts.push(`${dmg} dano`);
  if (cd) parts.push(`${cd} CD`);
  if (dur) parts.push(`${dur} duração`);
  if (rad) parts.push(`${rad} raio`);
  if (bonus.extraHits > 0) parts.push(`+${bonus.extraHits} hits/stacks`);
  if (bonus.extraProjectiles > 0) {
    parts.push(`+${bonus.extraProjectiles} projétil(is)`);
  }
  if (parts.length === 0) return null;
  return `Cartas de raridade nesta run: ${parts.join(" · ")}.`;
}

function buildSkillStatRows(
  key: SpecialSkillKey,
  level: number,
  skillDmgMul: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
): { rows: StatRow[]; levelBonusNote: string; skillDmgNote: string } {
  const skills = useGameStore.getState().skills;
  const prestigeMul = useGameStore.getState().getPrestigeMultiplier();
  const stats = useGameStore.getState().getEffectiveStats();
  const matchBuffs = useArenaStore.getState().matchBuffs;
  const punchBase = stats.damage * matchBuffs.damageMultiplier;
  const skillPunchBase = punchBase * skillDmgMul;
  const skillDmgPct = Math.round((skillDmgMul - 1) * 100);
  const skillDmgNote =
    skillDmgPct > 0
      ? `Cartas de Dano das Skills nesta run: +${skillDmgPct}% no dano de skills (queimadura, raio, ricochete…).`
      : `Sem cartas de Dano das Skills ainda — bônus atual 0%.`;
  const runBonusNote = buildRunBonusNote(bonus);

  if (key === "fire") {
    const levelMul = 1 + level * 0.15;
    const levelPct = Math.round((levelMul - 1) * 100);
    const burnPerStack =
      skillPunchBase * 0.2 * levelMul * bonus.damageMul;
    const maxStacks = Math.max(
      1,
      1 +
        Math.round(skills.fire.damage * prestigeMul) +
        Math.max(0, bonus.extraHits),
    );
    const durationMs = Math.round(
      (2000 + skills.fire.duration * 500) * bonus.durationMul,
    );
    return {
      rows: [
        { label: "Tipo", value: "Passivo (on-hit)" },
        { label: "Nível in-run", value: String(level) },
        {
          label: "Burn / stack",
          value: `${burnPerStack.toFixed(1)} DPS`,
          accent: true,
        },
        { label: "Stacks máx.", value: String(maxStacks) },
        {
          label: "Burn total (máx.)",
          value: `${(burnPerStack * maxStacks).toFixed(1)} DPS`,
        },
        { label: "Duração do stack", value: formatMs(durationMs) },
      ],
      levelBonusNote: [
        `Nível ${level} da skill: +${levelPct}% no burn.`,
        runBonusNote,
      ]
        .filter(Boolean)
        .join(" "),
      skillDmgNote,
    };
  }

  if (key === "ice") {
    const cycleMs = Math.max(
      5_000,
      (20_000 - skills.ice.cooldown * 1_000 * prestigeMul) *
        bonus.cooldownMul,
    );
    const freezeMs = Math.round(
      (1000 + Math.round(skills.ice.duration * 500 * prestigeMul)) *
        bonus.durationMul,
    );
    const range = Math.max(
      40,
      stats.attackRange * matchBuffs.attackRange * 0.4,
    );
    return {
      rows: [
        { label: "Tipo", value: "Ativo periódico" },
        { label: "Nível in-run", value: String(level) },
        { label: "Cooldown", value: formatMs(cycleMs) },
        { label: "Duração do gelo", value: formatMs(freezeMs) },
        { label: "Raio da onda", value: `${Math.round(range)} px` },
        {
          label: "Vulnerabilidade",
          value: "+30% dano recebido",
          accent: true,
        },
      ],
      levelBonusNote: [
        `Nível ${level}: mantém a skill ativa na run (escala via árvore roxa / prestígio).`,
        runBonusNote,
      ]
        .filter(Boolean)
        .join(" "),
      skillDmgNote,
    };
  }

  if (key === "lightning") {
    const cycleMs = Math.max(
      5_000,
      (20_000 - skills.lightning.cooldown * 1_000 * prestigeMul) *
        bonus.cooldownMul,
    );
    const burst =
      getLightningBurstDamage(
        punchBase * skillDmgMul,
        skills.lightning.damage,
        skills.lightning.hits + Math.max(0, bonus.extraHits),
      ) *
      prestigeMul *
      bonus.damageMul;
    const boltCount = 1 + Math.max(0, bonus.extraProjectiles);
    return {
      rows: [
        { label: "Tipo", value: "Ativo periódico" },
        { label: "Nível in-run", value: String(level) },
        { label: "Cooldown", value: formatMs(cycleMs) },
        {
          label: "Dano do estouro",
          value: burst.toFixed(1),
          accent: true,
        },
        { label: "Raio da explosão", value: `${LIGHTNING_AOE_RADIUS} px` },
        { label: "Raios por ciclo", value: String(boltCount) },
        {
          label: "Burst (meta+cartas)",
          value: String(
            Math.max(1, skills.lightning.hits + Math.max(0, bonus.extraHits)),
          ),
        },
        {
          label: "Dano meta",
          value: String(Math.max(0, skills.lightning.damage)),
        },
      ],
      levelBonusNote: [
        `Nível ${level}: só dispara com inimigo na tela. Explode em área com shock.`,
        runBonusNote,
      ]
        .filter(Boolean)
        .join(" "),
      skillDmgNote,
    };
  }

  if (key === "aura") {
    const arena = useArenaStore.getState();
    const preferred = useGameStore.getState().auraPrimaryElement;
    const runElements = listRunAuraElements(
      arena.activeRunSkills,
      arena.matchSkills,
    );
    const { powers, primary, neutral } = buildAuraElementPowersFromRun(
      runElements,
      preferred,
    );
    const powerTag = (element: keyof typeof powers) => {
      const p = powers[element];
      if (p <= 0) return "";
      if (p >= 1) return " · principal";
      return " · 50%";
    };
    const radius = getAuraRadius(
      level,
      skills.aura.radius,
      bonus,
      prestigeMul,
    );
    const neutralDps = neutral
      ? getAuraNeutralDps(
          punchBase * skillDmgMul,
          level,
          skills.aura.damage,
          bonus,
          prestigeMul,
        )
      : 0;
    const dps = powers.fire
      ? getAuraFireDps(
          punchBase * skillDmgMul,
          level,
          skills.aura.damage,
          bonus,
          prestigeMul,
          powers.fire,
        )
      : 0;
    const stunInterval = powers.ice
      ? getAuraIceStunIntervalMs(skills.aura.pulse, bonus, prestigeMul)
      : 0;
    const shadowBurst = powers.shadow
      ? getAuraShadowBurstDamage(
          punchBase * skillDmgMul,
          level,
          skills.aura.damage,
          bonus,
          prestigeMul,
          powers.shadow,
        )
      : 0;
    const shadowInterval = powers.shadow
      ? getAuraShadowBurstIntervalMs(skills.aura.pulse, bonus, prestigeMul)
      : 0;
    const lightningSlowPct = Math.round(
      AURA_LIGHTNING_SLOW * powers.lightning * 100,
    );
    const stoneOutgoingPct = Math.round(
      (1 - (1 - AURA_STONE_OUTGOING_DAMAGE_MUL) * powers.stone) * 100,
    );
    const ricochetSplashPct = Math.round(
      AURA_RICOCHET_SPLASH_RATIO * powers.ricochet * 100,
    );
    const synergyRows = neutral
      ? [
          {
            label: "Neutro (DPS)",
            value: `${neutralDps.toFixed(1)}/s`,
          },
          {
            label: "Neutro (slow)",
            value: `${Math.round(AURA_NEUTRAL_SLOW * 100)}% lentidão`,
          },
        ]
      : [
          {
            label: `Fogo (DPS)${powerTag("fire")}`,
            value: powers.fire ? `${dps.toFixed(1)}/s` : "— (não na run)",
          },
          {
            label: `Raio (slow)${powerTag("lightning")}`,
            value: powers.lightning
              ? `${lightningSlowPct}% lentidão`
              : "— (não na run)",
          },
          {
            label: `Gelo (stun)${powerTag("ice")}`,
            value: powers.ice
              ? `a cada ${formatMs(stunInterval)}`
              : "— (não na run)",
          },
          {
            label: `Shadow (burst)${powerTag("shadow")}`,
            value: powers.shadow
              ? `${shadowBurst.toFixed(0)} a cada ${formatMs(shadowInterval)}`
              : "— (não na run)",
          },
          {
            label: `Pedra (defesa)${powerTag("stone")}`,
            value: powers.stone
              ? `inimigos na aura causam ${stoneOutgoingPct}% dano`
              : "— (não na run)",
          },
          {
            label: `Ricochete (splash)${powerTag("ricochet")}`,
            value: powers.ricochet
              ? `hits → ${ricochetSplashPct}% em todos na aura`
              : "— (não na run)",
          },
          {
            label: `Vendaval (puxão)${powerTag("vendaval")}`,
            value: powers.vendaval
              ? `puxão contínuo (${Math.round(AURA_VENDAVAL_PULL_STRENGTH * powers.vendaval * 100)}%)`
              : "— (não na run)",
          },
        ];
    return {
      rows: [
        { label: "Tipo", value: "Aura passiva" },
        {
          label: "Modo",
          value: neutral
            ? "Neutra (DPS + slow leve)"
            : primary
              ? `Sinergia: ${AURA_ELEMENT_LABELS[primary]}`
              : "Sinergia",
          accent: true,
        },
        { label: "Nível in-run", value: String(level) },
        { label: "Raio", value: `${Math.round(radius)} px` },
        ...synergyRows,
      ],
      levelBonusNote: [
        `Nível ${level}: sinergia só com skills ativas nesta run (1 = 100%; 2 = 100%/50%). Sem parceira → aura neutra.`,
        runBonusNote,
      ]
        .filter(Boolean)
        .join(" "),
      skillDmgNote,
    };
  }

  if (key === "shadow") {
    const ratio = getShadowCloneStatRatio(
      level,
      skills.shadow.damage,
      bonus,
      prestigeMul,
    );
    const ttl = getShadowCloneTtlMs(
      skills.shadow.duration,
      bonus,
      prestigeMul,
    );
    const cd = getShadowCloneCooldownMs(
      skills.shadow.cooldown,
      bonus,
      prestigeMul,
    );
    return {
      rows: [
        { label: "Tipo", value: "Invocação" },
        { label: "Nível in-run", value: String(level) },
        {
          label: "Poder do clone",
          value: `${Math.round(ratio * 100)}% dos stats`,
          accent: true,
        },
        {
          label: "HP base",
          value: `${Math.round(SHADOW_CLONE_STAT_RATIO * 100)}% do herói`,
        },
        { label: "Duração", value: formatMs(ttl) },
        { label: "Cooldown", value: formatMs(cd) },
        { label: "Heal / skills", value: "Nenhum" },
        { label: "Alvos", value: "Diferentes do herói (boss ok)" },
      ],
      levelBonusNote: [
        `Nível ${level}: 1 clone por vez. Sem recuperação de vida e sem skills.`,
        runBonusNote,
      ]
        .filter(Boolean)
        .join(" "),
      skillDmgNote,
    };
  }

  if (key === "stone") {
    const quakeDamage =
      punchBase *
      skillDmgMul *
      STONE_QUAKE_DAMAGE_RATIO *
      (1 + level * 0.12) *
      (1 + skills.stone.damage * 0.08 * prestigeMul) *
      bonus.damageMul;
    const debuffMs = Math.round(
      (STONE_DEBUFF_BASE_MS + skills.stone.duration * 800 * prestigeMul) *
        bonus.durationMul,
    );
    const cycleMs = Math.max(
      6_000,
      (18_000 - skills.stone.cooldown * 700 * prestigeMul) * bonus.cooldownMul,
    );
    return {
      rows: [
        { label: "Tipo", value: "Terremoto global" },
        { label: "Nível in-run", value: String(level) },
        {
          label: "Dano",
          value: quakeDamage.toFixed(1),
          accent: true,
        },
        {
          label: "Debuff",
          value: `−${Math.round((1 - STONE_ENEMY_POWER_MUL) * 100)}% AS e dano`,
        },
        { label: "Duração debuff", value: formatMs(debuffMs) },
        { label: "Cooldown", value: formatMs(cycleMs) },
      ],
      levelBonusNote: [
        `Nível ${level}: afeta todos os inimigos na tela.`,
        runBonusNote,
      ]
        .filter(Boolean)
        .join(" "),
      skillDmgNote,
    };
  }

  if (key === "vendaval") {
    const radius = Math.max(
      120,
      (VENDAVAL_BASE_RADIUS +
        level * VENDAVAL_RADIUS_PER_MATCH +
        skills.vendaval.radius * VENDAVAL_RADIUS_PER_META * prestigeMul) *
        bonus.radiusMul,
    );
    const impact =
      skillPunchBase *
      VENDAVAL_DAMAGE_RATIO *
      (1 + level * 0.1) *
      (1 + skills.vendaval.damage * 0.08 * prestigeMul) *
      bonus.damageMul;
    const cycleMs = Math.max(
      5_000,
      (7_500 - skills.vendaval.cooldown * 200 * prestigeMul) *
        bonus.cooldownMul,
    );
    return {
      rows: [
        { label: "Tipo", value: "Vácuo periódico" },
        { label: "Nível in-run", value: String(level) },
        {
          label: "Dano",
          value: impact.toFixed(1),
          accent: true,
        },
        { label: "Raio", value: `${Math.round(radius)}px` },
        { label: "Puxão", value: formatMs(VENDAVAL_PULL_DURATION_MS) },
        { label: "Cooldown", value: formatMs(cycleMs) },
      ],
      levelBonusNote: [
        `Nível ${level}: puxa inimigos no raio para o centro.`,
        runBonusNote,
      ]
        .filter(Boolean)
        .join(" "),
      skillDmgNote,
    };
  }

  // ricochet
  const cycleMs = Math.max(
    2_000,
    (7_000 - skills.ricochet.cooldown * 500 * prestigeMul) *
      bonus.cooldownMul,
  );
  const maxBounces =
    2 +
    Math.round(skills.ricochet.hits * prestigeMul) +
    Math.max(0, bonus.extraHits);
  const bouncePct =
    (0.6 + skills.ricochet.damage * 0.15) *
    Math.min(1.5, prestigeMul) *
    bonus.damageMul;
  return {
    rows: [
      { label: "Tipo", value: "Janela ativa" },
      { label: "Nível in-run", value: String(level) },
      { label: "Cooldown", value: formatMs(cycleMs) },
      { label: "Saltos máx.", value: String(maxBounces) },
      {
        label: "Dano por salto",
        value: `${Math.round(bouncePct * 100)}% do soco`,
        accent: true,
      },
      {
        label: "Com Dano Skills",
        value: `${(skillPunchBase * bouncePct).toFixed(1)} (aprox.)`,
      },
    ],
    levelBonusNote: [
      `Nível ${level}: skill ativa na run. Saltos/dano escalam com meta roxa e prestígio.`,
      runBonusNote,
    ]
      .filter(Boolean)
      .join(" "),
    skillDmgNote,
  };
}

function SkillDetailPanel({
  skillKey,
  onClose,
}: {
  skillKey: SpecialSkillKey;
  onClose: () => void;
}) {
  const matchSkills = useArenaStore((s) => s.matchSkills);
  const matchSkillMastery = useArenaStore((s) => s.matchSkillMastery);
  const matchBuffs = useArenaStore((s) => s.matchBuffs);
  const matchSkillBonuses = useArenaStore((s) => s.matchSkillBonuses);
  const pulse = useArenaStore((s) => s.activeSkillPulse);
  const gameClockMs = useArenaStore((s) => s.gameClockMs);
  const skills = useGameStore((s) => s.skills);

  const ui = SKILL_UI[skillKey];
  const level = matchSkills[skillKey] ?? 0;
  const mastered = Boolean(matchSkillMastery[skillKey]);
  const masteryInfo = getMasteryCardInfo(skillKey);
  const bonus = matchSkillBonuses[skillKey] ?? DEFAULT_MATCH_SKILL_BONUS;
  const skillDmgMul = matchBuffs.skillDamageMultiplier ?? 1;
  const info = getSkillCooldownInfo(
    skillKey,
    pulse,
    skills,
    gameClockMs,
    bonus.cooldownMul,
  );
  const { rows, levelBonusNote, skillDmgNote } = buildSkillStatRows(
    skillKey,
    level,
    skillDmgMul,
    bonus,
  );

  const modeLabel =
    info.mode === "passive"
      ? "Passivo"
      : info.mode === "active"
        ? "Ativo agora"
        : info.mode === "ready"
          ? "Pronto"
          : "Em cooldown";

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-full z-30 mt-2 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-white/15 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-label={`Detalhes de ${ui.name}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-zinc-900 ${ui.fill}`}
          >
            {ui.icon}
            {mastered && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-amber-300/80 bg-amber-500 text-amber-950">
                <Crown className="h-2.5 w-2.5" aria-hidden />
              </span>
            )}
          </div>
          <div>
            <p className="inline-flex flex-wrap items-center gap-1.5 text-sm font-black text-zinc-50">
              {ui.name}
              {mastered && (
                <span className="rounded-md border border-amber-400/50 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                  Master
                </span>
              )}
            </p>
            <p className="text-[10px] text-zinc-400">
              Nv. {level} · {modeLabel}
              {info.cycleMs > 0
                ? ` · ciclo ${formatMs(getSkillCycleMs(skillKey, skills, bonus.cooldownMul))}`
                : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mb-3 text-[11px] leading-snug text-zinc-500">{ui.blurb}</p>

      <ul className="mb-3 space-y-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 text-[11px]"
          >
            <span className="text-zinc-500">{row.label}</span>
            <span
              className={`font-semibold tabular-nums ${
                row.accent ? "text-amber-200" : "text-zinc-100"
              }`}
            >
              {row.value}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-zinc-500">Maestria Suprema</span>
          <span
            className={`font-semibold ${
              mastered ? "text-amber-200" : "text-zinc-500"
            }`}
          >
            {mastered ? "Ativa" : "—"}
          </span>
        </li>
      </ul>

      <div className="space-y-2">
        {mastered && (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-2">
            <p className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-300/90">
              <Crown className="h-3 w-3" aria-hidden />
              {masteryInfo.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-amber-100/90">
              {masteryInfo.description}
            </p>
          </div>
        )}
        <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange-300/80">
            Bônus por nível da skill
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-orange-100/90">
            {levelBonusNote}
          </p>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-300/80">
            Dano das Skills (cartas de level-up)
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-100/90">
            {skillDmgNote}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * HUD de combate: slots de skills especiais + anel de cooldown.
 */
export function HUD() {
  const activeRunSkills = useArenaStore((s) => s.activeRunSkills);
  const matchSkills = useArenaStore((s) => s.matchSkills);
  const matchSkillMastery = useArenaStore((s) => s.matchSkillMastery);
  const matchSkillBonuses = useArenaStore((s) => s.matchSkillBonuses);
  const pulse = useArenaStore((s) => s.activeSkillPulse);
  const gameClockMs = useArenaStore((s) => s.gameClockMs);
  const skills = useGameStore((s) => s.skills);
  const skillTree = useGameStore((s) => s.skillTree);
  const [, setTick] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<SpecialSkillKey | null>(
    null,
  );

  // Atualiza anéis ~10fps sem depender do game loop React
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, []);

  // Fecha o painel se a skill sair da run
  useEffect(() => {
    if (!selectedSkill) return;
    if ((matchSkills[selectedSkill] ?? 0) <= 0) {
      setSelectedSkill(null);
    }
  }, [matchSkills, selectedSkill]);

  // Clique fora fecha o painel
  useEffect(() => {
    if (!selectedSkill) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-skill-hud-root]")) return;
      setSelectedSkill(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedSkill]);

  const maxSlots = getMaxActiveRunSkills(
    getExtraActiveRunSkillSlots(skillTree),
  );
  const equipped = resolveActiveSkills(activeRunSkills, matchSkills, maxSlots);
  const remaining = Math.max(0, maxSlots - equipped.length);
  const gameNow = gameClockMs;

  const slots: (SpecialSkillKey | null)[] = Array.from(
    { length: maxSlots },
    (_, i) => equipped[i] ?? null,
  );

  return (
    <div
      data-skill-hud-root
      className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2"
    >
      <div className="relative">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/65 px-3 py-2.5 shadow-lg backdrop-blur-md">
          <div className="hidden min-w-[4.5rem] px-1 sm:block">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Skills
            </p>
            <p className="text-[10px] tabular-nums text-zinc-400">
              {equipped.length}/{maxSlots}
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
              const bonus =
                matchSkillBonuses[key] ?? DEFAULT_MATCH_SKILL_BONUS;
              const info = getSkillCooldownInfo(
                key,
                pulse,
                skills,
                gameNow,
                bonus.cooldownMul,
              );
              const level = matchSkills[key] ?? 0;
              const mastered = Boolean(matchSkillMastery[key]);
              const selected = selectedSkill === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setSelectedSkill((cur) => (cur === key ? null : key))
                  }
                  className={`pointer-events-auto relative flex h-[52px] w-[52px] items-center justify-center rounded-full transition ${
                    selected
                      ? "ring-2 ring-amber-300/80 ring-offset-2 ring-offset-black/60"
                      : "hover:brightness-110"
                  } ${mastered ? "ring-1 ring-amber-400/50" : ""}`}
                  title={`${ui.name} · Nv. ${level}${mastered ? " · Master" : ""} · ver stats`}
                  aria-expanded={selected}
                  aria-label={`${ui.name}, nível ${level}${mastered ? ", maestria ativa" : ""}. Clique para ver detalhes.`}
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
                  {mastered && (
                    <span className="absolute -right-0.5 -top-0.5 z-[2] flex h-3.5 w-3.5 items-center justify-center rounded-full border border-amber-300/80 bg-amber-500 text-amber-950">
                      <Crown className="h-2 w-2" aria-hidden />
                    </span>
                  )}
                  <span className="absolute -bottom-1 rounded bg-black/80 px-1 text-[8px] font-bold tabular-nums text-zinc-200">
                    {level}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedSkill && (
          <SkillDetailPanel
            skillKey={selectedSkill}
            onClose={() => setSelectedSkill(null)}
          />
        )}
      </div>
    </div>
  );
}

/** @deprecated Prefer `HUD` — mantido para imports antigos. */
export { HUD as ActiveSkillsHud };
