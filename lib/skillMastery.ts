/** Maestria Suprema: desbloqueio meta + carta lendária in-run (Lv.5). */

import type {
  SkillsData,
  SkillTierStatMultipliers,
  SkillUpgradeType,
  UnlockedSkillsData,
} from "@/db/schema";
import {
  DEFAULT_UNLOCKED_SKILLS,
  MAX_PURPLE_SKILL_STAT_LEVEL,
  SKILL_STAT_KEYS,
} from "@/db/schema";
import type { SpecialSkillKey } from "@/lib/matchUpgrades";
import { getSkillTierScaling, getSkillTierStat } from "@/lib/balanceConfig";

/**
 * Custo em Diamantes Roxos para liberar a Maestria de uma skill.
 * Maxar 1 atributo 0→20 ≈ 1019; skill de 3 attrs ≈ 3057 — a maestria
 * fica acima disso para valer como passo final.
 */
export const SKILL_MASTERY_PURPLE_COST = 5000;
/** Custo em Ascension Shards para liberar a Maestria (~5 níveis iniciais de passiva). */
export const SKILL_MASTERY_SHARD_COST = 50;
/** Nível in-run mínimo da skill para a carta suprema poder surgir. */
export const SKILL_MASTERY_MATCH_LEVEL_REQ = 5;
/** Chance por slot de oferecer uma carta de Maestria elegível. */
export const SKILL_MASTERY_CARD_CHANCE = 0.28;

/** Mesmo shape de `UnlockedSkillsData` — maestrias liberadas no meta. */
export type SkillMasteryUnlockedData = UnlockedSkillsData;

export const DEFAULT_SKILL_MASTERY_UNLOCKED: SkillMasteryUnlockedData = {
  ...DEFAULT_UNLOCKED_SKILLS,
};

/** Maestrias ativadas nesta run (após escolher a carta lendária). */
export type MatchSkillMasteryData = SkillMasteryUnlockedData;

export const DEFAULT_MATCH_SKILL_MASTERY: MatchSkillMasteryData = {
  ...DEFAULT_UNLOCKED_SKILLS,
};

export const SKILL_MASTERY_KEYS: SpecialSkillKey[] = [
  "fire",
  "ice",
  "lightning",
  "stone",
  "ricochet",
  "vendaval",
  "shadow",
  "aura",
];

export type SkillMasteryUpgradeType = `mastery_${SpecialSkillKey}`;

export function isSkillMasteryUpgradeType(
  value: string,
): value is SkillMasteryUpgradeType {
  if (!value.startsWith("mastery_")) return false;
  const key = value.slice("mastery_".length);
  return (SKILL_MASTERY_KEYS as string[]).includes(key);
}

export function skillMasteryUpgradeToKey(
  type: SkillMasteryUpgradeType,
): SpecialSkillKey {
  return type.slice("mastery_".length) as SpecialSkillKey;
}

export function toSkillMasteryUpgradeType(
  key: SpecialSkillKey,
): SkillMasteryUpgradeType {
  return `mastery_${key}`;
}

export function normalizeSkillMasteryUnlocked(
  raw?: Partial<SkillMasteryUnlockedData> | null,
): SkillMasteryUnlockedData {
  const out = { ...DEFAULT_SKILL_MASTERY_UNLOCKED };
  if (!raw || typeof raw !== "object") return out;
  for (const key of SKILL_MASTERY_KEYS) {
    if (raw[key] === true) out[key] = true;
  }
  return out;
}

export function normalizeMatchSkillMastery(
  raw?: Partial<MatchSkillMasteryData> | null,
): MatchSkillMasteryData {
  return normalizeSkillMasteryUnlocked(raw);
}

/** True se todos os atributos granulares da skill estão no teto (20). */
export function areAllSkillStatsMaxed(
  skills: SkillsData,
  skillId: SkillUpgradeType,
): boolean {
  const keys = SKILL_STAT_KEYS[skillId];
  for (const key of keys) {
    const level = Number(
      (skills[skillId] as Record<string, number>)[key] ?? 0,
    );
    if (level < MAX_PURPLE_SKILL_STAT_LEVEL) return false;
  }
  return true;
}

export type SkillMasteryCardInfo = {
  key: SpecialSkillKey;
  label: string;
  title: string;
  description: string;
  effectLines: string[];
};

export const SKILL_MASTERY_CARD_INFO: Record<
  SpecialSkillKey,
  SkillMasteryCardInfo
> = {
  fire: {
    key: "fire",
    label: "Maestria: Fogo",
    title: "Combustão em Cadeia",
    description:
      "Inimigos em chamas compartilham 10% do dano contínuo com alvos adjacentes.",
    effectLines: [
      "DoT em cadeia (10%)",
      "Alvos próximos em chamas",
    ],
  },
  ice: {
    key: "ice",
    label: "Maestria: Gelo",
    title: "Estilhaço Glacial",
    description:
      "Inimigos congelados que morrem explodem, aplicando gelo e dano em área.",
    effectLines: ["Explosão ao morrer congelado", "Congela e fere a área"],
  },
  lightning: {
    key: "lightning",
    label: "Maestria: Raio",
    title: "Sobrecarga Tesla",
    description:
      "Estouros de raio deixam mini-campos elétricos no chão (DoT por 4s).",
    effectLines: ["Campos estáticos 4s", "Dano contínuo no chão"],
  },
  stone: {
    key: "stone",
    label: "Maestria: Pedra",
    title: "Tectônica Absoluta",
    description:
      "O terremoto fissura o chão: slow severo e quebra de resistência permanentes na run.",
    effectLines: ["Fissuras permanentes", "Slow + vulnerabilidade"],
  },
  ricochet: {
    key: "ricochet",
    label: "Maestria: Ricochete",
    title: "Ricochete Infinito",
    description:
      "Soco salta indefinidamente entre alvos; o dano por salto não decai (100%).",
    effectLines: ["Saltos sem limite", "Sem falloff de dano"],
  },
  vendaval: {
    key: "vendaval",
    label: "Maestria: Vendaval",
    title: "Singularidade Gravitacional",
    description:
      "No fim do vácuo, uma implosão atordoa e repele inimigos ao redor.",
    effectLines: ["Implosão ao fim do puxão", "Stun + knockback"],
  },
  shadow: {
    key: "shadow",
    label: "Maestria: Sombra",
    title: "Exército Espelhado",
    description:
      "Dois clones simultâneos herdando 30% dos atributos (em vez de 15%).",
    effectLines: ["2 clones", "30% dos stats"],
  },
  aura: {
    key: "aura",
    label: "Maestria: Aura",
    title: "Domínio Absoluto",
    description:
      "Raio da Aura dobra; efeitos secundários das skills ativas ficam em 100%.",
    effectLines: ["Raio ×2", "Secundários a 100%"],
  },
};

/** Constantes de combate da Maestria. */
export const MASTERY_FIRE_SHARE_RATIO = 0.1;
export const MASTERY_FIRE_SHARE_RADIUS = 90;
export const MASTERY_ICE_SHATTER_RADIUS = 110;
export const MASTERY_ICE_SHATTER_DAMAGE_RATIO = 0.85;
export const MASTERY_ICE_SHATTER_FREEZE_MS = 1_400;
export const MASTERY_TESLA_DURATION_MS = 4_000;
export const MASTERY_TESLA_RADIUS = 52;
export const MASTERY_TESLA_DPS_RATIO = 0.35;
export const MASTERY_FISSURE_RADIUS = 100;
export const MASTERY_FISSURE_SLOW = 0.55;
export const MASTERY_FISSURE_VULN = 1.4;
export const MASTERY_VENDAVAL_IMPLOSION_RADIUS = 140;
export const MASTERY_VENDAVAL_IMPLOSION_DAMAGE_RATIO = 1.1;
export const MASTERY_VENDAVAL_STUN_MS = 1_200;
export const MASTERY_VENDAVAL_KNOCKBACK = 14;
export const MASTERY_SHADOW_STAT_RATIO = 0.3;
export const MASTERY_SHADOW_CLONE_COUNT = 2;
export const MASTERY_AURA_RADIUS_MULT = 2;
export const MASTERY_AURA_SECONDARY_POWER = 1;
export const MASTERY_RICOCHET_MAX_TARGETS = 40;

export function getMasteryCardInfo(key: SpecialSkillKey): SkillMasteryCardInfo {
  const fallback = SKILL_MASTERY_CARD_INFO[key];
  const row = getSkillTierScaling(key, "master");
  if (!row) return fallback;
  return {
    key,
    label: row.cardLabel || fallback.label,
    title: row.cardTitle || fallback.title,
    description: row.cardDescription || fallback.description,
    effectLines:
      row.effectLines.length > 0 ? row.effectLines : fallback.effectLines,
  };
}

export function masteryStat(
  skillKey: SpecialSkillKey,
  field: keyof SkillTierStatMultipliers,
  fallback: number,
): number {
  return getSkillTierStat(skillKey, "master", field, fallback);
}

/** Zona de chão criada por Maestria (Tesla / fissura). */
export type MasteryGroundZone = {
  id: string;
  kind: "tesla" | "fissure";
  x: number;
  y: number;
  radius: number;
  /** Infinity = permanente na run (fissura). */
  expiresAt: number;
  dps?: number;
};
