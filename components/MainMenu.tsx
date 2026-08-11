"use client";

import { useState, type ReactNode } from "react";
import { Coins, Gem, Settings, Sparkles } from "lucide-react";
import { AdvancedSkillsPanel } from "@/components/AdvancedSkillsPanel";
import { AscensionPanel } from "@/components/AscensionPanel";
import { MetaTreePanel } from "@/components/MetaTreePanel";
import { MilestoneQuestsPanel } from "@/components/MilestoneQuestsPanel";
import { SaveMenu } from "@/components/SaveMenu";
import { SettingsModal } from "@/components/SettingsModal";
import { TeamPanel } from "@/components/TeamPanel";
import { UpgradePanel } from "@/components/UpgradePanel";
import {
  ENDLESS_UNLOCK_STAGE,
  TOTAL_STAGES,
  getMaxSelectableStage,
  getStageDef,
} from "@/lib/stages";
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

type UpgradeTab =
  | "gold"
  | "diamonds"
  | "skills"
  | "ascension"
  | "quests"
  | "team";

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

function CurrencyChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${tone}`}
    >
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">
          {label}
        </p>
        <p className="truncate text-sm font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
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
  const maxStageCleared = useGameStore((s) => s.maxStageCleared);
  const endlessUnlocked = useGameStore((s) => s.endlessUnlocked);
  const selectedStage = useGameStore((s) => s.selectedStage);
  const selectedRunMode = useGameStore((s) => s.selectedRunMode);
  const setSelectedStage = useGameStore((s) => s.setSelectedStage);
  const setSelectedRunMode = useGameStore((s) => s.setSelectedRunMode);
  const [upgradeTab, setUpgradeTab] = useState<UpgradeTab>("gold");
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [confirmPrestige, setConfirmPrestige] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const selected = difficulties.find((d) => d.id === selectedDifficultyId);
  const prestigeReady = canTriggerPrestige();
  const prestigeMul = getPrestigeMultiplier();
  const nextShape = prestigeShapeLabel(prestigeLevel + 1);
  const shardsPreview = previewAscensionShards();
  const maxSelectable = getMaxSelectableStage(maxStageCleared);
  const endlessReady = endlessUnlocked || maxStageCleared >= ENDLESS_UNLOCK_STAGE;
  const stagePreview = getStageDef(selectedStage);

  const handlePrestige = () => {
    if (!triggerPrestige()) return;
    setConfirmPrestige(false);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex">
      {/* Sidebar esquerda — 100% da altura */}
      <aside className="pointer-events-auto flex h-full w-full shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/10 bg-zinc-950/90 p-5 backdrop-blur-md sm:w-[22rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              {isGameOver ? "Game Over" : "Menu Principal"}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-50">
              Joguin Boxe
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="mt-1 shrink-0 rounded-xl border border-white/10 bg-zinc-900/80 p-2.5 text-zinc-400 transition hover:border-sky-400/40 hover:bg-zinc-800 hover:text-sky-300"
            aria-label="Configurações"
            title="Configurações"
          >
            <Settings className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Moedas compactas no mobile (no desktop ficam na barra à direita) */}
        <div className="flex flex-col gap-2 sm:hidden">
          <CurrencyChip
            icon={<Coins className="h-4 w-4 text-amber-300" aria-hidden />}
            label="Ouro"
            value={gold.toLocaleString("pt-BR")}
            tone="border-amber-500/30 bg-amber-500/10 text-amber-200"
          />
          <CurrencyChip
            icon={<Gem className="h-4 w-4 text-cyan-300" aria-hidden />}
            label="Diamantes"
            value={gems.toLocaleString("pt-BR")}
            tone="border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
          />
          <CurrencyChip
            icon={<Gem className="h-4 w-4 text-violet-300" aria-hidden />}
            label="Roxos"
            value={purpleDiamonds.toLocaleString("pt-BR")}
            tone="border-violet-400/30 bg-violet-500/10 text-violet-200"
          />
          <CurrencyChip
            icon={<Sparkles className="h-4 w-4 text-fuchsia-300" aria-hidden />}
            label="Ascensão"
            value={`Nv. ${prestigeLevel} · +${Math.round((prestigeMul - 1) * 100)}% · ${prestigeShapeLabel(prestigeLevel)}`}
            tone="border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200"
          />
          <CurrencyChip
            icon={<Sparkles className="h-4 w-4 text-pink-300" aria-hidden />}
            label="Shards"
            value={ascensionShards.toLocaleString("pt-BR")}
            tone="border-pink-400/30 bg-pink-500/10 text-pink-200"
          />
        </div>

        {!isGameOver && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Campanha
            </p>

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

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedRunMode("stage")}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  selectedRunMode === "stage"
                    ? "bg-sky-500/30 text-sky-200"
                    : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Fases
              </button>
              <button
                type="button"
                disabled={!endlessReady}
                onClick={() => setSelectedRunMode("endless")}
                title={
                  endlessReady
                    ? "Sobrevivência infinita"
                    : `Libere ao vencer a fase ${ENDLESS_UNLOCK_STAGE}`
                }
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  selectedRunMode === "endless"
                    ? "bg-fuchsia-500/30 text-fuchsia-200"
                    : "bg-zinc-950 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Endless
              </button>
            </div>

            {selectedRunMode === "stage" ? (
              <>
                <label
                  htmlFor="stage-select"
                  className="mb-1.5 mt-3 block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500"
                >
                  Fase
                </label>
                <select
                  id="stage-select"
                  value={selectedStage}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setSelectedStage(n);
                  }}
                  className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm font-semibold text-zinc-100 outline-none transition focus:border-sky-400/60"
                >
                  {Array.from({ length: maxSelectable }, (_, i) => i + 1).map(
                    (n) => {
                      const stage = getStageDef(n);
                      const cleared = n <= maxStageCleared;
                      return (
                        <option key={n} value={n}>
                          {n}. {stage.name}
                          {cleared
                            ? " ✓"
                            : n === maxStageCleared + 1
                              ? " ★"
                              : ""}
                        </option>
                      );
                    },
                  )}
                </select>
                <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                  {stagePreview.name} · {stagePreview.enemyCount} inimigos ·
                  +chefe
                  {" · "}
                  {stagePreview.difficultyMul.toFixed(2)}× diff
                  {" · "}
                  limpa até {maxStageCleared}/{TOTAL_STAGES}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[11px] leading-snug text-zinc-400">
                Endless liberado. Horda contínua com bosses e escalonamento.
              </p>
            )}
            {!endlessReady && (
              <p className="mt-2 text-[11px] text-zinc-500">
                Endless após vencer a fase {ENDLESS_UNLOCK_STAGE}.
              </p>
            )}
          </div>
        )}

        {!isGameOver && <SaveMenu onSaveReady={onSaveReady} />}

        {!isGameOver && (
          <div className="pointer-events-auto flex shrink-0 gap-2 sm:hidden">
            <button
              type="button"
              disabled={!canPlay}
              onClick={onStart}
              className="flex-1 rounded-xl bg-sky-500 py-3.5 text-base font-black uppercase tracking-wider text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
            >
              Start Game
            </button>
            <button
              type="button"
              disabled={!canPlay}
              onClick={() => setShowUpgrades(true)}
              className="flex-1 rounded-xl border border-amber-400/50 bg-amber-500/15 py-3.5 text-base font-black uppercase tracking-wider text-amber-200 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Upgrades
            </button>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {isGameOver && (
            <>
              <button
                type="button"
                disabled={!canPlay && !isGameOver}
                onClick={onStart}
                className="w-full rounded-xl bg-sky-500 py-3.5 text-lg font-black uppercase tracking-wider text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
              >
                RESTART
              </button>
              <button
                type="button"
                onClick={onReturnToMenu}
                className="w-full rounded-xl border border-white/15 bg-zinc-800/80 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700/80 hover:text-zinc-100"
              >
                Voltar ao Menu Principal
              </button>
            </>
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
                    Ascender reseta ouro, diamantes (moeda), upgrades de ouro e
                    atributos das skills avançadas (voltam ao Nv.1). Skills já
                    liberadas e maestrias permanecem no save. Mantém upgrades de
                    diamante (árvore meta, XP e talentos), passivas/shards/equipe.
                    Custos e poder sobem com a Ascensão e concede{" "}
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

      {/* Coluna direita: barra de moedas (do fim da sidebar até a borda) + conteúdo */}
      <div className="pointer-events-none relative hidden min-h-0 min-w-0 flex-1 flex-col sm:flex">
        <header className="pointer-events-auto z-30 w-full shrink-0 border-b border-white/10 bg-zinc-950/85 px-4 py-2.5 backdrop-blur-md">
          <div className="flex w-full items-stretch justify-between gap-2">
            <CurrencyChip
              icon={<Coins className="h-4 w-4 text-amber-300" aria-hidden />}
              label="Ouro"
              value={gold.toLocaleString("pt-BR")}
              tone="border-amber-500/30 bg-amber-500/10 text-amber-200"
            />
            <CurrencyChip
              icon={<Gem className="h-4 w-4 text-cyan-300" aria-hidden />}
              label="Diamantes"
              value={gems.toLocaleString("pt-BR")}
              tone="border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
            />
            <CurrencyChip
              icon={<Gem className="h-4 w-4 text-violet-300" aria-hidden />}
              label="Roxos"
              value={purpleDiamonds.toLocaleString("pt-BR")}
              tone="border-violet-400/30 bg-violet-500/10 text-violet-200"
            />
            <CurrencyChip
              icon={
                <Sparkles className="h-4 w-4 text-fuchsia-300" aria-hidden />
              }
              label="Ascensão"
              value={`Nv. ${prestigeLevel} · +${Math.round((prestigeMul - 1) * 100)}% · ${prestigeShapeLabel(prestigeLevel)}`}
              tone="border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200"
            />
            <CurrencyChip
              icon={<Sparkles className="h-4 w-4 text-pink-300" aria-hidden />}
              label="Shards"
              value={ascensionShards.toLocaleString("pt-BR")}
              tone="border-pink-400/30 bg-pink-500/10 text-pink-200"
            />
          </div>
        </header>

        {!isGameOver && (
          <div className="pointer-events-auto flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-8">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={!canPlay}
                onClick={onStart}
                className="rounded-2xl bg-sky-500 px-12 py-3.5 text-lg font-black uppercase tracking-wider text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:shadow-none"
              >
                Start Game
              </button>
              <button
                type="button"
                disabled={!canPlay}
                onClick={() => setShowUpgrades(true)}
                className="rounded-2xl border border-amber-400/50 bg-amber-500/15 px-12 py-3.5 text-lg font-black uppercase tracking-wider text-amber-100 shadow-lg shadow-amber-950/30 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Upgrades
              </button>
            </div>
            <p className="max-w-sm text-center text-xs text-zinc-500">
              Abra Upgrades para ouro, diamantes, skills, ascensão, missões e
              equipe.
            </p>
          </div>
        )}
      </div>

      {/* Overlay fullscreen de upgrades */}
      {showUpgrades && !isGameOver && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-md">
          <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Progressão
                </p>
                <h2 className="text-xl font-black text-zinc-50 sm:text-2xl">
                  Upgrades
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgrades(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
              >
                Fechar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <CurrencyChip
                icon={<Coins className="h-4 w-4 text-amber-300" aria-hidden />}
                label="Ouro"
                value={gold.toLocaleString("pt-BR")}
                tone="border-amber-500/30 bg-amber-500/10 text-amber-200"
              />
              <CurrencyChip
                icon={<Gem className="h-4 w-4 text-cyan-300" aria-hidden />}
                label="Diamantes"
                value={gems.toLocaleString("pt-BR")}
                tone="border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
              />
              <CurrencyChip
                icon={<Gem className="h-4 w-4 text-violet-300" aria-hidden />}
                label="Roxos"
                value={purpleDiamonds.toLocaleString("pt-BR")}
                tone="border-violet-400/30 bg-violet-500/10 text-violet-200"
              />
              <CurrencyChip
                icon={
                  <Sparkles className="h-4 w-4 text-pink-300" aria-hidden />
                }
                label="Shards"
                value={ascensionShards.toLocaleString("pt-BR")}
                tone="border-pink-400/30 bg-pink-500/10 text-pink-200"
              />
            </div>
          </header>

          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-white/10 px-3 py-2 sm:px-6">
            {(
              [
                ["gold", "Ouro", "amber"],
                ["diamonds", "Diamantes", "cyan"],
                ["skills", "Skills Roxas", "violet"],
                ["ascension", "Ascensão", "fuchsia"],
                ["quests", "Missões", "amber"],
                ["team", "Equipe", "orange"],
              ] as const
            ).map(([id, label, tone]) => {
              const active = upgradeTab === id;
              const activeCls =
                tone === "amber"
                  ? "bg-amber-500/20 text-amber-200"
                  : tone === "cyan"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : tone === "violet"
                      ? "bg-violet-500/20 text-violet-200"
                      : tone === "fuchsia"
                        ? "bg-fuchsia-500/20 text-fuchsia-200"
                        : "bg-orange-500/20 text-orange-200";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUpgradeTab(id)}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                    active
                      ? activeCls
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {upgradeTab === "gold" ? (
              <UpgradePanel embedded />
            ) : upgradeTab === "diamonds" ? (
              <MetaTreePanel embedded />
            ) : upgradeTab === "skills" ? (
              <AdvancedSkillsPanel embedded />
            ) : upgradeTab === "ascension" ? (
              <AscensionPanel embedded />
            ) : upgradeTab === "quests" ? (
              <MilestoneQuestsPanel embedded />
            ) : (
              <TeamPanel embedded />
            )}
          </div>
        </div>
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
