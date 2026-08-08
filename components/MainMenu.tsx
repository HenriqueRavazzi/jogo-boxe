"use client";

import { useState } from "react";
import { Coins, Gem, Sparkles } from "lucide-react";
import { AdvancedSkillsPanel } from "@/components/AdvancedSkillsPanel";
import { AscensionPanel } from "@/components/AscensionPanel";
import { MetaTreePanel } from "@/components/MetaTreePanel";
import { MilestoneQuestsPanel } from "@/components/MilestoneQuestsPanel";
import { SaveMenu } from "@/components/SaveMenu";
import { UpgradePanel } from "@/components/UpgradePanel";
import { useGameStore } from "@/store/useGameStore";

type MainMenuProps = {
  canPlay: boolean;
  isGameOver: boolean;
  onStart: () => void;
  onOpenTalents: () => void;
  onSaveReady: () => void;
  /** Game Over → menu + sync (mesmo fluxo de Sair da Partida). */
  onReturnToMenu?: () => void;
};

type UpgradeTab = "gold" | "diamonds" | "skills" | "ascension" | "quests";

const PRESTIGE_SHAPE_LABEL: Record<number, string> = {
  0: "Círculos",
  1: "Quadrados",
  2: "Triângulos",
  3: "Hexágonos",
  4: "Octógonos",
};

function prestigeShapeLabel(level: number): string {
  if (level >= 5) return "Estrelas";
  return PRESTIGE_SHAPE_LABEL[level] ?? "Círculos";
}

/**
 * Menu principal: saves dinâmicos, START, upgrades e skill tree.
 */
export function MainMenu({
  canPlay,
  isGameOver,
  onStart,
  onOpenTalents,
  onSaveReady,
  onReturnToMenu,
}: MainMenuProps) {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const purpleDiamonds = useGameStore((s) => s.purpleDiamonds);
  const prestigeLevel = useGameStore((s) => s.prestigeLevel);
  const ascensionShards = useGameStore((s) => s.ascensionShards);
  const canTriggerPrestige = useGameStore((s) => s.canTriggerPrestige);
  const triggerPrestige = useGameStore((s) => s.triggerPrestige);
  const getPrestigeMultiplier = useGameStore((s) => s.getPrestigeMultiplier);
  const previewAscensionShards = useGameStore((s) => s.previewAscensionShards);
  const difficulties = useGameStore((s) => s.difficulties);
  const selectedDifficultyId = useGameStore((s) => s.selectedDifficultyId);
  const setSelectedDifficulty = useGameStore((s) => s.setSelectedDifficulty);
  const configsLoaded = useGameStore((s) => s.configsLoaded);
  const [upgradeTab, setUpgradeTab] = useState<UpgradeTab>("gold");
  const [confirmPrestige, setConfirmPrestige] = useState(false);

  const selected = difficulties.find((d) => d.id === selectedDifficultyId);
  const prestigeReady = canTriggerPrestige();
  const prestigeMul = getPrestigeMultiplier();
  const nextShape = prestigeShapeLabel(prestigeLevel + 1);
  const shardsPreview = previewAscensionShards();

  const handlePrestige = () => {
    if (!triggerPrestige()) return;
    setConfirmPrestige(false);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex">
      {/* Sidebar esquerda */}
      <aside className="pointer-events-auto flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-r border-white/10 bg-zinc-950/90 p-5 backdrop-blur-md sm:w-[22rem]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            {isGameOver ? "Game Over" : "Menu Principal"}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-50">
            Joguin Boxe
          </h1>
        </div>

        {/* Recursos do slot ativo */}
        <div className="flex flex-col gap-2">
          <div className="flex w-full items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <Coins className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-amber-200/70">
                Ouro
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-amber-200">
                {gold.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2">
            <Gem className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-200/70">
                Diamantes
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-cyan-200">
                {gems.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2">
            <Gem className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-violet-200/70">
                Roxos
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-violet-200">
                {purpleDiamonds.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2">
            <Sparkles
              className="h-4 w-4 shrink-0 text-fuchsia-300"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-fuchsia-200/70">
                Ascensão
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-fuchsia-200">
                Nv. {prestigeLevel} · +{Math.round((prestigeMul - 1) * 100)}% ·{" "}
                {prestigeShapeLabel(prestigeLevel)}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 rounded-xl border border-pink-400/30 bg-pink-500/10 px-3 py-2">
            <Sparkles className="h-4 w-4 shrink-0 text-pink-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-pink-200/70">
                Ascension Shards
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-pink-200">
                {ascensionShards.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>

        {!isGameOver && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
            <label
              htmlFor="difficulty-select"
              className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500"
            >
              Dificuldade
            </label>
            <select
              id="difficulty-select"
              value={selectedDifficultyId ?? ""}
              disabled={difficulties.length === 0}
              onChange={(e) => {
                const id = Number(e.target.value);
                if (!Number.isFinite(id)) return;
                setSelectedDifficulty(id);
              }}
              className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none transition focus:border-sky-400/60"
            >
              {difficulties.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.enemyHpMultiplier.toFixed(1)}×)
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                Inimigos {selected.enemyHpMultiplier.toFixed(1)}× HP · Ouro{" "}
                {selected.goldDropMultiplier.toFixed(1)}×
                {!configsLoaded ? " · defaults locais" : null}
              </p>
            )}
          </div>
        )}

        {!isGameOver && <SaveMenu onSaveReady={onSaveReady} />}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={!canPlay && !isGameOver}
            onClick={onStart}
            className="w-full rounded-xl bg-sky-500 py-3.5 text-lg font-black uppercase tracking-wider text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {isGameOver ? "RESTART" : "START GAME"}
          </button>

          {isGameOver && (
            <button
              type="button"
              onClick={onReturnToMenu}
              className="w-full rounded-xl border border-white/15 bg-zinc-800/80 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700/80 hover:text-zinc-100"
            >
              Voltar ao Menu Principal
            </button>
          )}

          {!isGameOver && (
            <button
              type="button"
              disabled={!canPlay}
              onClick={onOpenTalents}
              className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 py-3 text-sm font-bold uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Árvore de Skills
              <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-cyan-300/70">
                Custa diamantes
              </span>
            </button>
          )}

          {!isGameOver && canPlay && (
            <>
              {!confirmPrestige ? (
                <button
                  type="button"
                  disabled={!prestigeReady}
                  onClick={() => setConfirmPrestige(true)}
                  className="w-full rounded-xl border border-fuchsia-400/50 bg-fuchsia-500/15 py-3 text-sm font-bold uppercase tracking-wider text-fuchsia-100 transition hover:bg-fuchsia-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Fazer Prestígio / Ascender
                  <span className="mt-0.5 block text-[10px] font-medium normal-case tracking-normal text-fuchsia-200/70">
                    {prestigeReady
                      ? `Mundo → ${nextShape} · +${shardsPreview} shards`
                      : "Requer HP≥10, Dano≥8, Tier≥2 ou Range max"}
                  </span>
                </button>
              ) : (
                <div className="rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/80 p-3">
                  <p className="text-xs leading-relaxed text-fuchsia-100/90">
                    Ascender reseta ouro e upgrades de base (e skills roxas
                    granulares, com reembolso). Mantém diamantes, árvore meta,
                    passivas de Ascensão e concede{" "}
                    <span className="font-semibold text-pink-200">
                      +{shardsPreview} Ascension Shards
                    </span>
                    . Inimigos viram {nextShape}.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handlePrestige}
                      className="flex-1 rounded-lg bg-fuchsia-500 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-fuchsia-400"
                    >
                      Confirmar Ascensão
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmPrestige(false)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Área central: upgrades ouro / atributos / skills avançadas */}
      {!isGameOver && (
        <div className="pointer-events-none relative hidden flex-1 sm:block">
          <div className="pointer-events-auto absolute inset-x-4 bottom-4 top-auto max-h-[60%] overflow-y-auto rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-sm">
            <div className="mb-2 flex flex-wrap items-center gap-1 px-1">
              <button
                type="button"
                onClick={() => setUpgradeTab("gold")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  upgradeTab === "gold"
                    ? "bg-amber-500/20 text-amber-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Ouro
              </button>
              <button
                type="button"
                onClick={() => setUpgradeTab("diamonds")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  upgradeTab === "diamonds"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Diamantes
              </button>
              <button
                type="button"
                onClick={() => setUpgradeTab("skills")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  upgradeTab === "skills"
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Skills Roxas
              </button>
              <button
                type="button"
                onClick={() => setUpgradeTab("ascension")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  upgradeTab === "ascension"
                    ? "bg-fuchsia-500/20 text-fuchsia-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Ascensão
              </button>
              <button
                type="button"
                onClick={() => setUpgradeTab("quests")}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition ${
                  upgradeTab === "quests"
                    ? "bg-amber-500/20 text-amber-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Missões
              </button>
            </div>
            {upgradeTab === "gold" ? (
              <UpgradePanel embedded />
            ) : upgradeTab === "diamonds" ? (
              <MetaTreePanel embedded />
            ) : upgradeTab === "skills" ? (
              <AdvancedSkillsPanel embedded />
            ) : upgradeTab === "ascension" ? (
              <AscensionPanel embedded />
            ) : (
              <MilestoneQuestsPanel embedded />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
