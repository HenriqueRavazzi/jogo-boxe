import type { TeamMemberBuffConfig } from "@/db/schema";

/** Buffs por membro — fonte canônica para seed e fallback offline. */
export const TEAM_MEMBER_BUFF_SEEDS: Record<string, TeamMemberBuffConfig[]> = {
  bandage_boy: [{ type: "hp_regen_pct_max", coefficient: 0.35 }],
  gym_rat: [{ type: "damage_mul_pct", coefficient: 2 }],
  water_boy: [{ type: "max_hp_mul_pct", coefficient: 18 }],
  towel_toss: [
    { type: "hp_regen_pct_max", coefficient: 0.22 },
    { type: "attack_speed_mul", coefficient: 0.008 },
  ],
  roadwork_runner: [{ type: "xp_bonus", coefficient: 0.012 }],
  stitch_sam: [{ type: "hp_regen_pct_max", coefficient: 0.55 }],
  pad_holder: [
    { type: "damage_mul_pct", coefficient: 3 },
    { type: "xp_bonus", coefficient: 0.02 },
  ],
  meal_prep: [
    { type: "max_hp_mul_pct", coefficient: 28 },
    { type: "damage_taken_reduce", coefficient: 0.012, cap: 0.25 },
  ],
  ice_bucket: [
    { type: "hp_regen_pct_max", coefficient: 0.4 },
    { type: "max_hp_mul_pct", coefficient: 12 },
  ],
  focus_mitt: [
    { type: "crit_chance", coefficient: 0.011 },
    { type: "attack_speed_mul", coefficient: 0.02 },
  ],
  ringside_doc: [{ type: "hp_regen_pct_max", coefficient: 0.85 }],
  sparring_ace: [
    { type: "damage_mul_pct", coefficient: 5 },
    { type: "xp_bonus", coefficient: 0.035 },
  ],
  strength_coach: [
    { type: "max_hp_mul_pct", coefficient: 45 },
    { type: "damage_taken_reduce", coefficient: 0.02, cap: 0.3 },
  ],
  corner_tactician: [
    { type: "crit_chance", coefficient: 0.015 },
    { type: "crit_damage", coefficient: 0.08 },
  ],
  push_specialist: [
    { type: "knockback_mul_pct", coefficient: 4 },
    { type: "damage_mul_pct", coefficient: 3 },
  ],
  skill_scout: [
    { type: "skill_damage_mul", coefficient: 0.04 },
    { type: "crit_chance", coefficient: 0.012 },
  ],
  prime_cutman: [{ type: "hp_regen_pct_max", coefficient: 1.35 }],
  elite_spar: [
    { type: "damage_mul_pct", coefficient: 9 },
    { type: "xp_bonus", coefficient: 0.055 },
  ],
  head_coach: [
    { type: "crit_chance", coefficient: 0.022 },
    { type: "attack_speed_mul", coefficient: 0.03 },
  ],
  money_manager: [
    { type: "gold_income_mul", coefficient: 0.05 },
    { type: "diamond_luck", coefficient: 0.0035 },
  ],
  range_finder: [{ type: "attack_speed_mul", coefficient: 0.025 }],
  purple_agent: [
    { type: "purple_diamond_luck", coefficient: 0.0045 },
    { type: "gold_income_mul", coefficient: 0.03 },
  ],
  iron_doc: [{ type: "hp_regen_pct_max", coefficient: 2.1 }],
  shadow_spar: [
    { type: "damage_mul_pct", coefficient: 14 },
    { type: "xp_bonus", coefficient: 0.08 },
  ],
  titan_prep: [
    { type: "max_hp_mul_pct", coefficient: 90 },
    { type: "damage_taken_reduce", coefficient: 0.04, cap: 0.35 },
  ],
  master_coach: [
    { type: "crit_chance", coefficient: 0.035 },
    { type: "attack_speed_mul", coefficient: 0.05 },
    { type: "crit_damage", coefficient: 0.12 },
  ],
  golden_manager: [
    { type: "gold_income_mul", coefficient: 0.08 },
    { type: "diamond_luck", coefficient: 0.0055 },
  ],
  echo_striker: [
    { type: "skill_damage_mul", coefficient: 0.06 },
    { type: "knockback_mul_pct", coefficient: 8 },
  ],
  vault_broker: [
    { type: "gold_income_mul", coefficient: 0.06 },
    { type: "diamond_luck", coefficient: 0.004 },
    { type: "purple_diamond_luck", coefficient: 0.005 },
  ],
};

export const TEAM_TIER_POWER_SEEDS: Record<string, number> = {
  common: 1,
  uncommon: 1.45,
  rare: 2.1,
  epic: 3.2,
  legendary: 4.8,
};
