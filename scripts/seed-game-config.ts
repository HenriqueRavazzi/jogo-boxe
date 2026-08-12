/**
 * Seed de game_settings + difficulties + enemy_types + balanceamento no Neon.
 * Uso: npx tsx scripts/seed-game-config.ts
 * (ou npm run db:seed)
 */

import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  difficulties,
  enemyTypes,
  gameEnemiesConfig,
  gameMatchGlobals,
  gameMatchRarities,
  gameMatchSkillCards,
  gameMatchSkillEffects,
  gameMatchStatCards,
  gameSettings,
  gameSkillTierScaling,
  gameSkillsConfig,
  gameStatCardsConfig,
  gameTeamMembersConfig,
  gameUpgradesConfig,
  stages,
} from "../db/schema";
import { ENEMIES_CONFIG_SEEDS } from "../db/seeds/enemiesConfig";
import {
  MATCH_GLOBALS_SEED,
  MATCH_RARITY_SEEDS,
  MATCH_SKILL_CARD_SEEDS,
  MATCH_SKILL_EFFECT_SEEDS,
  MATCH_STAT_CARD_SEEDS,
} from "../db/seeds/matchUpgradesConfig";
import { SKILLS_CONFIG_SEEDS } from "../db/seeds/skillsConfig";
import { SKILL_TIER_SCALING_SEEDS } from "../db/seeds/skillTierScaling";
import { STAT_CARDS_CONFIG_SEEDS } from "../db/seeds/statCardsConfig";
import { STAGES_CONFIG_SEEDS } from "../db/seeds/stagesConfig";
import {
  TEAM_MEMBER_BUFF_SEEDS,
  TEAM_TIER_POWER_SEEDS,
} from "../db/seeds/teamMemberBuffs";
import { TEAM_MEMBERS_META_SEEDS } from "../db/seeds/teamMembersMeta";
import { UPGRADES_CONFIG_SEEDS } from "../db/seeds/upgradesConfig";
import {
  ENEMY_TYPE_SEEDS,
  OBSOLETE_ENEMY_TYPE_NAMES,
} from "../db/seeds/enemyTypes";

const DEFAULT_SETTINGS = {
  baseAttackSpeed: 1500,
  baseDamage: 10,
  baseHp: 100,
  baseRange: 100,
};

const DIFFICULTY_ROWS = [
  {
    name: "Fácil",
    enemyHpMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    goldDropMultiplier: 1.0,
  },
  {
    name: "Médio",
    enemyHpMultiplier: 1.3,
    enemyDamageMultiplier: 1.2,
    enemySpeedMultiplier: 1.1,
    goldDropMultiplier: 1.35,
  },
  {
    name: "Difícil",
    enemyHpMultiplier: 1.8,
    enemyDamageMultiplier: 1.5,
    enemySpeedMultiplier: 1.25,
    goldDropMultiplier: 1.55,
  },
  {
    name: "Infernal",
    enemyHpMultiplier: 2.5,
    enemyDamageMultiplier: 2.0,
    enemySpeedMultiplier: 1.4,
    goldDropMultiplier: 1.6,
  },
] as const;

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida no .env");
  }

  const existingSettings = await db.select().from(gameSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(gameSettings).values(DEFAULT_SETTINGS);
    console.log("[seed] game_settings: linha inicial inserida");
  } else {
    await db
      .update(gameSettings)
      .set(DEFAULT_SETTINGS)
      .where(eq(gameSettings.id, existingSettings[0]!.id));
    console.log("[seed] game_settings: atualizado");
  }

  for (const row of DIFFICULTY_ROWS) {
    const found = await db
      .select()
      .from(difficulties)
      .where(eq(difficulties.name, row.name))
      .limit(1);

    if (found.length === 0) {
      await db.insert(difficulties).values(row);
      console.log(`[seed] difficulties: inserido "${row.name}"`);
    } else {
      await db
        .update(difficulties)
        .set({
          enemyHpMultiplier: row.enemyHpMultiplier,
          enemyDamageMultiplier: row.enemyDamageMultiplier,
          enemySpeedMultiplier: row.enemySpeedMultiplier,
          goldDropMultiplier: row.goldDropMultiplier,
        })
        .where(eq(difficulties.name, row.name));
      console.log(`[seed] difficulties: atualizado "${row.name}"`);
    }
  }

  const removed = await db
    .delete(enemyTypes)
    .where(inArray(enemyTypes.name, [...OBSOLETE_ENEMY_TYPE_NAMES]))
    .returning({ name: enemyTypes.name });
  for (const row of removed) {
    console.log(`[seed] enemy_types: removido legado "${row.name}"`);
  }

  for (const row of ENEMY_TYPE_SEEDS) {
    const found = await db
      .select()
      .from(enemyTypes)
      .where(eq(enemyTypes.name, row.name))
      .limit(1);

    if (found.length === 0) {
      await db.insert(enemyTypes).values(row);
      console.log(`[seed] enemy_types: inserido "${row.name}"`);
    } else {
      await db
        .update(enemyTypes)
        .set({
          isBoss: row.isBoss,
          hpBase: row.hpBase,
          speed: row.speed,
          damage: row.damage,
          attackSpeed: row.attackSpeed,
          color: row.color,
          scale: row.scale,
          unlockTime: row.unlockTime,
          xpReward: row.xpReward,
          goldReward: row.goldReward,
          normalDiamondChance: row.normalDiamondChance,
          purpleDiamondChance: row.purpleDiamondChance,
        })
        .where(eq(enemyTypes.name, row.name));
      console.log(`[seed] enemy_types: atualizado "${row.name}"`);
    }
  }

  for (const [index, meta] of TEAM_MEMBERS_META_SEEDS.entries()) {
    const row = {
      id: meta.id,
      name: meta.name,
      tier: meta.tier,
      role: meta.role,
      tagline: meta.tagline,
      buffs: TEAM_MEMBER_BUFF_SEEDS[meta.id] ?? [],
      tierPower: TEAM_TIER_POWER_SEEDS[meta.tier] ?? 1,
      sortOrder: index,
    };
    const found = await db
      .select()
      .from(gameTeamMembersConfig)
      .where(eq(gameTeamMembersConfig.id, meta.id))
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameTeamMembersConfig).values(row);
      console.log(`[seed] game_team_members_config: inserido "${meta.id}"`);
    } else {
      await db
        .update(gameTeamMembersConfig)
        .set(row)
        .where(eq(gameTeamMembersConfig.id, meta.id));
      console.log(`[seed] game_team_members_config: atualizado "${meta.id}"`);
    }
  }

  for (const row of SKILLS_CONFIG_SEEDS) {
    const found = await db
      .select()
      .from(gameSkillsConfig)
      .where(eq(gameSkillsConfig.skillKey, row.skillKey))
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameSkillsConfig).values(row);
      console.log(`[seed] game_skills_config: inserido "${row.skillKey}"`);
    } else {
      await db
        .update(gameSkillsConfig)
        .set(row)
        .where(eq(gameSkillsConfig.skillKey, row.skillKey));
      console.log(`[seed] game_skills_config: atualizado "${row.skillKey}"`);
    }
  }

  for (const row of ENEMIES_CONFIG_SEEDS) {
    const found = await db
      .select()
      .from(gameEnemiesConfig)
      .where(eq(gameEnemiesConfig.name, row.name))
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameEnemiesConfig).values(row);
      console.log(`[seed] game_enemies_config: inserido "${row.name}"`);
    } else {
      await db
        .update(gameEnemiesConfig)
        .set(row)
        .where(eq(gameEnemiesConfig.name, row.name));
      console.log(`[seed] game_enemies_config: atualizado "${row.name}"`);
    }
  }

  for (const row of UPGRADES_CONFIG_SEEDS) {
    const found = await db
      .select()
      .from(gameUpgradesConfig)
      .where(eq(gameUpgradesConfig.upgradeKey, row.upgradeKey))
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameUpgradesConfig).values(row);
      console.log(`[seed] game_upgrades_config: inserido "${row.upgradeKey}"`);
    } else {
      await db
        .update(gameUpgradesConfig)
        .set(row)
        .where(eq(gameUpgradesConfig.upgradeKey, row.upgradeKey));
      console.log(`[seed] game_upgrades_config: atualizado "${row.upgradeKey}"`);
    }
  }

  for (const row of STAGES_CONFIG_SEEDS) {
    const found = await db
      .select()
      .from(stages)
      .where(eq(stages.stageNumber, row.stageNumber))
      .limit(1);
    if (found.length === 0) {
      await db.insert(stages).values(row);
      console.log(`[seed] stages: inserida fase ${row.stageNumber}`);
    } else {
      await db.update(stages).set(row).where(eq(stages.stageNumber, row.stageNumber));
      console.log(`[seed] stages: atualizada fase ${row.stageNumber}`);
    }
  }

  const existingGlobals = await db.select().from(gameMatchGlobals).limit(1);
  if (existingGlobals.length === 0) {
    await db.insert(gameMatchGlobals).values(MATCH_GLOBALS_SEED);
    console.log("[seed] game_match_globals: inserido");
  } else {
    await db
      .update(gameMatchGlobals)
      .set(MATCH_GLOBALS_SEED)
      .where(eq(gameMatchGlobals.id, existingGlobals[0]!.id));
    console.log("[seed] game_match_globals: atualizado");
  }

  for (const row of MATCH_RARITY_SEEDS) {
    const found = await db
      .select()
      .from(gameMatchRarities)
      .where(eq(gameMatchRarities.rarity, row.rarity))
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameMatchRarities).values(row);
    } else {
      await db
        .update(gameMatchRarities)
        .set(row)
        .where(eq(gameMatchRarities.rarity, row.rarity));
    }
  }
  console.log("[seed] game_match_rarities: sincronizado");

  for (const row of MATCH_STAT_CARD_SEEDS) {
    const found = await db
      .select()
      .from(gameMatchStatCards)
      .where(eq(gameMatchStatCards.category, row.category))
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameMatchStatCards).values(row);
    } else {
      await db
        .update(gameMatchStatCards)
        .set(row)
        .where(eq(gameMatchStatCards.category, row.category));
    }
  }
  console.log("[seed] game_match_stat_cards: sincronizado");

  for (const row of MATCH_SKILL_CARD_SEEDS) {
    const found = await db
      .select()
      .from(gameMatchSkillCards)
      .where(eq(gameMatchSkillCards.skillKey, row.skillKey))
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameMatchSkillCards).values(row);
    } else {
      await db
        .update(gameMatchSkillCards)
        .set(row)
        .where(eq(gameMatchSkillCards.skillKey, row.skillKey));
    }
  }
  console.log("[seed] game_match_skill_cards: sincronizado");

  for (const row of MATCH_SKILL_EFFECT_SEEDS) {
    const found = await db
      .select()
      .from(gameMatchSkillEffects)
      .where(
        and(
          eq(gameMatchSkillEffects.skillKey, row.skillKey),
          eq(gameMatchSkillEffects.rarity, row.rarity),
        ),
      )
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameMatchSkillEffects).values(row);
    } else {
      await db
        .update(gameMatchSkillEffects)
        .set(row)
        .where(
          and(
            eq(gameMatchSkillEffects.skillKey, row.skillKey),
            eq(gameMatchSkillEffects.rarity, row.rarity),
          ),
        );
    }
  }
  console.log("[seed] game_match_skill_effects: sincronizado");

  for (const row of SKILL_TIER_SCALING_SEEDS) {
    const found = await db
      .select()
      .from(gameSkillTierScaling)
      .where(
        and(
          eq(gameSkillTierScaling.skillKey, row.skillKey),
          eq(gameSkillTierScaling.tier, row.tier),
        ),
      )
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameSkillTierScaling).values(row);
    } else {
      await db
        .update(gameSkillTierScaling)
        .set(row)
        .where(
          and(
            eq(gameSkillTierScaling.skillKey, row.skillKey),
            eq(gameSkillTierScaling.tier, row.tier),
          ),
        );
    }
  }
  console.log("[seed] game_skill_tier_scaling: sincronizado");

  for (const row of STAT_CARDS_CONFIG_SEEDS) {
    const found = await db
      .select()
      .from(gameStatCardsConfig)
      .where(
        and(
          eq(gameStatCardsConfig.cardId, row.cardId),
          eq(gameStatCardsConfig.tier, row.tier),
        ),
      )
      .limit(1);
    if (found.length === 0) {
      await db.insert(gameStatCardsConfig).values(row);
    } else {
      await db
        .update(gameStatCardsConfig)
        .set(row)
        .where(
          and(
            eq(gameStatCardsConfig.cardId, row.cardId),
            eq(gameStatCardsConfig.tier, row.tier),
          ),
        );
    }
  }
  console.log("[seed] game_stat_cards_config: sincronizado");

  console.log("[seed] concluído");
}

seed().catch((err) => {
  console.error("[seed] falhou:", err);
  process.exit(1);
});
