/** Missões de marco / diárias — progresso persistido no save. */

export type MilestoneQuestId =
  | "flame_master"
  | "boss_hunter"
  | "implacable_survivor"
  | "ascended"
  | "ricochet_rampage"
  | "gold_rush"
  | "diamond_digger";

export type MilestoneQuestCategory = "milestone" | "daily";

export type MilestoneQuestRewards = {
  gold: number;
  gems: number;
  purpleDiamonds: number;
  ascensionShards: number;
};

export type MilestoneQuestDef = {
  id: MilestoneQuestId;
  title: string;
  description: string;
  category: MilestoneQuestCategory;
  target: number;
  rewards: MilestoneQuestRewards;
};

export type MilestoneQuestProgress = {
  current: number;
  claimed: boolean;
};

export type MilestoneQuestsState = Record<
  MilestoneQuestId,
  MilestoneQuestProgress
>;

export type MilestoneProgressEvent =
  | { type: "kill_with_fire"; amount: number }
  | { type: "bosses_in_run"; amount: number }
  | { type: "survive_hard_seconds"; amount: number }
  | { type: "prestige_level"; amount: number }
  | { type: "kill_with_ricochet"; amount: number }
  | { type: "gold_collected"; amount: number }
  | { type: "diamonds_collected"; amount: number };

export const MILESTONE_QUESTS: MilestoneQuestDef[] = [
  {
    id: "flame_master",
    title: "Mestre das Chamas",
    description: "Derrote 500 inimigos sob efeito de Fogo (queimadura).",
    category: "milestone",
    target: 500,
    rewards: {
      gold: 1500,
      gems: 25,
      purpleDiamonds: 8,
      ascensionShards: 5,
    },
  },
  {
    id: "boss_hunter",
    title: "Caçador de Chefes",
    description: "Derrote 5 bosses em uma única run.",
    category: "milestone",
    target: 5,
    rewards: {
      gold: 2000,
      gems: 40,
      purpleDiamonds: 15,
      ascensionShards: 8,
    },
  },
  {
    id: "implacable_survivor",
    title: "Sobrevivente Implacável",
    description: "Sobreviva 10 minutos em Difícil ou Infernal.",
    category: "milestone",
    target: 600,
    rewards: {
      gold: 1800,
      gems: 30,
      purpleDiamonds: 10,
      ascensionShards: 6,
    },
  },
  {
    id: "ascended",
    title: "Ascendido",
    description: "Alcance o Nível 1 de Prestígio.",
    category: "milestone",
    target: 1,
    rewards: {
      gold: 1000,
      gems: 50,
      purpleDiamonds: 20,
      ascensionShards: 12,
    },
  },
  {
    id: "ricochet_rampage",
    title: "Caos do Ricochete",
    description: "Elimine 200 inimigos durante a janela de Ricochete.",
    category: "milestone",
    target: 200,
    rewards: {
      gold: 1200,
      gems: 20,
      purpleDiamonds: 6,
      ascensionShards: 4,
    },
  },
  {
    id: "gold_rush",
    title: "Corrida do Ouro",
    description: "Colete 10.000 de ouro no total (todas as runs).",
    category: "milestone",
    target: 10_000,
    rewards: {
      gold: 2500,
      gems: 15,
      purpleDiamonds: 5,
      ascensionShards: 3,
    },
  },
  {
    id: "diamond_digger",
    title: "Garimpeiro",
    description: "Colete 100 diamantes normais no total.",
    category: "milestone",
    target: 100,
    rewards: {
      gold: 800,
      gems: 35,
      purpleDiamonds: 12,
      ascensionShards: 5,
    },
  },
];

export const MILESTONE_QUEST_IDS = MILESTONE_QUESTS.map((q) => q.id);

export function createDefaultMilestoneQuests(): MilestoneQuestsState {
  const state = {} as MilestoneQuestsState;
  for (const id of MILESTONE_QUEST_IDS) {
    state[id] = { current: 0, claimed: false };
  }
  return state;
}

export function normalizeMilestoneQuests(
  partial?: Partial<MilestoneQuestsState> | null,
): MilestoneQuestsState {
  const base = createDefaultMilestoneQuests();
  if (!partial) return base;
  for (const id of MILESTONE_QUEST_IDS) {
    const row = partial[id];
    if (!row) continue;
    const def = MILESTONE_QUESTS.find((q) => q.id === id)!;
    const current = Math.min(
      def.target,
      Math.max(0, Math.floor(Number(row.current) || 0)),
    );
    base[id] = {
      current,
      claimed: Boolean(row.claimed),
    };
  }
  return base;
}

export function getMilestoneQuestDef(
  id: MilestoneQuestId,
): MilestoneQuestDef | undefined {
  return MILESTONE_QUESTS.find((q) => q.id === id);
}

/** Progresso: soma para cumulativos; max para metas de “melhor run”. */
export function applyMilestoneProgress(
  state: MilestoneQuestsState,
  events: MilestoneProgressEvent[],
): MilestoneQuestsState {
  if (events.length === 0) return state;
  const next = { ...state };

  const bump = (id: MilestoneQuestId, amount: number, mode: "add" | "max") => {
    const def = getMilestoneQuestDef(id);
    if (!def) return;
    const row = next[id] ?? { current: 0, claimed: false };
    if (row.claimed) return;
    const value =
      mode === "max"
        ? Math.max(row.current, amount)
        : row.current + amount;
    next[id] = {
      ...row,
      current: Math.min(def.target, Math.max(0, Math.floor(value))),
    };
  };

  for (const ev of events) {
    if (ev.amount <= 0) continue;
    switch (ev.type) {
      case "kill_with_fire":
        bump("flame_master", ev.amount, "add");
        break;
      case "bosses_in_run":
        bump("boss_hunter", ev.amount, "max");
        break;
      case "survive_hard_seconds":
        bump("implacable_survivor", ev.amount, "max");
        break;
      case "prestige_level":
        bump("ascended", ev.amount, "max");
        break;
      case "kill_with_ricochet":
        bump("ricochet_rampage", ev.amount, "add");
        break;
      case "gold_collected":
        bump("gold_rush", ev.amount, "add");
        break;
      case "diamonds_collected":
        bump("diamond_digger", ev.amount, "add");
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
  return row.current >= def.target;
}

export function canClaimMilestone(
  state: MilestoneQuestsState,
  id: MilestoneQuestId,
): boolean {
  const row = state[id];
  return Boolean(row && !row.claimed && isMilestoneComplete(state, id));
}

export const HARD_DIFFICULTY_NAMES = new Set([
  "Difícil",
  "Hard",
  "Infernal",
  "Insane",
]);

export function isHardOrInfernalDifficulty(name: string | undefined): boolean {
  if (!name) return false;
  return HARD_DIFFICULTY_NAMES.has(name);
}
