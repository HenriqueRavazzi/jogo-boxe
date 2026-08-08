"use client";

import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronRight,
  Crosshair,
  Flame,
  Gem,
  Lock,
  Snowflake,
  Spline,
  Timer,
  X,
  Zap,
} from "lucide-react";
import {
  SKILL_STAT_KEYS,
  getSkillMetaCap,
  type SkillUpgradeType,
} from "@/db/schema";
import { getMatchSkillMaxLevel } from "@/lib/matchUpgrades";
import { syncWithDB } from "@/lib/syncWithDB";
import {
  getSkillStatLevel,
  useGameStore,
} from "@/store/useGameStore";

/** Nível visual máximo da barra de progresso (só UI). */
const STAT_BAR_CAP = 20;

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
    description: "Onda periódica a 40% do seu alcance.",
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
    description: "Projétil elétrico com cadeia em zigue-zague.",
    icon: <Zap className="h-5 w-5" aria-hidden />,
    statActions: {
      damage: {
        label: "Aumentar Dano",
        icon: <Zap className="h-4 w-4" aria-hidden />,
      },
      hits: {
        label: "Aumentar Alvos",
        icon: <Crosshair className="h-4 w-4" aria-hidden />,
      },
      cooldown: {
        label: "Reduzir Cooldown",
        icon: <Timer className="h-4 w-4" aria-hidden />,
      },
    },
  },
];

function StatProgressBar({ level }: { level: number }) {
  const pct = Math.min(100, (Math.max(0, level) / STAT_BAR_CAP) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-black/40"
      role="progressbar"
      aria-valuenow={level}
      aria-valuemin={0}
      aria-valuemax={STAT_BAR_CAP}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-violet-400/35 bg-zinc-950 shadow-2xl shadow-violet-950/40"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p
              id={titleId}
              className="inline-flex items-center gap-2 text-base font-bold text-violet-100"
            >
              <span className="text-violet-300">{card.icon}</span>
              {card.title}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-zinc-400">
              {card.description}
            </p>
            <p className="mt-1.5 text-[11px] text-violet-300/80">
              Teto in-run {matchMax} ·{" "}
              <span className="inline-flex items-center gap-1">
                <Gem className="h-3 w-3 text-violet-300" aria-hidden />
                {purpleDiamonds.toLocaleString("pt-BR")} roxos
              </span>
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
        </header>

        <ul className="flex max-h-[min(60vh,420px)] flex-col gap-2 overflow-y-auto p-3">
          {statKeys.map((statKey) => {
            const level = getSkillStatLevel(skills, card.type, statKey);
            const cost = getSkillStatUpgradeCost(card.type, statKey);
            const canUpgrade = purpleDiamonds >= cost;
            const action = card.statActions[statKey] ?? {
              label: String(statKey),
              icon: <Gem className="h-4 w-4" aria-hidden />,
            };

            return (
              <li
                key={statKey}
                className="rounded-xl border border-violet-400/25 bg-violet-500/5 px-3 py-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-50">
                    <span className="text-violet-300">{action.icon}</span>
                    {action.label}
                  </p>
                  <span className="shrink-0 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                    Nv. {level}
                  </span>
                </div>
                <StatProgressBar level={level} />
                <button
                  type="button"
                  disabled={!canUpgrade}
                  onClick={() => void upgradeStat(statKey)}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-400/45 bg-violet-500/20 px-2.5 py-2 text-xs font-bold text-violet-50 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Gem className="h-3.5 w-3.5 text-violet-300" aria-hidden />
                  Upgrade · {cost.toLocaleString("pt-BR")}
                </button>
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
  const gems = useGameStore((s) => s.gems);
  const purpleDiamonds = useGameStore((s) => s.purpleDiamonds);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const skills = useGameStore((s) => s.skills);
  const unlockAdvancedSkill = useGameStore((s) => s.unlockAdvancedSkill);
  const getAdvancedSkillUnlockCost = useGameStore(
    (s) => s.getAdvancedSkillUnlockCost,
  );

  const selectedCard =
    selected != null ? CARDS.find((c) => c.type === selected) ?? null : null;

  const unlock = async (type: SkillUpgradeType) => {
    if (!unlockAdvancedSkill(type)) return;
    await syncWithDB();
  };

  return (
    <div className={embedded ? "" : "rounded-2xl border border-white/10 p-3"}>
      {!embedded && (
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Skills Avançadas
        </p>
      )}
      <p className="mb-3 px-1 text-[11px] leading-snug text-zinc-500">
        Desbloqueie com diamantes. Clique numa skill liberada para upar cada
        atributo com diamantes roxos.
      </p>
      <div className="mb-2 px-1 text-[11px] text-violet-300/80">
        <span className="inline-flex items-center gap-1 font-semibold">
          <Gem className="h-3 w-3" aria-hidden />
          {purpleDiamonds.toLocaleString("pt-BR")} roxos
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CARDS.map((card) => {
          const unlocked = unlockedSkills[card.type];
          const skillStats = skills[card.type];
          const unlockCost = getAdvancedSkillUnlockCost(card.type);
          const matchMax = getMatchSkillMaxLevel(getSkillMetaCap(skillStats));
          const canUnlock = !unlocked && gems >= unlockCost;
          const totalLevels = SKILL_STAT_KEYS[card.type].reduce(
            (sum, key) => sum + getSkillStatLevel(skills, card.type, key),
            0,
          );

          if (!unlocked) {
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
                <button
                  type="button"
                  disabled={!canUnlock}
                  onClick={() => void unlock(card.type)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Gem className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                  Desbloquear · {unlockCost.toLocaleString("pt-BR")}
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
                  {totalLevels} pts · teto in-run {matchMax}
                </span>
                <span className="font-semibold text-violet-200">Detalhes</span>
              </div>
              <StatProgressBar level={Math.min(STAT_BAR_CAP, totalLevels)} />
            </button>
          );
        })}
      </div>

      {selectedCard && (
        <SkillDetailModal
          card={selectedCard}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
