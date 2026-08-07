/** Raridades e geração de cartas de upgrade in-match. */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type UpgradeType =
  | "attackSpeed"
  | "attackRange"
  | "damageMultiplier";

export type MatchUpgrade = {
  id: string;
  type: UpgradeType;
  /** Bônus percentual (0.1 = +10%). */
  value: number;
  rarity: Rarity;
  label: string;
  description: string;
};

const RARITY_TABLE: { rarity: Rarity; weight: number }[] = [
  { rarity: "common", weight: 80 },
  { rarity: "uncommon", weight: 15 },
  { rarity: "rare", weight: 4 },
  { rarity: "epic", weight: 0.9 },
  { rarity: "legendary", weight: 0.1 },
];

/** Magnitude do buff por raridade. */
const RARITY_BONUS: Record<Rarity, number> = {
  common: 0.1,
  uncommon: 0.15,
  rare: 0.25,
  epic: 0.4,
  legendary: 0.75,
};

const UPGRADE_POOL: {
  type: UpgradeType;
  name: string;
  short: string;
}[] = [
  { type: "attackSpeed", name: "Attack Speed", short: "Velocidade de Ataque" },
  { type: "attackRange", name: "Range", short: "Alcance" },
  { type: "damageMultiplier", name: "Damage", short: "Dano" },
];

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

function rollRarity(): Rarity {
  const total = RARITY_TABLE.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const entry of RARITY_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) return entry.rarity;
  }
  return "common";
}

function createUpgrade(rarity: Rarity): MatchUpgrade {
  const pool = UPGRADE_POOL[Math.floor(Math.random() * UPGRADE_POOL.length)]!;
  const value = RARITY_BONUS[rarity];
  const pct = Math.round(value * 100);

  return {
    id: crypto.randomUUID(),
    type: pool.type,
    value,
    rarity,
    label: `+${pct}% ${pool.name}`,
    description: `+${pct}% ${pool.short}`,
  };
}

/** Gera N cartas aleatórias com raridade ponderada. */
export function generateUpgradeOptions(count = 3): MatchUpgrade[] {
  return Array.from({ length: count }, () => createUpgrade(rollRarity()));
}
