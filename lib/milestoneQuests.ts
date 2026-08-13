/** Missões de marco eternas — fases infinitas com meta e recompensa crescentes. */

export type MilestoneQuestId =
  | "grunt_slayer"
  | "dasher_hunter"
  | "ranged_exterminator"
  | "boss_hunter"
  | "flame_master"
  | "frost_executor"
  | "storm_executioner"
  | "ricochet_rampage"
  | "quake_bringer"
  | "vacuum_master"
  | "shadow_summoner"
  | "ice_wave_adept"
  | "gold_rush"
  | "diamond_digger"
  | "purple_hoarder"
  | "gold_spender"
  | "purple_scholar"
  | "gem_craftsman"
  | "implacable_survivor"
  | "ascended";

export type MilestoneQuestCategory = "milestone" | "daily";

/** add = progresso acumulado; max = melhor run / marco absoluto. */
export type MilestoneProgressMode = "add" | "max";

/** Como a meta cresce por fase. */
export type MilestoneTargetScale = "multiply" | "linear";

export type MilestoneQuestRewards = {
  gold: number;
  gems: number;
  purpleDiamonds: number;
};

export type MilestoneQuestDef = {
  id: MilestoneQuestId;
  title: string;
  /** Descrição da fase 1; a UI pode completar com a meta atual. */
  description: string;
  category: MilestoneQuestCategory;
  /** Meta da fase 1 (phase = 0). */
  target: number;
  rewards: MilestoneQuestRewards;
  progressMode: MilestoneProgressMode;
  targetScale: MilestoneTargetScale;
};

export type MilestoneQuestProgress = {
  /** Fase atual (0 = primeira). */
  phase: number;
  /** Progresso na fase atual. */
  current: number;
};

export type MilestoneQuestsState = Record<
  MilestoneQuestId,
  MilestoneQuestProgress
>;

export type MilestoneProgressEvent =
  | { type: "kill_normals"; amount: number }
  | { type: "kill_dashers"; amount: number }
  | { type: "kill_ranged"; amount: number }
  | { type: "bosses_in_run"; amount: number }
  | { type: "kill_with_fire"; amount: number }
  | { type: "kill_with_ice"; amount: number }
  | { type: "kill_with_shock"; amount: number }
  | { type: "kill_with_ricochet"; amount: number }
  | { type: "skill_stone_cast"; amount: number }
  | { type: "skill_vendaval_cast"; amount: number }
  | { type: "skill_shadow_spawn"; amount: number }
  | { type: "skill_ice_cast"; amount: number }
  | { type: "gold_collected"; amount: number }
  | { type: "diamonds_collected"; amount: number }
  | { type: "purple_diamonds_collected"; amount: number }
  | { type: "gold_upgrades_bought"; amount: number }
  | { type: "purple_upgrades_bought"; amount: number }
  | { type: "meta_upgrades_bought"; amount: number }
  | { type: "survive_hard_seconds"; amount: number }
  | { type: "prestige_level"; amount: number };

/** Meta ×1.5 por fase (multiply). */
export const MILESTONE_TARGET_GROWTH = 1.5;
/** Ouro/diamantes ×1.4 por fase. */
export const MILESTONE_REWARD_GROWTH = 1.4;
/** Roxos sobem mais devagar — ×1.4 explodia em fases altas. */
export const MILESTONE_PURPLE_REWARD_GROWTH = 1.2;

export const MILESTONE_QUESTS: MilestoneQuestDef[] = [
  {
    id: "grunt_slayer",
    title: "Matador de Tropa",
    description: "Derrote inimigos básicos (normais).",
    category: "milestone",
    target: 1_000,
    rewards: {
      gold: 1_200,
      gems: 18,
      purpleDiamonds: 2,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "dasher_hunter",
    title: "Caçador de Corredores",
    description: "Derrote inimigos do tipo Dasher.",
    category: "milestone",
    target: 250,
    rewards: {
      gold: 1_400,
      gems: 22,
      purpleDiamonds: 3,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "ranged_exterminator",
    title: "Exterminador à Distância",
    description: "Derrote inimigos à distância (Ranged).",
    category: "milestone",
    target: 250,
    rewards: {
      gold: 1_400,
      gems: 22,
      purpleDiamonds: 3,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "boss_hunter",
    title: "Caçador de Chefes",
    description: "Derrote bosses em uma única run.",
    category: "milestone",
    target: 5,
    rewards: {
      gold: 2000,
      gems: 40,
      purpleDiamonds: 6,
    },
    progressMode: "max",
    targetScale: "multiply",
  },
  {
    id: "flame_master",
    title: "Mestre das Chamas",
    description: "Derrote inimigos sob efeito de Fogo (queimadura).",
    category: "milestone",
    target: 500,
    rewards: {
      gold: 1500,
      gems: 25,
      purpleDiamonds: 3,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "frost_executor",
    title: "Executor Gelado",
    description: "Derrote inimigos congelados.",
    category: "milestone",
    target: 400,
    rewards: {
      gold: 1_450,
      gems: 24,
      purpleDiamonds: 3,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "storm_executioner",
    title: "Executor Elétrico",
    description: "Derrote inimigos sob efeito de Raio (shock).",
    category: "milestone",
    target: 400,
    rewards: {
      gold: 1_450,
      gems: 24,
      purpleDiamonds: 3,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "ricochet_rampage",
    title: "Caos do Ricochete",
    description: "Elimine inimigos durante a janela de Ricochete.",
    category: "milestone",
    target: 200,
    rewards: {
      gold: 1200,
      gems: 20,
      purpleDiamonds: 2,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "quake_bringer",
    title: "Tremor da Pedra",
    description: "Dispare o terremoto da skill Pedra.",
    category: "milestone",
    target: 40,
    rewards: {
      gold: 1_300,
      gems: 22,
      purpleDiamonds: 3,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "vacuum_master",
    title: "Senhor do Vendaval",
    description: "Dispare o vácuo da skill Vendaval.",
    category: "milestone",
    target: 40,
    rewards: {
      gold: 1_350,
      gems: 23,
      purpleDiamonds: 3,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "shadow_summoner",
    title: "Invocador Sombrio",
    description: "Invoque clones da skill Shadow Clone.",
    category: "milestone",
    target: 30,
    rewards: {
      gold: 1_500,
      gems: 28,
      purpleDiamonds: 4,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "ice_wave_adept",
    title: "Adepto do Gelo",
    description: "Dispare ondas da skill Gelo.",
    category: "milestone",
    target: 50,
    rewards: {
      gold: 1_250,
      gems: 20,
      purpleDiamonds: 2,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "gold_rush",
    title: "Corrida do Ouro",
    description: "Colete ouro no total (todas as runs).",
    category: "milestone",
    target: 10_000,
    rewards: {
      gold: 2500,
      gems: 15,
      purpleDiamonds: 2,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "diamond_digger",
    title: "Garimpeiro",
    description: "Colete diamantes normais no total.",
    category: "milestone",
    target: 100,
    rewards: {
      gold: 800,
      gems: 35,
      purpleDiamonds: 5,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "purple_hoarder",
    title: "Colecionador Roxo",
    description: "Colete diamantes roxos no total.",
    category: "milestone",
    target: 50,
    rewards: {
      gold: 1_000,
      gems: 20,
      purpleDiamonds: 8,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "gold_spender",
    title: "Investidor de Ouro",
    description: "Compre níveis de upgrades permanentes com ouro.",
    category: "milestone",
    target: 100,
    rewards: {
      gold: 2_000,
      gems: 18,
      purpleDiamonds: 2,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "purple_scholar",
    title: "Erudito Roxo",
    description: "Melhore atributos de skills com diamantes roxos.",
    category: "milestone",
    target: 25,
    rewards: {
      gold: 1_100,
      gems: 25,
      purpleDiamonds: 8,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "gem_craftsman",
    title: "Artesão de Diamantes",
    description: "Compre níveis da árvore de atributos (diamantes).",
    category: "milestone",
    target: 40,
    rewards: {
      gold: 1_300,
      gems: 40,
      purpleDiamonds: 4,
    },
    progressMode: "add",
    targetScale: "multiply",
  },
  {
    id: "implacable_survivor",
    title: "Sobrevivente Implacável",
    description: "Sobreviva em Difícil ou superior (Extremo/Inferno contam).",
    category: "milestone",
    target: 600,
    rewards: {
      gold: 1800,
      gems: 30,
      purpleDiamonds: 4,
    },
    progressMode: "max",
    targetScale: "multiply",
  },
  {
    id: "ascended",
    title: "Ascendido",
    description: "Alcance um novo nível de Prestígio.",
    category: "milestone",
    target: 1,
    rewards: {
      gold: 1000,
      gems: 50,
      purpleDiamonds: 8,
    },
    progressMode: "max",
    targetScale: "linear",
  },
];

export const MILESTONE_QUEST_IDS = MILESTONE_QUESTS.map((q) => q.id);

export function createDefaultMilestoneQuests(): MilestoneQuestsState {
  const state = {} as MilestoneQuestsState;
  for (const id of MILESTONE_QUEST_IDS) {
    state[id] = { phase: 0, current: 0 };
  }
  return state;
}

export function getMilestoneQuestDef(
  id: MilestoneQuestId,
): MilestoneQuestDef | undefined {
  return MILESTONE_QUESTS.find((q) => q.id === id);
}

/** Meta da fase atual (phase 0 = base). */
export function getMilestonePhaseTarget(
  def: MilestoneQuestDef,
  phase: number,
): number {
  const p = Math.max(0, Math.floor(phase));
  if (def.targetScale === "linear") {
    return Math.max(1, def.target + p);
  }
  return Math.max(
    1,
    Math.floor(def.target * Math.pow(MILESTONE_TARGET_GROWTH, p)),
  );
}

/** Recompensas da fase atual. */
export function getMilestonePhaseRewards(
  def: MilestoneQuestDef,
  phase: number,
): MilestoneQuestRewards {
  const p = Math.max(0, Math.floor(phase));
  const mul = Math.pow(MILESTONE_REWARD_GROWTH, p);
  const purpleMul = Math.pow(MILESTONE_PURPLE_REWARD_GROWTH, p);
  return {
    gold: Math.max(1, Math.floor(def.rewards.gold * mul)),
    gems: Math.max(1, Math.floor(def.rewards.gems * mul)),
    purpleDiamonds: Math.max(
      1,
      Math.floor(def.rewards.purpleDiamonds * purpleMul),
    ),
  };
}

export function normalizeMilestoneQuests(
  partial?: Partial<MilestoneQuestsState> | Record<string, unknown> | null,
): MilestoneQuestsState {
  const base = createDefaultMilestoneQuests();
  if (!partial) return base;

  for (const id of MILESTONE_QUEST_IDS) {
    const raw = partial[id] as
      | (Partial<MilestoneQuestProgress> & { claimed?: boolean })
      | undefined;
    if (!raw) continue;

    const phaseFromClaim =
      raw.claimed === true ? Math.max(1, Math.floor(Number(raw.phase) || 0) || 1) : 0;
    const phase = Math.max(
      0,
      Math.floor(Number(raw.phase) || 0) || phaseFromClaim,
    );
    // Saves antigos com claimed=true e phase ausente → avançam para fase 1
    const migratedPhase =
      raw.claimed === true && raw.phase == null ? 1 : phase;

    const def = getMilestoneQuestDef(id)!;
    const target = getMilestonePhaseTarget(def, migratedPhase);
    const current = Math.max(0, Math.floor(Number(raw.current) || 0));

    base[id] = {
      phase: migratedPhase,
      // Missões "add": permitem excedente (vai para a próxima fase no claim).
      // Missões "max": capam no target da fase.
      current:
        def.progressMode === "add"
          ? current
          : Math.min(target, current),
    };
  }

  return base;
}

/** Progresso: soma para cumulativos; max para metas de “melhor run”. */
export function applyMilestoneProgress(
  state: MilestoneQuestsState,
  events: MilestoneProgressEvent[],
): MilestoneQuestsState {
  if (events.length === 0) return state;
  const next = { ...state };

  const bump = (id: MilestoneQuestId, amount: number) => {
    const def = getMilestoneQuestDef(id);
    if (!def) return;
    const row = next[id] ?? { phase: 0, current: 0 };
    const target = getMilestonePhaseTarget(def, row.phase);
    if (def.progressMode === "max") {
      next[id] = {
        ...row,
        current: Math.min(
          target,
          Math.max(row.current, Math.floor(amount)),
        ),
      };
      return;
    }
    // add: continua somando mesmo após completar a fase (excedente → próxima)
    next[id] = {
      ...row,
      current: Math.max(0, Math.floor(row.current + amount)),
    };
  };

  for (const ev of events) {
    if (ev.amount <= 0) continue;
    switch (ev.type) {
      case "kill_normals":
        bump("grunt_slayer", ev.amount);
        break;
      case "kill_dashers":
        bump("dasher_hunter", ev.amount);
        break;
      case "kill_ranged":
        bump("ranged_exterminator", ev.amount);
        break;
      case "bosses_in_run":
        bump("boss_hunter", ev.amount);
        break;
      case "kill_with_fire":
        bump("flame_master", ev.amount);
        break;
      case "kill_with_ice":
        bump("frost_executor", ev.amount);
        break;
      case "kill_with_shock":
        bump("storm_executioner", ev.amount);
        break;
      case "kill_with_ricochet":
        bump("ricochet_rampage", ev.amount);
        break;
      case "skill_stone_cast":
        bump("quake_bringer", ev.amount);
        break;
      case "skill_vendaval_cast":
        bump("vacuum_master", ev.amount);
        break;
      case "skill_shadow_spawn":
        bump("shadow_summoner", ev.amount);
        break;
      case "skill_ice_cast":
        bump("ice_wave_adept", ev.amount);
        break;
      case "gold_collected":
        bump("gold_rush", ev.amount);
        break;
      case "diamonds_collected":
        bump("diamond_digger", ev.amount);
        break;
      case "purple_diamonds_collected":
        bump("purple_hoarder", ev.amount);
        break;
      case "gold_upgrades_bought":
        bump("gold_spender", ev.amount);
        break;
      case "purple_upgrades_bought":
        bump("purple_scholar", ev.amount);
        break;
      case "meta_upgrades_bought":
        bump("gem_craftsman", ev.amount);
        break;
      case "survive_hard_seconds":
        bump("implacable_survivor", ev.amount);
        break;
      case "prestige_level":
        bump("ascended", ev.amount);
        break;
    }
  }

  return next;
}

export function isMilestoneComplete(
  state: MilestoneQuestsState,
  id: MilestoneQuestId,
): boolean {
  const def = getMilestoneQuestDef(id);
  const row = state[id];
  if (!def || !row) return false;
  return row.current >= getMilestonePhaseTarget(def, row.phase);
}

export function canClaimMilestone(
  state: MilestoneQuestsState,
  id: MilestoneQuestId,
): boolean {
  return isMilestoneComplete(state, id);
}

/** IDs que acabaram de ficar resgatáveis (antes incompletos → agora completos). */
export function listNewlyClaimableMilestones(
  before: MilestoneQuestsState,
  after: MilestoneQuestsState,
): MilestoneQuestId[] {
  const out: MilestoneQuestId[] = [];
  for (const id of MILESTONE_QUEST_IDS) {
    if (!canClaimMilestone(before, id) && canClaimMilestone(after, id)) {
      out.push(id);
    }
  }
  return out;
}

/**
 * Avança para a próxima fase após resgate.
 * add: carry-over do excedente (pode completar a próxima de imediato) · max: zera.
 */
export function advanceMilestonePhase(
  state: MilestoneQuestsState,
  id: MilestoneQuestId,
): MilestoneQuestsState {
  const def = getMilestoneQuestDef(id);
  const row = state[id];
  if (!def || !row) return state;

  const target = getMilestonePhaseTarget(def, row.phase);
  const nextPhase = row.phase + 1;

  let nextCurrent = 0;
  if (def.progressMode === "add") {
    // Ex.: meta 864k, progresso 1.2M → próxima fase começa com 360k
    nextCurrent = Math.max(0, Math.floor(row.current - target));
  }

  return {
    ...state,
    [id]: {
      phase: nextPhase,
      current: nextCurrent,
    },
  };
}

export const HARD_DIFFICULTY_NAMES = new Set([
  "Difícil",
  "Hard",
  "Muito Difícil",
  "Extremo",
  "Inferno",
  "Infernal",
  "Insane",
]);

export function isHardOrInfernalDifficulty(name: string | undefined): boolean {
  if (!name) return false;
  return HARD_DIFFICULTY_NAMES.has(name);
}
