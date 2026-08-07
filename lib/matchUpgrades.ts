/** Raridades e geração de cartas de upgrade in-match. */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Categoria da carta — usada para evitar duplicatas no pack de level-up. */
export type UpgradeCategory = "damage" | "speed" | "range";

export type UpgradeType =
  | "attackSpeed"
  | "attackRange"
  | "damageMultiplier";

export type MatchUpgrade = {
  id: string;
  type: UpgradeType;
  category: UpgradeCategory;
  /** Bônus percentual (0.1 = +10%). */
  value: number;
  rarity: Rarity;
  label: string;
  description: string;
};

/**
 * Pesos da roleta (somam 100):
 * Comum 50% · Incomum 28% · Raro 15% · Épico 6% · Lendário 1%
 */
const RARITY_TABLE: { rarity: Rarity; weight: number }[] = [
  { rarity: "common", weight: 50 },
  { rarity: "uncommon", weight: 28 },
  { rarity: "rare", weight: 15 },
  { rarity: "epic", weight: 6 },
  { rarity: "legendary", weight: 1 },
];

/**
 * Magnitude do buff por raridade (diferença de poder clara).
 * Ex.: Attack Speed comum +5%, épico +15%, lendário +25%.
 */
const RARITY_BONUS: Record<Rarity, number> = {
  common: 0.05,
  uncommon: 0.08,
  rare: 0.12,
  epic: 0.15,
  legendary: 0.25,
};

const UPGRADE_POOL: {
  type: UpgradeType;
  category: UpgradeCategory;
  name: string;
  short: string;
}[] = [
  {
    type: "attackSpeed",
    category: "speed",
    name: "Attack Speed",
    short: "Velocidade de Ataque",
  },
  {
    type: "attackRange",
    category: "range",
    name: "Range",
    short: "Alcance",
  },
  {
    type: "damageMultiplier",
    category: "damage",
    name: "Damage",
    short: "Dano",
  },
];

const ALL_CATEGORIES: UpgradeCategory[] = UPGRADE_POOL.map((p) => p.category);

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

/** Classes Tailwind por raridade (borda / texto / fundo). */
export const RARITY_STYLES: Record<
  Rarity,
  { border: string; text: string; bg: string; glow: string }
> = {
  common: {
    border: "border-zinc-500",
    text: "text-zinc-300",
    bg: "bg-zinc-800/90",
    glow: "hover:shadow-zinc-500/30",
  },
  uncommon: {
    border: "border-emerald-500",
    text: "text-emerald-300",
    bg: "bg-emerald-950/80",
    glow: "hover:shadow-emerald-500/40",
  },
  rare: {
    border: "border-blue-500",
    text: "text-blue-300",
    bg: "bg-blue-950/80",
    glow: "hover:shadow-blue-500/40",
  },
  epic: {
    border: "border-purple-500",
    text: "text-purple-300",
    bg: "bg-purple-950/80",
    glow: "hover:shadow-purple-500/40",
  },
  legendary: {
    border: "border-amber-400",
    text: "text-amber-300",
    bg: "bg-amber-950/80",
    glow: "hover:shadow-amber-400/50",
  },
};

/**
 * Roleta por faixas cumulativas: Math.random() em [0, 1) vs pesos normalizados.
 */
function rollRarity(): Rarity {
  const total = RARITY_TABLE.reduce((sum, r) => sum + r.weight, 0);
  const roll = Math.random(); // 0 ≤ roll < 1
  let cumulative = 0;

  for (const entry of RARITY_TABLE) {
    cumulative += entry.weight / total;
    if (roll < cumulative) return entry.rarity;
  }

  return "legendary";
}

function createUpgradeForCategory(
  category: UpgradeCategory,
  rarity: Rarity,
): MatchUpgrade {
  const pool =
    UPGRADE_POOL.find((p) => p.category === category) ?? UPGRADE_POOL[0]!;
  const value = RARITY_BONUS[rarity];
  const pct = Math.round(value * 100);

  return {
    id: crypto.randomUUID(),
    type: pool.type,
    category: pool.category,
    value,
    rarity,
    label: `+${pct}% ${pool.name}`,
    description: `+${pct}% ${pool.short}`,
  };
}

/**
 * Gera N cartas com raridade ponderada e categorias distintas
 * (nunca duas cartas da mesma categoria no mesmo pack).
 */
export function generateUpgradeOptions(count = 3): MatchUpgrade[] {
  const selectedCards: MatchUpgrade[] = [];
  let availableCategories = [...ALL_CATEGORIES];

  while (selectedCards.length < count && availableCategories.length > 0) {
    const categoryIndex = Math.floor(
      Math.random() * availableCategories.length,
    );
    const category = availableCategories[categoryIndex]!;

    const rarity = rollRarity();
    selectedCards.push(createUpgradeForCategory(category, rarity));

    availableCategories = availableCategories.filter((c) => c !== category);
  }

  return selectedCards;
}
