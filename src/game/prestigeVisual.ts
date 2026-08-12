/** Tiers visuais compartilhados (fundo + inimigos) por dimensão. */

/** 0 Rua · 1 Industrial · 2 Cyber · 3 Infernal · 4 Glacial · 5 Vulcânico · 6 Ciber-Abissal · 7 Cósmico */
export type DimensionId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** @deprecated Alias legado — preferir `DimensionId`. */
export type PrestigeVisualTier = DimensionId;

/** Ordem do Multiverse Loop (Dimensional Rift). */
export const MULTIVERSE_DIMENSION_CYCLE: DimensionId[] = [
  0, 1, 2, 3, 4, 5, 6, 7,
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
