"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Estado persistente — espelha o JSONB `save_data` no banco. */
export type GameStoreState = {
  gold: number;
  gems: number;
  maxHpLevel: number;
  baseDamageLevel: number;
  incomeMultiplier: number;
  addGold: (amount: number) => void;
  addGems: (amount: number) => void;
  upgradeHP: () => boolean;
  upgradeDamage: () => boolean;
  getHpUpgradeCost: () => number;
  getDamageUpgradeCost: () => number;
  getMaxHp: () => number;
  getBaseDamage: () => number;
};

const HP_BASE = 100;
const HP_PER_LEVEL = 25;
const DAMAGE_BASE = 10;
const DAMAGE_PER_LEVEL = 5;
const UPGRADE_COST_BASE = 50;

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      gold: 200,
      gems: 0,
      maxHpLevel: 1,
      baseDamageLevel: 1,
      incomeMultiplier: 1,

      addGold: (amount) =>
        set((s) => ({ gold: s.gold + Math.floor(amount * s.incomeMultiplier) })),

      addGems: (amount) => set((s) => ({ gems: s.gems + amount })),

      getHpUpgradeCost: () => get().maxHpLevel * UPGRADE_COST_BASE,

      getDamageUpgradeCost: () => get().baseDamageLevel * UPGRADE_COST_BASE,

      getMaxHp: () => HP_BASE + (get().maxHpLevel - 1) * HP_PER_LEVEL,

      getBaseDamage: () =>
        DAMAGE_BASE + (get().baseDamageLevel - 1) * DAMAGE_PER_LEVEL,

      upgradeHP: () => {
        const cost = get().getHpUpgradeCost();
        if (get().gold < cost) return false;
        set((s) => ({ gold: s.gold - cost, maxHpLevel: s.maxHpLevel + 1 }));
        return true;
      },

      upgradeDamage: () => {
        const cost = get().getDamageUpgradeCost();
        if (get().gold < cost) return false;
        set((s) => ({
          gold: s.gold - cost,
          baseDamageLevel: s.baseDamageLevel + 1,
        }));
        return true;
      },
    }),
    { name: "joguin-boxe-game-save" },
  ),
);
