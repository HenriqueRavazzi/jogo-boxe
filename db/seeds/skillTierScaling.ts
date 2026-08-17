import type {
  SkillScalingTier,
  SkillTierStatMultipliers,
} from "@/db/schema";

export type SkillTierScalingSeed = {
  skillKey: string;
  tier: SkillScalingTier;
  statMultipliers: SkillTierStatMultipliers;
  effectLines: string[];
  cardLabel?: string;
  cardTitle?: string;
  cardDescription?: string;
};

type CardTier = Exclude<SkillScalingTier, "master">;

const CARD_TIERS: CardTier[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
];

function cardRows(
  skillKey: string,
  byTier: Record<
    CardTier,
    { statMultipliers: SkillTierStatMultipliers; effectLines: string[] }
  >,
): SkillTierScalingSeed[] {
  return CARD_TIERS.map((tier) => ({
    skillKey,
    tier,
    statMultipliers: byTier[tier].statMultipliers,
    effectLines: byTier[tier].effectLines,
  }));
}

export const SKILL_TIER_SCALING_SEEDS: SkillTierScalingSeed[] = [
  ...cardRows("lightning", {
    common: { statMultipliers: { damageMul: 1.12 }, effectLines: ["+12% dano do raio"] },
    uncommon: { statMultipliers: { cooldownMul: 0.88 }, effectLines: ["−12% cooldown"] },
    rare: { statMultipliers: { damageMul: 1.2, extraHits: 1 }, effectLines: ["+20% dano", "+1 burst"] },
    epic: { statMultipliers: { damageMul: 1.28, cooldownMul: 0.82 }, effectLines: ["+28% dano", "−18% cooldown"] },
    legendary: {
      statMultipliers: { damageMul: 1.4, cooldownMul: 0.75, extraProjectiles: 1, extraHits: 1 },
      effectLines: ["+40% dano", "−25% cooldown", "+1 raio extra", "+1 burst"],
    },
  }),
  {
    skillKey: "lightning",
    tier: "master",
    statMultipliers: {
      teslaDurationMs: 4_000,
      teslaRadius: 52,
      teslaDpsRatio: 0.35,
    },
    effectLines: ["Campos estáticos 4s", "Dano contínuo no chão"],
    cardLabel: "Maestria: Raio",
    cardTitle: "Sobrecarga Tesla",
    cardDescription:
      "Estouros de raio deixam mini-campos elétricos no chão (DoT por 4s).",
  },

  ...cardRows("fire", {
    common: { statMultipliers: { damageMul: 1.12 }, effectLines: ["+12% dano de burn"] },
    uncommon: { statMultipliers: { durationMul: 1.18 }, effectLines: ["+18% duração do burn"] },
    rare: { statMultipliers: { damageMul: 1.18, extraHits: 1 }, effectLines: ["+18% burn", "+1 stack máx."] },
    epic: { statMultipliers: { damageMul: 1.28, durationMul: 1.22 }, effectLines: ["+28% burn", "+22% duração"] },
    legendary: {
      statMultipliers: { damageMul: 1.4, durationMul: 1.35, extraHits: 2 },
      effectLines: ["+40% burn", "+35% duração", "+2 stacks máx."],
    },
  }),
  {
    skillKey: "fire",
    tier: "master",
    statMultipliers: { fireShareRatio: 0.1, fireShareRadius: 90 },
    effectLines: ["DoT em cadeia (10%)", "Alvos próximos em chamas"],
    cardLabel: "Maestria: Fogo",
    cardTitle: "Combustão em Cadeia",
    cardDescription:
      "Inimigos em chamas compartilham 10% do dano contínuo com alvos adjacentes.",
  },

  ...cardRows("ice", {
    common: { statMultipliers: { durationMul: 1.12 }, effectLines: ["+12% duração do gelo"] },
    uncommon: { statMultipliers: { cooldownMul: 0.88 }, effectLines: ["−12% cooldown"] },
    rare: { statMultipliers: { durationMul: 1.22, cooldownMul: 0.9 }, effectLines: ["+22% duração", "−10% cooldown"] },
    epic: { statMultipliers: { durationMul: 1.3, cooldownMul: 0.82 }, effectLines: ["+30% duração", "−18% cooldown"] },
    legendary: {
      statMultipliers: { durationMul: 1.45, cooldownMul: 0.72 },
      effectLines: ["+45% duração", "−28% cooldown"],
    },
  }),
  {
    skillKey: "ice",
    tier: "master",
    statMultipliers: {
      iceShatterRadius: 110,
      iceShatterDamageRatio: 0.85,
      iceShatterFreezeMs: 1_400,
    },
    effectLines: ["Explosão ao morrer congelado", "Congela e fere a área"],
    cardLabel: "Maestria: Gelo",
    cardTitle: "Estilhaço Glacial",
    cardDescription:
      "Inimigos congelados que morrem explodem, aplicando gelo e dano em área.",
  },

  ...cardRows("ricochet", {
    common: { statMultipliers: { damageMul: 1.12 }, effectLines: ["+12% dano dos saltos"] },
    uncommon: { statMultipliers: { cooldownMul: 0.88 }, effectLines: ["−12% cooldown"] },
    rare: { statMultipliers: { damageMul: 1.15, extraHits: 1 }, effectLines: ["+15% dano", "+1 salto"] },
    epic: { statMultipliers: { damageMul: 1.25, cooldownMul: 0.82 }, effectLines: ["+25% dano", "−18% cooldown"] },
    legendary: {
      statMultipliers: { damageMul: 1.35, cooldownMul: 0.75, extraHits: 2 },
      effectLines: ["+35% dano", "−25% cooldown", "+2 saltos"],
    },
  }),
  {
    skillKey: "ricochet",
    tier: "master",
    statMultipliers: { ricochetMaxTargets: 40 },
    effectLines: ["Saltos sem limite", "Sem falloff de dano"],
    cardLabel: "Maestria: Ricochete",
    cardTitle: "Ricochete Infinito",
    cardDescription:
      "Soco salta indefinidamente entre alvos; o dano por salto não decai (100%).",
  },

  ...cardRows("aura", {
    common: { statMultipliers: { damageMul: 1.12 }, effectLines: ["+12% dano da aura"] },
    uncommon: { statMultipliers: { radiusMul: 1.15 }, effectLines: ["+15% raio da aura"] },
    rare: { statMultipliers: { damageMul: 1.2, radiusMul: 1.12 }, effectLines: ["+20% dano da aura", "+12% raio"] },
    epic: {
      statMultipliers: { damageMul: 1.28, radiusMul: 1.18 },
      effectLines: ["+28% dano da aura", "+18% raio"],
    },
    legendary: {
      statMultipliers: { damageMul: 1.4, radiusMul: 1.3 },
      effectLines: ["+40% dano da aura", "+30% raio"],
    },
  }),
  {
    skillKey: "aura",
    tier: "master",
    statMultipliers: { radiusMul: 2, auraSecondaryPower: 1 },
    effectLines: ["Raio ×2", "Secundários a 100%"],
    cardLabel: "Maestria: Aura",
    cardTitle: "Domínio Absoluto",
    cardDescription:
      "Raio da Aura dobra; efeitos secundários das skills ativas ficam em 100%.",
  },

  ...cardRows("shadow", {
    common: { statMultipliers: { damageMul: 1.12 }, effectLines: ["+12% poder do clone"] },
    uncommon: { statMultipliers: { durationMul: 1.15 }, effectLines: ["+15% duração do clone"] },
    rare: { statMultipliers: { damageMul: 1.2, cooldownMul: 0.9 }, effectLines: ["+20% poder", "−10% cooldown"] },
    epic: {
      statMultipliers: { damageMul: 1.28, cooldownMul: 0.82, durationMul: 1.2 },
      effectLines: ["+28% poder", "−18% cooldown", "+20% duração"],
    },
    legendary: {
      statMultipliers: { damageMul: 1.4, cooldownMul: 0.72, durationMul: 1.35 },
      effectLines: ["+40% poder", "−28% cooldown", "+35% duração"],
    },
  }),
  {
    skillKey: "shadow",
    tier: "master",
    statMultipliers: { cloneCount: 2, cloneStatRatio: 0.3 },
    effectLines: ["2 clones", "30% dos stats"],
    cardLabel: "Maestria: Sombra",
    cardTitle: "Exército Espelhado",
    cardDescription:
      "Dois clones simultâneos herdando 30% dos atributos (em vez de 15%).",
  },

  ...cardRows("stone", {
    common: { statMultipliers: { damageMul: 1.12 }, effectLines: ["+12% dano do terremoto"] },
    uncommon: { statMultipliers: { durationMul: 1.15 }, effectLines: ["+15% duração do debuff"] },
    rare: { statMultipliers: { damageMul: 1.2, cooldownMul: 0.9 }, effectLines: ["+20% dano", "−10% cooldown"] },
    epic: {
      statMultipliers: { damageMul: 1.28, cooldownMul: 0.82, durationMul: 1.2 },
      effectLines: ["+28% dano", "−18% cooldown", "+20% duração"],
    },
    legendary: {
      statMultipliers: { damageMul: 1.4, cooldownMul: 0.72, durationMul: 1.35 },
      effectLines: ["+40% dano", "−28% cooldown", "+35% duração"],
    },
  }),
  {
    skillKey: "stone",
    tier: "master",
    statMultipliers: { fissureRadius: 100, fissureSlow: 0.55, fissureVuln: 1.4 },
    effectLines: ["Fissuras permanentes", "Slow + vulnerabilidade"],
    cardLabel: "Maestria: Pedra",
    cardTitle: "Tectônica Absoluta",
    cardDescription:
      "O terremoto fissura o chão: slow severo e quebra de resistência permanentes na run.",
  },

  ...cardRows("vendaval", {
    common: { statMultipliers: { damageMul: 1.12 }, effectLines: ["+12% dano do vácuo"] },
    uncommon: { statMultipliers: { radiusMul: 1.15 }, effectLines: ["+15% raio do vácuo"] },
    rare: { statMultipliers: { damageMul: 1.2, cooldownMul: 0.9 }, effectLines: ["+20% dano", "−10% cooldown"] },
    epic: {
      statMultipliers: { damageMul: 1.28, cooldownMul: 0.82, radiusMul: 1.2 },
      effectLines: ["+28% dano", "−18% cooldown", "+20% raio"],
    },
    legendary: {
      statMultipliers: { damageMul: 1.4, cooldownMul: 0.72, radiusMul: 1.35 },
      effectLines: ["+40% dano", "−28% cooldown", "+35% raio"],
    },
  }),
  {
    skillKey: "vendaval",
    tier: "master",
    statMultipliers: {
      vendavalImplosionRadius: 140,
      vendavalImplosionDamageRatio: 1.1,
      vendavalStunMs: 1_200,
      vendavalKnockback: 14,
    },
    effectLines: ["Implosão ao fim do puxão", "Stun + knockback"],
    cardLabel: "Maestria: Vendaval",
    cardTitle: "Singularidade Gravitacional",
    cardDescription:
      "No fim do vácuo, uma implosão atordoa e repele inimigos ao redor.",
  },
];
