"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

const PLAYER_RADIUS = 18;
const ENEMY_RADIUS = 12;
const SPAWN_INTERVAL_MS = 2000;
/** Flash visual dos socos (braços esticados). */
const ATTACK_FLASH_MS = 150;

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
      const {
        playerX,
        playerY,
        updateEnemies,
        spawnEnemy,
        processCombat,
        pruneActiveAttacks,
      } = useArenaStore.getState();
      const { getBaseDamage, getAttackRange, getAttackCooldown } =
        useGameStore.getState();

      updateEnemies(playerX, playerY, dt, PLAYER_RADIUS, ENEMY_RADIUS);

      processCombat(getBaseDamage(), getAttackRange(), getAttackCooldown());
      pruneActiveAttacks(ATTACK_FLASH_MS);

      spawnAccumulator += dt * 1000;
      if (spawnAccumulator >= SPAWN_INTERVAL_MS) {
        spawnAccumulator -= SPAWN_INTERVAL_MS;
        spawnEnemy(canvas.clientWidth, canvas.clientHeight);
      }
    };

    /** Boxeador estilizado (cabeça + torso + luvas). */
    const drawBoxer = (x: number, y: number) => {
      // Torso
      ctx.fillStyle = "#1e3a5f";
      ctx.beginPath();
      ctx.roundRect(x - 12, y - 4, 24, 28, 6);
      ctx.fill();

      // Cabeça
      ctx.beginPath();
      ctx.arc(x, y - 14, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#f0c4a0";
      ctx.fill();

      // Cabelo / bandana
      ctx.beginPath();
      ctx.arc(x, y - 18, 10, Math.PI, 0);
      ctx.fillStyle = "#0ea5e9";
      ctx.fill();

      // Luvas de boxe (repouso)
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(x - 16, y + 6, 7, 0, Math.PI * 2);
      ctx.arc(x + 16, y + 6, 7, 0, Math.PI * 2);
      ctx.fill();

      // Contorno leve
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y - 14, 11, 0, Math.PI * 2);
      ctx.stroke();
    };

    /** Limpa o canvas e desenha o frame atual. */
    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const { playerX, playerY, enemies, activeAttacks } =
        useArenaStore.getState();
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

      // Socos: braços esticados até cada alvo recente
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

        // Luva no impacto
        ctx.beginPath();
        ctx.arc(attack.targetX, attack.targetY, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(225, 29, 72, ${0.5 + fade * 0.5})`;
        ctx.fill();
      }

      // Inimigos: cor pelo HP (vermelho vivo → quase preto)
      for (const enemy of enemies) {
        const hpPercent = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
        const red = Math.floor(255 * hpPercent);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, ENEMY_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${red}, 0, 0)`;
        ctx.fill();
      }

      drawBoxer(playerX, playerY);
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
