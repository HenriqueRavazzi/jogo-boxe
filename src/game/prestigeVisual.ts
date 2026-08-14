/** Tiers visuais compartilhados (fundo + inimigos) por dimensão. */

/** Temas geométricos originais (fundo + silhuetas). */
export type BaseDimensionId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * 0–7 temas originais · 8–15 o mesmo tema com paleta deslocada.
 * 0 Rua · 1 Industrial · 2 Cyber · 3 Infernal · 4 Glacial · 5 Vulcânico · 6 Ciber-Abissal · 7 Cósmico
 * 8 Rua Neon · 9 Fundição · 10 Synthwave · 11 Inferno Ácido · 12 Aurora · 13 Magma Cobalto · 14 Matrix Rubra · 15 Nebulosa Solar
 */
export type DimensionId =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

/** @deprecated Alias legado — preferir `DimensionId`. */
export type PrestigeVisualTier = DimensionId;

export const BASE_DIMENSION_COUNT = 8;

/** Hue-rotate (graus) dos universos 8–15 sobre o tema 0–7. */
const VARIANT_HUE_ROTATE: Record<BaseDimensionId, number> = {
  0: 280,
  1: 38,
  2: -85,
  3: 105,
  4: 255,
  5: 175,
  6: 168,
  7: 48,
};

export function getDimensionTheme(id: DimensionId): BaseDimensionId {
  return (id % BASE_DIMENSION_COUNT) as BaseDimensionId;
}

/** 0 = paleta original; ≠0 = variante colorida do mesmo tema. */
export function getDimensionHueRotate(id: DimensionId): number {
  if (id < BASE_DIMENSION_COUNT) return 0;
  return VARIANT_HUE_ROTATE[getDimensionTheme(id)];
}

export function getDimensionFilter(id: DimensionId): string {
  const hue = getDimensionHueRotate(id);
  if (!hue) return "none";
  return `hue-rotate(${hue}deg) saturate(1.18)`;
}

/** Ordem do Multiverse Loop (Dimensional Rift). */
export const MULTIVERSE_DIMENSION_CYCLE: DimensionId[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

/**
 * Dimensão padrão quando o loop dimensional está inativo.
 * Prestígio 4+ permanece no Cósmico até o loop ativar.
 */
export function getDefaultDimensionForPrestige(prestigeLevel: number): DimensionId {
  const n = Math.max(0, Math.floor(prestigeLevel));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 7;
}

/** @deprecated Preferir `getDefaultDimensionForPrestige` ou `resolveVisualDimension`. */
export function getPrestigeVisualTier(prestigeLevel: number): DimensionId {
  return getDefaultDimensionForPrestige(prestigeLevel);
}
