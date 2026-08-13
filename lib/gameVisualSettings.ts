/** Preferências de desempenho / visual do canvas (persistidas no save). */

export type DamageTextMode = "all" | "crits" | "off";

/** Zoom 1 = padrão; menor = câmera mais longe (vê mais mapa). */
export const CAMERA_ZOOM_MIN = 0.5;
export const CAMERA_ZOOM_MAX = 1;
export const CAMERA_ZOOM_DEFAULT = 1;

export type GameVisualSettings = {
  /** Tremores de tela em hits/explosões. */
  screenShake: boolean;
  /** Textos flutuantes de dano. */
  damageTextMode: DamageTextMode;
  /** true = VFX completos; false = reduz partículas/efeitos pesados. */
  highParticleQuality: boolean;
  /**
   * Zoom da câmera (1 = perto/padrão; 0.5 = mais longe).
   * Com zoom < 1, ícones de loot não são desenhados.
   */
  cameraZoom: number;
};

export const DEFAULT_GAME_VISUAL_SETTINGS: GameVisualSettings = {
  screenShake: true,
  damageTextMode: "all",
  highParticleQuality: true,
  cameraZoom: CAMERA_ZOOM_DEFAULT,
};

export function clampCameraZoom(value: unknown): number {
  const n = typeof value === "number" ? value : CAMERA_ZOOM_DEFAULT;
  if (!Number.isFinite(n)) return CAMERA_ZOOM_DEFAULT;
  return Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, n));
}

/** Retângulo do mundo visível com o zoom atual (player no centro do canvas). */
export function getCameraWorldRect(
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
): { originX: number; originY: number; width: number; height: number } {
  const z = clampCameraZoom(zoom);
  const width = canvasWidth / z;
  const height = canvasHeight / z;
  return {
    width,
    height,
    originX: (canvasWidth - width) / 2,
    originY: (canvasHeight - height) / 2,
  };
}

export function normalizeGameVisualSettings(
  raw?: Partial<GameVisualSettings> | null,
): GameVisualSettings {
  const mode = raw?.damageTextMode;
  return {
    screenShake: raw?.screenShake !== false,
    damageTextMode:
      mode === "crits" || mode === "off" || mode === "all" ? mode : "all",
    highParticleQuality: raw?.highParticleQuality !== false,
    cameraZoom: clampCameraZoom(raw?.cameraZoom),
  };
}
