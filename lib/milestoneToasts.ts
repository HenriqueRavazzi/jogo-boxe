/** Helpers de toast de marco (sem React) — usados pelo store e pela UI. */

import {
  getMilestonePhaseRewards,
  getMilestoneQuestDef,
  type MilestoneQuestId,
  type MilestoneQuestRewards,
  type MilestoneQuestsState,
} from "@/lib/milestoneQuests";

export type MilestoneToastItem = {
  uid: string;
  questId: MilestoneQuestId;
  title: string;
  phase: number;
  rewards: MilestoneQuestRewards;
  createdAt: number;
};

export function buildMilestoneToastItems(
  questIds: MilestoneQuestId[],
  state: MilestoneQuestsState,
): MilestoneToastItem[] {
  const now = Date.now();
  const items: MilestoneToastItem[] = [];
  for (const id of questIds) {
    const def = getMilestoneQuestDef(id);
    if (!def) continue;
    const row = state[id] ?? { phase: 0, current: 0 };
    items.push({
      uid: `${id}-${row.phase}-${now}-${Math.random().toString(36).slice(2, 7)}`,
      questId: id,
      title: def.title,
      phase: row.phase,
      rewards: getMilestonePhaseRewards(def, row.phase),
      createdAt: now,
    });
  }
  return items;
}
