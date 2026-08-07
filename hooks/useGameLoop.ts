"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { Enemy } from "@/src/game/entities/Enemy";
import {
  Player,
  getArmDistribution,
  getArmPunchOrder,
  getArmRestPosition,
} from "@/src/game/entities/Player";
import {
  runCombatSystem,
} from "@/src/game/systems/CombatSystem";
import {
  createDropsFromKills,
  runLootSystem,
} from "@/src/game/systems/LootSystem";
import { runSpawner } from "@/src/game/systems/Spawner";
import { useArenaStore, type ActiveAttack } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

const PLAYER_RADIUS = 18;
const BODY_RADIUS = 16;
const HEAD_RADIUS = 11;
const ENEMY_RADIUS = 12;
const DROP_RADIUS = 6;
const GLOVE_RADIUS = 8;
const CONTACT_DAMAGE = 20;
const XP_PER_KILL = 25;
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
): { x: number; y: number } {
  return {
    x: side === "left" ? playerX - BODY_RADIUS * 0.7 : playerX + BODY_RADIUS * 0.7,
    y: playerY - 2,
  };
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
      const gameSpeed = arena.gameSpeed === 2 ? 2 : 1;
      // Física, spawn, timeAlive e timers usam dt escalado
      const dt = realDt * gameSpeed;
      gameClockMs += realDt * 1000 * gameSpeed;
      const gameNow = gameClockMs;

      // Centro estrito a cada frame (clientWidth/Height = CSS px do canvas)
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      useArenaStore.getState().centerPlayer(canvas.clientWidth, canvas.clientHeight);

      const player = new Player(
        cx,
        cy,
        arena.currentHp,
        game.getMaxHp(),
        PLAYER_RADIUS,
      );

      const enemies = arena.enemies.map((e) =>
        Enemy.fromData(
          {
            ...e,
            vx: e.vx ?? 0,
            vy: e.vy ?? 0,
            contactDamage: e.contactDamage ?? CONTACT_DAMAGE,
          },
          ENEMY_RADIUS,
        ),
      );
      for (const enemy of enemies) {
        enemy.moveToward(player.x, player.y, dt);
      }

      const combat = runCombatSystem({
        player,
        enemies,
        arms: game.arms,
        armTier: game.armTier,
        baseDamage: game.getBaseDamage(),
        baseRange: game.getAttackRange(),
        baseAttackSpeed: game.getAttackCooldown(),
        matchBuffs: arena.matchBuffs,
        lastAttackTime: arena.lastAttackTime,
        now: gameNow,
        contactDamage: CONTACT_DAMAGE,
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

      let shakeFrames = arena.shakeFrames;
      if (combat.contactHits > 0) {
        shakeFrames = 10;
      } else if (shakeFrames > 0) {
        shakeFrames = Math.max(0, shakeFrames - gameSpeed);
      }

      // Drops nas coordenadas exatas da morte (sem ouro instantâneo)
      const newDrops = createDropsFromKills(combat.killSites, gameNow);
      const dropsWithNew = [...arena.drops, ...newDrops];

      const loot = runLootSystem({
        drops: dropsWithNew,
        playerX: cx,
        playerY: cy,
        playerRadius: PLAYER_RADIUS,
        dt,
        now: gameNow,
      });

      if (loot.collectedGold > 0) {
        game.addGold(loot.collectedGold);
      }
      if (loot.collectedDiamonds > 0) {
        game.addGems(loot.collectedDiamonds);
      }

      useArenaStore.setState({
        playerX: cx,
        playerY: cy,
        enemies: livingEnemies,
        drops: loot.drops,
        currentHp: combat.player.hp,
        lastAttackTime: combat.lastAttackTime,
        activeAttacks,
        floatingTexts,
        shakeFrames,
        timeAlive: arena.timeAlive + dt,
      });

      if (combat.player.hp <= 0) {
        useArenaStore.getState().setGameOver();
      }

      if (combat.kills > 0) {
        useArenaStore.getState().addXp(XP_PER_KILL * combat.kills);
      }

      const spawn = runSpawner({
        timeAlive: arena.timeAlive + dt,
        matchLevel: arena.matchLevel,
        canvasWidth: canvas.clientWidth,
        canvasHeight: canvas.clientHeight,
        currentEnemyCount: livingEnemies.length,
        spawnAccumulatorMs: spawnAccumulator,
        dt,
      });
      spawnAccumulator = spawn.spawnAccumulatorMs;

      if (spawn.spawned.length > 0) {
        useArenaStore.setState((s) => ({
          enemies: [...s.enemies, ...spawn.spawned],
        }));
      }
    };

    const drawGlove = (x: number, y: number) => {
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
      arms: number,
      punching: ActiveAttack[],
      now: number,
    ) => {
      // —— Corpo: círculo azul escuro ——
      ctx.beginPath();
      ctx.arc(x, y, BODY_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#1e3a5f";
      ctx.fill();

      // —— Cabeça: círculo azul claro sobreposto ——
      const headY = y - BODY_RADIUS * 0.85;
      ctx.beginPath();
      ctx.arc(x, headY, HEAD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#7dd3fc";
      ctx.fill();

      // —— Faixa branca na cabeça (headband) ——
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(x - HEAD_RADIUS + 1, headY - 4, HEAD_RADIUS * 2 - 2, 5);
      ctx.beginPath();
      ctx.arc(x, headY - 1.5, HEAD_RADIUS - 1, Math.PI, 0);
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 3;
      ctx.stroke();

      const { leftArms, rightArms } = getArmDistribution(arms);
      const busy = new Set(punching.map((a) => `${a.side}:${a.armIndex}`));

      // —— Luvas em repouso (bolinhas vermelhas empilhadas L/R) ——
      for (const arm of getArmPunchOrder(arms)) {
        if (busy.has(`${arm.side}:${arm.armIndex}`)) continue;
        const armsOnSide = arm.side === "left" ? leftArms : rightArms;
        const rest = getArmRestPosition(
          x,
          y,
          arm.side,
          arm.armIndex,
          armsOnSide,
        );
        const shoulder = shoulderOf(x, y, arm.side);

        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(rest.x, rest.y);
        ctx.strokeStyle = "#1e3a5f";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();

        // Camada de “pele” por cima da manga
        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(rest.x, rest.y);
        ctx.strokeStyle = "#f0c4a0";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        drawGlove(rest.x, rest.y);
      }

      // —— Socos ativos: braço esticando + luva com lerp/easing ——
      for (const attack of punching) {
        const pos = glovePosition(attack, now);
        const shoulder = shoulderOf(x, y, attack.side);

        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = "#1e3a5f";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = "#f0c4a0";
        ctx.lineWidth = 3;
        ctx.stroke();

        drawGlove(pos.x, pos.y);
      }
    };

    const drawScene = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const { playerX, playerY, enemies, drops, activeAttacks, floatingTexts } =
        useArenaStore.getState();
      const arms = useGameStore.getState().arms;
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

      for (const enemy of enemies) {
        const hpPercent = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
        const red = Math.floor(255 * hpPercent);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${red}, 0, 0)`;
        ctx.fill();
      }

      for (const drop of drops) {
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, DROP_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = drop.type === "gold" ? "#facc15" : "#7dd3fc";
        ctx.fill();
        ctx.strokeStyle = drop.type === "gold" ? "#ca8a04" : "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      drawBoxer(playerX, playerY, arms, activeAttacks, now);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 16px system-ui, sans-serif";
      for (const ft of floatingTexts) {
        const alpha = 1 - ft.age / FLOATING_TEXT_MAX_AGE;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = ft.color;
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

    const loop = (now: number) => {
      rafId.current = window.requestAnimationFrame(loop);

      const state = useArenaStore.getState().gameState;
      const playing = state === "playing";

      if (playing && !wasPlaying && useArenaStore.getState().timeAlive === 0) {
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

      const realDt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(realDt);
      draw();
    };

    rafId.current = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef]);
}
