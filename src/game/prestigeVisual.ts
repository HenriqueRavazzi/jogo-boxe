/** Tiers visuais compartilhados (fundo + inimigos) por prestígio. */

export type PrestigeVisualTier = 0 | 1 | 2 | 3 | 4;

/**
 * 0 Rua · 1 Industrial · 2 Cyber · 3 Infernal · 4+ Cósmico
 */
export function getPrestigeVisualTier(prestigeLevel: number): PrestigeVisualTier {
  const n = Math.max(0, Math.floor(prestigeLevel));
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}
