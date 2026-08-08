"use client";

import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronRight,
  Coins,
  Crosshair,
  Crown,
  Flame,
  Gem,
  Lock,
  RotateCcw,
  Snowflake,
  Spline,
  Swords,
  Timer,
  X,
  Zap,
} from "lucide-react";
import {
  MAX_PURPLE_SKILL_STAT_LEVEL,
  SKILL_STAT_KEYS,
  getSkillMetaCap,
  type SkillUpgradeType,
} from "@/db/schema";
import { getMatchSkillMaxLevel } from "@/lib/matchUpgrades";
import { syncWithDB } from "@/lib/syncWithDB";
import {
  getPurpleSkillSpentForLevel,
  getSkillStatLevel,
  useGameStore,
} from "@/store/useGameStore";

type SkillCardDef = {
  type: SkillUpgradeType;
  title: string;
  description: string;
  icon: ReactNode;
  /** Rótulos de ação por atributo (ex.: "Aumentar Dano"). */
  statActions: Record<string, { label: string; icon: ReactNode }>;
};

const CARDS: SkillCardDef[] = [
  {
    type: "ricochet",
    title: "Ricochete",
    description: "Socos saltam entre inimigos na janela ativa.",
    icon: <Spline className="h-5 w-5" aria-hidden />,
    statActions: {
      damage: {
        label: "Aumentar Dano",
        icon: <Crosshair className="h-4 w-4" aria-hidden />,
      },
      cooldown: {
        label: "Reduzir Cooldown",
        icon: <Timer className="h-4 w-4" aria-hidden />,
      },
      hits: {
        label: "Aumentar Ricochetes",
        icon: <Spline className="h-4 w-4" aria-hidden />,
      },
    },
  },
  {
    type: "ice",
    title: "Gelo",
    description:
      "Onda a 40% do alcance: congela e deixa vulnerável (+30% dano).",
    icon: <Snowflake className="h-5 w-5" aria-hidden />,
    statActions: {
      duration: {
        label: "Aumentar Duração",
        icon: <Snowflake className="h-4 w-4" aria-hidden />,
      },
      cooldown: {
        label: "Reduzir Cooldown",
        icon: <Timer className="h-4 w-4" aria-hidden />,
      },
    },
  },
  {
    type: "fire",
    title: "Fogo",
    description: "Queimadura on-hit com stacks cumulativos.",
    icon: <Flame className="h-5 w-5" aria-hidden />,
    statActions: {
      damage: {
        label: "Aumentar Dano",
        icon: <Flame className="h-4 w-4" aria-hidden />,
      },
      duration: {
        label: "Aumentar Duração",
        icon: <Timer className="h-4 w-4" aria-hidden />,
      },
    },
  },
  {
    type: "lightning",
    title: "Raio",
    description: "Estouro massivo no inimigo mais próximo + mini-stun.",
    icon: <Zap className="h-5 w-5" aria-hidden />,
    statActions: {
      damage: {
        label: "Aumentar Dano",
        icon: <Zap className="h-4 w-4" aria-hidden />,
      },
      hits: {
        label: "Aumentar Burst",
        icon: <Crosshair className="h-4 w-4" aria-hidden />,
      },
      cooldown: {
        label: "Reduzir Cooldown",
        icon: <Timer className="h-4 w-4" aria-hidden />,
      },
    },
  },
];

function StatProgressBar({
  level,
  max = MAX_PURPLE_SKILL_STAT_LEVEL,
}: {
  level: number;
  max?: number;
}) {
  const capped = Math.min(max, Math.max(0, level));
  const pct = max <= 0 ? 0 : Math.min(100, (capped / max) * 100);
  const isMax = capped >= max;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-zinc-900/80 ring-1 ring-inset ring-white/5"
      role="progressbar"
      aria-valuenow={capped}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${
          isMax
            ? "bg-gradient-to-r from-amber-500 to-yellow-300"
            : "bg-gradient-to-r from-violet-600 to-fuchsia-400"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function skillInvested(
  skills: ReturnType<typeof useGameStore.getState>["skills"],
  skillType: SkillUpgradeType,
): number {
  return SKILL_STAT_KEYS[skillType].reduce(
    (sum, key) =>
      sum + getPurpleSkillSpentForLevel(getSkillStatLevel(skills, skillType, key)),
    0,
  );
}

function SkillDetailModal({
  card,
  onClose,
}: {
  card: SkillCardDef;
  onClose: () => void;
}) {
  const titleId = useId();
  const purpleDiamonds = useGameStore((s) => s.purpleDiamonds);
  const skills = useGameStore((s) => s.skills);
  const upgradeSkillStat = useGameStore((s) => s.upgradeSkillStat);
  const getSkillStatUpgradeCost = useGameStore(
    (s) => s.getSkillStatUpgradeCost,
  );

  const matchMax = getMatchSkillMaxLevel(
    getSkillMetaCap(skills[card.type]),
  );
  const statKeys = SKILL_STAT_KEYS[card.type];
  const invested = skillInvested(skills, card.type);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const upgradeStat = async (statKey: string) => {
    if (!upgradeSkillStat(card.type, statKey)) return;
    await syncWithDB();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-md max-h-[min(90vh,640px)] flex-col overflow-hidden rounded-2xl border border-violet-400/40 bg-zinc-950 shadow-2xl shadow-violet-950/50"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-white/10 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                id={titleId}
                className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-violet-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
                  {card.icon}
                </span>
                {card.title}
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-zinc-400">
                {card.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-violet-200/85">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Gem className="h-3 w-3 text-violet-300" aria-hidden />
              {purpleDiamonds.toLocaleString("pt-BR")} disponíveis
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              Investido nesta skill:{" "}
              <span className="font-semibold text-violet-200">
                {invested.toLocaleString("pt-BR")}
              </span>
            </span>
            <span className="text-zinc-600">·</span>
            <span>Teto in-run {matchMax}</span>
          </div>
        </header>

        <ul className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
          {statKeys.map((statKey) => {
            const level = getSkillStatLevel(skills, card.type, statKey);
            const atMax = level >= MAX_PURPLE_SKILL_STAT_LEVEL;
            const cost = getSkillStatUpgradeCost(card.type, statKey);
            const canUpgrade =
              !atMax &&
              Number.isFinite(cost) &&
              purpleDiamonds >= cost;
            const action = card.statActions[statKey] ?? {
              label: String(statKey),
              icon: <Gem className="h-4 w-4" aria-hidden />,
            };

            return (
              <li
                key={statKey}
                className={`rounded-xl border px-3.5 py-3 ${
                  atMax
                    ? "border-amber-400/35 bg-amber-500/5"
                    : "border-violet-400/30 bg-violet-500/[0.07]"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-50">
                    <span
                      className={atMax ? "text-amber-300" : "text-violet-300"}
                    >
                      {action.icon}
                    </span>
                    {action.label}
                  </p>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      atMax
                        ? "bg-amber-500/25 text-amber-100"
                        : "bg-violet-500/25 text-violet-100"
                    }`}
                  >
                    {atMax
                      ? "Máx"
                      : `Nv. ${level}/${MAX_PURPLE_SKILL_STAT_LEVEL}`}
                  </span>
                </div>
                <StatProgressBar level={level} />
                {atMax ? (
                  <div className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-2 text-xs font-bold text-amber-100">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Nível máximo ({MAX_PURPLE_SKILL_STAT_LEVEL})
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canUpgrade}
                    onClick={() => void upgradeStat(statKey)}
                    className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-400/50 bg-violet-500/25 px-2.5 py-2 text-xs font-bold text-violet-50 transition hover:bg-violet-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Gem className="h-3.5 w-3.5 text-violet-300" aria-hidden />
                    Upgrade · {cost.toLocaleString("pt-BR")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Painel: desbloqueio (diamantes) + modal de atributos (diamantes roxos). */
export function AdvancedSkillsPanel({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [selected, setSelected] = useState<SkillUpgradeType | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const gems = useGameStore((s) => s.gems);
  const gold = useGameStore((s) => s.gold);
  const purpleDiamonds = useGameStore((s) => s.purpleDiamonds);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const skills = useGameStore((s) => s.skills);
  const totalMobsKilled = useGameStore((s) => s.totalMobsKilled);
  const totalBossesKilled = useGameStore((s) => s.totalBossesKilled);
  const unlockAdvancedSkill = useGameStore((s) => s.unlockAdvancedSkill);
  const getAdvancedSkillUnlockRequirements = useGameStore(
    (s) => s.getAdvancedSkillUnlockRequirements,
  );
  const canUnlockAdvancedSkill = useGameStore((s) => s.canUnlockAdvancedSkill);
  const getPurpleSkillInvestment = useGameStore(
    (s) => s.getPurpleSkillInvestment,
  );
  const resetSkillTree = useGameStore((s) => s.resetSkillTree);
  const enforcePurpleSkillCap = useGameStore((s) => s.enforcePurpleSkillCap);

  const selectedCard =
    selected != null ? CARDS.find((c) => c.type === selected) ?? null : null;
  const investment = getPurpleSkillInvestment();
  const canReset = investment > 0;

  // Sessoes já abertas com níveis > teto: corta e reembolsa.
  useEffect(() => {
    enforcePurpleSkillCap();
  }, [enforcePurpleSkillCap]);

  const unlock = async (type: SkillUpgradeType) => {
    if (!unlockAdvancedSkill(type)) return;
    await syncWithDB();
  };

  const confirmRespec = async () => {
    const refunded = resetSkillTree();
    setConfirmReset(false);
    setSelected(null);
    if (refunded > 0) await syncWithDB();
  };

  return (
    <div className={embedded ? "" : "rounded-2xl border border-white/10 p-3"}>
      {!embedded && (
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Skills Avançadas
        </p>
      )}
      <p className="mb-3 px-1 text-[11px] leading-snug text-zinc-500">
        Desbloqueie com ouro + diamantes após atingir os marcos de abates.
        Depois, upagrade atributos com diamantes roxos (máx.{" "}
        {MAX_PURPLE_SKILL_STAT_LEVEL} por atributo).
      </p>
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px]">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-300/90">
          <Coins className="h-3 w-3" aria-hidden />
          {gold.toLocaleString("pt-BR")} ouro
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-cyan-300/90">
          <Gem className="h-3 w-3" aria-hidden />
          {gems.toLocaleString("pt-BR")} diamantes
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-violet-300/80">
          <Gem className="h-3 w-3" aria-hidden />
          {purpleDiamonds.toLocaleString("pt-BR")} roxos
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARDS.map((card) => {
          const unlocked = unlockedSkills[card.type];
          const skillStats = skills[card.type];
          const req = getAdvancedSkillUnlockRequirements(card.type);
          const matchMax = getMatchSkillMaxLevel(getSkillMetaCap(skillStats));
          const canUnlock = canUnlockAdvancedSkill(card.type);
          const totalLevels = SKILL_STAT_KEYS[card.type].reduce(
            (sum, key) => sum + getSkillStatLevel(skills, card.type, key),
            0,
          );
          const maxTotal =
            SKILL_STAT_KEYS[card.type].length * MAX_PURPLE_SKILL_STAT_LEVEL;

          if (!unlocked) {
            const mobsOk = totalMobsKilled >= req.requiredMobs;
            const bossesOk = totalBossesKilled >= req.requiredBosses;
            const goldOk = gold >= req.goldCost;
            const gemsOk = gems >= req.diamondCost;

            return (
              <div
                key={card.type}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-300">
                      <span className="text-zinc-500">{card.icon}</span>
                      {card.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                      {card.description}
                    </p>
                  </div>
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-zinc-500"
                    aria-hidden
                  />
                </div>

                <div className="flex flex-col gap-1 rounded-lg border border-white/5 bg-zinc-950/50 px-2 py-1.5 text-[10px]">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                        goldOk ? "text-amber-300" : "text-zinc-500"
                      }`}
                    >
                      <Coins className="h-3 w-3" aria-hidden />
                      {req.goldCost.toLocaleString("pt-BR")} Ouro
                    </span>
                    <span className="text-zinc-600">+</span>
                    <span
                      className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                        gemsOk ? "text-cyan-300" : "text-zinc-500"
                      }`}
                    >
                      <Gem className="h-3 w-3" aria-hidden />
                      {req.diamondCost.toLocaleString("pt-BR")} Diamantes
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-zinc-400">
                    <span
                      className={`inline-flex items-center gap-0.5 tabular-nums ${
                        mobsOk ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    >
                      <Swords className="h-3 w-3" aria-hidden />
                      Inimigos: {totalMobsKilled.toLocaleString("pt-BR")} /{" "}
                      {req.requiredMobs.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-zinc-700">|</span>
                    <span
                      className={`inline-flex items-center gap-0.5 tabular-nums ${
                        bossesOk ? "text-amber-300" : "text-zinc-500"
                      }`}
                    >
                      <Crown className="h-3 w-3" aria-hidden />
                      Chefes: {totalBossesKilled.toLocaleString("pt-BR")} /{" "}
                      {req.requiredBosses.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canUnlock}
                  onClick={() => void unlock(card.type)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    canUnlock
                      ? "border border-cyan-400/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
                      : "cursor-not-allowed border border-zinc-700/60 bg-zinc-800/50 text-zinc-500"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Desbloquear
                </button>
              </div>
            );
          }

          return (
            <button
              key={card.type}
              type="button"
              onClick={() => setSelected(card.type)}
              className="flex flex-col gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2.5 text-left transition hover:border-violet-300/50 hover:bg-violet-500/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-100">
                    <span className="text-violet-300">{card.icon}</span>
                    {card.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                    {card.description}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-violet-300/80"
                  aria-hidden
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-violet-200/85">
                <span>
                  {totalLevels}/{maxTotal} pts · teto in-run {matchMax}
                </span>
                <span className="font-semibold text-violet-200">Detalhes</span>
              </div>
              <StatProgressBar level={totalLevels} max={maxTotal} />
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <button
          type="button"
          disabled={!canReset}
          onClick={() => setConfirmReset(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2.5 text-xs font-bold text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Resetar Árvore de Skills
          {canReset && (
            <span className="font-semibold text-violet-200">
              · +{investment.toLocaleString("pt-BR")} roxos
            </span>
          )}
        </button>
        <p className="mt-1.5 px-1 text-[10px] leading-snug text-zinc-500">
          Devolve 100% dos diamantes roxos investidos nos atributos. Desbloqueios
          com diamantes normais são mantidos.
        </p>
      </div>

      {selectedCard && (
        <SkillDetailModal
          card={selectedCard}
          onClose={() => setSelected(null)}
        />
      )}

      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="respec-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p
                  id="respec-title"
                  className="text-sm font-bold text-zinc-100"
                >
                  Resetar árvore roxa?
                </p>
                <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                  Todos os atributos granulares voltam a 0. Você recebe{" "}
                  <span className="font-semibold text-violet-300">
                    {investment.toLocaleString("pt-BR")} diamantes roxos
                  </span>{" "}
                  de volta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmRespec()}
                className="flex-1 rounded-xl border border-rose-400/50 bg-rose-500/25 px-3 py-2 text-xs font-bold text-rose-50 transition hover:bg-rose-500/40"
              >
                Confirmar reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
