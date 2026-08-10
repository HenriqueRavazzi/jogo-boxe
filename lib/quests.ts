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
export const QUEST_GOLD_PER_DIAMOND = 55;
/** A cada N pontos de diamante base → +1 roxo (raro). */
export const QUEST_DIAMONDS_PER_PURPLE = 10;
/** +20% nas recompensas a cada quest coletada nesta run. */
export const QUEST_CLAIM_SCALE_PER_CLAIM = 0.2;
/** +30% na meta a cada quest coletada (runs longas ficam bem mais duras). */
export const QUEST_TARGET_SCALE_PER_CLAIM = 0.3;

export type QuestRewards = {
  gold: number;
  diamonds: number;
  purpleDiamonds: number;
};

/** Skills especiais disponíveis nesta run (filtra quests de gelo/raio). */
export type QuestSkillContext = {
  hasIce?: boolean;
  hasLightning?: boolean;
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

/**
 * Modelos possíveis — metas altas (AoE de gelo/raio completa fácil se forem baixas).
 * Skills só entram no pool se o jogador tiver a skill na run.
 */
const QUEST_TEMPLATES: QuestTemplate[] = [
  { type: "kill_boss", targetAmount: 2, baseDiamonds: 10 },
  { type: "kill_boss", targetAmount: 3, baseDiamonds: 16 },
  { type: "kill_boss", targetAmount: 5, baseDiamonds: 24 },
  { type: "inflict_freeze", targetAmount: 100, baseDiamonds: 9 },
  { type: "inflict_freeze", targetAmount: 200, baseDiamonds: 14 },
  { type: "inflict_freeze", targetAmount: 350, baseDiamonds: 20 },
  { type: "inflict_shock", targetAmount: 80, baseDiamonds: 9 },
  { type: "inflict_shock", targetAmount: 160, baseDiamonds: 15 },
  { type: "inflict_shock", targetAmount: 280, baseDiamonds: 22 },
  { type: "kill_enemies", targetAmount: 150, baseDiamonds: 7 },
  { type: "kill_enemies", targetAmount: 350, baseDiamonds: 12 },
  { type: "kill_enemies", targetAmount: 700, baseDiamonds: 18 },
  { type: "kill_enemies", targetAmount: 1200, baseDiamonds: 26 },
  { type: "kill_dashers", targetAmount: 50, baseDiamonds: 8 },
  { type: "kill_dashers", targetAmount: 100, baseDiamonds: 14 },
  { type: "kill_dashers", targetAmount: 180, baseDiamonds: 20 },
];

const SKILL_QUEST_TYPES = new Set<QuestType>([
  "inflict_freeze",
  "inflict_shock",
]);

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
  const purpleDiamonds = Math.max(
    0,
    Math.floor(scaledBase / QUEST_DIAMONDS_PER_PURPLE),
  );

  return { gold, diamonds, purpleDiamonds };
}

/** Escala a meta com o nº de claims (dificuldade sobe nas runs longas). */
export function scaleQuestTarget(
  baseTarget: number,
  questsClaimedThisRun = 0,
): number {
  const claimed = Math.max(0, Math.floor(questsClaimedThisRun));
  const mul = 1 + claimed * QUEST_TARGET_SCALE_PER_CLAIM;
  return Math.max(1, Math.round(Math.max(1, baseTarget) * mul));
}

function templateKey(t: QuestTemplate): string {
  return `${t.type}:${t.targetAmount}`;
}

function isTemplateAllowed(
  template: QuestTemplate,
  skillCtx?: QuestSkillContext | null,
): boolean {
  if (template.type === "inflict_freeze") {
    return Boolean(skillCtx?.hasIce);
  }
  if (template.type === "inflict_shock") {
    return Boolean(skillCtx?.hasLightning);
  }
  return true;
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
    targetAmount: scaleQuestTarget(
      template.targetAmount,
      questsClaimedThisRun,
    ),
    currentAmount: 0,
    rewardGold: rewards.gold,
    rewardDiamonds: rewards.diamonds,
    rewardPurpleDiamonds: rewards.purpleDiamonds,
    completed: false,
  };
}

function pickTemplate(
  excludeKeys: Set<string>,
  excludeTypes: Set<QuestType>,
  skillCtx?: QuestSkillContext | null,
): QuestTemplate {
  const allowed = QUEST_TEMPLATES.filter((t) => isTemplateAllowed(t, skillCtx));

  // 1) Preferência: tipo ainda não presente nos slots + template único
  let pool = allowed.filter(
    (t) =>
      !excludeKeys.has(templateKey(t)) && !excludeTypes.has(t.type),
  );

  // 2) Relaxa tipo: ainda evita template idêntico
  if (pool.length === 0) {
    pool = allowed.filter((t) => !excludeKeys.has(templateKey(t)));
  }

  // 3) Qualquer permitido
  if (pool.length === 0) {
    pool = allowed;
  }

  // 4) Sem skill liberada: só quests genéricas (nunca gelo/raio sem skill)
  if (pool.length === 0) {
    pool = QUEST_TEMPLATES.filter((t) => !SKILL_QUEST_TYPES.has(t.type));
  }

  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** Gera N quests aleatórias sem repetir o mesmo template. */
export function createRandomQuests(
  count = ACTIVE_QUEST_COUNT,
  questsClaimedThisRun = 0,
  skillCtx?: QuestSkillContext | null,
): ActiveQuest[] {
  const used = new Set<string>();
  const usedTypes = new Set<QuestType>();
  const quests: ActiveQuest[] = [];
  for (let i = 0; i < count; i++) {
    const template = pickTemplate(used, usedTypes, skillCtx);
    used.add(templateKey(template));
    usedTypes.add(template.type);
    quests.push(fromTemplate(template, questsClaimedThisRun));
  }
  return quests;
}

/** Nova quest diferente das que ainda estão ativas (escala com claims). */
export function createReplacementQuest(
  active: ActiveQuest[],
  questsClaimedThisRun = 0,
  skillCtx?: QuestSkillContext | null,
): ActiveQuest {
  const used = new Set(active.map((q) => `${q.type}:${q.targetAmount}`));
  // Chave por tipo base aproximada: evita 3× "Aplicar Gelo" ao mesmo tempo
  const usedTypes = new Set(active.map((q) => q.type));
  // Templates usam target base; excludeKeys também por type só via usedTypes
  const excludeKeys = new Set<string>([
    ...used,
    ...QUEST_TEMPLATES.filter((t) => usedTypes.has(t.type)).map(templateKey),
  ]);
  return fromTemplate(
    pickTemplate(excludeKeys, usedTypes, skillCtx),
    questsClaimedThisRun,
  );
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
