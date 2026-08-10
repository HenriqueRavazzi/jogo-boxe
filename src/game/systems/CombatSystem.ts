import type { Player } from "@/src/game/entities/Player";
import type { Enemy } from "@/src/game/entities/Enemy";
import {
  angleToward,
  getArmDistribution,
  getArmRestPosition,
  pickNextPunchSide,
  type ArmSide,
} from "@/src/game/entities/Player";
import type { QuestProgressEvent } from "@/lib/quests";
import type { MilestoneProgressEvent } from "@/lib/milestoneQuests";
import { getLifeStealRatio, getSkillDamageTakenMultiplier, RICOCHET_LINK_RADIUS } from "@/lib/skillTree";
import {
  getMetaLifeStealRatio,
  getMetaParryChance,
  getMetaSkillRegenHealing,
  useGameStore,
} from "@/store/useGameStore";
import {
  buildZigzagPoints,
  createActiveSkillPulseState,
  FIRE_HIT_VFX_MS,
  isRicochetActive,
  LIGHTNING_AOE_RADIUS,
  LIGHTNING_BURST_VFX_MS,
  LIGHTNING_HIT_SLOP_PX,
  LIGHTNING_PROJECTILE_SPEED,
  LIGHTNING_VFX_MS,
  runActiveSkills,
  type ActiveSkillPulseState,
  type LightningProjectile,
  type SkillVfxEffect,
} from "@/src/game/systems/ActiveSkillsSystem";
import {
  AURA_RICOCHET_SPLASH_RATIO,
  getAuraStoneOutgoingDamageMul,
  runAuraSystem,
} from "@/src/game/systems/AuraSystem";
import {
  getShadowCloneCooldownMs,
  runShadowCloneSystem,
  type ShadowCloneState,
} from "@/src/game/systems/ShadowCloneSystem";
import type { MatchSkillsData } from "@/db/schema";
import { DEFAULT_MATCH_SKILLS } from "@/db/schema";
import {
  DEFAULT_MATCH_SKILL_BONUS,
  MATCH_CRIT_CHANCE_CAP,
  type MatchSkillBonuses,
  type SpecialSkillKey,
} from "@/lib/matchUpgrades";
import { LIGHTNING_STUN_MS } from "@/src/game/entities/Enemy";

export type MatchBuffsInput = {
  attackSpeed: number;
  attackRange: number;
  damageMultiplier: number;
  critDamageMultiplier?: number;
  /** Bônus aditivo in-run de chance crítica (0–1). */
  critChanceBonus?: number;
  skillDamageMultiplier?: number;
  knockbackMultiplier?: number;
};

export type ActiveAttack = {
  id: string;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  startTime: number;
  duration: number;
  isRetracting: boolean;
  side: ArmSide;
  armIndex: number;
  kind?: "punch" | "ricochet";
  fromShoulder?: boolean;
};

export type HitSplat = {
  id: string;
  x: number;
  y: number;
  text: string;
  age: number;
  color: string;
  /** Escala de fonte (críticos > 1). */
  scale?: number;
};

/** Segmento visual da cadeia de ricochete (player → alvos). */
export type RicochetPathPoint = { x: number; y: number };

export type RicochetPathEffect = {
  points: RicochetPathPoint[];
  /** Game clock em que o traço some. */
  expiresAt: number;
};

export const RICOCHET_PATH_DURATION_MS = 520;

/** Projétil disparado por inimigo ranged. */
export type EnemyProjectile = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
};

export type CombatSystemInput = {
  player: Player;
  enemies: Enemy[];
  arms: number;
  armTier: number;
  baseDamage: number;
  baseRange: number;
  baseAttackSpeed: number;
  matchBuffs: MatchBuffsInput;
  lastAttackTime: number;
  /** Último lado que socou — próximo tick alterna a partir daqui. */
  lastPunchSide: ArmSide;
  /** Game clock do último ricochete. */
  lastRicochetTime: number;
  now: number;
  dt: number;
  contactDamage: number;
  knockbackImpulse?: number;
  punchDurationMs?: number;
  /** Facing atual (atan2) — mantido se não houver ataque. */
  playerRotation?: number;
  /** Projéteis ainda em voo. */
  projectiles?: EnemyProjectile[];
  canvasWidth?: number;
  canvasHeight?: number;
  /** Skills especiais ativos nesta run (0 = inativo). */
  matchSkills?: MatchSkillsData;
  /** Slots de skills especiais já escolhidos nesta run. */
  activeRunSkills?: SpecialSkillKey[];
  /** Bônus in-run das cartas de raridade (dano/CD/stacks/raios…). */
  matchSkillBonuses?: MatchSkillBonuses;
  /** Timers de pulso gelo/raio/ricochete. */
  activeSkillPulse?: ActiveSkillPulseState;
  /** Projéteis elétricos em voo. */
  lightningProjectiles?: LightningProjectile[];
  /** Clones de sombra ativos. */
  shadowClones?: ShadowCloneState[];
};

export type CombatSystemResult = {
  player: Player;
  /** Inimigos ainda vivos (mortos já filtrados). */
  enemies: Enemy[];
  lastAttackTime: number;
  lastPunchSide: ArmSide;
  lastRicochetTime: number;
  newAttacks: ActiveAttack[];
  hitSplats: HitSplat[];
  /** Traços de ricochete gerados neste frame (VFX). */
  ricochetPaths: RicochetPathEffect[];
  kills: number;
  /** Coordenadas dos inimigos mortos neste frame (para loot). */
  killSites: {
    x: number;
    y: number;
    enemyType: Enemy["type"];
    rewards: Enemy["rewards"];
  }[];
  contactHits: number;
  /** Eventos para progresso de quests in-game. */
  questEvents: QuestProgressEvent[];
  /** Eventos para missões de marco persistentes. */
  milestoneEvents: MilestoneProgressEvent[];
  /** Facing atual do jogador (atan2); inalterado se não atacou neste frame. */
  playerRotation: number;
  /** Projéteis após update + novos disparos. */
  projectiles: EnemyProjectile[];
  /** Estado atualizado dos pulsos. */
  activeSkillPulse: ActiveSkillPulseState;
  lightningProjectiles: LightningProjectile[];
  skillVfx: SkillVfxEffect[];
  /** Clones de sombra após o tick. */
  shadowClones: ShadowCloneState[];
};

const DEFAULT_KNOCKBACK = 5;
export const PUNCH_DURATION_MS = 150;
/** Atraso leve entre socos no mesmo tick (ms de game clock). */
const PUNCH_STAGGER_MS = 40;
export const RICOCHET_SEGMENT_DURATION_MS = 100;
export const RICOCHET_SEGMENT_STAGGER_MS = 70;
/** Redução de dano por salto consecutivo (1º bounce = 85% do base, 2º ≈ 72%, …). */
export const RICOCHET_BOUNCE_FALLOFF = 0.85;
/**
 * Teto rígido de alvos na cadeia (alvo do soco + saltos).
 * Hits granulares aumentam até este limite — evita limpar a tela inteira.
 */
export const RICOCHET_MAX_TARGETS = 5;
export const RANGED_PROJECTILE_SPEED = 340;
export const RANGED_PROJECTILE_RADIUS = 5;
/** Duração do clarão de parry (ms de game clock). */
export const PARRY_VFX_MS = 280;
/** Raio do contra-ataque ao parry. */
export const PARRY_COUNTER_RADIUS = 100;
/** Fração do dano do herói refletida no contra-ataque. */
export const PARRY_COUNTER_DAMAGE_RATIO = 0.65;

export const ELEMENTAL_PROC_CHANCE = 0.15;
/** Fallback legado; duração real = 1000 + ice*500. */
export const FREEZE_DURATION_MS = 2000;
export const SHOCK_VISUAL_MS = 450;
export const CHAIN_LIGHTNING_RADIUS = 130;
export const CHAIN_LIGHTNING_TARGETS = 3;
/** @deprecated Raio não usa mais cadeia. */
export const CHAIN_DAMAGE_MULT = 0.5;

/** Cadeia: saltos a partir de um origem; `used` evita alvos já atingidos. */
function chainRicochet(
  living: Enemy[],
  originX: number,
  originY: number,
  maxBounces: number,
  firstRange: number,
  linkRadius: number,
  usedIds: Set<string> = new Set(),
): Enemy[] {
  const chain: Enemy[] = [];
  const used = new Set(usedIds);
  let cx = originX;
  let cy = originY;

  for (let i = 0; i < maxBounces; i++) {
    const maxDist = i === 0 ? firstRange : linkRadius;
    let best: Enemy | null = null;
    let bestDist = Infinity;

    for (const enemy of living) {
      if (used.has(enemy.id) || enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - cx, enemy.y - cy);
      if (dist <= maxDist && dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }

    if (!best) break;
    chain.push(best);
    used.add(best.id);
    cx = best.x;
    cy = best.y;
  }

  return chain;
}

/**
 * Sistema de combate: colisão de contato + auto-ataque multi-alvo + knockback
 * + procs elementais (gelo / raio / fogo) da skill tree e Purple Diamonds.
 */
export function runCombatSystem(input: CombatSystemInput): CombatSystemResult {
  const {
    player,
    enemies,
    arms,
    armTier: _armTier,
    baseDamage,
    baseRange,
    baseAttackSpeed,
    matchBuffs,
    lastAttackTime,
    lastPunchSide,
    lastRicochetTime,
    now,
    dt,
    contactDamage,
    knockbackImpulse,
    punchDurationMs = PUNCH_DURATION_MS,
    playerRotation: inputRotation = -Math.PI / 2,
    projectiles: inputProjectiles = [],
    canvasWidth = 2000,
    canvasHeight = 2000,
    matchSkills: inputMatchSkills,
    activeRunSkills: inputActiveRunSkills = [],
    matchSkillBonuses: inputMatchSkillBonuses,
    activeSkillPulse: inputPulse = createActiveSkillPulseState(),
    lightningProjectiles: inputLightning = [],
    shadowClones: inputShadowClones = [],
  } = input;

  let playerRotation = inputRotation;

  const gameState = useGameStore.getState();
  const matchSkills = inputMatchSkills ?? { ...DEFAULT_MATCH_SKILLS };
  const matchSkillBonuses = inputMatchSkillBonuses;
  const skills = gameState.skills;
  const fireLevel = matchSkills.fire;
  const fireBonus = matchSkillBonuses?.fire ?? DEFAULT_MATCH_SKILL_BONUS;
  const ricochetBonus =
    matchSkillBonuses?.ricochet ?? DEFAULT_MATCH_SKILL_BONUS;
  /** maxStacks da árvore roxa (fire.damage); escala com prestígio. */
  const prestigeMul = gameState.getPrestigeMultiplier();
  const fireMaxStacks = Math.max(
    1,
    1 +
      Math.round(skills.fire.damage * prestigeMul) +
      Math.max(0, fireBonus.extraHits),
  );
  const lifeStealRatio =
    (getLifeStealRatio(gameState.skillTree) +
      getMetaLifeStealRatio(gameState.metaLifeStealLevel)) *
    prestigeMul;

  const metaSkillRegenLevel = gameState.metaSkillRegenLevel;
  // Ricochete: hits granulares até teto rígido; dano cai por salto
  const maxBounces = Math.min(
    RICOCHET_MAX_TARGETS + Math.max(0, ricochetBonus.extraHits),
    2 +
      Math.round(skills.ricochet.hits * prestigeMul) +
      Math.max(0, ricochetBonus.extraHits),
  );
  const bounceDamageMult =
    (0.6 + skills.ricochet.damage * 0.15) *
    Math.min(1.5, prestigeMul) *
    ricochetBonus.damageMul;
  const knockbackPower =
    (knockbackImpulse ??
      gameState.getKnockbackPower() ??
      DEFAULT_KNOCKBACK) *
    (matchBuffs.knockbackMultiplier ?? 1);
  const difficulty = gameState.getDifficultyMultipliers();
  const damageTakenMul =
    getSkillDamageTakenMultiplier(gameState.skillTree) *
    gameState.getEquippedTeamBuffs().damageTakenMultiplier;
  const parryChance = Math.min(
    0.2,
    getMetaParryChance(gameState.metaParryChance) *
      (0.85 + 0.15 * prestigeMul),
  );
  void contactDamage; // legado: dano melee vem de enemy.attackDamage

  let contactHits = 0;
  let kills = 0;
  const killSites: {
    x: number;
    y: number;
    enemyType: Enemy["type"];
    rewards: Enemy["rewards"];
  }[] = [];
  const questEvents: QuestProgressEvent[] = [];
  const milestoneEvents: MilestoneProgressEvent[] = [];
  const skillVfx: SkillVfxEffect[] = [];
  const pendingParrySplats: HitSplat[] = [];
  let parriesThisFrame = 0;

  const pushKillQuests = (enemyType: Enemy["type"]) => {
    questEvents.push({ type: "kill_enemies", amount: 1 });
    if (enemyType === "boss") {
      questEvents.push({ type: "kill_boss", amount: 1 });
    } else if (enemyType === "dasher") {
      questEvents.push({ type: "kill_dashers", amount: 1 });
    }
  };

  // Atualizado após runActiveSkills — usado em pushKill via closure.
  let ricochetWindowActive = false;

  const pushKill = (enemy: Enemy) => {
    kills += 1;
    killSites.push({
      x: enemy.x,
      y: enemy.y,
      enemyType: enemy.type,
      rewards: { ...enemy.rewards },
    });
    pushKillQuests(enemy.type);
    if (enemy.hasStatus("burn", now) || enemy.isBurning) {
      milestoneEvents.push({ type: "kill_with_fire", amount: 1 });
    }
    if (ricochetWindowActive) {
      milestoneEvents.push({ type: "kill_with_ricochet", amount: 1 });
    }
  };

  const effectiveRange = baseRange * matchBuffs.attackRange;
  const skillDamageMult = matchBuffs.skillDamageMultiplier ?? 1;
  const activeSkills = runActiveSkills({
    enemies,
    playerX: player.x,
    playerY: player.y,
    now,
    baseDamage:
      baseDamage * matchBuffs.damageMultiplier * skillDamageMult,
    matchSkills,
    skills,
    pulseState: inputPulse,
    effectiveRange,
    matchSkillBonuses,
  });
  skillVfx.push(...activeSkills.newSkillVfx);
  ricochetWindowActive = isRicochetActive(activeSkills.pulseState, now);
  if (activeSkills.questFreeze > 0) {
    questEvents.push({
      type: "inflict_freeze",
      amount: activeSkills.questFreeze,
    });
  }

  // Aura: área contínua com sinergia das skills ativas na run
  const aura = runAuraSystem({
    enemies,
    playerX: player.x,
    playerY: player.y,
    now,
    dt,
    baseDamage:
      baseDamage * matchBuffs.damageMultiplier * skillDamageMult,
    matchSkills,
    activeRunSkills: inputActiveRunSkills,
    skills,
    matchSkillBonuses,
    pulseState: activeSkills.pulseState,
    prestigeMul,
    auraPrimaryElement: gameState.auraPrimaryElement,
  });
  skillVfx.push(...aura.newSkillVfx);
  if (aura.questFreeze > 0) {
    questEvents.push({
      type: "inflict_freeze",
      amount: aura.questFreeze,
    });
  }

  const auraStoneOutgoingMul = (enemy: Enemy) =>
    getAuraStoneOutgoingDamageMul(
      enemy,
      player.x,
      player.y,
      aura.auraRadius,
      aura.elementPowers.stone,
    );

  // Projéteis de raio: homing garantido + explosão em área (dano + shock)
  let skillDamageFromLightning =
    activeSkills.skillDamageDealt + aura.skillDamageDealt;
  let skillHitsFromLightning =
    activeSkills.skillHitsLanded + aura.skillHitsLanded;
  const lightningProjectiles: LightningProjectile[] = [
    ...activeSkills.newLightningProjectiles,
  ];
  const boltMargin = 40;
  const pendingLightningSplats: HitSplat[] = [];

  const findLightningTarget = (
    preferredId: string | null,
    fromX: number,
    fromY: number,
  ): Enemy | null => {
    if (preferredId) {
      const locked = enemies.find((e) => e.id === preferredId && !e.isDead);
      if (locked) return locked;
    }
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - fromX, enemy.y - fromY);
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }
    return best;
  };

  for (const bolt of inputLightning) {
    let nx = bolt.x + bolt.vx * dt;
    let ny = bolt.y + bolt.vy * dt;
    let vx = bolt.vx;
    let vy = bolt.vy;
    let targetId = bolt.targetEnemyId;

    const guided = findLightningTarget(targetId, nx, ny);
    if (!guided) {
      // Sem inimigos vivos: descarta o projétil (não explode no vazio)
      continue;
    }

    targetId = guided.id;
    const aimDx = guided.x - nx;
    const aimDy = guided.y - ny;
    const aimLen = Math.hypot(aimDx, aimDy) || 1;
    vx = (aimDx / aimLen) * LIGHTNING_PROJECTILE_SPEED;
    vy = (aimDy / aimLen) * LIGHTNING_PROJECTILE_SPEED;
    // Reaplica o passo já mirando no alvo (evita “passar reto”)
    nx = bolt.x + vx * dt;
    ny = bolt.y + vy * dt;

    if (
      nx < -boltMargin ||
      ny < -boltMargin ||
      nx > canvasWidth + boltMargin ||
      ny > canvasHeight + boltMargin
    ) {
      // Fora da tela: puxa impacto direto no alvo (sempre acerta)
      nx = guided.x;
      ny = guided.y;
    }

    const reach = guided.radius + bolt.radius + LIGHTNING_HIT_SLOP_PX;
    const distToGuided = Math.hypot(guided.x - nx, guided.y - ny);
    if (distToGuided > reach) {
      lightningProjectiles.push({
        ...bolt,
        x: nx,
        y: ny,
        vx,
        vy,
        targetEnemyId: targetId,
      });
      continue;
    }

    // Explosão em área no ponto do impacto
    const blastX = guided.x;
    const blastY = guided.y;
    const dmg = bolt.damage;
    let shocked = 0;

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - blastX, enemy.y - blastY);
      if (dist > LIGHTNING_AOE_RADIUS + enemy.radius) continue;

      enemy.takeDamage(dmg, now);
      enemy.applyStun(now, LIGHTNING_STUN_MS);
      shocked += 1;
      skillDamageFromLightning += dmg * enemy.getDamageTakenMultiplier(now);
      skillHitsFromLightning += 1;
      pendingLightningSplats.push({
        id: crypto.randomUUID(),
        x: enemy.x,
        y: enemy.y - 6,
        text: String(
          Math.max(1, Math.round(dmg * enemy.getDamageTakenMultiplier(now))),
        ),
        age: 0,
        color: "#e0f2fe",
        scale: enemy.id === guided.id ? 1.35 : 1.1,
      });
    }

    if (shocked > 0) {
      questEvents.push({ type: "inflict_shock", amount: shocked });
    }

    const zig = buildZigzagPoints(player.x, player.y, blastX, blastY);
    skillVfx.push({
      kind: "lightning",
      points: zig,
      startedAt: now,
      expiresAt: now + LIGHTNING_VFX_MS,
    });
    skillVfx.push({
      kind: "lightning_burst",
      x: blastX,
      y: blastY,
      maxRadius: LIGHTNING_AOE_RADIUS,
      startedAt: now,
      expiresAt: now + LIGHTNING_BURST_VFX_MS,
    });
  }

  // Mortes por burn / raio (antes dos socos)
  for (const enemy of enemies) {
    if (!enemy.isDead) continue;
    pushKill(enemy);
  }

  // Shadow Clone: spawn/move/ataque (sem skills; sem heal no herói)
  const playerTargetIds = new Set(
    enemies
      .filter((e) => !e.isDead)
      .map((enemy) => ({
        id: enemy.id,
        dist: Math.hypot(enemy.x - player.x, enemy.y - player.y),
      }))
      .filter(({ dist }) => dist <= effectiveRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, arms)
      .map(({ id }) => id),
  );

  const statsForClone = {
    maxHp: player.maxHp,
    damage: baseDamage * matchBuffs.damageMultiplier,
    range: effectiveRange,
    attackCooldownMs: baseAttackSpeed / Math.max(0.1, matchBuffs.attackSpeed),
    arms,
  };

  const shadow = runShadowCloneSystem({
    clones: inputShadowClones,
    enemies,
    playerTargetIds,
    playerX: player.x,
    playerY: player.y,
    now,
    dt,
    playerMaxHp: statsForClone.maxHp,
    playerDamage: statsForClone.damage,
    playerRange: statsForClone.range,
    playerAttackCooldownMs: statsForClone.attackCooldownMs,
    playerArms: statsForClone.arms,
    matchSkills,
    skills,
    matchSkillBonuses,
    pulseState: aura.pulseState,
    prestigeMul,
    knockbackPower,
    punchDurationMs,
  });
  let pulseState = shadow.pulseState;
  let shadowClones = shadow.clones;
  const pendingShadowAttacks = shadow.newAttacks;
  const pendingShadowSplats = shadow.hitSplats;

  for (const [enemyId, dmg] of shadow.damagedEnemyIds) {
    const enemy = enemies.find((e) => e.id === enemyId && !e.isDead);
    if (!enemy || dmg <= 0) continue;
    if (enemy.takeDamage(dmg, now)) {
      pushKill(enemy);
    }
  }

  // Melee: inimigos encostados formam horda e batem periodicamente (não morrem no contato)
  let meleeDamageDealt = 0;
  let cloneMeleeDamage = new Map<string, number>();
  for (const enemy of enemies) {
    if (enemy.isDead || enemy.type === "ranged") continue; // ranged só dispara projéteis
    if (enemy.hasStatus("freeze", now)) {
      enemy.isAttacking = false;
      continue;
    }

    const distPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const touchPlayer = player.radius + enemy.radius;
    const knockbackSpeed = Math.hypot(enemy.vx, enemy.vy);

    // Prefere bater no clone se estiver colado nele
    let targetClone: ShadowCloneState | null = null;
    let bestCloneDist = Infinity;
    for (const clone of shadowClones) {
      if (clone.hp <= 0) continue;
      const d = Math.hypot(enemy.x - clone.x, enemy.y - clone.y);
      if (d <= clone.radius + enemy.radius && d < bestCloneDist) {
        bestCloneDist = d;
        targetClone = clone;
      }
    }

    if (targetClone) {
      if (knockbackSpeed > 0.4) {
        enemy.isAttacking = false;
        continue;
      }
      enemy.isAttacking = true;
      enemy.vx = 0;
      enemy.vy = 0;
      const speedMul = enemy.getAttackSpeedMultiplier(now);
      const cooldown = (enemy.attackCooldown || 1000) / speedMul;
      const damage =
        (enemy.attackDamage > 0
          ? enemy.attackDamage
          : Math.max(0.5, 1.2 * difficulty.enemyDamageMultiplier)) *
        enemy.getOutgoingDamageMultiplier(now) *
        auraStoneOutgoingMul(enemy);
      if (now - enemy.lastAttackTime >= cooldown) {
        enemy.lastAttackTime = now;
        cloneMeleeDamage.set(
          targetClone.id,
          (cloneMeleeDamage.get(targetClone.id) ?? 0) + damage,
        );
      }
      continue;
    }

    if (distPlayer <= touchPlayer) {
      // Knockback ativo: força saída do swarm e não zera o impulso
      if (knockbackSpeed > 0.4) {
        enemy.isAttacking = false;
        continue;
      }

      enemy.isAttacking = true;
      enemy.vx = 0;
      enemy.vy = 0;

      const speedMul = enemy.getAttackSpeedMultiplier(now);
      const cooldown = (enemy.attackCooldown || 1000) / speedMul;
      const damage =
        (enemy.attackDamage > 0
          ? enemy.attackDamage
          : Math.max(0.5, 1.2 * difficulty.enemyDamageMultiplier)) *
        enemy.getOutgoingDamageMultiplier(now) *
        auraStoneOutgoingMul(enemy);

      if (now - enemy.lastAttackTime >= cooldown) {
        enemy.lastAttackTime = now;
        contactHits += 1;
        if (Math.random() < parryChance) {
          parriesThisFrame += 1;
        } else {
          meleeDamageDealt += damage;
        }
      }
    } else {
      enemy.isAttacking = false;
    }
  }

  // Dano no clone — sem heal/regen de nenhuma forma
  if (cloneMeleeDamage.size > 0) {
    const before = shadowClones.length;
    shadowClones = shadowClones
      .map((clone) => {
        const dmg = cloneMeleeDamage.get(clone.id) ?? 0;
        if (dmg <= 0) return clone;
        return { ...clone, hp: Math.max(0, clone.hp - dmg) };
      })
      .filter((c) => c.hp > 0 && c.expiresAt > now);
    if (before > 0 && shadowClones.length === 0) {
      pulseState = {
        ...pulseState,
        shadowActiveUntil: 0,
        shadowNextSpawnAt:
          now +
          getShadowCloneCooldownMs(
            skills.shadow.cooldown,
            matchSkillBonuses?.shadow ?? DEFAULT_MATCH_SKILL_BONUS,
            prestigeMul,
          ),
      };
    }
  }

  if (meleeDamageDealt > 0) {
    player.takeDamage(meleeDamageDealt * damageTakenMul);
  }

  // Projéteis em voo: move + colisão com clone ou jogador
  const projectiles: EnemyProjectile[] = [];
  const margin = 40;
  for (const p of inputProjectiles) {
    const nx = p.x + p.vx * dt;
    const ny = p.y + p.vy * dt;
    if (
      nx < -margin ||
      ny < -margin ||
      nx > canvasWidth + margin ||
      ny > canvasHeight + margin
    ) {
      continue;
    }

    let hitClone: ShadowCloneState | null = null;
    let hitCloneDist = Infinity;
    for (const clone of shadowClones) {
      if (clone.hp <= 0) continue;
      const d = Math.hypot(nx - clone.x, ny - clone.y);
      if (d <= clone.radius + p.radius && d < hitCloneDist) {
        hitCloneDist = d;
        hitClone = clone;
      }
    }
    if (hitClone) {
      shadowClones = shadowClones
        .map((c) =>
          c.id === hitClone!.id
            ? { ...c, hp: Math.max(0, c.hp - p.damage) }
            : c,
        )
        .filter((c) => c.hp > 0 && c.expiresAt > now);
      if (shadowClones.length === 0) {
        pulseState = {
          ...pulseState,
          shadowActiveUntil: 0,
          shadowNextSpawnAt:
            now +
            getShadowCloneCooldownMs(
              skills.shadow.cooldown,
              matchSkillBonuses?.shadow ?? DEFAULT_MATCH_SKILL_BONUS,
              prestigeMul,
            ),
        };
      }
      continue;
    }

    const hitDist = Math.hypot(nx - player.x, ny - player.y);
    if (hitDist <= player.radius + p.radius) {
      contactHits += 1;
      if (Math.random() < parryChance) {
        parriesThisFrame += 1;
      } else {
        player.takeDamage(p.damage * damageTakenMul);
      }
      continue;
    }
    projectiles.push({ ...p, x: nx, y: ny });
  }

  if (parriesThisFrame > 0) {
    skillVfx.push({
      kind: "parry",
      x: player.x,
      y: player.y,
      maxRadius: 56,
      startedAt: now,
      expiresAt: now + PARRY_VFX_MS,
    });
    pendingParrySplats.push({
      id: crypto.randomUUID(),
      x: player.x,
      y: player.y - 30,
      text: "PARRY!",
      age: 0,
      color: "#fef08a",
      scale: 1.65,
    });

    const counterDamage = Math.max(
      1,
      baseDamage * matchBuffs.damageMultiplier * PARRY_COUNTER_DAMAGE_RATIO,
    );
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist > PARRY_COUNTER_RADIUS + enemy.radius) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      enemy.applyKnockback(dx, dy, knockbackPower * 1.35);
      const displayDamage = Math.max(
        1,
        Math.round(counterDamage * enemy.getDamageTakenMultiplier(now)),
      );
      pendingParrySplats.push({
        id: crypto.randomUUID(),
        x: enemy.x,
        y: enemy.y,
        text: String(displayDamage),
        age: 0,
        color: "#fde68a",
        scale: 1.15,
      });
      if (enemy.takeDamage(counterDamage, now)) {
        pushKill(enemy);
      }
    }
  }

  // Ranged: dispara quando parado no alcance de ataque do jogador
  const effectivePlayerRange = baseRange * matchBuffs.attackRange;
  for (const enemy of enemies) {
    if (enemy.type !== "ranged" || enemy.isDead) continue;
    if (enemy.hasStatus("freeze", now)) continue;

    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist > effectivePlayerRange) continue;

    const cooldown =
      (enemy.attackCooldown || 2000) / enemy.getAttackSpeedMultiplier(now);
    if (now - enemy.lastAttackTime < cooldown) continue;

    enemy.lastAttackTime = now;
    enemy.isAttacking = true;

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const damage =
      (enemy.projectileDamage > 0
        ? enemy.projectileDamage
        : Math.max(0.5, enemy.attackDamage * 1.5)) *
      enemy.getOutgoingDamageMultiplier(now) *
      auraStoneOutgoingMul(enemy);

    projectiles.push({
      id: crypto.randomUUID(),
      x: enemy.x,
      y: enemy.y,
      vx: (dx / len) * RANGED_PROJECTILE_SPEED,
      vy: (dy / len) * RANGED_PROJECTILE_SPEED,
      damage,
      radius: RANGED_PROJECTILE_RADIUS,
    });
  }

  let nextAttackTime = lastAttackTime;
  let nextPunchSide = lastPunchSide;
  const newAttacks: ActiveAttack[] = [...pendingShadowAttacks];
  const hitSplats: HitSplat[] = [
    ...pendingShadowSplats,
    ...pendingLightningSplats,
    ...pendingParrySplats,
  ];
  const ricochetPaths: RicochetPathEffect[] = [];
  let living = enemies.filter((e) => !e.isDead);

  let skillDamageDealt = skillDamageFromLightning;
  let skillHitsLanded = skillHitsFromLightning;

  const applyHealingSplat = (healingAmount: number) => {
    if (healingAmount <= 0 || player.isDead) return;
    const hpBefore = player.hp;
    player.heal(healingAmount);
    const healed = player.hp - hpBefore;
    if (healed > 0) {
      hitSplats.push({
        id: crypto.randomUUID(),
        x: player.x,
        y: player.y - player.radius - 8,
        text: `+${Math.max(1, Math.round(healed))}`,
        age: 0,
        color: "#4ade80",
      });
    }
  };

  const applyLifeSteal = (damageDealt: number) => {
    applyHealingSplat(damageDealt * lifeStealRatio);
  };

  const applySkillRegen = (damage: number, hits: number) => {
    applyHealingSplat(
      getMetaSkillRegenHealing(metaSkillRegenLevel, damage, hits) *
      prestigeMul,
    );
  };

  // Regen por skill dos pulsos ativos (raio/gelo/fogo) — não usa life steal físico
  if (skillDamageDealt > 0 || skillHitsLanded > 0) {
    applySkillRegen(skillDamageDealt, skillHitsLanded);
    skillDamageDealt = 0;
    skillHitsLanded = 0;
  }

  const effectiveCooldown = baseAttackSpeed / matchBuffs.attackSpeed;
  const canAttack = now >= lastAttackTime + effectiveCooldown;

  if (canAttack && living.length > 0 && !player.isDead) {
    const effectiveRange = baseRange * matchBuffs.attackRange;
    const inRange = living
      .map((enemy) => ({
        enemy,
        dist: Math.hypot(enemy.x - player.x, enemy.y - player.y),
      }))
      .filter(({ dist }) => dist <= effectiveRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, arms);

    if (inRange.length > 0) {
      nextAttackTime = now;
      const punchBase = baseDamage * matchBuffs.damageMultiplier;
      const skillPunchBase = punchBase * skillDamageMult;
      const critChance = Math.min(
        MATCH_CRIT_CHANCE_CAP,
        useGameStore.getState().getCritChance() +
          (matchBuffs.critChanceBonus ?? 0),
      );
      const critMult =
        useGameStore.getState().getCritDamageMultiplier() *
        (matchBuffs.critDamageMultiplier ?? 1);
      /** Dano acumulado por id (primário + chain). */
      const damageById = new Map<string, number>();
      /** Dano físico comum (socos) para life steal. */
      const physicalById = new Map<string, number>();
      /** Dano de skills (ricochete / cadeia de raio) para regen. */
      const skillById = new Map<string, number>();
      let punchSkillHits = 0;

      const addDamage = (id: string, amount: number, kind: "physical" | "skill") => {
        damageById.set(id, (damageById.get(id) ?? 0) + amount);
        if (kind === "physical") {
          physicalById.set(id, (physicalById.get(id) ?? 0) + amount);
        } else {
          skillById.set(id, (skillById.get(id) ?? 0) + amount);
          punchSkillHits += 1;
        }
      };

      // Olha para o último alvo do lote neste tick
      const lastTarget = inRange[inRange.length - 1]!.enemy;
      playerRotation = angleToward(
        player.x,
        player.y,
        lastTarget.x,
        lastTarget.y,
      );
      player.rotation = playerRotation;

      const { leftArms, rightArms } = getArmDistribution(arms);
      const sideUseCount: Record<ArmSide, number> = { left: 0, right: 0 };
      let punchSide = lastPunchSide;

      inRange.forEach(({ enemy }, i) => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        enemy.applyKnockback(dx, dy, knockbackPower);

        punchSide = pickNextPunchSide(punchSide, leftArms, rightArms);
        const armsOnSide = punchSide === "left" ? leftArms : rightArms;
        const armIndex =
          armsOnSide > 0 ? sideUseCount[punchSide] % armsOnSide : 0;
        sideUseCount[punchSide] += 1;

        const rest = getArmRestPosition(
          player.x,
          player.y,
          punchSide,
          armIndex,
          Math.max(1, armsOnSide),
          playerRotation,
        );

        newAttacks.push({
          id: crypto.randomUUID(),
          targetX: enemy.x,
          targetY: enemy.y,
          startX: rest.x,
          startY: rest.y,
          startTime: now + i * PUNCH_STAGGER_MS,
          duration: punchDurationMs,
          isRetracting: false,
          side: punchSide,
          armIndex,
          kind: "punch",
          fromShoulder: true,
        });

        const isCrit = Math.random() <= critChance;
        const damage = isCrit ? punchBase * critMult : punchBase;
        const displayDamage = Math.round(damage);

        hitSplats.push({
          id: crypto.randomUUID(),
          x: enemy.x,
          y: enemy.y,
          text: isCrit ? `${displayDamage}!` : String(displayDamage),
          age: 0,
          color: isCrit ? "#fb923c" : "#ffffff",
          scale: isCrit ? 1.4 : 1,
        });

        addDamage(enemy.id, damage, "physical");

        // Aura + Ricochete liberado: splash 25% em todos os outros na aura
        if (
          aura.elementPowers.ricochet > 0 &&
          aura.auraRadius > 0 &&
          damage > 0
        ) {
          const splash =
            damage *
            AURA_RICOCHET_SPLASH_RATIO *
            aura.elementPowers.ricochet;
          for (const other of living) {
            if (other.isDead || other.id === enemy.id) continue;
            const dist = Math.hypot(other.x - player.x, other.y - player.y);
            if (dist > aura.auraRadius + other.radius) continue;
            addDamage(other.id, splash, "skill");
            hitSplats.push({
              id: crypto.randomUUID(),
              x: other.x,
              y: other.y,
              text: String(Math.max(1, Math.round(splash))),
              age: 0,
              color: "#c4b5fd",
              scale: 0.85,
            });
          }
        }

        // Ricochete ativo: cadeia a partir do alvo do soco (1º alvo = dano cheio do soco)
        if (ricochetWindowActive && maxBounces > 1) {
          const baseBounceDamage = skillPunchBase * bounceDamageMult;
          const bounceChain = chainRicochet(
            living,
            enemy.x,
            enemy.y,
            maxBounces - 1,
            RICOCHET_LINK_RADIUS,
            RICOCHET_LINK_RADIUS,
            new Set([enemy.id]),
          );

          // VFX: caminho do braço pelos alvos (duração cobre a cadeia)
          ricochetPaths.push({
            points: [
              { x: enemy.x, y: enemy.y },
              ...bounceChain.map((t) => ({ x: t.x, y: t.y })),
            ],
            expiresAt:
              now +
              RICOCHET_PATH_DURATION_MS +
              bounceChain.length * RICOCHET_SEGMENT_STAGGER_MS,
          });

          let prevX = enemy.x;
          let prevY = enemy.y;
          for (let b = 0; b < bounceChain.length; b++) {
            const target = bounceChain[b]!;
            // bounceIndex 1 = 2º alvo (85%), 2 = 3º (~72%), …
            const bounceIndex = b + 1;
            const currentBounceDamage =
              baseBounceDamage * Math.pow(RICOCHET_BOUNCE_FALLOFF, bounceIndex);
            const displayBounce = Math.max(
              1,
              Math.round(currentBounceDamage),
            );

            newAttacks.push({
              id: crypto.randomUUID(),
              startX: prevX,
              startY: prevY,
              targetX: target.x,
              targetY: target.y,
              startTime:
                now +
                i * PUNCH_STAGGER_MS +
                (b + 1) * RICOCHET_SEGMENT_STAGGER_MS,
              duration: RICOCHET_SEGMENT_DURATION_MS,
              isRetracting: false,
              side: punchSide,
              armIndex,
              kind: "ricochet",
              fromShoulder: false,
            });

            hitSplats.push({
              id: crypto.randomUUID(),
              x: target.x,
              y: target.y,
              text: String(displayBounce),
              age: 0,
              color: "#fca5a5",
            });

            addDamage(target.id, currentBounceDamage, "skill");
            target.applyKnockback(
              target.x - prevX,
              target.y - prevY,
              knockbackPower * 0.85,
            );
            prevX = target.x;
            prevY = target.y;
          }
        }

        // Fogo on-hit: DoT = baseBurnDamage × stacks (pilhas individuais)
        if (fireLevel > 0) {
          const baseBurnDamage =
            skillPunchBase *
            0.2 *
            (1 + fireLevel * 0.15) *
            fireBonus.damageMul;
          const burnDurationMs = Math.round(
            (2000 + skills.fire.duration * 500) * fireBonus.durationMul,
          );
          const stacks = enemy.applyBurnStack(
            baseBurnDamage,
            fireMaxStacks,
            now,
            burnDurationMs,
          );
          skillVfx.push({
            kind: "fire",
            x: enemy.x,
            y: enemy.y,
            startedAt: now,
            expiresAt: now + FIRE_HIT_VFX_MS,
          });
          hitSplats.push({
            id: crypto.randomUUID(),
            x: enemy.x + 10,
            y: enemy.y - 10,
            text: `BURN×${stacks}`,
            age: 0,
            color: "#fb923c",
          });
        }
      });

      nextPunchSide = punchSide;

      const nextLiving: Enemy[] = [];
      let physicalDealt = 0;
      let skillDealt = 0;
      for (const enemy of living) {
        const dealt = damageById.get(enemy.id);
        if (dealt == null || dealt <= 0) {
          nextLiving.push(enemy);
          continue;
        }
        const hpBefore = Math.max(0, enemy.hp);
        const physicalPart = physicalById.get(enemy.id) ?? 0;
        const skillPart = skillById.get(enemy.id) ?? 0;
        // HP removido de fato (não conta overkill), rateado entre físico e skill
        const absorbed = Math.min(dealt, hpBefore);
        if (dealt > 0 && absorbed > 0) {
          physicalDealt += absorbed * (physicalPart / dealt);
          skillDealt += absorbed * (skillPart / dealt);
        }
        if (enemy.takeDamage(dealt, now)) {
          pushKill(enemy);
        } else {
          nextLiving.push(enemy);
        }
      }
      living = nextLiving;

      applyLifeSteal(physicalDealt);
      if (skillDealt > 0 || punchSkillHits > 0) {
        applySkillRegen(skillDealt, punchSkillHits);
      }
    }
  }

  living = living.filter((e) => !e.isDead);

  return {
    player,
    enemies: living,
    lastAttackTime: nextAttackTime,
    lastPunchSide: nextPunchSide,
    lastRicochetTime: lastRicochetTime,
    newAttacks,
    hitSplats,
    ricochetPaths,
    kills,
    killSites,
    contactHits,
    questEvents,
    milestoneEvents,
    playerRotation,
    projectiles,
    activeSkillPulse: pulseState,
    lightningProjectiles,
    skillVfx,
    shadowClones,
  };
}
