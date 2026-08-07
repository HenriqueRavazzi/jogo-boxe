"use client";

import {
  RARITY_LABEL,
  RARITY_STYLES,
  type MatchUpgrade,
} from "@/lib/matchUpgrades";
import { useArenaStore } from "@/store/useArenaStore";

/** Modal de level up com 3 cartas de raridade. */
export function LevelUpModal() {
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const options = useArenaStore((s) => s.levelUpOptions);
  const selectUpgrade = useArenaStore((s) => s.selectUpgrade);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col items-center gap-6 px-4">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-amber-300/90">
            Level Up
          </p>
          <h2 className="mt-1 text-3xl font-black text-zinc-50 sm:text-4xl">
            Nível {matchLevel}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Escolha um upgrade para continuar
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {options.map((card) => (
            <UpgradeCard
              key={card.id}
              card={card}
              onSelect={() => selectUpgrade(card.type, card.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UpgradeCard({
  card,
  onSelect,
}: {
  card: MatchUpgrade;
  onSelect: () => void;
}) {
  const styles = RARITY_STYLES[card.rarity];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-6 text-center shadow-lg transition hover:scale-[1.03] hover:shadow-xl ${styles.border} ${styles.bg} ${styles.glow}`}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${styles.text}`}
      >
        {RARITY_LABEL[card.rarity]}
      </span>
      <span className="text-xl font-black text-zinc-50">{card.label}</span>
      <span className="text-xs text-zinc-400">{card.description}</span>
    </button>
  );
}
