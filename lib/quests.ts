/** Pool e helpers de quests ativas na partida. */

export type QuestType =
  | "kill_boss"
  | "kill_enemies"
  | "kill_dashers"
  | "inflict_freeze"
  | "inflict_shock";

export type ActiveQuest = {
  id: string;
  type: QuestType;
  targetAmount: number;
  currentAmount: number;
  rewardDiamonds: number;
  completed: boolean;
};

export type QuestProgressEvent = {
  type: QuestType;
  amount: number;
};

type QuestTemplate = {
  type: QuestType;
  targetAmount: number;
  rewardDiamonds: number;
};

/** Modelos possíveis — sorteados no início e ao claim. */
const QUEST_TEMPLATES: QuestTemplate[] = [
  { type: "kill_boss", targetAmount: 1, rewardDiamonds: 5 },
  { type: "kill_boss", targetAmount: 2, rewardDiamonds: 8 },
  { type: "inflict_freeze", targetAmount: 35, rewardDiamonds: 4 },
  { type: "inflict_freeze", targetAmount: 20, rewardDiamonds: 3 },
  { type: "inflict_shock", targetAmount: 25, rewardDiamonds: 4 },
  { type: "inflict_shock", targetAmount: 40, rewardDiamonds: 5 },
  { type: "kill_enemies", targetAmount: 50, rewardDiamonds: 3 },
  { type: "kill_enemies", targetAmount: 100, rewardDiamonds: 5 },
  { type: "kill_dashers", targetAmount: 15, rewardDiamonds: 3 },
  { type: "kill_dashers", targetAmount: 30, rewardDiamonds: 5 },
];

export const QUEST_LABELS: Record<QuestType, string> = {
  kill_boss: "Derrotar Boss",
  kill_enemies: "Eliminar inimigos",
  kill_dashers: "Eliminar Dashers",
  inflict_freeze: "Aplicar Gelo",
  inflict_shock: "Aplicar Raio",
};

export const ACTIVE_QUEST_COUNT = 2;

function templateKey(t: QuestTemplate): string {
  return `${t.type}:${t.targetAmount}`;
}

function fromTemplate(template: QuestTemplate): ActiveQuest {
  return {
    id: crypto.randomUUID(),
    type: template.type,
    targetAmount: template.targetAmount,
    currentAmount: 0,
    rewardDiamonds: template.rewardDiamonds,
    completed: false,
  };
}

function pickTemplate(excludeKeys: Set<string>): QuestTemplate {
  const pool = QUEST_TEMPLATES.filter((t) => !excludeKeys.has(templateKey(t)));
  const source = pool.length > 0 ? pool : QUEST_TEMPLATES;
  return source[Math.floor(Math.random() * source.length)]!;
}

/** Gera N quests aleatórias sem repetir o mesmo template. */
export function createRandomQuests(count = ACTIVE_QUEST_COUNT): ActiveQuest[] {
  const used = new Set<string>();
  const quests: ActiveQuest[] = [];
  for (let i = 0; i < count; i++) {
    const template = pickTemplate(used);
    used.add(templateKey(template));
    quests.push(fromTemplate(template));
  }
  return quests;
}

/** Nova quest diferente das que ainda estão ativas. */
export function createReplacementQuest(active: ActiveQuest[]): ActiveQuest {
  const used = new Set(active.map((q) => `${q.type}:${q.targetAmount}`));
  return fromTemplate(pickTemplate(used));
}

/** Aplica eventos de progresso e marca completed quando atingir a meta. */
export function applyQuestProgress(
  quests: ActiveQuest[],
  events: QuestProgressEvent[],
): ActiveQuest[] {
  if (events.length === 0) return quests;

  const totals = new Map<QuestType, number>();
  for (const ev of events) {
    if (ev.amount <= 0) continue;
    totals.set(ev.type, (totals.get(ev.type) ?? 0) + ev.amount);
  }
  if (totals.size === 0) return quests;

  return quests.map((quest) => {
    if (quest.completed) return quest;
    const add = totals.get(quest.type);
    if (!add) return quest;
    const currentAmount = Math.min(
      quest.targetAmount,
      quest.currentAmount + add,
    );
    return {
      ...quest,
      currentAmount,
      completed: currentAmount >= quest.targetAmount,
    };
  });
}
