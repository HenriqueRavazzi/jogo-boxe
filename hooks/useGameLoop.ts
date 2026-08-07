"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

const PLAYER_RADIUS = 18;
const ENEMY_RADIUS = 12;
const SPAWN_INTERVAL_MS = 2000;
/** Quanto tempo a linha do golpe permanece visível. */
const ATTACK_FLASH_MS = 120;

/**
 * Loop principal do jogo via requestAnimationFrame.
 * update() → lógica; draw() → render no canvas.
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
      // Ajusta buffer interno ao tamanho CSS (evita blur em telas retina)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Centraliza o jogador na arena ao redimensionar
      const { playerX, playerY, setPlayerPosition } = useArenaStore.getState();
      if (playerX === 0 && playerY === 0) {
        setPlayerPosition(w / 2, h / 2);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    let spawnAccumulator = 0;

    /** Atualiza entidades: movimento, spawn e auto-ataque. */
    const update = (dt: number) => {
      const { playerX, playerY, updateEnemies, spawnEnemy, processCombat } =
        useArenaStore.getState();
      const { getBaseDamage, getAttackRange, getAttackCooldown } =
        useGameStore.getState();

      updateEnemies(playerX, playerY, dt, PLAYER_RADIUS, ENEMY_RADIUS);

      processCombat(getBaseDamage(), getAttackRange(), getAttackCooldown());

      spawnAccumulator += dt * 1000;
      if (spawnAccumulator >= SPAWN_INTERVAL_MS) {
        spawnAccumulator -= SPAWN_INTERVAL_MS;
        spawnEnemy(canvas.clientWidth, canvas.clientHeight);
      }
    };

    /** Limpa o canvas e desenha o frame atual. */
    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const {
        playerX,
        playerY,
        enemies,
        lastAttackTime,
        lastAttackTargetX,
        lastAttackTargetY,
      } = useArenaStore.getState();
      const now = performance.now();

      // Fundo da arena
      ctx.fillStyle = "#0f1419";
      ctx.fillRect(0, 0, w, h);

      // Grade sutil para dar noção de espaço
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

      // Feedback do golpe: linha do jogador até o alvo recente
      if (
        lastAttackTargetX != null &&
        lastAttackTargetY != null &&
        now - lastAttackTime < ATTACK_FLASH_MS
      ) {
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        ctx.lineTo(lastAttackTargetX, lastAttackTargetY);
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // Inimigos (círculos vermelhos, menores que o jogador)
      for (const enemy of enemies) {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#e11d48";
        ctx.fill();
      }

      // Jogador (círculo no centro / posição do store)
      ctx.beginPath();
      ctx.arc(playerX, playerY, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    let last = performance.now();

    const loop = (now: number) => {
      rafId.current = window.requestAnimationFrame(loop);

      // Pausa física/combate quando não está em partida
      if (useArenaStore.getState().gameState !== "playing") {
        last = now;
        draw();
        return;
      }

      const dt = Math.min((now - last) / 1000, 0.05); // evita saltos após tab inactive
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
