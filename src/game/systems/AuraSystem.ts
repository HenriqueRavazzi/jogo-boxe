/** Aura: área contínua no herói com sinergia das skills ativas na run. */

import type { Enemy } from "@/src/game/entities/Enemy";
import type {
  AuraElementKey,
  MatchSkillsData,
  SkillsData,
  UnlockedSkillsData,
} from "@/db/schema";
import { AURA_ELEMENT_KEYS, isAuraElementKey } from "@/db/schema";
import {
  DEFAULT_MATCH_SKILL_BONUS,
  type MatchSkillBonusState,
  type MatchSkillBonuses,
  type SpecialSkillKey,
} from "@/lib/matchUpgrades";
import type { ActiveSkillPulseState } from "@/src/game/systems/ActiveSkillsSystem";
import type { SkillVfxEffect } from "@/src/game/systems/ActiveSkillsSystem";
import {
  MASTERY_AURA_RADIUS_MULT,
  MASTERY_AURA_SECONDARY_POWER,
  masteryStat,
} from "@/lib/skillMastery";
import { LIGHTNING_STUN_MS } from "@/src/game/entities/Enemy";

/** Raio base da aura (px). */
export const AURA_BASE_RADIUS = 88;
/** +px por nível in-run. */
export const AURA_RADIUS_PER_MATCH_LEVEL = 10;
/** +px por nível meta de radius. */
export const AURA_RADIUS_PER_META = 6;
/** Fração do dano base → DPS de fogo na aura. */
export const AURA_FIRE_DPS_RATIO = 0.22;
/** Fração do dano base → DPS neutro (Aura sozinha). */
export const AURA_NEUTRAL_DPS_RATIO = 0.12;
/** Slow neutro enquanto o inimigo está na aura (0–1). */
export const AURA_NEUTRAL_SLOW = 0.15;
/** Slow do raio enquanto o inimigo está na aura (0–1). */
export const AURA_LIGHTNING_SLOW = 0.45;
/** Intervalo base do stun de gelo (ms). */
export const AURA_ICE_STUN_INTERVAL_MS = 2_800;
/** Duração do stun de gelo da aura (ms). */
export const AURA_ICE_STUN_DURATION_MS = 380;
/** Duração do VFX de pulso de gelo da aura. */
export const AURA_ICE_PULSE_VFX_MS = 280;
/** Intervalo base da explosão sombra na aura (ms). */
export const AURA_SHADOW_BURST_INTERVAL_MS = 3_200;
/** Fração do dano base → burst sombra da aura. */
export const AURA_SHADOW_BURST_RATIO = 0.85;
/** Duração do VFX da explosão sombra. */
export const AURA_SHADOW_BURST_VFX_MS = 360;
/** Com Pedra na run: inimigos na aura causam esta fração de dano (primário). */
export const AURA_STONE_OUTGOING_DAMAGE_MUL = 0.5;
/** Com Ricochete na run: splash nos outros inimigos da aura (fração do hit). */
export const AURA_RICOCHET_SPLASH_RATIO = 0.25;
/** Potência do atributo secundário da aura (2ª skill ativa). */
export const AURA_SECONDARY_POWER = 0.5;
/** Força base do puxão contínuo da Aura + Vendaval. */
export const AURA_VENDAVAL_PULL_STRENGTH = 0.42;
/** Renovação curta do puxão contínuo (ms). */
export const AURA_VENDAVAL_PULL_REFRESH_MS = 140;

export type AuraElementPowers = Record<AuraElementKey, number>;

export type RunAuraInput = {
  enemies: Enemy[];
  playerX: number;
  playerY: number;
  now: number;
  dt: number;
  baseDamage: number;
  matchSkills: MatchSkillsData;
  /** Skills especiais equipadas nesta run (slots ativos). */
  activeRunSkills?: SpecialSkillKey[];
  skills: SkillsData;
  matchSkillBonuses?: MatchSkillBonuses;
  pulseState: ActiveSkillPulseState;
  prestigeMul: number;
  /** Preferência de primário (meta); só vale se a skill estiver ativa na run. */
  auraPrimaryElement?: AuraElementKey | null;
  /** Maestria Aura: Domínio Absoluto (raio ×2, secundários 100%). */
  masteryAbsoluteDomain?: boolean;
};

export type RunAuraResult = {
  pulseState: ActiveSkillPulseState;
  skillDamageDealt: number;
  skillHitsLanded: number;
  questFreeze: number;
  newSkillVfx: SkillVfxEffect[];
  /** Raio atual (para desenhar o anel). */
  auraRadius: number;
  /** Quais elementos estão ativos nesta aura. */
  activeElements: {
    fire: boolean;
    lightning: boolean;
    ice: boolean;
    shadow: boolean;
    stone: boolean;
    ricochet: boolean;
    vendaval: boolean;
  };
  /** 0 / 0.5 / 1.0 por elemento (secundário / primário). */
  elementPowers: AuraElementPowers;
  /** Primário efetivo nesta run (null se neutra). */
  primaryElement: AuraElementKey | null;
  /** True se Aura está sozinha (sem outra skill especial na run). */
  neutralAura: boolean;
};

/** Labels curtos para UI. */
export const AURA_ELEMENT_LABELS: Record<AuraElementKey, string> = {
  ice: "Gelo",
  lightning: "Raio",
  fire: "Fogo",
  stone: "Pedra",
  shadow: "Shadow",
  ricochet: "Ricochete",
  vendaval: "Vendaval",
};

/** Elementos liberados no meta (preferência de UI / save). */
export function listUnlockedAuraElements(
  unlockedSkills: UnlockedSkillsData,
): AuraElementKey[] {
  return AURA_ELEMENT_KEYS.filter((key) => Boolean(unlockedSkills[key]));
}

/**
 * Resolve preferência de primário no meta (entre skills liberadas).
 * Em combate use `resolveAuraPrimaryFromRun`.
 */
export function resolveAuraPrimaryElement(
  primary: AuraElementKey | null | undefined,
  unlockedSkills: UnlockedSkillsData,
): AuraElementKey | null {
  if (primary && unlockedSkills[primary]) return primary;
  return listUnlockedAuraElements(unlockedSkills)[0] ?? null;
}

/**
 * Elementos das skills especiais ativas nos slots da run (exceto a própria Aura).
 * Não usa o meta desbloqueado — só o loadout equipado nesta partida.
 */
export function listRunAuraElements(
  activeRunSkills: readonly SpecialSkillKey[] = [],
  _matchSkills?: MatchSkillsData | null,
): AuraElementKey[] {
  void _matchSkills;
  const ordered: AuraElementKey[] = [];
  const seen = new Set<AuraElementKey>();

  for (const key of activeRunSkills) {
    if (key === "aura") continue;
    if (!isAuraElementKey(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  return ordered;
}

export function resolveAuraPrimaryFromRun(
  preferred: AuraElementKey | null | undefined,
  runElements: readonly AuraElementKey[],
): AuraElementKey | null {
  if (runElements.length === 0) return null;
  if (runElements.length === 1) return runElements[0]!;
  if (preferred && runElements.includes(preferred)) return preferred;
  return runElements[0]!;
}

/**
 * Potências a partir do loadout da run (slots ativos):
 * 0 parceiras → neutra; 1 → 100%; 2+ (Skill Arsenal) → primário 100% / demais 50%.
 * Preferência de primário (meta) só vale se a skill estiver nos slots da run.
 */
export function buildAuraElementPowersFromRun(
  runElements: readonly AuraElementKey[],
  preferredPrimary?: AuraElementKey | null,
  secondaryPower = AURA_SECONDARY_POWER,
): {
  powers: AuraElementPowers;
  primary: AuraElementKey | null;
  neutral: boolean;
} {
  const powers = {} as AuraElementPowers;
  for (const key of AURA_ELEMENT_KEYS) powers[key] = 0;

  if (runElements.length === 0) {
    return { powers, primary: null, neutral: true };
  }

  const primary = resolveAuraPrimaryFromRun(preferredPrimary, runElements);
  if (runElements.length === 1) {
    const only = runElements[0]!;
    powers[only] = 1;
    return { powers, primary: only, neutral: false };
  }

  for (const el of runElements) {
    powers[el] = el === primary ? 1 : secondaryPower;
  }
  return { powers, primary, neutral: false };
}

/** @deprecated Prefer buildAuraElementPowersFromRun (loadout da run). */
export function getAuraElementPower(
  element: AuraElementKey,
  unlockedSkills: UnlockedSkillsData,
  primary: AuraElementKey | null | undefined,
): number {
  if (!unlockedSkills[element]) return 0;
  const resolved = resolveAuraPrimaryElement(primary, unlockedSkills);
  if (!resolved) return 1;
  return element === resolved ? 1 : AURA_SECONDARY_POWER;
}

/** @deprecated Prefer buildAuraElementPowersFromRun. */
export function buildAuraElementPowers(
  unlockedSkills: UnlockedSkillsData,
  primary: AuraElementKey | null | undefined,
): AuraElementPowers {
  const resolved = resolveAuraPrimaryElement(primary, unlockedSkills);
  const powers = {} as AuraElementPowers;
  for (const key of AURA_ELEMENT_KEYS) {
    powers[key] = getAuraElementPower(key, unlockedSkills, resolved);
  }
  return powers;
}

export function getAuraRadius(
  matchLevel: number,
  metaRadius: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
): number {
  const base =
    AURA_BASE_RADIUS +
    Math.max(0, matchLevel) * AURA_RADIUS_PER_MATCH_LEVEL +
    Math.max(0, metaRadius) * AURA_RADIUS_PER_META * prestigeMul;
  return Math.max(40, base * bonus.radiusMul);
}

export function getAuraFireDps(
  baseDamage: number,
  matchLevel: number,
  metaDamage: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
  elementPower = 1,
): number {
  const levelMul = 1 + Math.max(0, matchLevel) * 0.12;
  const metaMul = 1 + Math.max(0, metaDamage) * 0.08 * prestigeMul;
  return (
    baseDamage *
    AURA_FIRE_DPS_RATIO *
    levelMul *
    metaMul *
    bonus.damageMul *
    Math.max(0, elementPower)
  );
}

/** DPS neutro quando a Aura está sozinha na run. */
export function getAuraNeutralDps(
  baseDamage: number,
  matchLevel: number,
  metaDamage: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
): number {
  const levelMul = 1 + Math.max(0, matchLevel) * 0.1;
  const metaMul = 1 + Math.max(0, metaDamage) * 0.06 * prestigeMul;
  return (
    baseDamage *
    AURA_NEUTRAL_DPS_RATIO *
    levelMul *
    metaMul *
    bonus.damageMul
  );
}

export function getAuraIceStunIntervalMs(
  metaPulse: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
): number {
  const reduced =
    AURA_ICE_STUN_INTERVAL_MS -
    Math.max(0, metaPulse) * 120 * prestigeMul;
  return Math.max(1_000, reduced * bonus.cooldownMul);
}

export function getAuraShadowBurstIntervalMs(
  metaPulse: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
): number {
  const reduced =
    AURA_SHADOW_BURST_INTERVAL_MS -
    Math.max(0, metaPulse) * 100 * prestigeMul;
  return Math.max(1_200, reduced * bonus.cooldownMul);
}

export function getAuraShadowBurstDamage(
  baseDamage: number,
  matchLevel: number,
  metaDamage: number,
  bonus: MatchSkillBonusState = DEFAULT_MATCH_SKILL_BONUS,
  prestigeMul = 1,
  elementPower = 1,
): number {
  const levelMul = 1 + Math.max(0, matchLevel) * 0.1;
  const metaMul = 1 + Math.max(0, metaDamage) * 0.07 * prestigeMul;
  return (
    baseDamage *
    AURA_SHADOW_BURST_RATIO *
    levelMul *
    metaMul *
    bonus.damageMul *
    Math.max(0, elementPower)
  );
}

/**
 * Pedra na aura: primário → 50% dano inimigo; secundário → 75% (metade da redução).
 */
export function getAuraStoneOutgoingDamageMul(
  enemy: Enemy,
  playerX: number,
  playerY: number,
  auraRadius: number,
  stonePower: number,
): number {
  if (stonePower <= 0 || auraRadius <= 0 || enemy.isDead) return 1;
  const dist = Math.hypot(enemy.x - playerX, enemy.y - playerY);
  if (dist > auraRadius + enemy.radius) return 1;
  const reduction = (1 - AURA_STONE_OUTGOING_DAMAGE_MUL) * stonePower;
  return Math.max(0.05, 1 - reduction);
}

/**
 * Tick da aura: sinergia só com skills ativas na run.
 * 1 parceira → 100%; 2+ → primário 100% / secundárias 50%; nenhuma → neutra.
 */
export function runAuraSystem(input: RunAuraInput): RunAuraResult {
  const {
    enemies,
    playerX,
    playerY,
    now,
    dt,
    baseDamage,
    matchSkills,
    activeRunSkills = [],
    skills,
    matchSkillBonuses,
    pulseState,
    prestigeMul,
    auraPrimaryElement,
    masteryAbsoluteDomain = false,
  } = input;

  const next: ActiveSkillPulseState = { ...pulseState };
  const newSkillVfx: SkillVfxEffect[] = [];
  let skillDamageDealt = 0;
  let skillHitsLanded = 0;
  let questFreeze = 0;

  const runElements = listRunAuraElements(activeRunSkills, matchSkills);
  const secondaryPower = masteryAbsoluteDomain
    ? masteryStat("aura", "auraSecondaryPower", MASTERY_AURA_SECONDARY_POWER)
    : AURA_SECONDARY_POWER;
  const {
    powers: elementPowers,
    primary: primaryElement,
    neutral: neutralAura,
  } = buildAuraElementPowersFromRun(
    runElements,
    auraPrimaryElement,
    secondaryPower,
  );

  const activeElements = {
    fire: elementPowers.fire > 0,
    lightning: elementPowers.lightning > 0,
    ice: elementPowers.ice > 0,
    shadow: elementPowers.shadow > 0,
    stone: elementPowers.stone > 0,
    ricochet: elementPowers.ricochet > 0,
    vendaval: elementPowers.vendaval > 0,
  };

  const auraLevel = matchSkills.aura ?? 0;

  if (auraLevel <= 0) {
    next.auraStunNextAt = 0;
    next.auraShadowNextAt = 0;
    return {
      pulseState: next,
      skillDamageDealt: 0,
      skillHitsLanded: 0,
      questFreeze: 0,
      newSkillVfx: [],
      auraRadius: 0,
      activeElements,
      elementPowers,
      primaryElement,
      neutralAura: false,
    };
  }

  const bonus = matchSkillBonuses?.aura ?? DEFAULT_MATCH_SKILL_BONUS;
  const radius =
    getAuraRadius(auraLevel, skills.aura.radius, bonus, prestigeMul) *
    (masteryAbsoluteDomain
      ? masteryStat("aura", "radiusMul", MASTERY_AURA_RADIUS_MULT)
      : 1);

  const inAura: Enemy[] = [];
  for (const enemy of enemies) {
    if (enemy.isDead) continue;
    const dist = Math.hypot(enemy.x - playerX, enemy.y - playerY);
    if (dist <= radius + enemy.radius) {
      inAura.push(enemy);
    }
  }

  // Neutra: DPS leve + lentidão leve (sem efeitos elementais)
  if (neutralAura && inAura.length > 0 && dt > 0) {
    const dps = getAuraNeutralDps(
      baseDamage,
      auraLevel,
      skills.aura.damage,
      bonus,
      prestigeMul,
    );
    const tickDamage = dps * dt;
    if (tickDamage > 0) {
      for (const enemy of inAura) {
        enemy.takeDamage(tickDamage, now);
        skillDamageDealt +=
          tickDamage * enemy.getDamageTakenMultiplier(now);
        skillHitsLanded += 1;
      }
    }
    for (const enemy of inAura) {
      enemy.applyShockSlow(AURA_NEUTRAL_SLOW, now, 220);
    }
  }

  // Fogo → DPS contínuo
  if (activeElements.fire && inAura.length > 0 && dt > 0) {
    const dps = getAuraFireDps(
      baseDamage,
      auraLevel,
      skills.aura.damage,
      bonus,
      prestigeMul,
      elementPowers.fire,
    );
    const tickDamage = dps * dt;
    if (tickDamage > 0) {
      for (const enemy of inAura) {
        enemy.takeDamage(tickDamage, now);
        skillDamageDealt +=
          tickDamage * enemy.getDamageTakenMultiplier(now);
        skillHitsLanded += 1;
      }
    }
  }

  // Raio → lentidão
  if (activeElements.lightning && inAura.length > 0) {
    const slow = AURA_LIGHTNING_SLOW * elementPowers.lightning;
    for (const enemy of inAura) {
      enemy.applyShockSlow(slow, now, 220);
    }
  }

  // Gelo → stun periódico (duração escala com potência)
  if (activeElements.ice) {
    if (next.auraStunNextAt <= 0) {
      next.auraStunNextAt = now + getAuraIceStunIntervalMs(
        skills.aura.pulse,
        bonus,
        prestigeMul,
      );
    }
    if (now >= next.auraStunNextAt) {
      next.auraStunNextAt =
        now +
        getAuraIceStunIntervalMs(skills.aura.pulse, bonus, prestigeMul);
      next.auraPulseAt = now;
      if (inAura.length > 0) {
        const stunMs = Math.round(
          AURA_ICE_STUN_DURATION_MS *
            (1 + skills.aura.pulse * 0.04 * prestigeMul) *
            elementPowers.ice,
        );
        for (const enemy of inAura) {
          enemy.applyStun(
            now,
            Math.max(LIGHTNING_STUN_MS * elementPowers.ice, stunMs),
          );
          questFreeze += 1;
        }
        newSkillVfx.push({
          kind: "aura_ice_pulse",
          x: playerX,
          y: playerY,
          maxRadius: radius,
          startedAt: now,
          expiresAt: now + AURA_ICE_PULSE_VFX_MS,
        });
      }
    }
  } else {
    next.auraStunNextAt = 0;
  }

  // Shadow → explosão periódica
  if (activeElements.shadow) {
    if (next.auraShadowNextAt <= 0) {
      next.auraShadowNextAt = now + getAuraShadowBurstIntervalMs(
        skills.aura.pulse,
        bonus,
        prestigeMul,
      );
    }
    if (now >= next.auraShadowNextAt) {
      next.auraShadowNextAt =
        now +
        getAuraShadowBurstIntervalMs(skills.aura.pulse, bonus, prestigeMul);
      next.auraShadowPulseAt = now;
      if (inAura.length > 0) {
        const burst = getAuraShadowBurstDamage(
          baseDamage,
          auraLevel,
          skills.aura.damage,
          bonus,
          prestigeMul,
          elementPowers.shadow,
        );
        for (const enemy of inAura) {
          enemy.takeDamage(burst, now);
          skillDamageDealt += burst * enemy.getDamageTakenMultiplier(now);
          skillHitsLanded += 1;
        }
        newSkillVfx.push({
          kind: "aura_shadow_burst",
          x: playerX,
          y: playerY,
          maxRadius: radius,
          startedAt: now,
          expiresAt: now + AURA_SHADOW_BURST_VFX_MS,
        });
      }
    }
  } else {
    next.auraShadowNextAt = 0;
  }

  // Vendaval → puxão gravitacional contínuo dentro da aura
  if (activeElements.vendaval && inAura.length > 0) {
    const strength =
      AURA_VENDAVAL_PULL_STRENGTH * elementPowers.vendaval;
    for (const enemy of inAura) {
      enemy.applyVacuumPull(
        playerX,
        playerY,
        now,
        AURA_VENDAVAL_PULL_REFRESH_MS,
        strength,
      );
    }
  }

  return {
    pulseState: next,
    skillDamageDealt,
    skillHitsLanded,
    questFreeze,
    newSkillVfx,
    auraRadius: radius,
    activeElements,
    elementPowers,
    primaryElement,
    neutralAura,
  };
}
