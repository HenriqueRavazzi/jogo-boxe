"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { Enemy } from "@/src/game/entities/Enemy";
import { Player } from "@/src/game/entities/Player";
import { runCombatSystem } from "@/src/game/systems/CombatSystem";
import {
  createDropsFromKills,
  runLootSystem,
} from "@/src/game/systems/LootSystem";
import { runSpawner } from "@/src/game/systems/Spawner";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

const PLAYER_RADIUS = 18;
const ENEMY_RADIUS = 12;
const DROP_RADIUS = 6;
const ATTACK_FLASH_MS = 150;
const CONTACT_DAMAGE = 20;
const XP_PER_KILL = 25;
const FLOATING_TEXT_MAX_AGE = 60;

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

    const update = (dt: number) => {
      const arena = useArenaStore.getState();
      const game = useGameStore.getState();

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
        now: performance.now(),
        contactDamage: CONTACT_DAMAGE,
      });

      const now = performance.now();
      const livingEnemies = combat.enemies
        .filter((e) => !e.isDead)
        .map((e) => e.toData());

      const activeAttacks = [
        ...arena.activeAttacks,
        ...combat.newAttacks,
      ].filter((a) => now - a.timestamp < ATTACK_FLASH_MS);

      const floatingTexts = [
        ...arena.floatingTexts.map((t) => ({
          ...t,
          age: t.age + 1,
          y: t.y - 0.8,
        })),
        ...combat.hitSplats,
      ].filter((t) => t.age < FLOATING_TEXT_MAX_AGE);

      let shakeFrames = arena.shakeFrames;
      if (combat.contactHits > 0) {
        shakeFrames = 10;
      } else if (shakeFrames > 0) {
        shakeFrames -= 1;
      }

      // Drops nas coordenadas exatas da morte (sem ouro instantâneo)
      const newDrops = createDropsFromKills(combat.killSites);
      const dropsWithNew = [...arena.drops, ...newDrops];

      const loot = runLootSystem({
        drops: dropsWithNew,
        playerX: cx,
        playerY: cy,
        playerRadius: PLAYER_RADIUS,
        dt,
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

    const drawBoxer = (x: number, y: number) => {
      ctx.fillStyle = "#1e3a5f";
      ctx.beginPath();
      ctx.roundRect(x - 12, y - 4, 24, 28, 6);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y - 14, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#f0c4a0";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y - 18, 10, Math.PI, 0);
      ctx.fillStyle = "#0ea5e9";
      ctx.fill();

      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(x - 16, y + 6, 7, 0, Math.PI * 2);
      ctx.arc(x + 16, y + 6, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y - 14, 11, 0, Math.PI * 2);
      ctx.stroke();
    };

    const drawScene = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const { playerX, playerY, enemies, drops, activeAttacks, floatingTexts } =
        useArenaStore.getState();
      const now = performance.now();

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

      for (const attack of activeAttacks) {
        if (now - attack.timestamp >= ATTACK_FLASH_MS) continue;
        const fade = 1 - (now - attack.timestamp) / ATTACK_FLASH_MS;
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        ctx.lineTo(attack.targetX, attack.targetY);
        ctx.strokeStyle = `rgba(253, 224, 71, ${0.45 + fade * 0.55})`;
        ctx.lineWidth = 5 + fade * 3;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(attack.targetX, attack.targetY, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(225, 29, 72, ${0.5 + fade * 0.5})`;
        ctx.fill();
      }

      for (const enemy of enemies) {
        const hpPercent = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
        const red = Math.floor(255 * hpPercent);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${red}, 0, 0)`;
        ctx.fill();
      }

      // Drops: ouro amarelo / diamante azul claro
      for (const drop of drops) {
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, DROP_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = drop.type === "gold" ? "#facc15" : "#7dd3fc";
        ctx.fill();
        ctx.strokeStyle =
          drop.type === "gold" ? "#ca8a04" : "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      drawBoxer(playerX, playerY);

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

    const loop = (now: number) => {
      rafId.current = window.requestAnimationFrame(loop);

      if (useArenaStore.getState().gameState !== "playing") {
        last = now;
        // Mantém player centralizado mesmo no menu/pause visual
        useArenaStore
          .getState()
          .centerPlayer(canvas.clientWidth, canvas.clientHeight);
        draw();
        return;
      }

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw();
    };

    rafId.current = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef]);
}
