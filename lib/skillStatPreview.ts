/** Texto de progresso dos atributos roxos (valor atual → próximo nível). */

import type { SkillUpgradeType, SkillsData } from "@/db/schema";
import { MAX_PURPLE_SKILL_STAT_LEVEL } from "@/db/schema";
import { formatSciNumber } from "@/lib/formatNumber";
import {
  AURA_BASE_RADIUS,
  AURA_RADIUS_PER_META,
  getAuraRegenMaxHpRatio,
} from "@/src/game/systems/AuraSystem";
import {
  getLightningBurstDamage,
  STONE_DEBUFF_BASE_MS,
  STONE_QUAKE_DAMAGE_RATIO,
  VENDAVAL_BASE_RADIUS,
  VENDAVAL_DAMAGE_RATIO,
  VENDAVAL_RADIUS_PER_META,
} from "@/src/game/systems/ActiveSkillsSystem";
import {
  getShadowCloneCooldownMs,
  getShadowCloneStatRatio,
  getShadowCloneTtlMs,
} from "@/src/game/systems/ShadowCloneSystem";

export type SkillStatPreview = {
  label: string;
  current: string;
  next: string | null;
};

function formatSec(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return `${s.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}s`;
}

function formatPct(ratio: number, digits = 0): string {
  return `${(ratio * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}%`;
}

function formatPx(px: number): string {
  return `${Math.round(px)} px`;
}

function iceCooldownMs(level: number, prestigeMul: number): number {
  return Math.max(5_000, 20_000 - level * 1_000 * prestigeMul);
}

function lightningCooldownMs(level: number, prestigeMul: number): number {
  return Math.max(5_000, 20_000 - level * 1_000 * prestigeMul);
}

function ricochetCooldownMs(level: number, prestigeMul: number): number {
  return Math.max(2_000, 7_000 - level * 500 * prestigeMul);
}

function stoneCooldownMs(level: number, prestigeMul: number): number {
  return Math.max(6_000, 18_000 - level * 700 * prestigeMul);
}

function vendavalCooldownMs(level: number, prestigeMul: number): number {
  return Math.max(5_000, 7_500 - level * 200 * prestigeMul);
}

function pair(
  label: string,
  current: string,
  next: string | null,
  atMax: boolean,
): SkillStatPreview {
  return { label, current, next: atMax ? null : next };
}

export function getSkillStatPreview(
  skill: SkillUpgradeType,
  statKey: string,
  level: number,
  prestigeMul: number,
  punchDamage: number,
  skills: SkillsData,
): SkillStatPreview {
  const atMax = level >= MAX_PURPLE_SKILL_STAT_LEVEL;
  const nextLv = Math.min(MAX_PURPLE_SKILL_STAT_LEVEL, level + 1);
  const punch = Math.max(0, punchDamage);

  if (skill === "fire") {
    if (statKey === "damage") {
      const stacks = (lv: number) =>
        Math.max(1, 1 + Math.round(lv * prestigeMul));
      return pair(
        "Stacks máx.",
        String(stacks(level)),
        String(stacks(nextLv)),
        atMax,
      );
    }
    if (statKey === "duration") {
      const ms = (lv: number) => 2_000 + lv * 500;
      return pair(
        "Duração do burn",
        formatSec(ms(level)),
        formatSec(ms(nextLv)),
        atMax,
      );
    }
  }

  if (skill === "ice") {
    if (statKey === "duration") {
      const ms = (lv: number) =>
        1_000 + Math.round(lv * 500 * prestigeMul);
      return pair(
        "Duração do gelo",
        formatSec(ms(level)),
        formatSec(ms(nextLv)),
        atMax,
      );
    }
    if (statKey === "cooldown") {
      return pair(
        "Cooldown",
        formatSec(iceCooldownMs(level, prestigeMul)),
        formatSec(iceCooldownMs(nextLv, prestigeMul)),
        atMax,
      );
    }
  }

  if (skill === "lightning") {
    const hits = skills.lightning.hits;
    const dmg = skills.lightning.damage;
    if (statKey === "damage") {
      const burst = (lv: number) =>
        getLightningBurstDamage(punch, lv, hits);
      return pair(
        "Dano do estouro",
        formatSciNumber(burst(level)),
        formatSciNumber(burst(nextLv)),
        atMax,
      );
    }
    if (statKey === "hits") {
      const burst = (lv: number) =>
        getLightningBurstDamage(punch, dmg, lv);
      return pair(
        "Dano do estouro",
        formatSciNumber(burst(level)),
        formatSciNumber(burst(nextLv)),
        atMax,
      );
    }
    if (statKey === "cooldown") {
      return pair(
        "Cooldown",
        formatSec(lightningCooldownMs(level, prestigeMul)),
        formatSec(lightningCooldownMs(nextLv, prestigeMul)),
        atMax,
      );
    }
  }

  if (skill === "stone") {
    if (statKey === "damage") {
      const dmg = (lv: number) =>
        punch *
        STONE_QUAKE_DAMAGE_RATIO *
        (1 + lv * 0.08 * prestigeMul);
      return pair(
        "Dano do terremoto",
        formatSciNumber(dmg(level)),
        formatSciNumber(dmg(nextLv)),
        atMax,
      );
    }
    if (statKey === "duration") {
      const ms = (lv: number) =>
        STONE_DEBUFF_BASE_MS + lv * 800 * prestigeMul;
      return pair(
        "Duração do debuff",
        formatSec(ms(level)),
        formatSec(ms(nextLv)),
        atMax,
      );
    }
    if (statKey === "cooldown") {
      return pair(
        "Cooldown",
        formatSec(stoneCooldownMs(level, prestigeMul)),
        formatSec(stoneCooldownMs(nextLv, prestigeMul)),
        atMax,
      );
    }
  }

  if (skill === "ricochet") {
    if (statKey === "damage") {
      const pct = (lv: number) =>
        (0.6 + lv * 0.15) * Math.min(1.5, prestigeMul);
      return pair(
        "Dano por salto",
        formatPct(pct(level)),
        formatPct(pct(nextLv)),
        atMax,
      );
    }
    if (statKey === "cooldown") {
      return pair(
        "Cooldown",
        formatSec(ricochetCooldownMs(level, prestigeMul)),
        formatSec(ricochetCooldownMs(nextLv, prestigeMul)),
        atMax,
      );
    }
    if (statKey === "hits") {
      const bounces = (lv: number) => 2 + Math.round(lv * prestigeMul);
      return pair(
        "Saltos máx.",
        String(bounces(level)),
        String(bounces(nextLv)),
        atMax,
      );
    }
  }

  if (skill === "vendaval") {
    if (statKey === "damage") {
      const dmg = (lv: number) =>
        punch *
        VENDAVAL_DAMAGE_RATIO *
        (1 + lv * 0.08 * prestigeMul);
      return pair(
        "Dano do impacto",
        formatSciNumber(dmg(level)),
        formatSciNumber(dmg(nextLv)),
        atMax,
      );
    }
    if (statKey === "radius") {
      const radius = (lv: number) =>
        Math.max(
          120,
          VENDAVAL_BASE_RADIUS + lv * VENDAVAL_RADIUS_PER_META * prestigeMul,
        );
      return pair(
        "Raio do vácuo",
        formatPx(radius(level)),
        formatPx(radius(nextLv)),
        atMax,
      );
    }
    if (statKey === "cooldown") {
      return pair(
        "Cooldown",
        formatSec(vendavalCooldownMs(level, prestigeMul)),
        formatSec(vendavalCooldownMs(nextLv, prestigeMul)),
        atMax,
      );
    }
  }

  if (skill === "shadow") {
    if (statKey === "damage") {
      const ratio = (lv: number) =>
        getShadowCloneStatRatio(0, lv, undefined, prestigeMul);
      return pair(
        "Poder do clone",
        formatPct(ratio(level)),
        formatPct(ratio(nextLv)),
        atMax,
      );
    }
    if (statKey === "duration") {
      const ms = (lv: number) => getShadowCloneTtlMs(lv, undefined, prestigeMul);
      return pair(
        "Duração",
        formatSec(ms(level)),
        formatSec(ms(nextLv)),
        atMax,
      );
    }
    if (statKey === "cooldown") {
      const ms = (lv: number) =>
        getShadowCloneCooldownMs(lv, undefined, prestigeMul);
      return pair(
        "Cooldown",
        formatSec(ms(level)),
        formatSec(ms(nextLv)),
        atMax,
      );
    }
  }

  if (skill === "aura") {
    if (statKey === "radius") {
      const radius = (lv: number) =>
        AURA_BASE_RADIUS + lv * AURA_RADIUS_PER_META * prestigeMul;
      return pair(
        "Raio da aura",
        formatPx(radius(level)),
        formatPx(radius(nextLv)),
        atMax,
      );
    }
    if (statKey === "damage") {
      const mul = (lv: number) => 1 + lv * 0.08 * prestigeMul;
      return pair(
        "Poder da aura",
        `+${formatPct(mul(level) - 1)} DPS`,
        `+${formatPct(mul(nextLv) - 1)} DPS`,
        atMax,
      );
    }
    if (statKey === "regen") {
      const pct = (lv: number) => getAuraRegenMaxHpRatio(lv, prestigeMul);
      return pair(
        "Regen (máx. HP)",
        `${formatPct(pct(level), 1)}/s`,
        `${formatPct(pct(nextLv), 1)}/s`,
        atMax,
      );
    }
  }

  return pair("Nível", String(level), String(nextLv), atMax);
}
