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
import { getLifeStealRatio, RICOCHET_LINK_RADIUS } from "@/lib/skillTree";
import {
  getMetaLifeStealRatio,
  getMetaSkillRegenHealing,
  useGameStore,
} from "@/store/useGameStore";
import {
  buildZigzagPoints,
  chainLightningTargets,
  createActiveSkillPulseState,
  isRicochetActive,
  LIGHTNING_VFX_MS,
  runActiveSkills,
  type ActiveSkillPulseState,
  type LightningProjectile,
  type SkillVfxEffect,
} from "@/src/game/systems/ActiveSkillsSystem";
import type { MatchSkillsData } from "@/db/schema";
import { DEFAULT_MATCH_SKILLS } from "@/db/schema";

export type MatchBuffsInput = {
  attackSpeed: number;
  attackRange: number;
  damageMultiplier: number;
  critDamageMultiplier?: number;
  skillDamageMultiplier?: number;
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

export const RICOCHET_PATH_DURATION_MS = 200;

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
  /** Timers de pulso gelo/raio/ricochete. */
  activeSkillPulse?: ActiveSkillPulseState;
  /** Projéteis elétricos em voo. */
  lightningProjectiles?: LightningProjectile[];
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
  /** Facing atual do jogador (atan2); inalterado se não atacou neste frame. */
  playerRotation: number;
  /** Projéteis após update + novos disparos. */
  projectiles: EnemyProjectile[];
  /** Estado atualizado dos pulsos. */
  activeSkillPulse: ActiveSkillPulseState;
  lightningProjectiles: LightningProjectile[];
  skillVfx: SkillVfxEffect[];
};

const DEFAULT_KNOCKBACK = 5;
export const PUNCH_DURATION_MS = 150;
/** Atraso leve entre socos no mesmo tick (ms de game clock). */
const PUNCH_STAGGER_MS = 40;
export const RICOCHET_SEGMENT_DURATION_MS = 120;
export const RICOCHET_SEGMENT_STAGGER_MS = 55;
export const RANGED_PROJECTILE_SPEED = 340;
export const RANGED_PROJECTILE_RADIUS = 5;

export const ELEMENTAL_PROC_CHANCE = 0.15;
/** Fallback legado; duração real = 1000 + ice*500. */
export const FREEZE_DURATION_MS = 2000;
export const SHOCK_VISUAL_MS = 450;
export const CHAIN_LIGHTNING_RADIUS = 130;
export const CHAIN_LIGHTNING_TARGETS = 3;
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
    activeSkillPulse: inputPulse = createActiveSkillPulseState(),
    lightningProjectiles: inputLightning = [],
  } = input;

  let playerRotation = inputRotation;

  const gameState = useGameStore.getState();
  const matchSkills = inputMatchSkills ?? { ...DEFAULT_MATCH_SKILLS };
  const skills = gameState.skills;
  const shockSlowAmount = Math.min(
    0.85,
    0.2 + skills.lightning.hits * 0.1,
  );
  const fireLevel = matchSkills.fire;
  /** maxStacks da árvore roxa (fire.damage); mínimo 1 com carta in-run. */
  const fireMaxStacks = Math.max(1, 1 + skills.fire.damage);
  const lifeStealRatio =
    getLifeStealRatio(gameState.skillTree) +
    getMetaLifeStealRatio(gameState.metaLifeStealLevel);
  const metaSkillRegenLevel = gameState.metaSkillRegenLevel;
  // Ricochete: hits / damage (ciclo gerenciado em ActiveSkillsSystem)
  const maxBounces = 2 + skills.ricochet.hits;
  const bounceDamageMult = 0.6 + skills.ricochet.damage * 0.15;
  const knockbackPower =
    knockbackImpulse ??
    gameState.getKnockbackPower() ??
    DEFAULT_KNOCKBACK;
  const difficulty = gameState.getDifficultyMultipliers();
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
  const skillVfx: SkillVfxEffect[] = [];

  const pushKillQuests = (enemyType: Enemy["type"]) => {
    questEvents.push({ type: "kill_enemies", amount: 1 });
    if (enemyType === "boss") {
      questEvents.push({ type: "kill_boss", amount: 1 });
    } else if (enemyType === "dasher") {
      questEvents.push({ type: "kill_dashers", amount: 1 });
    }
  };

  const pushKill = (enemy: Enemy) => {
    kills += 1;
    killSites.push({
      x: enemy.x,
      y: enemy.y,
      enemyType: enemy.type,
      rewards: { ...enemy.rewards },
    });
    pushKillQuests(enemy.type);
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
  });
  skillVfx.push(...activeSkills.newSkillVfx);
  const ricochetWindowActive = isRicochetActive(
    activeSkills.pulseState,
    now,
  );
  if (activeSkills.questFreeze > 0) {
    questEvents.push({
      type: "inflict_freeze",
      amount: activeSkills.questFreeze,
    });
  }

  // Projéteis de raio: move + impacto + cadeia em zigue-zague
  let skillDamageFromLightning = activeSkills.skillDamageDealt;
  let skillHitsFromLightning = activeSkills.skillHitsLanded;
  const lightningProjectiles: LightningProjectile[] = [
    ...activeSkills.newLightningProjectiles,
  ];
  const maxLightningHits = 2 + skills.lightning.hits;
  const boltMargin = 40;
  const pendingLightningSplats: HitSplat[] = [];

  for (const bolt of inputLightning) {
    const nx = bolt.x + bolt.vx * dt;
    const ny = bolt.y + bolt.vy * dt;
    if (
      nx < -boltMargin ||
      ny < -boltMargin ||
      nx > canvasWidth + boltMargin ||
      ny > canvasHeight + boltMargin
    ) {
      continue;
    }

    let hitEnemy: Enemy | null = null;
    let hitDist = Infinity;
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(nx - enemy.x, ny - enemy.y);
      if (dist <= enemy.radius + bolt.radius && dist < hitDist) {
        hitEnemy = enemy;
        hitDist = dist;
      }
    }

    if (!hitEnemy) {
      lightningProjectiles.push({ ...bolt, x: nx, y: ny });
      continue;
    }

    // Impacto no 1º alvo + cadeia
    const chainTargets = chainLightningTargets(
      enemies,
      hitEnemy.x,
      hitEnemy.y,
      Math.max(0, maxLightningHits - 1),
      new Set([hitEnemy.id]),
    );
    const allHits = [hitEnemy, ...chainTargets];
    const pathPoints: { x: number; y: number }[] = [
      { x: player.x, y: player.y },
    ];

    let prevX = player.x;
    let prevY = player.y;
    for (let i = 0; i < allHits.length; i++) {
      const target = allHits[i]!;
      const dmg =
        i === 0 ? bolt.damage : bolt.damage * CHAIN_DAMAGE_MULT;
      target.hp -= dmg;
      target.applyShockSlow(shockSlowAmount, now);
      questEvents.push({ type: "inflict_shock", amount: 1 });
      skillDamageFromLightning += dmg;
      skillHitsFromLightning += 1;
      pendingLightningSplats.push({
        id: crypto.randomUUID(),
        x: target.x,
        y: target.y,
        text: String(Math.max(1, Math.round(dmg))),
        age: 0,
        color: "#e0f2fe",
      });
      const zig = buildZigzagPoints(prevX, prevY, target.x, target.y);
      pathPoints.push(...zig.slice(1));
      prevX = target.x;
      prevY = target.y;
    }

    skillVfx.push({
      kind: "lightning",
      points: pathPoints,
      startedAt: now,
      expiresAt: now + LIGHTNING_VFX_MS,
    });
  }

  // Mortes por burn / raio (antes dos socos)
  for (const enemy of enemies) {
    if (!enemy.isDead) continue;
    pushKill(enemy);
  }

  // Melee: inimigos encostados formam horda e batem periodicamente (não morrem no contato)
  let meleeDamageDealt = 0;
  for (const enemy of enemies) {
    if (enemy.isDead || enemy.type === "ranged") continue; // ranged só dispara projéteis
    if (enemy.hasStatus("freeze", now)) {
      enemy.isAttacking = false;
      continue;
    }

    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const touchDist = player.radius + enemy.radius;
    const knockbackSpeed = Math.hypot(enemy.vx, enemy.vy);

    if (dist <= touchDist) {
      // Knockback ativo: força saída do swarm e não zera o impulso
      if (knockbackSpeed > 0.4) {
        enemy.isAttacking = false;
        continue;
      }

      enemy.isAttacking = true;
      enemy.vx = 0;
      enemy.vy = 0;

      const cooldown = enemy.attackCooldown || 1000;
      const damage =
        enemy.attackDamage > 0
          ? enemy.attackDamage
          : Math.max(0.5, 1.2 * difficulty.enemyDamageMultiplier);

      if (now - enemy.lastAttackTime >= cooldown) {
        meleeDamageDealt += damage;
        enemy.lastAttackTime = now;
        contactHits += 1;
      }
    } else {
      enemy.isAttacking = false;
    }
  }

  if (meleeDamageDealt > 0) {
    player.takeDamage(meleeDamageDealt);
  }

  // Projéteis em voo: move + colisão com o jogador
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
    const hitDist = Math.hypot(nx - player.x, ny - player.y);
    if (hitDist <= player.radius + p.radius) {
      player.takeDamage(p.damage);
      contactHits += 1;
      continue;
    }
    projectiles.push({ ...p, x: nx, y: ny });
  }

  // Ranged: dispara quando parado no alcance de ataque do jogador
  const effectivePlayerRange = baseRange * matchBuffs.attackRange;
  for (const enemy of enemies) {
    if (enemy.type !== "ranged" || enemy.isDead) continue;
    if (enemy.hasStatus("freeze", now)) continue;

    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist > effectivePlayerRange) continue;

    const cooldown = enemy.attackCooldown || 2000;
    if (now - enemy.lastAttackTime < cooldown) continue;

    enemy.lastAttackTime = now;
    enemy.isAttacking = true;

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    const damage =
      enemy.projectileDamage > 0
        ? enemy.projectileDamage
        : Math.max(0.5, enemy.attackDamage * 1.5);

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
  const newAttacks: ActiveAttack[] = [];
  const hitSplats: HitSplat[] = [...pendingLightningSplats];
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
      getMetaSkillRegenHealing(metaSkillRegenLevel, damage, hits),
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
      const critChance = useGameStore.getState().getCritChance();
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

        // Ricochete ativo: cadeia a partir do alvo do soco
        if (ricochetWindowActive && maxBounces > 1) {
          const bounceDamage = skillPunchBase * bounceDamageMult;
          const displayBounce = Math.max(1, Math.round(bounceDamage));
          const bounceChain = chainRicochet(
            living,
            enemy.x,
            enemy.y,
            maxBounces - 1,
            RICOCHET_LINK_RADIUS,
            RICOCHET_LINK_RADIUS,
            new Set([enemy.id]),
          );

          // VFX: player → alvo primário → saltos
          ricochetPaths.push({
            points: [
              { x: enemy.x, y: enemy.y },
              ...bounceChain.map((t) => ({ x: t.x, y: t.y })),
            ],
            expiresAt: now + RICOCHET_PATH_DURATION_MS,
          });

          let prevX = enemy.x;
          let prevY = enemy.y;
          for (let b = 0; b < bounceChain.length; b++) {
            const target = bounceChain[b]!;
            newAttacks.push({
              id: crypto.randomUUID(),
              startX: prevX,
              startY: prevY,
              targetX: target.x,
              targetY: target.y,
              startTime:
                now + i * PUNCH_STAGGER_MS + (b + 1) * RICOCHET_SEGMENT_STAGGER_MS,
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
              color: "#fbbf24",
            });

            addDamage(target.id, bounceDamage, "skill");
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
            skillPunchBase * 0.2 * (1 + fireLevel * 0.15);
          const burnDurationMs = 2000 + skills.fire.duration * 500;
          const stacks = enemy.applyBurnStack(
            baseBurnDamage,
            fireMaxStacks,
            now,
            burnDurationMs,
          );
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
        if (enemy.takeDamage(dealt)) {
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
    playerRotation,
    projectiles,
    activeSkillPulse: activeSkills.pulseState,
    lightningProjectiles,
    skillVfx,
  };
}
