"use client";

import { useEffect, useState } from "react";
import type { AuraElementKey } from "@/db/schema";
import { isAuraElementKey } from "@/db/schema";
import { AURA_ELEMENT_LABELS } from "@/src/game/systems/AuraSystem";
import {
  AURA_MIN_ACTIVE_SKILLS_TO_PICK,
  RARITY_LABEL,
  RARITY_STYLES,
  getSpecialSkillDisplayName,
  type MatchUpgrade,
  type SpecialSkillKey,
} from "@/lib/matchUpgrades";
import { useArenaStore } from "@/store/useArenaStore";

/** Modal de level up com cartas de raridade + countdown de auto-seleção. */
export function LevelUpModal() {
  const matchLevel = useArenaStore((s) => s.matchLevel);
  const options = useArenaStore((s) => s.levelUpOptions);
  const levelUpTimeRemaining = useArenaStore((s) => s.levelUpTimeRemaining);
  const pendingAuraEquip = useArenaStore((s) => s.pendingAuraEquip);
  const activeRunSkills = useArenaStore((s) => s.activeRunSkills);
  const selectUpgrade = useArenaStore((s) => s.selectUpgrade);
  const confirmAuraEquip = useArenaStore((s) => s.confirmAuraEquip);
  const cancelAuraEquip = useArenaStore((s) => s.cancelAuraEquip);
  const tickLevelUpCountdown = useArenaStore((s) => s.tickLevelUpCountdown);

  useEffect(() => {
    tickLevelUpCountdown();
    const id = window.setInterval(() => {
      tickLevelUpCountdown();
    }, 200);
    return () => window.clearInterval(id);
  }, [tickLevelUpCountdown]);

  const secondsLeft = Math.max(0, Math.ceil(levelUpTimeRemaining));

  if (pendingAuraEquip) {
    return (
      <AuraEquipPanel
        activeRunSkills={activeRunSkills}
        secondsLeft={secondsLeft}
        onConfirm={confirmAuraEquip}
        onCancel={cancelAuraEquip}
      />
    );
  }

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

        <div
          className={`grid w-full grid-cols-1 gap-3 ${
            options.length >= 5
              ? "sm:grid-cols-2 lg:grid-cols-5"
              : options.length >= 4
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : "sm:grid-cols-3"
          }`}
        >
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

function AuraEquipPanel({
  activeRunSkills,
  secondsLeft,
  onConfirm,
  onCancel,
}: {
  activeRunSkills: SpecialSkillKey[];
  secondsLeft: number;
  onConfirm: (replace: SpecialSkillKey, primary: AuraElementKey) => void;
  onCancel: () => void;
}) {
  const replaceOptions = activeRunSkills.filter((k) => k !== "aura");
  const [replaceSkill, setReplaceSkill] = useState<SpecialSkillKey | null>(
    null,
  );
  const [primaryElement, setPrimaryElement] = useState<AuraElementKey | null>(
    null,
  );

  const remaining = replaceSkill
    ? replaceOptions.filter((k) => k !== replaceSkill)
    : [];
  const primaryOptions = remaining.filter((k): k is AuraElementKey =>
    isAuraElementKey(k),
  );

  // Se trocou a skill a remover, limpa primário inválido
  useEffect(() => {
    if (
      primaryElement &&
      replaceSkill &&
      !primaryOptions.includes(primaryElement)
    ) {
      setPrimaryElement(null);
    }
  }, [primaryElement, primaryOptions, replaceSkill]);

  const canConfirm =
    replaceSkill != null &&
    primaryElement != null &&
    remaining.length >= AURA_MIN_ACTIVE_SKILLS_TO_PICK - 1;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-xl flex-col gap-5 rounded-2xl border border-violet-400/40 bg-zinc-950/95 px-5 py-6 shadow-2xl shadow-violet-950/50">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-300/90">
            Equipar Aura
          </p>
          <h2 className="mt-1 text-2xl font-black text-zinc-50">
            Troque uma skill e escolha o efeito 100%
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            A Aura ocupa um slot. A skill removida perde o nível desta run. O
            efeito primário fica em 100%; os demais parceiros em 50%.
          </p>
          <p
            className={`mt-3 font-mono text-xl font-bold tabular-nums ${
              secondsLeft <= 10 ? "text-rose-400" : "text-amber-300"
            }`}
            aria-live="polite"
          >
            {secondsLeft}s
          </p>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            1. Qual skill trocar pela Aura?
          </p>
          <div className="flex flex-wrap gap-2">
            {replaceOptions.map((key) => {
              const selected = replaceSkill === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setReplaceSkill(key);
                    setPrimaryElement(null);
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    selected
                      ? "border-rose-400/70 bg-rose-500/25 text-rose-100"
                      : "border-white/15 bg-white/[0.04] text-zinc-200 hover:border-rose-400/40"
                  }`}
                >
                  Remover {getSpecialSkillDisplayName(key)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            2. Qual efeito fica em 100%?
          </p>
          {!replaceSkill ? (
            <p className="text-xs text-zinc-500">
              Escolha primeiro a skill que será trocada.
            </p>
          ) : primaryOptions.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Sem parceiros válidos após a troca.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {primaryOptions.map((key) => {
                const selected = primaryElement === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPrimaryElement(key)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      selected
                        ? "border-violet-300/80 bg-violet-500/30 text-violet-50"
                        : "border-white/15 bg-white/[0.04] text-zinc-200 hover:border-violet-400/40"
                    }`}
                  >
                    {AURA_ELEMENT_LABELS[key]} · 100%
                  </button>
                );
              })}
            </div>
          )}
          {replaceSkill && primaryOptions.length > 1 && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Os outros efeitos restantes ficam em 50%.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!replaceSkill || !primaryElement) return;
              onConfirm(replaceSkill, primaryElement);
            }}
            className="flex-1 rounded-xl bg-violet-500 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            Confirmar Aura
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/5"
          >
            Cancelar
          </button>
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
