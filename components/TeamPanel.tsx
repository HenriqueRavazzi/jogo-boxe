"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Coins,
  Crosshair,
  Dumbbell,
  Gem,
  HeartPulse,
  Star,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import {
  getTeamMemberDef,
  getTeamMemberStars,
  getTeamTierWeights,
  MAX_EQUIPPED_TEAM_MEMBERS,
  TEAM_MEMBER_DEFS,
  TEAM_MULTI_PULL_COUNT,
  TEAM_MULTI_PULL_DISCOUNT,
  TEAM_ROLE_LABEL,
  TEAM_STAR_EVERY_LEVELS,
  TEAM_STAR_STAT_BONUS,
  TEAM_TIER_LABEL,
  type RecruitTeamPullEntry,
  type TeamMemberId,
  type TeamRole,
  type TeamTier,
} from "@/lib/teamMembers";
import { syncWithDB } from "@/lib/syncWithDB";
import { useGameStore } from "@/store/useGameStore";

const ROLE_ICONS: Record<TeamRole, ReactNode> = {
  cutman: <HeartPulse className="h-4 w-4" aria-hidden />,
  sparring: <Dumbbell className="h-4 w-4" aria-hidden />,
  vitality: <Users className="h-4 w-4" aria-hidden />,
  coach: <Crosshair className="h-4 w-4" aria-hidden />,
  manager: <Wallet className="h-4 w-4" aria-hidden />,
};

const TIER_CARD: Record<TeamTier, string> = {
  common: "border-zinc-500/40 bg-zinc-800/40 text-zinc-100",
  uncommon: "border-emerald-400/45 bg-emerald-950/40 text-emerald-50",
  rare: "border-sky-400/45 bg-sky-950/40 text-sky-50",
  epic: "border-violet-400/50 bg-violet-950/45 text-violet-50",
  legendary: "border-amber-400/55 bg-amber-950/45 text-amber-50",
};

const TIER_BADGE: Record<TeamTier, string> = {
  common: "bg-zinc-500/30 text-zinc-200",
  uncommon: "bg-emerald-500/25 text-emerald-200",
  rare: "bg-sky-500/25 text-sky-200",
  epic: "bg-violet-500/30 text-violet-200",
  legendary: "bg-amber-500/30 text-amber-100",
};

const TIER_REVEAL: Record<TeamTier, string> = {
  common: "from-zinc-600 to-zinc-800",
  uncommon: "from-emerald-500 to-emerald-900",
  rare: "from-sky-400 to-sky-900",
  epic: "from-violet-400 to-violet-950",
  legendary: "from-amber-300 to-orange-800",
};

const TIER_RANK: Record<TeamTier, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

function TeamStars({ level }: { level: number }) {
  const stars = getTeamMemberStars(level);
  if (stars <= 0) return null;
  const shown = Math.min(stars, 5);
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`${stars} estrela${stars > 1 ? "s" : ""} · +${Math.round(TEAM_STAR_STAT_BONUS * 100)}% stats cada`}
    >
      {Array.from({ length: shown }, (_, i) => (
        <Star
          key={i}
          className="h-3 w-3 fill-amber-400 text-amber-400"
          aria-hidden
        />
      ))}
      {stars > shown ? (
        <span className="text-[9px] font-bold tabular-nums text-amber-200">
          +{stars - shown}
        </span>
      ) : null}
    </span>
  );
}

/** Painel da Equipe: gacha com pity + slots na esquina. */
export function TeamPanel({ embedded = false }: { embedded?: boolean }) {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const teamPity = useGameStore((s) => s.teamPity);
  const teamMembersOwned = useGameStore((s) => s.teamMembersOwned);
  const equippedTeamMemberIds = useGameStore((s) => s.equippedTeamMemberIds);
  const getTeamRecruitCost = useGameStore((s) => s.getTeamRecruitCost);
  const getTeamMultiRecruitCost = useGameStore((s) => s.getTeamMultiRecruitCost);
  const recruitTeamMember = useGameStore((s) => s.recruitTeamMember);
  const recruitTeamMembers = useGameStore((s) => s.recruitTeamMembers);
  const equipTeamMember = useGameStore((s) => s.equipTeamMember);
  const unequipTeamMember = useGameStore((s) => s.unequipTeamMember);

  const [reveal, setReveal] = useState<{
    memberId: TeamMemberId;
    tier: TeamTier;
    isDuplicate: boolean;
    level: number;
  } | null>(null);
  const [batchReveal, setBatchReveal] = useState<RecruitTeamPullEntry[] | null>(
    null,
  );
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cost = getTeamRecruitCost();
  const multiCost = getTeamMultiRecruitCost();
  const canRecruit = gold >= cost.gold && gems >= cost.gems;
  const canRecruitMulti = gold >= multiCost.gold && gems >= multiCost.gems;
  const weights = getTeamTierWeights(teamPity);
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const discountPct = Math.round(TEAM_MULTI_PULL_DISCOUNT * 100);

  useEffect(() => {
    if (!reveal && !batchReveal) return;
    setRevealing(true);
    const t = window.setTimeout(() => setRevealing(false), 650);
    return () => window.clearTimeout(t);
  }, [reveal, batchReveal]);

  const handleRecruit = async () => {
    setError(null);
    setBatchReveal(null);
    const result = recruitTeamMember();
    if (!result.ok) {
      setError("Ouro ou diamantes insuficientes.");
      return;
    }
    setReveal({
      memberId: result.memberId,
      tier: result.tier,
      isDuplicate: result.isDuplicate,
      level: result.level,
    });
    await syncWithDB();
  };

  const handleRecruitMulti = async () => {
    setError(null);
    setReveal(null);
    const result = recruitTeamMembers(TEAM_MULTI_PULL_COUNT);
    if (!result.ok) {
      setError("Ouro ou diamantes insuficientes para o pacote 10×.");
      return;
    }
    setBatchReveal(result.pulls);
    await syncWithDB();
  };

  const handleToggleEquip = async (id: TeamMemberId) => {
    if (equippedTeamMemberIds.includes(id)) {
      unequipTeamMember(id);
    } else if (!equipTeamMember(id)) {
      setError(`Máximo de ${MAX_EQUIPPED_TEAM_MEMBERS} na esquina.`);
      return;
    }
    setError(null);
    await syncWithDB();
  };

  const ownedList = TEAM_MEMBER_DEFS.filter(
    (d) => (teamMembersOwned[d.id] ?? 0) > 0,
  ).sort((a, b) => {
    const tierOrder = [
      "legendary",
      "epic",
      "rare",
      "uncommon",
      "common",
    ] as TeamTier[];
    return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
  });

  const revealDef = reveal ? getTeamMemberDef(reveal.memberId) : null;
  const bestBatchTier =
    batchReveal && batchReveal.length > 0
      ? batchReveal.reduce(
          (best, p) => (TIER_RANK[p.tier] > TIER_RANK[best] ? p.tier : best),
          batchReveal[0]!.tier,
        )
      : null;
  const batchNewCount = batchReveal?.filter((p) => !p.isDuplicate).length ?? 0;

  return (
    <div className={embedded ? "" : "rounded-2xl border border-white/10 p-3"}>
      {!embedded && (
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          Equipe
        </p>
      )}
      <p className="mb-3 px-1 text-[11px] leading-snug text-zinc-500">
        Recrute membros com ouro e diamantes. Duplicatas sobem o nível. Equipe
        até {MAX_EQUIPPED_TEAM_MEMBERS} na esquina do ringue. Pity melhora rare+
        com pulls acumuladas. Pacote {TEAM_MULTI_PULL_COUNT}× com {discountPct}%
        de desconto.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2 px-1 text-[10px] text-zinc-400">
        <span>
          Pulls:{" "}
          <strong className="text-zinc-200">{teamPity.totalPulls}</strong>
        </span>
        <span className="text-zinc-600">·</span>
        <span>
          Desde Épico:{" "}
          <strong className="text-violet-200">
            {teamPity.pullsSinceEpic}
          </strong>
        </span>
        <span className="text-zinc-600">·</span>
        <span>
          Desde Lendário:{" "}
          <strong className="text-amber-200">
            {teamPity.pullsSinceLegendary}
          </strong>
        </span>
        <span className="text-zinc-600">·</span>
        <span>
          Slots: {equippedTeamMemberIds.length}/{MAX_EQUIPPED_TEAM_MEMBERS}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 px-1 text-[10px]">
        {(
          [
            "common",
            "uncommon",
            "rare",
            "epic",
            "legendary",
          ] as TeamTier[]
        ).map((tier) => (
          <span
            key={tier}
            className={`rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${TIER_BADGE[tier]}`}
          >
            {TEAM_TIER_LABEL[tier]}{" "}
            {weightSum > 0
              ? `${((weights[tier] / weightSum) * 100).toFixed(1)}%`
              : "—"}
          </span>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canRecruit}
            onClick={() => void handleRecruit()}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            Recrutar Membro
            <span className="inline-flex items-center gap-1 font-semibold tabular-nums opacity-90">
              <Coins className="h-3 w-3 text-amber-200" aria-hidden />
              {cost.gold.toLocaleString("pt-BR")}
              <Gem className="h-3 w-3 text-cyan-200" aria-hidden />
              {cost.gems.toLocaleString("pt-BR")}
            </span>
          </button>
          <button
            type="button"
            disabled={!canRecruitMulti}
            onClick={() => void handleRecruitMulti()}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            Recrutar {TEAM_MULTI_PULL_COUNT}×
            <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100">
              −{discountPct}%
            </span>
            <span className="inline-flex items-center gap-1 font-semibold tabular-nums opacity-90">
              <Coins className="h-3 w-3 text-amber-200" aria-hidden />
              {multiCost.gold.toLocaleString("pt-BR")}
              <Gem className="h-3 w-3 text-cyan-200" aria-hidden />
              {multiCost.gems.toLocaleString("pt-BR")}
            </span>
          </button>
        </div>
        <p className="text-[10px] text-zinc-500">
          Pacote: soma das próximas {TEAM_MULTI_PULL_COUNT} pulls com desconto
          (sem pacote: {multiCost.rawGold.toLocaleString("pt-BR")} ouro ·{" "}
          {multiCost.rawGems.toLocaleString("pt-BR")} diamantes).
        </p>
        {error && (
          <span className="text-[11px] font-medium text-rose-300">{error}</span>
        )}
      </div>

      {reveal && revealDef && (
        <div
          className={`mb-4 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br p-4 transition duration-500 ${TIER_REVEAL[reveal.tier]} ${
            revealing ? "scale-[1.02] opacity-100" : "scale-100 opacity-95"
          }`}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
            {reveal.isDuplicate ? "Duplicata" : "Novo membro"} ·{" "}
            {TEAM_TIER_LABEL[reveal.tier]}
          </p>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/25 text-white">
              {ROLE_ICONS[revealDef.role]}
            </span>
            <div>
              <p className="text-lg font-black text-white">{revealDef.name}</p>
              <p className="text-xs text-white/80">
                {TEAM_ROLE_LABEL[revealDef.role]} · Nv. {reveal.level}
                {getTeamMemberStars(reveal.level) > 0
                  ? ` · ${getTeamMemberStars(reveal.level)}★`
                  : ""}
              </p>
              <p className="mt-1 text-[11px] text-white/75">
                {revealDef.bonusLabel(reveal.level)}
              </p>
            </div>
          </div>
        </div>
      )}

      {batchReveal && bestBatchTier && (
        <div
          className={`mb-4 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br p-3 transition duration-500 ${TIER_REVEAL[bestBatchTier]} ${
            revealing ? "scale-[1.01] opacity-100" : "scale-100 opacity-95"
          }`}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
            Pacote {TEAM_MULTI_PULL_COUNT}× · {batchNewCount} novos · melhor:{" "}
            {TEAM_TIER_LABEL[bestBatchTier]}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {batchReveal.map((pull, idx) => {
              const def = getTeamMemberDef(pull.memberId);
              return (
                <li
                  key={`${pull.memberId}-${idx}`}
                  className="flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-black/30 text-white">
                    {ROLE_ICONS[def.role]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">
                      {def.name}
                    </p>
                    <p className="text-[10px] text-white/75">
                      {pull.isDuplicate ? "Duplicata" : "Novo"} ·{" "}
                      {TEAM_TIER_LABEL[pull.tier]} · Nv. {pull.level}
                      {getTeamMemberStars(pull.level) > 0
                        ? ` · ${getTeamMemberStars(pull.level)}★`
                        : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {equippedTeamMemberIds.length > 0 && (
        <div className="mb-3 px-1">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Esquina do Ringue
          </p>
          <div className="flex flex-wrap gap-1.5">
            {equippedTeamMemberIds.map((id) => {
              const def = getTeamMemberDef(id);
              const level = teamMembersOwned[id] ?? 0;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void handleToggleEquip(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold ${TIER_CARD[def.tier]}`}
                >
                  {ROLE_ICONS[def.role]}
                  {def.name}
                  <span className="inline-flex items-center gap-1 opacity-70">
                    Nv.{level}
                    <TeamStars level={level} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
        Coleção ({ownedList.length}/{TEAM_MEMBER_DEFS.length})
      </p>
      {ownedList.length === 0 ? (
        <p className="px-1 text-[11px] text-zinc-500">
          Nenhum membro ainda — recrute o primeiro.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ownedList.map((def) => {
            const level = teamMembersOwned[def.id] ?? 0;
            const equipped = equippedTeamMemberIds.includes(def.id);
            const stars = getTeamMemberStars(level);
            return (
              <li
                key={def.id}
                className={`rounded-xl border px-3 py-2.5 ${TIER_CARD[def.tier]} ${
                  equipped ? "ring-2 ring-orange-400/60" : ""
                }`}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {ROLE_ICONS[def.role]}
                    <div>
                      <p className="text-sm font-bold">{def.name}</p>
                      <p className="text-[10px] uppercase tracking-wider opacity-70">
                        {TEAM_ROLE_LABEL[def.role]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${TIER_BADGE[def.tier]}`}
                    >
                      {TEAM_TIER_LABEL[def.tier]}
                    </span>
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold tabular-nums opacity-80">
                      Nv. {level}
                      <TeamStars level={level} />
                    </p>
                  </div>
                </div>
                <p className="mb-2 text-[11px] leading-snug opacity-80">
                  {def.tagline}
                </p>
                <p className="mb-2 text-[11px] font-medium opacity-90">
                  {def.bonusLabel(level)}
                </p>
                {stars > 0 ? (
                  <p className="mb-2 text-[10px] font-semibold text-amber-200/90">
                    {stars}★ · +{Math.round(((1 + TEAM_STAR_STAT_BONUS) ** stars - 1) * 100)}% nos stats
                    (1★ a cada {TEAM_STAR_EVERY_LEVELS} nv. · 5★ no nv.{" "}
                    {TEAM_STAR_EVERY_LEVELS * 5})
                  </p>
                ) : (
                  <p className="mb-2 text-[10px] text-amber-200/70">
                    Estrela no nv.{TEAM_STAR_EVERY_LEVELS} (+{Math.round(TEAM_STAR_STAT_BONUS * 100)}% stats · 5★ no nv.{TEAM_STAR_EVERY_LEVELS * 5})
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleToggleEquip(def.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-[11px] font-bold transition ${
                    equipped
                      ? "bg-white/15 text-white hover:bg-white/20"
                      : "bg-black/30 hover:bg-black/45"
                  }`}
                >
                  {equipped ? "Na esquina · Remover" : "Equipar na esquina"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
