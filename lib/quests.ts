/** Pool e helpers de quests ativas na partida. */

export type QuestType =
  | "kill_boss"
  | "kill_enemies"
  | "kill_dashers"
  | "inflict_freeze"
  | "inflict_shock";

/**
 * Proporção alinhada ao loot in-game:
 * diamante roxo ≪ diamante ≪≪ ouro
 * (chances ~0.1% / ~3% / quase sempre).
 */
export const QUEST_GOLD_PER_DIAMOND = 45;
/** A cada N pontos de diamante base → +1 roxo (raro). */
export const QUEST_DIAMONDS_PER_PURPLE = 12;
/** +12% nas recompensas a cada quest coletada nesta run. */
export const QUEST_CLAIM_SCALE_PER_CLAIM = 0.12;

export type QuestRewards = {
  gold: number;
  diamonds: number;
  purpleDiamonds: number;
};

export type ActiveQuest = {
  id: string;
  type: QuestType;
  targetAmount: number;
  currentAmount: number;
  rewardGold: number;
  rewardDiamonds: number;
  rewardPurpleDiamonds: number;
  completed: boolean;
};

export type QuestProgressEvent = {
  type: QuestType;
  amount: number;
};

type QuestTemplate = {
  type: QuestType;
  targetAmount: number;
  /** Pontuação em “diamantes base” — ouro/roxos derivam da proporção. */
  baseDiamonds: number;
};

/** Modelos possíveis — sorteados no início e ao claim. */
const QUEST_TEMPLATES: QuestTemplate[] = [
  { type: "kill_boss", targetAmount: 1, baseDiamonds: 8 },
  { type: "kill_boss", targetAmount: 2, baseDiamonds: 14 },
  { type: "inflict_freeze", targetAmount: 20, baseDiamonds: 5 },
  { type: "inflict_freeze", targetAmount: 35, baseDiamonds: 7 },
  { type: "inflict_freeze", targetAmount: 55, baseDiamonds: 10 },
  { type: "inflict_shock", targetAmount: 25, baseDiamonds: 7 },
  { type: "inflict_shock", targetAmount: 40, baseDiamonds: 9 },
  { type: "inflict_shock", targetAmount: 60, baseDiamonds: 11 },
  { type: "kill_enemies", targetAmount: 40, baseDiamonds: 4 },
  { type: "kill_enemies", targetAmount: 50, baseDiamonds: 5 },
  { type: "kill_enemies", targetAmount: 100, baseDiamonds: 9 },
  { type: "kill_enemies", targetAmount: 150, baseDiamonds: 12 },
  { type: "kill_dashers", targetAmount: 15, baseDiamonds: 5 },
  { type: "kill_dashers", targetAmount: 30, baseDiamonds: 8 },
  { type: "kill_dashers", targetAmount: 45, baseDiamonds: 11 },
];

export const QUEST_LABELS: Record<QuestType, string> = {
  kill_boss: "Derrotar Boss",
  kill_enemies: "Eliminar inimigos",
  kill_dashers: "Eliminar Dashers",
  inflict_freeze: "Aplicar Gelo",
  inflict_shock: "Aplicar Raio",
};

/** Slots de quest in-game simultâneos. */
export const ACTIVE_QUEST_COUNT = 4;

/**
 * Converte diamantes-base + nº de claims da run → pacote ouro/diamante/roxo.
 * Quanto mais quests você completa, maiores as próximas recompensas.
 */
export function computeQuestRewards(
  baseDiamonds: number,
  questsClaimedThisRun = 0,
): QuestRewards {
  const claimed = Math.max(0, Math.floor(questsClaimedThisRun));
  const mul = 1 + claimed * QUEST_CLAIM_SCALE_PER_CLAIM;
  const scaledBase = Math.max(1, baseDiamonds) * mul;

  const diamonds = Math.max(1, Math.round(scaledBase));
  const gold = Math.max(
    10,
    Math.round(scaledBase * QUEST_GOLD_PER_DIAMOND),
  );
  // Roxo raro: sobe devagar com o tier e com claims da run
  const purpleDiamonds = Math.max(
    0,
    Math.floor(scaledBase / QUEST_DIAMONDS_PER_PURPLE),
  );

  return { gold, diamonds, purpleDiamonds };
}

function templateKey(t: QuestTemplate): string {
  return `${t.type}:${t.targetAmount}`;
}

function fromTemplate(
  template: QuestTemplate,
  questsClaimedThisRun = 0,
): ActiveQuest {
  const rewards = computeQuestRewards(
    template.baseDiamonds,
    questsClaimedThisRun,
  );
  return {
    id: crypto.randomUUID(),
    type: template.type,
    targetAmount: template.targetAmount,
    currentAmount: 0,
    rewardGold: rewards.gold,
    rewardDiamonds: rewards.diamonds,
    rewardPurpleDiamonds: rewards.purpleDiamonds,
    completed: false,
  };
}

function pickTemplate(excludeKeys: Set<string>): QuestTemplate {
  const pool = QUEST_TEMPLATES.filter((t) => !excludeKeys.has(templateKey(t)));
  const source = pool.length > 0 ? pool : QUEST_TEMPLATES;
  return source[Math.floor(Math.random() * source.length)]!;
}

/** Gera N quests aleatórias sem repetir o mesmo template. */
export function createRandomQuests(
  count = ACTIVE_QUEST_COUNT,
  questsClaimedThisRun = 0,
): ActiveQuest[] {
  const used = new Set<string>();
  const quests: ActiveQuest[] = [];
  for (let i = 0; i < count; i++) {
    const template = pickTemplate(used);
    used.add(templateKey(template));
    quests.push(fromTemplate(template, questsClaimedThisRun));
  }
  return quests;
}

/** Nova quest diferente das que ainda estão ativas (escala com claims). */
export function createReplacementQuest(
  active: ActiveQuest[],
  questsClaimedThisRun = 0,
): ActiveQuest {
  const used = new Set(active.map((q) => `${q.type}:${q.targetAmount}`));
  return fromTemplate(pickTemplate(used), questsClaimedThisRun);
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
