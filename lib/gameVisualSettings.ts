/** Preferências de desempenho / visual do canvas (persistidas no save). */

export type DamageTextMode = "all" | "crits" | "off";

export type GameVisualSettings = {
  /** Tremores de tela em hits/explosões. */
  screenShake: boolean;
  /** Textos flutuantes de dano. */
  damageTextMode: DamageTextMode;
  /** true = VFX completos; false = reduz partículas/efeitos pesados. */
  highParticleQuality: boolean;
};

export const DEFAULT_GAME_VISUAL_SETTINGS: GameVisualSettings = {
  screenShake: true,
  damageTextMode: "all",
  highParticleQuality: true,
};

export function normalizeGameVisualSettings(
  raw?: Partial<GameVisualSettings> | null,
): GameVisualSettings {
  const mode = raw?.damageTextMode;
  return {
    screenShake: raw?.screenShake !== false,
    damageTextMode:
      mode === "crits" || mode === "off" || mode === "all" ? mode : "all",
    highParticleQuality: raw?.highParticleQuality !== false,
  };
}
