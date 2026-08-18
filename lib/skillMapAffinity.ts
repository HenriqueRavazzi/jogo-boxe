/** Vantagem / desvantagem de dano das skills conforme o tema do mapa. */

import type { SpecialSkillKey } from "@/lib/matchUpgrades";
import { getDimensionDisplayName } from "@/src/game/multiverseLoop";
import {
  getDimensionTheme,
  type BaseDimensionId,
  type DimensionId,
} from "@/src/game/prestigeVisual";

/** Vantagem clara (elemento oposto ao bioma). */
export const SKILL_MAP_ADVANTAGE = 1.25;
/** Desvantagem clara (mesmo elemento do bioma). */
export const SKILL_MAP_DISADVANTAGE = 0.75;
export const SKILL_MAP_MINOR_UP = 1.12;
export const SKILL_MAP_MINOR_DOWN = 0.88;

type ThemeMul = Partial<Record<BaseDimensionId, number>>;

/**
 * Temas: 0 Rua · 1 Industrial · 2 Cyber · 3 Infernal · 4 Glacial
 * 5 Vulcânico · 6 Ciber-Abissal · 7 Cósmico
 * Variantes 8–15 usam o mesmo tema-base.
 */
const SKILL_MAP_DAMAGE: Record<SpecialSkillKey, ThemeMul> = {
  fire: {
    1: SKILL_MAP_MINOR_UP,
    3: SKILL_MAP_DISADVANTAGE,
    4: SKILL_MAP_ADVANTAGE,
    5: SKILL_MAP_DISADVANTAGE,
    7: SKILL_MAP_MINOR_UP,
  },
  ice: {
    3: SKILL_MAP_ADVANTAGE,
    4: SKILL_MAP_DISADVANTAGE,
    5: SKILL_MAP_ADVANTAGE,
    7: SKILL_MAP_MINOR_UP,
  },
  lightning: {
    0: SKILL_MAP_MINOR_UP,
    1: SKILL_MAP_MINOR_UP,
    2: SKILL_MAP_ADVANTAGE,
    3: SKILL_MAP_MINOR_DOWN,
    4: SKILL_MAP_MINOR_UP,
    5: SKILL_MAP_MINOR_DOWN,
    6: SKILL_MAP_ADVANTAGE,
    7: SKILL_MAP_MINOR_UP,
  },
  stone: {
    0: SKILL_MAP_MINOR_UP,
    1: SKILL_MAP_ADVANTAGE,
    4: SKILL_MAP_MINOR_UP,
    5: 0.8,
    7: 0.85,
  },
  ricochet: {
    0: SKILL_MAP_MINOR_UP,
    1: SKILL_MAP_ADVANTAGE,
    2: SKILL_MAP_ADVANTAGE,
    4: SKILL_MAP_MINOR_DOWN,
    5: SKILL_MAP_MINOR_DOWN,
    6: SKILL_MAP_MINOR_UP,
  },
  vendaval: {
    0: SKILL_MAP_MINOR_UP,
    3: 0.8,
    4: SKILL_MAP_ADVANTAGE,
    5: SKILL_MAP_MINOR_DOWN,
    7: SKILL_MAP_DISADVANTAGE,
  },
  shadow: {
    0: 0.9,
    3: SKILL_MAP_ADVANTAGE,
    6: SKILL_MAP_ADVANTAGE,
    7: SKILL_MAP_MINOR_UP,
  },
  aura: {},
};

const SKILL_MAP_REASON: Partial<
  Record<SpecialSkillKey, Partial<Record<BaseDimensionId, string>>>
> = {
  fire: {
    1: "A forja alimenta as chamas",
    3: "O inferno já está saturado de fogo",
    4: "Calor contra o gelo",
    5: "Magma não precisa de mais fogo",
    7: "Calor estelar",
  },
  ice: {
    3: "Gelo apaga o inferno",
    4: "O mapa já está congelado",
    5: "Gelo contra o magma",
    7: "Frio do vácuo",
  },
  lightning: {
    0: "Metal e fiação urbana",
    1: "Estruturas condutoras",
    2: "Sobrecarga nos circuitos",
    3: "O calor dispersa a carga",
    4: "Gelo conduz bem",
    5: "Cinzas isolam o raio",
    6: "Tempestade no abismo digital",
    7: "Descargas cósmicas",
  },
  stone: {
    0: "Concreto e asfalto",
    1: "Aço e concreto",
    4: "Rocha quebra o gelo",
    5: "Chão derretido amortece o terremoto",
    7: "Pouco chão no vazio",
  },
  ricochet: {
    0: "Paredes e metal da rua",
    1: "Superfícies de aço",
    2: "Rebote em placas e vidro",
    4: "Gelo absorve o impacto",
    5: "Magma amortece os saltos",
    6: "Estruturas digitais rígidas",
  },
  vendaval: {
    0: "Vento aberto na rua",
    3: "Ar rarefeito no inferno",
    4: "Nevasca",
    5: "Cinzas pesam o ar",
    7: "Não há ar no vácuo",
  },
  shadow: {
    0: "Rua clara demais",
    3: "Trevas infernais",
    6: "Sombra do abismo",
    7: "Vazio cósmico",
  },
};

export function getSkillMapDamageMul(
  skill: SpecialSkillKey,
  dimension: DimensionId,
): number {
  const theme = getDimensionTheme(dimension);
  return SKILL_MAP_DAMAGE[skill][theme] ?? 1;
}

export type SkillMapAffinityInfo = {
  mul: number;
  mapName: string;
  /** Ex.: "+25% em Glacial". Null se neutro. */
  summary: string | null;
  reason: string | null;
};

export function describeSkillMapAffinity(
  skill: SpecialSkillKey,
  dimension: DimensionId,
): SkillMapAffinityInfo {
  const mul = getSkillMapDamageMul(skill, dimension);
  const mapName = getDimensionDisplayName(dimension);
  const theme = getDimensionTheme(dimension);
  const reason = SKILL_MAP_REASON[skill]?.[theme] ?? null;
  if (Math.abs(mul - 1) < 0.001) {
    return { mul: 1, mapName, summary: null, reason: null };
  }
  const pct = Math.round((mul - 1) * 100);
  const sign = pct > 0 ? "+" : "";
  return {
    mul,
    mapName,
    summary: `${sign}${pct}% em ${mapName}`,
    reason,
  };
}

export function formatSkillMapMulBadge(mul: number): string | null {
  if (Math.abs(mul - 1) < 0.001) return null;
  const pct = Math.round((mul - 1) * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}
