"use client";

import { Settings, X } from "lucide-react";
import {
  type DamageTextMode,
  type GameVisualSettings,
} from "@/lib/gameVisualSettings";
import { useGameStore } from "@/store/useGameStore";

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

const DAMAGE_TEXT_OPTIONS: { value: DamageTextMode; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "crits", label: "Apenas críticos" },
  { value: "off", label: "Desativados" },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-100">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-sky-500"
      />
    </label>
  );
}

/**
 * Modal de Configurações: desempenho e customização visual do canvas.
 */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const visualSettings = useGameStore((s) => s.visualSettings);
  const setVisualSettings = useGameStore((s) => s.setVisualSettings);

  if (!open) return null;

  const patch = (partial: Partial<GameVisualSettings>) => {
    setVisualSettings(partial);
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/12 bg-zinc-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-sky-400" aria-hidden />
            <h2
              id="settings-title"
              className="text-lg font-black tracking-tight text-zinc-50"
            >
              Configurações
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-zinc-900 p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Preferências de desempenho e visual — salvas no seu save.
        </p>

        <div className="mt-4 space-y-3">
          <ToggleRow
            label="Screen Shake"
            description="Tremores de tela em críticos, hits e explosões."
            checked={visualSettings.screenShake}
            onChange={(screenShake) => patch({ screenShake })}
          />

          <div className="rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-100">
              Textos flutuantes de dano
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Reduz poluição visual na horda.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAMAGE_TEXT_OPTIONS.map((opt) => {
                const active = visualSettings.damageTextMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => patch({ damageTextMode: opt.value })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? "bg-sky-500 text-white"
                        : "border border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <ToggleRow
            label="Qualidade de partículas"
            description="Desative para reduzir VFX pesados em dispositivos fracos."
            checked={visualSettings.highParticleQuality}
            onChange={(highParticleQuality) => patch({ highParticleQuality })}
          />

          <div className="rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  Zoom da câmera
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Afaste para ver mais mapa. Com zoom menor, some o clutter de
                  loot puxado até você.
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums text-sky-300">
                {Math.round(visualSettings.cameraZoom * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={Math.round(visualSettings.cameraZoom * 100)}
              onChange={(e) =>
                patch({ cameraZoom: Number(e.target.value) / 100 })
              }
              className="mt-3 w-full accent-sky-500"
              aria-label="Zoom da câmera"
            />
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-zinc-600">
              <span>Longe</span>
              <span>Perto</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-sky-500 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-sky-400"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
