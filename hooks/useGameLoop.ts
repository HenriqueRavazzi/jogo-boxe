"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { Enemy } from "@/src/game/entities/Enemy";
import {
  Player,
  facingToCanvasRotation,
  getArmDistribution,
  getArmPunchOrder,
  getArmRestPosition,
  rotateLocalOffset,
} from "@/src/game/entities/Player";
import {
  runCombatSystem,
} from "@/src/game/systems/CombatSystem";
import {
  COMPACT_LOOT_MERGE_THRESHOLD,
  COMPACT_LOOT_TIME_ALIVE_SEC,
  createDropsFromKills,
  mergeDropsIntoBundle,
  runLootSystem,
} from "@/src/game/systems/LootSystem";
import {
  pulseVisualProgress,
  isRicochetActive,
  RICOCHET_ACTIVE_MS,
} from "@/src/game/systems/ActiveSkillsSystem";
import {
  drawAllSkillVfx,
  drawHeroAuraRing,
  drawLightningProjectile,
  drawRicochetArmPath,
  drawShadowClone,
} from "@/src/game/render/drawSkillEffects";
import { drawArenaBackground, invalidateArenaBackgroundCache } from "@/src/game/systems/BackgroundRenderer";
import { getAuraRadius } from "@/src/game/systems/AuraSystem";
import { DEFAULT_MATCH_SKILL_BONUS } from "@/lib/matchUpgrades";
import { runSpawner } from "@/src/game/systems/Spawner";
import {
  isHardOrInfernalDifficulty,
  type MilestoneProgressEvent,
} from "@/lib/milestoneQuests";
import { useArenaStore, type ActiveAttack } from "@/store/useArenaStore";
import { getSkillGoldIncomeMultiplier } from "@/lib/skillTree";
import { clampGameSpeed, useGameStore } from "@/store/useGameStore";

const PLAYER_RADIUS = 18;
const BODY_RADIUS = 16;
const HEAD_RADIUS = 11;
const DROP_RADIUS = 6;
const GLOVE_RADIUS = 8;
const CONTACT_DAMAGE = 20;
const FLOATING_TEXT_MAX_AGE = 60;

/** Interpolação linear: start → end. */
const lerp = (start: number, end: number, t: number): number =>
  start * (1 - t) + end * t;

/** Easing: aceleração forte no início, freia no fim do soco. */
const easeOutCubic = (t: number): number => {
  const p = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - p, 3);
};

/** Avança extensão → retração e remove socos finalizados. */
function tickActiveAttacks(
  attacks: ActiveAttack[],
  now: number,
): ActiveAttack[] {
  const next: ActiveAttack[] = [];
  for (const a of attacks) {
    let progress = (now - a.startTime) / a.duration;

    if (!a.isRetracting && progress > 1) {
      // Ricochete: braço só atravessa o alvo (sem retração = não parece ataque extra)
      if (a.kind === "ricochet") continue;
      next.push({ ...a, isRetracting: true, startTime: now });
      continue;
    }

    if (a.isRetracting) {
      progress = (now - a.startTime) / a.duration;
      if (progress > 1) continue; // retração acabou → remove
    }

    next.push(a);
  }
  return next;
}

/** Posição da luva com lerp + easeOutCubic (extensão ou retração). */
function glovePosition(
  attack: ActiveAttack,
  now: number,
): { x: number; y: number } {
  const raw = (now - attack.startTime) / attack.duration;
  const t = easeOutCubic(Math.min(1, Math.max(0, raw)));

  if (attack.isRetracting) {
    // Volta do inimigo para o repouso
    return {
      x: lerp(attack.targetX, attack.startX, t),
      y: lerp(attack.targetY, attack.startY, t),
    };
  }

  return {
    x: lerp(attack.startX, attack.targetX, t),
    y: lerp(attack.startY, attack.targetY, t),
  };
}

function shoulderOf(
  playerX: number,
  playerY: number,
  side: "left" | "right",
  facingRadians = -Math.PI / 2,
): { x: number; y: number } {
  const localX = side === "left" ? -BODY_RADIUS * 0.7 : BODY_RADIUS * 0.7;
  const localY = -2;
  const rotated = rotateLocalOffset(
    localX,
    localY,
    facingToCanvasRotation(facingRadians),
  );
  return { x: playerX + rotated.x, y: playerY + rotated.y };
}


/**
 * Orquestrador do game loop: lê Zustand, delega a entities/systems, escreve de volta.
 * Player fica sempre no centro do canvas (CSS px); loot usa magnetismo após 800ms.
 */
export function useGameLoop(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const rafId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = parent?.clientHeight ?? window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Posição do player = sempre o centro do canvas (espaço de desenho CSS)
      useArenaStore.getState().centerPlayer(w, h);
      invalidateArenaBackgroundCache();
    };

    resize();
    window.addEventListener("resize", resize);

    let spawnAccumulator = 0;
    /** Relógio da partida (ms) — avança com gameSpeed. */
    let gameClockMs = 0;

    const update = (realDt: number) => {
      const arena = useArenaStore.getState();
      const game = useGameStore.getState();
      const gameSpeed = clampGameSpeed(game.gameSpeedMultiplier);
      // Física, spawn, timeAlive e timers usam dt em segundos (escalado)
      const dt = realDt * gameSpeed;
      // Reinicia o relógio local quando a arena foi resetada (novo start)
      if (arena.timeAlive <= 0) {
        gameClockMs = 0;
      }
      gameClockMs += realDt * 1000 * gameSpeed;
      const gameNow = gameClockMs;
      /** Segundos vivos — valor único usado no spawn e na store neste frame. */
      const nextTimeAlive = arena.timeAlive + dt;

      // Centro estrito a cada frame (clientWidth/Height = CSS px do canvas)
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      useArenaStore.getState().centerPlayer(canvas.clientWidth, canvas.clientHeight);

      const stats = game.getEffectiveStats();

      const player = new Player(
        cx,
        cy,
        arena.currentHp,
        stats.maxHp,
        PLAYER_RADIUS,
        arena.playerRotation,
      );

      const enemies = arena.enemies.map((e) =>
        Enemy.fromData({
          ...e,
          type: e.type ?? "normal",
          radius: e.radius ?? 12,
          vx: e.vx ?? 0,
          vy: e.vy ?? 0,
          attackDamage: e.attackDamage ?? 1.2,
          attackCooldown: e.attackCooldown ?? 1000,
          lastAttackTime: e.lastAttackTime ?? 0,
          isAttacking: e.isAttacking ?? false,
          projectileDamage: e.projectileDamage ?? 0,
          color: e.color ?? "",
          statusEffects: e.statusEffects ?? [],
          rewards: e.rewards,
        }),
      );
      const playerAttackRange =
        stats.attackRange * arena.matchBuffs.attackRange;
      for (const enemy of enemies) {
        enemy.moveToward(
          player.x,
          player.y,
          dt,
          gameNow,
          PLAYER_RADIUS,
          playerAttackRange,
        );
      }

      const combat = runCombatSystem({
        player,
        enemies,
        arms: stats.arms,
        armTier: game.armTier,
        baseDamage: stats.damage,
        baseRange: stats.attackRange,
        baseAttackSpeed: stats.attackCooldownMs,
        matchBuffs: arena.matchBuffs,
        lastAttackTime: arena.lastAttackTime,
        lastPunchSide: arena.lastPunchSide,
        lastRicochetTime: arena.lastRicochetTime,
        now: gameNow,
        dt,
        contactDamage: CONTACT_DAMAGE,
        playerRotation: arena.playerRotation,
        projectiles: arena.projectiles ?? [],
        canvasWidth: canvas.clientWidth,
        canvasHeight: canvas.clientHeight,
        matchSkills: arena.matchSkills,
        activeRunSkills: arena.activeRunSkills,
        matchSkillBonuses: arena.matchSkillBonuses,
        activeSkillPulse: arena.activeSkillPulse,
        lightningProjectiles: arena.lightningProjectiles ?? [],
        shadowClones: arena.shadowClones ?? [],
        matchSkillMastery: arena.matchSkillMastery,
        masteryGroundZones: arena.masteryGroundZones ?? [],
      });

      const livingEnemies = combat.enemies
        .filter((e) => !e.isDead)
        .map((e) => e.toData());

      const activeAttacks = tickActiveAttacks(
        [...arena.activeAttacks, ...combat.newAttacks],
        gameNow,
      );

      const visual = game.visualSettings ?? {
        screenShake: true,
        damageTextMode: "all" as const,
        highParticleQuality: true,
      };

      const floatingTexts = [
        ...arena.floatingTexts.map((t) => ({
          ...t,
          age: t.age + gameSpeed,
          y: t.y - 0.8 * gameSpeed,
        })),
        ...combat.hitSplats,
      ]
        .filter((t) => t.age < FLOATING_TEXT_MAX_AGE)
        .filter((t) => {
          if (visual.damageTextMode === "off") return false;
          if (visual.damageTextMode === "crits") return Boolean(t.isCrit);
          return true;
        });

      const ricochetPathEffects = [
        ...arena.ricochetPathEffects.filter((e) => e.expiresAt > gameNow),
        ...combat.ricochetPaths,
      ];

      const skillVfxEffects = [
        ...(arena.skillVfxEffects ?? []).filter((e) => e.expiresAt > gameNow),
        ...combat.skillVfx,
      ];

      let shakeFrames = arena.shakeFrames;
      if (visual.screenShake) {
        if (combat.contactHits > 0) {
          shakeFrames = 10;
        } else if (
          combat.activeSkillPulse.stonePulseAt > 0 &&
          gameNow - combat.activeSkillPulse.stonePulseAt < 80
        ) {
          shakeFrames = 16;
        } else if (shakeFrames > 0) {
          shakeFrames = Math.max(0, shakeFrames - gameSpeed);
        }
      } else {
        shakeFrames = 0;
      }

      // Drops: ouro + diamantes conforme rewards do enemy_types
      // Endless ≥5min: 1 ícone bundle por kill (anti-lag de sprites)
      const difficulty = game.getDifficultyMultipliers();
      const compactLoot =
        arena.runMode === "endless" &&
        arena.timeAlive >= COMPACT_LOOT_TIME_ALIVE_SEC;
      const dropResult = createDropsFromKills(combat.killSites, gameNow, {
        incomeMultiplier:
          game.incomeMultiplier *
          getSkillGoldIncomeMultiplier(game.skillTree) *
          game.getEquippedTeamBuffs().goldIncomeMultiplier,
        goldDropMultiplier: difficulty.goldDropMultiplier,
        bossesKilled: arena.bossesKilled,
        diamondLuckBonus: game.getDiamondLuckBonus(),
        purpleDiamondLuckBonus:
          game.getEquippedTeamBuffs().purpleDiamondLuckBonus,
        compactLoot,
      });
      const newDrops = dropResult.drops;
      let dropsWithNew = [...arena.drops, ...newDrops];
      if (
        compactLoot &&
        dropsWithNew.length > COMPACT_LOOT_MERGE_THRESHOLD
      ) {
        dropsWithNew = mergeDropsIntoBundle(dropsWithNew, gameNow);
      }

      const loot = runLootSystem({
        drops: dropsWithNew,
        playerX: cx,
        playerY: cy,
        playerRadius: PLAYER_RADIUS,
        magnetRadiusMultiplier: game.getMagnetRadiusMultiplier(),
        dt,
        now: gameNow,
      });

      if (loot.collectedGold > 0) {
        // Multiplicadores já aplicados no nº de moedas — não reaplicar renda
        game.addGold(loot.collectedGold, { applyIncome: false });
      }
      if (loot.collectedDiamonds > 0) {
        game.addGems(loot.collectedDiamonds);
      }
      if (loot.collectedPurpleDiamonds > 0) {
        game.addPurpleDiamonds(loot.collectedPurpleDiamonds);
      }

      const defeatedThisFrame = combat.killSites.length;
      if (defeatedThisFrame > 0) {
        useArenaStore.getState().recordEnemyDefeats(defeatedThisFrame);
        let mobs = 0;
        let bosses = 0;
        let killsNormal = 0;
        let killsDasher = 0;
        let killsRanged = 0;
        for (const site of combat.killSites) {
          if (site.enemyType === "boss") bosses += 1;
          else {
            mobs += 1;
            if (site.enemyType === "dasher") killsDasher += 1;
            else if (site.enemyType === "ranged") killsRanged += 1;
            else killsNormal += 1;
          }
        }
        useArenaStore.getState().recordCombatStats({
          killsNormal,
          killsDasher,
          killsRanged,
        });
        game.recordLifetimeKills(mobs, bosses);
      }
      if (combat.damageDealt > 0) {
        useArenaStore.getState().recordCombatStats({
          damageDealt: combat.damageDealt,
        });
      }
      if (loot.collectedGold > 0 || loot.collectedDiamonds > 0 || loot.collectedPurpleDiamonds > 0) {
        useArenaStore
          .getState()
          .recordLootCollected(
            loot.collectedGold,
            loot.collectedDiamonds,
            loot.collectedPurpleDiamonds,
          );
      }

      if (combat.questEvents.length > 0) {
        useArenaStore.getState().progressQuests(combat.questEvents);
      }

      // Missões de marco (persistentes no save)
      const milestoneBatch: MilestoneProgressEvent[] = [
        ...combat.milestoneEvents,
      ];
      if (loot.collectedGold > 0) {
        milestoneBatch.push({
          type: "gold_collected",
          amount: loot.collectedGold,
        });
      }
      if (loot.collectedDiamonds > 0) {
        milestoneBatch.push({
          type: "diamonds_collected",
          amount: loot.collectedDiamonds,
        });
      }
      if (loot.collectedPurpleDiamonds > 0) {
        milestoneBatch.push({
          type: "purple_diamonds_collected",
          amount: loot.collectedPurpleDiamonds,
        });
      }
      const bossesKilledPreview =
        arena.bossesKilled + dropResult.bossesKilledThisBatch;
      if (dropResult.bossesKilledThisBatch > 0) {
        milestoneBatch.push({
          type: "bosses_in_run",
          amount: bossesKilledPreview,
        });
      }
      const selectedDiff = game.getSelectedDifficulty();
      if (
        selectedDiff &&
        isHardOrInfernalDifficulty(selectedDiff.name) &&
        Math.floor(nextTimeAlive) > Math.floor(arena.timeAlive)
      ) {
        milestoneBatch.push({
          type: "survive_hard_seconds",
          amount: Math.floor(nextTimeAlive),
        });
      }
      if (milestoneBatch.length > 0) {
        game.progressMilestoneQuests(milestoneBatch);
      }

      const hasBossAlive = livingEnemies.some((e) => e.type === "boss");
      const aliveBossCount = livingEnemies.filter((e) => e.type === "boss")
        .length;
      const stagePace =
        arena.runMode === "stage" && arena.runStage
          ? 1 + (arena.runStage.stageNumber - 1) * 0.035
          : 1;
      const stageCampaign =
        arena.runMode === "stage" && arena.runStage
          ? {
              enemyTierCap: arena.runStage.enemyTierCap,
              enemyCount: arena.runStage.enemyCount,
              commonsSpawned: arena.stageCommonsSpawned,
              bossSpawnProgress: arena.runStage.bossSpawnProgress,
              difficultyMul: arena.runStage.difficultyMul,
              bossStatMul: arena.runStage.bossStatMul,
              stageNumber: arena.runStage.stageNumber,
              spawnPaceMul: stagePace,
            }
          : null;
      const spawn = runSpawner({
        timeAlive: nextTimeAlive,
        matchLevel: arena.matchLevel,
        canvasWidth: canvas.clientWidth,
        canvasHeight: canvas.clientHeight,
        currentEnemyCount: livingEnemies.length,
        bossesSpawned: arena.bossesSpawned,
        hasBossAlive,
        aliveBossCount,
        invasionBossCooldownMs: arena.invasionBossCooldownMs,
        endlessBossCooldownMs: arena.endlessBossCooldownMs,
        endlessBossQueue: arena.endlessBossQueue ?? [],
        spawnAccumulatorMs: spawnAccumulator,
        dt,
        difficulty: {
          enemyHpMultiplier: difficulty.enemyHpMultiplier,
          enemyDamageMultiplier: difficulty.enemyDamageMultiplier,
          enemySpeedMultiplier: difficulty.enemySpeedMultiplier,
        },
        enemyTypes: game.enemyTypes,
        stageCampaign,
      });
      spawnAccumulator = spawn.spawnAccumulatorMs;

      let nextHp = combat.player.hp;
      const teamBuffs = game.getEquippedTeamBuffs();
      const teamRegenRatio = teamBuffs.hpRegenMaxHpRatioPerSecond;
      if (
        teamRegenRatio > 0 &&
        nextHp > 0 &&
        nextHp < stats.maxHp &&
        !combat.player.isDead
      ) {
        nextHp = Math.min(
          stats.maxHp,
          nextHp + stats.maxHp * teamRegenRatio * dt,
        );
      }

      const nextCommonsSpawned =
        arena.stageCommonsSpawned + (spawn.commonsSpawnedDelta ?? 0);
      const defeatedThisTick = combat.killSites.length;
      const nextStageDefeated =
        arena.stageEnemiesDefeated + defeatedThisTick;

      const stageBossDefeated =
        arena.stageBossDefeated ||
        (arena.runMode === "stage" &&
          dropResult.bossesKilledThisBatch > 0);

      const nextEnemies =
        spawn.spawned.length > 0
          ? [...livingEnemies, ...spawn.spawned]
          : livingEnemies;

      useArenaStore.setState({
        playerX: cx,
        playerY: cy,
        playerRotation: combat.playerRotation,
        enemies: nextEnemies,
        drops: loot.drops,
        projectiles: combat.projectiles,
        currentHp: nextHp,
        lastAttackTime: combat.lastAttackTime,
        lastPunchSide: combat.lastPunchSide,
        lastRicochetTime: combat.lastRicochetTime,
        activeAttacks,
        floatingTexts,
        ricochetPathEffects,
        shakeFrames,
        timeAlive: nextTimeAlive,
        gameClockMs: gameNow,
        bossesSpawned: spawn.bossesSpawned,
        bossesKilled: arena.bossesKilled + dropResult.bossesKilledThisBatch,
        invasionBossCooldownMs: spawn.invasionBossCooldownMs,
        endlessBossCooldownMs: spawn.endlessBossCooldownMs,
        endlessBossQueue: spawn.endlessBossQueue,
        stageBossDefeated,
        stageCommonsSpawned: nextCommonsSpawned,
        stageEnemiesDefeated: nextStageDefeated,
        activeSkillPulse: combat.activeSkillPulse,
        lightningProjectiles: combat.lightningProjectiles,
        skillVfxEffects,
        shadowClones: combat.shadowClones,
        masteryGroundZones: combat.masteryGroundZones,
      });

      if (spawn.hordeBossInvaded) {
        useArenaStore.getState().triggerBossHordeAlert(2_000);
      }

      if (dropResult.bossesKilledThisBatch > 0) {
        useArenaStore.setState((s) => ({
          runStats: {
            ...s.runStats,
            bossesKilled:
              s.runStats.bossesKilled + dropResult.bossesKilledThisBatch,
          },
        }));
      }

      if (combat.player.hp <= 0) {
        useArenaStore.getState().setGameOver();
      } else if (arena.runMode === "stage" && arena.runStage) {
        const stage = arena.runStage;
        const commonsDone = nextCommonsSpawned >= stage.enemyCount;
        const bossSpawnedOk = spawn.bossesSpawned >= 1;
        const fieldClear = nextEnemies.length === 0;
        if (commonsDone && bossSpawnedOk && stageBossDefeated && fieldClear) {
          useArenaStore.getState().setVictory();
        }
      }

      if (dropResult.totalXp > 0) {
        useArenaStore.getState().addXp(dropResult.totalXp);
      }
    };

    const drawGlove = (x: number, y: number, _ricochet = false) => {
      ctx.beginPath();
      ctx.arc(x, y, GLOVE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#dc2626";
      ctx.fill();
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const drawBoxer = (
      x: number,
      y: number,
      facing: number,
      arms: number,
      punching: ActiveAttack[],
      now: number,
    ) => {
      const canvasRot = facingToCanvasRotation(facing);

      // Corpo, cabeça e braços em repouso no espaço local rotacionado
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(canvasRot);

      ctx.beginPath();
      ctx.arc(0, 0, BODY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#1e3a5f";
      ctx.fill();

      const headY = -BODY_RADIUS * 0.85;
      ctx.beginPath();
      ctx.arc(0, headY, HEAD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#7dd3fc";
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(-HEAD_RADIUS + 1, headY - 4, HEAD_RADIUS * 2 - 2, 5);
      ctx.beginPath();
      ctx.arc(0, headY - 1.5, HEAD_RADIUS - 1, Math.PI, 0);
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 3;
      ctx.stroke();

      const { leftArms, rightArms } = getArmDistribution(arms);
      const busy = new Set(
        punching
          .filter((a) => a.kind !== "ricochet" || a.fromShoulder !== false)
          .map((a) => `${a.side}:${a.armIndex}`),
      );

      for (const arm of getArmPunchOrder(arms)) {
        if (busy.has(`${arm.side}:${arm.armIndex}`)) continue;
        const armsOnSide = arm.side === "left" ? leftArms : rightArms;
        const rest = getArmRestPosition(
          0,
          0,
          arm.side,
          arm.armIndex,
          armsOnSide,
          -Math.PI / 2, // espaço local já rotacionado: offsets “neutros”
        );
        const shoulderX =
          arm.side === "left" ? -BODY_RADIUS * 0.7 : BODY_RADIUS * 0.7;
        const shoulderY = -2;

        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(rest.x, rest.y);
        ctx.strokeStyle = "#1e3a5f";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(rest.x, rest.y);
        ctx.strokeStyle = "#f0c4a0";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        drawGlove(rest.x, rest.y);
      }

      ctx.restore();

      // Socos / segmentos de ricochete em coordenadas globais
      for (const attack of punching) {
        const pos = glovePosition(attack, now);
        const isRicochet = attack.kind === "ricochet";
        const fromShoulder = isRicochet
          ? attack.fromShoulder === true
          : attack.fromShoulder !== false;
        const origin = fromShoulder
          ? shoulderOf(x, y, attack.side, facing)
          : { x: attack.startX, y: attack.startY };

        // Mesmo visual de braço/luva — ricochete = continuação do soco
        const outer = "#1e3a5f";
        const inner = "#f0c4a0";

        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = outer;
        ctx.lineWidth = isRicochet ? 5.5 : 6;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = inner;
        ctx.lineWidth = isRicochet ? 2.75 : 3;
        ctx.stroke();

        if (isRicochet) {
          // Rastro de impacto do braço saltando
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = "rgba(248, 113, 113, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        drawGlove(pos.x, pos.y, isRicochet);
      }
    };

    const drawScene = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const {
        playerX,
        playerY,
        playerRotation,
        enemies,
        drops,
        projectiles,
        activeAttacks,
        floatingTexts,
        ricochetPathEffects,
        skillVfxEffects,
        lightningProjectiles,
        activeSkillPulse,
      } = useArenaStore.getState();
      const arms = useGameStore.getState().getEffectiveStats().arms;
      const prestigeLevel = useGameStore.getState().prestigeLevel;
      const now = gameClockMs;

      // Fundo dinâmico por Prestígio (cache offscreen + overlays leves)
      drawArenaBackground(ctx, w, h, prestigeLevel, now);

      // VFX de skills (gelo / raio / fogo / parry) — opcional por desempenho
      const highParticles =
        useGameStore.getState().visualSettings?.highParticleQuality !== false;
      if (highParticles) {
        drawAllSkillVfx(ctx, skillVfxEffects, now);
      }

      // Anel de ricochete (janela ativa)
      const ricoT = pulseVisualProgress(
        activeSkillPulse.ricochetPulseAt,
        now,
        RICOCHET_ACTIVE_MS,
      );
      if (ricoT > 0 || isRicochetActive(activeSkillPulse, now)) {
        const t =
          ricoT > 0
            ? ricoT
            : Math.min(
                1,
                (now -
                  (activeSkillPulse.ricochetActiveUntil - RICOCHET_ACTIVE_MS)) /
                  RICOCHET_ACTIVE_MS,
              );
        const radius = 28 + t * Math.max(w, h) * 0.35;
        ctx.beginPath();
        ctx.arc(playerX, playerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(248, 113, 113, ${0.55 * (1 - t * 0.5)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Aura contínua no herói
      const matchSkills = useArenaStore.getState().matchSkills;
      const matchSkillBonuses = useArenaStore.getState().matchSkillBonuses;
      const gameSnap = useGameStore.getState();
      if ((matchSkills.aura ?? 0) > 0) {
        const auraRadius = getAuraRadius(
          matchSkills.aura,
          gameSnap.skills.aura.radius,
          matchSkillBonuses.aura ?? DEFAULT_MATCH_SKILL_BONUS,
          gameSnap.getPrestigeMultiplier(),
        );
        drawHeroAuraRing(ctx, playerX, playerY, auraRadius, {
          fire: gameSnap.unlockedSkills.fire,
          lightning: gameSnap.unlockedSkills.lightning,
          ice: gameSnap.unlockedSkills.ice,
          shadow: gameSnap.unlockedSkills.shadow,
          stone: gameSnap.unlockedSkills.stone,
          ricochet: gameSnap.unlockedSkills.ricochet,
        }, now);
      }

      // Shadow clones
      const shadowClones = useArenaStore.getState().shadowClones ?? [];
      for (const clone of shadowClones) {
        drawShadowClone(ctx, clone, now);
      }

      for (const enemy of enemies) {
        const enemyEntity = Enemy.fromData({
          ...enemy,
          type: enemy.type ?? "normal",
          radius: enemy.radius ?? 12,
          statusEffects: enemy.statusEffects ?? [],
          vx: enemy.vx ?? 0,
          vy: enemy.vy ?? 0,
          attackDamage: enemy.attackDamage ?? 1.2,
          attackCooldown: enemy.attackCooldown ?? 1000,
          lastAttackTime: enemy.lastAttackTime ?? 0,
          isAttacking: enemy.isAttacking ?? false,
          projectileDamage: enemy.projectileDamage ?? 0,
          color: enemy.color ?? "",
        });
        enemyEntity.draw(ctx, now);
      }

      // Projéteis elétricos
      for (const bolt of lightningProjectiles ?? []) {
        drawLightningProjectile(ctx, bolt, now);
      }

      for (const proj of projectiles ?? []) {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#2dd4bf";
        ctx.fill();
        ctx.strokeStyle = "#99f6e4";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Caminho do braço ricocheteando entre inimigos
      for (const effect of ricochetPathEffects ?? []) {
        if (highParticles) {
          drawRicochetArmPath(ctx, effect, playerX, playerY, now);
        }
      }

      for (const drop of drops) {
        if (drop.type === "bundle") {
          // Ícone único pós-5min: anéis ouro / diamante / roxo
          const r = DROP_RADIUS + 3;
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, r + 3, 0, Math.PI * 2);
          ctx.fillStyle = "#facc15";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, r + 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "#7dd3fc";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, r - 0.5, 0, Math.PI * 2);
          ctx.fillStyle = "#c084fc";
          ctx.fill();
          ctx.strokeStyle = "#fafafa";
          ctx.lineWidth = 1.25;
          ctx.stroke();
          continue;
        }

        ctx.beginPath();
        ctx.arc(drop.x, drop.y, DROP_RADIUS, 0, Math.PI * 2);
        if (drop.type === "gold") {
          ctx.fillStyle = "#facc15";
          ctx.strokeStyle = "#ca8a04";
        } else if (drop.type === "purple_diamond") {
          ctx.fillStyle = "#c084fc";
          ctx.strokeStyle = "#a855f7";
        } else {
          ctx.fillStyle = "#7dd3fc";
          ctx.strokeStyle = "#38bdf8";
        }
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Linha de alcance de ataque (por cima da horda)
      const attackRangePx = Math.max(
        8,
        useGameStore.getState().getEffectiveStats().attackRange *
          (useArenaStore.getState().matchBuffs.attackRange ?? 1),
      );
      ctx.save();
      ctx.beginPath();
      ctx.arc(playerX, playerY, attackRangePx, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(251, 146, 60, 0.55)";
      ctx.lineWidth = 1.75;
      ctx.setLineDash([7, 6]);
      ctx.stroke();
      ctx.restore();

      drawBoxer(playerX, playerY, playerRotation, arms, activeAttacks, now);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const ft of floatingTexts) {
        const alpha = 1 - ft.age / FLOATING_TEXT_MAX_AGE;
        const scale = ft.scale ?? 1;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${Math.round(16 * scale)}px system-ui, sans-serif`;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      const { shakeFrames } = useArenaStore.getState();
      const dpr = window.devicePixelRatio || 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (shakeFrames > 0) {
        ctx.save();
        const ox = (Math.random() * 2 - 1) * 5;
        const oy = (Math.random() * 2 - 1) * 5;
        ctx.translate(ox, oy);
        drawScene();
        ctx.restore();
      } else {
        drawScene();
      }
    };

    let last = performance.now();
    let wasPlaying = false;
    let backgroundIntervalId = 0;

    /**
     * Substeps de física com base em tempo real (performance.now).
     * Em abas ocultas o rAF é throttled/pausado — o setInterval cobre o gap
     * e deltas grandes são fatiados para não explodir colisões/spawn.
     */
    const MAX_SUBSTEP_SEC = 1 / 20;
    const MAX_CATCHUP_SEC = 1;
    /** Intervalo de fallback quando a aba está em segundo plano. */
    const BACKGROUND_TICK_MS = 100;

    const processElapsed = (elapsedSec: number) => {
      let remaining = Math.min(Math.max(0, elapsedSec), MAX_CATCHUP_SEC);
      while (remaining > 0) {
        const step = Math.min(remaining, MAX_SUBSTEP_SEC);
        update(step);
        remaining -= step;
      }
    };

    const runFrame = (now: number) => {
      const arenaState = useArenaStore.getState();
      const state = arenaState.gameState;
      const playing = state === "playing";

      if (playing && !wasPlaying && arenaState.timeAlive === 0) {
        gameClockMs = 0;
        spawnAccumulator = 0;
      }
      wasPlaying = playing;

      if (!playing || arenaState.isPausedForLevelUp) {
        if (state === "level_up" || arenaState.isPausedForLevelUp) {
          useArenaStore.getState().tickLevelUpCountdown();
        }
        last = now;
        useArenaStore
          .getState()
          .centerPlayer(canvas.clientWidth, canvas.clientHeight);
        if (!document.hidden) draw();
        return;
      }

      // Pause manual (ESC): não avança física, tempo, spawn nem colisões
      if (arenaState.isPaused) {
        last = now;
        return;
      }

      const realDt = (now - last) / 1000;
      last = now;
      processElapsed(realDt);
      if (!document.hidden) draw();
    };

    const stopBackgroundTicker = () => {
      if (backgroundIntervalId !== 0) {
        window.clearInterval(backgroundIntervalId);
        backgroundIntervalId = 0;
      }
    };

    const startBackgroundTicker = () => {
      if (backgroundIntervalId !== 0) return;
      last = performance.now();
      backgroundIntervalId = window.setInterval(() => {
        runFrame(performance.now());
      }, BACKGROUND_TICK_MS);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        // rAF para em abas ocultas — mantém simulação via tempo real
        startBackgroundTicker();
      } else {
        stopBackgroundTicker();
        last = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.hidden) {
      startBackgroundTicker();
    }

    const loop = (now: number) => {
      rafId.current = window.requestAnimationFrame(loop);
      // Em background o interval é a fonte de verdade do tick
      if (document.hidden) return;
      runFrame(now);
    };

    rafId.current = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId.current);
      stopBackgroundTicker();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [canvasRef]);
}
