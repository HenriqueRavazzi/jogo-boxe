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
  RICOCHET_PATH_DURATION_MS,
  runCombatSystem,
} from "@/src/game/systems/CombatSystem";
import {
  createDropsFromKills,
  runLootSystem,
} from "@/src/game/systems/LootSystem";
import {
  pulseVisualProgress,
  isRicochetActive,
  RICOCHET_ACTIVE_MS,
} from "@/src/game/systems/ActiveSkillsSystem";
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
        activeSkillPulse: arena.activeSkillPulse,
        lightningProjectiles: arena.lightningProjectiles ?? [],
      });

      const livingEnemies = combat.enemies
        .filter((e) => !e.isDead)
        .map((e) => e.toData());

      const activeAttacks = tickActiveAttacks(
        [...arena.activeAttacks, ...combat.newAttacks],
        gameNow,
      );

      const floatingTexts = [
        ...arena.floatingTexts.map((t) => ({
          ...t,
          age: t.age + gameSpeed,
          y: t.y - 0.8 * gameSpeed,
        })),
        ...combat.hitSplats,
      ].filter((t) => t.age < FLOATING_TEXT_MAX_AGE);

      const ricochetPathEffects = [
        ...arena.ricochetPathEffects.filter((e) => e.expiresAt > gameNow),
        ...combat.ricochetPaths,
      ];

      const skillVfxEffects = [
        ...(arena.skillVfxEffects ?? []).filter((e) => e.expiresAt > gameNow),
        ...combat.skillVfx,
      ];

      let shakeFrames = arena.shakeFrames;
      if (combat.contactHits > 0) {
        shakeFrames = 10;
      } else if (shakeFrames > 0) {
        shakeFrames = Math.max(0, shakeFrames - gameSpeed);
      }

      // Drops: ouro + diamantes conforme rewards do enemy_types
      const difficulty = game.getDifficultyMultipliers();
      const dropResult = createDropsFromKills(combat.killSites, gameNow, {
        incomeMultiplier:
          game.incomeMultiplier *
          getSkillGoldIncomeMultiplier(game.skillTree) *
          game.getEquippedTeamBuffs().goldIncomeMultiplier,
        goldDropMultiplier: difficulty.goldDropMultiplier,
        bossesKilled: arena.bossesKilled,
        diamondLuckBonus: game.getDiamondLuckBonus(),
      });
      const newDrops = dropResult.drops;
      const dropsWithNew = [...arena.drops, ...newDrops];

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
        for (const site of combat.killSites) {
          if (site.enemyType === "boss") bosses += 1;
          else mobs += 1;
        }
        game.recordLifetimeKills(mobs, bosses);
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
      const stageCampaign =
        arena.runMode === "stage" && arena.runStage
          ? {
              enemyTierCap: arena.runStage.enemyTierCap,
              bossSpawnTime: arena.runStage.bossSpawnTime,
              difficultyMul: arena.runStage.difficultyMul,
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
      const teamRegen = game.getEquippedTeamBuffs().hpRegenPerSecond;
      if (
        teamRegen > 0 &&
        nextHp > 0 &&
        nextHp < stats.maxHp &&
        !combat.player.isDead
      ) {
        nextHp = Math.min(stats.maxHp, nextHp + teamRegen * dt);
      }

      const stageBossDefeated =
        arena.stageBossDefeated ||
        (arena.runMode === "stage" &&
          dropResult.bossesKilledThisBatch > 0);

      useArenaStore.setState({
        playerX: cx,
        playerY: cy,
        playerRotation: combat.playerRotation,
        enemies:
          spawn.spawned.length > 0
            ? [...livingEnemies, ...spawn.spawned]
            : livingEnemies,
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
        stageBossDefeated,
        activeSkillPulse: combat.activeSkillPulse,
        lightningProjectiles: combat.lightningProjectiles,
        skillVfxEffects,
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
        const survived = nextTimeAlive >= stage.durationSeconds;
        const bossOk =
          stage.bossSpawnTime == null || stageBossDefeated;
        if (survived && bossOk) {
          useArenaStore.getState().setVictory();
        }
      }

      if (dropResult.totalXp > 0) {
        useArenaStore.getState().addXp(dropResult.totalXp);
      }
    };

    const drawGlove = (x: number, y: number, ricochet = false) => {
      ctx.beginPath();
      ctx.arc(x, y, GLOVE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ricochet ? "#fbbf24" : "#dc2626";
      ctx.fill();
      ctx.strokeStyle = ricochet ? "#fef3c7" : "#7f1d1d";
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

        const outer = isRicochet ? "#94a3b8" : "#1e3a5f";
        const inner = isRicochet ? "#fbbf24" : "#f0c4a0";

        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = outer;
        ctx.lineWidth = isRicochet ? 5 : 6;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = inner;
        ctx.lineWidth = isRicochet ? 2.5 : 3;
        ctx.stroke();

        // Rastro prateado extra no ricochete
        if (isRicochet) {
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.strokeStyle = "rgba(248, 250, 252, 0.55)";
          ctx.lineWidth = 1.25;
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
      const now = gameClockMs;

      ctx.fillStyle = "#0f1419";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      const grid = 48;
      for (let x = 0; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // VFX de skills (gelo / raio) com fade-out
      for (const effect of skillVfxEffects ?? []) {
        if (effect.expiresAt <= now) continue;
        const life = effect.expiresAt - effect.startedAt;
        const alpha = Math.max(
          0,
          Math.min(1, (effect.expiresAt - now) / Math.max(1, life)),
        );

        if (effect.kind === "ice") {
          const progress = 1 - alpha;
          const radius = Math.max(8, effect.maxRadius * Math.min(1, progress * 1.35));
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(125, 211, 252, 0.9)";
          ctx.lineWidth = 5;
          ctx.shadowColor = "#7dd3fc";
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, radius * 0.78, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(186, 230, 253, 0.55)";
          ctx.lineWidth = 2;
          ctx.stroke();
          // Cristais no anel
          const crystals = 10;
          for (let i = 0; i < crystals; i++) {
            const ang = (i / crystals) * Math.PI * 2 + progress * 0.6;
            const cx = effect.x + Math.cos(ang) * radius;
            const cy = effect.y + Math.sin(ang) * radius;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 5);
            ctx.lineTo(cx + 3, cy);
            ctx.lineTo(cx, cy + 5);
            ctx.lineTo(cx - 3, cy);
            ctx.closePath();
            ctx.fillStyle = "rgba(224, 242, 254, 0.85)";
            ctx.fill();
          }
          ctx.restore();
        } else if (effect.kind === "lightning" && effect.points.length > 1) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = "#e0f2fe";
          ctx.lineWidth = 3.5;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.moveTo(effect.points[0]!.x, effect.points[0]!.y);
          for (let i = 1; i < effect.points.length; i++) {
            ctx.lineTo(effect.points[i]!.x, effect.points[i]!.y);
          }
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.restore();
        } else if (effect.kind === "parry") {
          const progress = 1 - alpha;
          const radius = Math.max(
            18,
            effect.maxRadius * Math.min(1, 0.35 + progress * 1.1),
          );
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(254, 240, 138, 0.95)";
          ctx.lineWidth = 6;
          ctx.shadowColor = "#fef08a";
          ctx.shadowBlur = 28;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, radius * 0.62, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.22 * alpha})`;
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
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
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.7 * (1 - t * 0.5)})`;
        ctx.lineWidth = 3;
        ctx.stroke();
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

        // Brasas de burn (stacks) — densidade e brilho sobem com as pilhas
        const burnEffect = enemy.statusEffects?.find(
          (s) => s.type === "burn" && s.expiresAt > now,
        );
        const burnStacks =
          burnEffect?.burnStackExpires?.filter((t) => t > now).length ??
          burnEffect?.burnStacks ??
          0;
        if (burnStacks > 0) {
          const sparks = Math.min(28, 4 + burnStacks * 3);
          const glow = Math.min(1, 0.4 + burnStacks * 0.1);
          for (let i = 0; i < sparks; i++) {
            const ang = (i / sparks) * Math.PI * 2 + now * 0.004;
            const dist =
              (enemy.radius ?? 12) + 3 + (i % 3) * (2 + burnStacks * 0.4);
            const sx = enemy.x + Math.cos(ang) * dist;
            const sy =
              enemy.y +
              Math.sin(ang) * dist -
              ((now * 0.04 + i * 7) % (12 + burnStacks));
            ctx.beginPath();
            ctx.arc(sx, sy, 1.4 + (i % 2) * (0.6 + burnStacks * 0.08), 0, Math.PI * 2);
            ctx.fillStyle =
              i % 3 === 0
                ? `rgba(253, 224, 71, ${0.55 + glow * 0.4})`
                : i % 2 === 0
                  ? `rgba(251, 146, 60, ${0.6 + glow * 0.35})`
                  : `rgba(239, 68, 68, ${0.55 + glow * 0.35})`;
            ctx.fill();
          }
        }
      }

      // Projéteis elétricos
      for (const bolt of lightningProjectiles ?? []) {
        ctx.save();
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#e0f2fe";
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
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

      // Linhas de ricochete (player → cadeia de alvos)
      for (const effect of ricochetPathEffects ?? []) {
        if (effect.expiresAt <= now || effect.points.length === 0) continue;
        const remaining = effect.expiresAt - now;
        const alpha = Math.max(
          0,
          Math.min(1, remaining / RICOCHET_PATH_DURATION_MS),
        );

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        for (const point of effect.points) {
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      for (const drop of drops) {
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

    /** Evita spike de física/spawn ao voltar de aba pausada (tab-out). */
    const safeDeltaSeconds = (now: number, previous: number): number => {
      let deltaMs = now - previous;
      if (deltaMs > 100 || deltaMs < 0) {
        deltaMs = 16; // ~1 frame a 60fps
      }
      return deltaMs / 1000;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        last = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const loop = (now: number) => {
      rafId.current = window.requestAnimationFrame(loop);

      const arenaState = useArenaStore.getState();
      const state = arenaState.gameState;
      const playing = state === "playing";

      if (playing && !wasPlaying && arenaState.timeAlive === 0) {
        gameClockMs = 0;
        spawnAccumulator = 0;
      }
      wasPlaying = playing;

      if (!playing) {
        last = now;
        useArenaStore
          .getState()
          .centerPlayer(canvas.clientWidth, canvas.clientHeight);
        draw();
        return;
      }

      // Pause seguro: não avança física, tempo, spawn nem colisões
      if (arenaState.isPaused) {
        last = now;
        return;
      }

      const realDt = safeDeltaSeconds(now, last);
      last = now;
      update(realDt);
      draw();
    };

    rafId.current = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [canvasRef]);
}
