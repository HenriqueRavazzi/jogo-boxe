/** Desbloqueio progressivo de dificuldades (campanha + endless). */

import type { DifficultyConfig } from "@/lib/gameConfig";
import { TOTAL_STAGES } from "@/lib/stages";

/** Ordem canônica — concluir a fase 50 de uma libera a próxima. */
export const DIFFICULTY_UNLOCK_ORDER = [
  "Fácil",
  "Médio",
  "Difícil",
  "Muito Difícil",
  "Extremo",
  "Inferno",
] as const;

export type DifficultyName = (typeof DIFFICULTY_UNLOCK_ORDER)[number];

export type UnlockedDifficulties = Record<string, boolean>;

/** Fácil / Médio / Difícil liberados; demais bloqueados. */
export function createDefaultUnlockedDifficulties(): UnlockedDifficulties {
  const out: UnlockedDifficulties = {};
  for (const name of DIFFICULTY_UNLOCK_ORDER) {
    out[name] =
      name === "Fácil" || name === "Médio" || name === "Difícil";
  }
  return out;
}

/** Alias legado (seed antigo) → nome canônico. */
const LEGACY_DIFFICULTY_ALIASES: Record<string, DifficultyName> = {
  Infernal: "Inferno",
  Easy: "Fácil",
  Medium: "Médio",
  Hard: "Difícil",
  Insane: "Inferno",
};

export function canonicalDifficultyName(name: string): string {
  return LEGACY_DIFFICULTY_ALIASES[name] ?? name;
}

export function normalizeUnlockedDifficulties(
  partial?: UnlockedDifficulties | Record<string, unknown> | null,
  maxStageCleared = 0,
): UnlockedDifficulties {
  const base = createDefaultUnlockedDifficulties();
  if (partial && typeof partial === "object") {
    for (const [rawKey, value] of Object.entries(partial)) {
      const key = canonicalDifficultyName(rawKey);
      if (value === true) base[key] = true;
    }
  }
  // Campanha já zerada antes do gate: libera Muito Difícil como migração.
  if (maxStageCleared >= TOTAL_STAGES) {
    base["Muito Difícil"] = true;
  }
  // Cascata: se uma alta está liberada, todas anteriores também.
  let seenUnlockedHigh = false;
  for (let i = DIFFICULTY_UNLOCK_ORDER.length - 1; i >= 0; i--) {
    const name = DIFFICULTY_UNLOCK_ORDER[i]!;
    if (base[name]) seenUnlockedHigh = true;
    if (seenUnlockedHigh) base[name] = true;
  }
  return base;
}

export function isDifficultyUnlocked(
  unlocked: UnlockedDifficulties,
  name: string,
): boolean {
  const key = canonicalDifficultyName(name);
  if (
    key === "Fácil" ||
    key === "Médio" ||
    key === "Difícil"
  ) {
    return true;
  }
  return unlocked[key] === true;
}

/** Nome da dificuldade imediatamente anterior (para texto de cadeado). */
export function getPreviousDifficultyName(name: string): string | null {
  const key = canonicalDifficultyName(name);
  const idx = DIFFICULTY_UNLOCK_ORDER.indexOf(key as DifficultyName);
  if (idx <= 0) return null;
  return DIFFICULTY_UNLOCK_ORDER[idx - 1]!;
}

export function getDifficultyUnlockHint(name: string): string {
  const prev = getPreviousDifficultyName(name);
  if (!prev) return "Disponível";
  return `Desbloqueie concluindo todas as fases do ${prev}`;
}

/**
 * Ao limpar a fase final numa dificuldade, libera a próxima na ordem.
 * Retorna o novo mapa e o nome recém-liberado (se houver).
 */
export function unlockNextDifficultyAfterClear(
  unlocked: UnlockedDifficulties,
  clearedDifficultyName: string | null | undefined,
): { unlocked: UnlockedDifficulties; newlyUnlocked: string | null } {
  if (!clearedDifficultyName) {
    return { unlocked, newlyUnlocked: null };
  }
  const key = canonicalDifficultyName(clearedDifficultyName);
  const idx = DIFFICULTY_UNLOCK_ORDER.indexOf(key as DifficultyName);
  if (idx < 0 || idx >= DIFFICULTY_UNLOCK_ORDER.length - 1) {
    return { unlocked: { ...unlocked, [key]: true }, newlyUnlocked: null };
  }
  const next = DIFFICULTY_UNLOCK_ORDER[idx + 1]!;
  if (unlocked[next]) {
    return { unlocked: { ...unlocked, [key]: true }, newlyUnlocked: null };
  }
  return {
    unlocked: { ...unlocked, [key]: true, [next]: true },
    newlyUnlocked: next,
  };
}

export function pickDefaultUnlockedDifficultyId(
  list: DifficultyConfig[],
  unlocked: UnlockedDifficulties,
): number | null {
  const preferred = ["Médio", "Fácil", "Difícil"];
  for (const name of preferred) {
    const row = list.find(
      (d) =>
        canonicalDifficultyName(d.name) === name &&
        isDifficultyUnlocked(unlocked, d.name),
    );
    if (row) return row.id;
  }
  const first = list.find((d) => isDifficultyUnlocked(unlocked, d.name));
  return first?.id ?? list[0]?.id ?? null;
}
