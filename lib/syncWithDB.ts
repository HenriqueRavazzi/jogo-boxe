"use client";

import { useGameStore } from "@/store/useGameStore";

const DEBOUNCE_MS = 450;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 400;

type SyncOptions = {
  /**
   * true = grava já (ignora debounce).
   * Use antes de sair da run / trocar de fase / ações críticas.
   */
  flush?: boolean;
};

type Waiter = (ok: boolean) => void;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let waiters: Waiter[] = [];
let running = false;
let lastError: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pushOnce(): Promise<boolean> {
  const { activeSaveId, getSaveSnapshot } = useGameStore.getState();
  if (!activeSaveId) return false;

  // Snapshot no momento do push (não no momento do clique).
  const saveData = getSaveSnapshot();

  try {
    const res = await fetch(`/api/saves/${activeSaveId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saveData }),
      credentials: "same-origin",
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      lastError = body?.error ?? res.statusText;
      console.error("[syncWithDB]", lastError);
      return false;
    }

    lastError = null;
    return true;
  } catch (error) {
    lastError = error instanceof Error ? error.message : "network";
    console.error("[syncWithDB]", error);
    return false;
  }
}

async function pushWithRetry(): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const ok = await pushOnce();
    if (ok) return true;
    // 401: sessão morta — não adianta retentar.
    if (lastError?.toLowerCase().includes("sessão")) return false;
    await sleep(RETRY_BASE_MS * (attempt + 1));
  }
  return false;
}

async function pump(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (waiters.length > 0) {
      const batch = waiters;
      waiters = [];
      const ok = await pushWithRetry();
      for (const resolve of batch) resolve(ok);
      // Se chegaram novos waiters durante o push, o loop pega o snapshot mais novo.
    }
  } finally {
    running = false;
  }
}

function schedulePump(immediate: boolean): void {
  if (immediate) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    void pump();
    return;
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void pump();
  }, DEBOUNCE_MS);
}

/**
 * Empurra o snapshot atual do Zustand para o Neon (PUT).
 * Vinculado ao save autenticado (`activeSaveId` + cookie de sessão).
 *
 * - Debounce 450ms: cliques rápidos viram 1 write com o estado final.
 * - Fila: se um PUT está em voo, o próximo espera e re-snapshota.
 * - Retry com backoff em falha de rede (exceto sessão expirada).
 */
export function syncWithDB(options?: SyncOptions): Promise<boolean> {
  return new Promise((resolve) => {
    waiters.push(resolve);
    schedulePump(Boolean(options?.flush));
  });
}

/** Último erro de sync (debug / UI). */
export function getLastSyncError(): string | null {
  return lastError;
}
