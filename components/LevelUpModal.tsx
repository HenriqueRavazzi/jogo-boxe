"use client";

import { useEffect } from "react";
import {
  RARITY_LABEL,
  RARITY_STYLES,
  type MatchUpgrade,
} from "@/lib/matchUpgrades";
import { useArenaStore } from "@/store/useArenaStore";

/** Modal de level up com 3 cartas de raridade + countdown de auto-seleção. */
export function LevelUpModal() {
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const options = useArenaStore((s) => s.levelUpOptions);
  const levelUpTimeRemaining = useArenaStore((s) => s.levelUpTimeRemaining);
  const selectUpgrade = useArenaStore((s) => s.selectUpgrade);
  const tickLevelUpCountdown = useArenaStore((s) => s.tickLevelUpCountdown);

  // Countdown baseado em deadline real (Date.now) — funciona com aba em background
  useEffect(() => {
    tickLevelUpCountdown();
    const id = window.setInterval(() => {
      tickLevelUpCountdown();
    }, 200);
    return () => window.clearInterval(id);
  }, [tickLevelUpCountdown]);

  const secondsLeft = Math.max(0, Math.ceil(levelUpTimeRemaining));

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
          <p
            className={`mt-3 font-mono text-2xl font-bold tabular-nums ${
              secondsLeft <= 10 ? "text-rose-400" : "text-amber-300"
            }`}
            aria-live="polite"
          >
            {secondsLeft}s
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Seleção automática ao zerar o tempo
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {options.map((card) => (
            <UpgradeCard
              key={card.id}
              card={card}
              onSelect={() =>
                selectUpgrade(card.type, card.value, card.skillBonus)
              }
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
  const isMastery = card.type.startsWith("mastery_");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-6 text-center shadow-lg transition hover:scale-[1.03] hover:shadow-xl ${styles.border} ${styles.bg} ${styles.glow} ${
        isMastery ? "ring-2 ring-amber-300/80 shadow-amber-400/40" : ""
      }`}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${styles.text}`}
      >
        {isMastery ? "Supremo" : RARITY_LABEL[card.rarity]}
      </span>
      <span className="text-xl font-black text-zinc-50">{card.label}</span>
      {card.effectLines && card.effectLines.length > 0 ? (
        <>
          {card.description.startsWith("Ativa:") && (
            <span className="text-[11px] leading-snug text-zinc-500">
              {card.description.split(" · ")[0]?.replace(/\.$/, "")}
            </span>
          )}
          <ul className="mt-1 w-full space-y-0.5 text-left text-xs text-zinc-300">
            {card.effectLines.map((line) => (
              <li key={line} className="flex gap-1.5">
                <span className={styles.text}>•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <span className="text-xs text-zinc-400">{card.description}</span>
      )}
    </button>
  );
}
