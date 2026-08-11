/** Multiplicador de ouro (upgrade meta) com retorno crescente por nível. */

/** Passo base de renda no 1º upgrade (nível 0→1). */
export const INCOME_STEP = 0.1;
/** Escala do ganho/nível — retorno cresce com o investimento. */
export const INCOME_STEP_SCALE_PER_LEVEL = 0.012;

/** +renda ao comprar o próximo nível a partir de `currentLevel`. */
export function incomeStepGainAt(currentLevel: number): number {
  const steps = Math.max(0, Math.floor(currentLevel));
  return INCOME_STEP * (1 + steps * INCOME_STEP_SCALE_PER_LEVEL);
}

/** Multiplicador de ouro no nível `level` (0 = 1×). */
export function incomeMultiplierAt(level: number): number {
  const n = Math.max(0, Math.floor(level));
  if (n <= 0) return 1;
  const base = INCOME_STEP;
  const scale = INCOME_STEP_SCALE_PER_LEVEL;
  return 1 + base * (n + (scale * n * (n - 1)) / 2);
}

/** Migração: nível a partir do multiplicador linear antigo (+0.1/nv). */
export function incomeLevelFromLegacyMultiplier(mul: number): number {
  const m = Number(mul);
  if (!Number.isFinite(m) || m <= 1) return 0;
  return Math.max(0, Math.round((m - 1) / INCOME_STEP));
}
