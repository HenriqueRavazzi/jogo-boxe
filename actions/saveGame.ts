"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  DEFAULT_SKILLS_DATA,
  gameSaves,
  type SaveData,
} from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/savePassword";
import {
  clearSaveSessionCookie,
  getSaveSession,
  requireSaveSession,
  setSaveSessionCookie,
} from "@/lib/saveSession";
import {
  createDefaultSaveData,
  isSaveId,
  mergeSaveRow,
  normalizeSaveData,
  type SaveListItem,
} from "@/lib/saveSlots";

function columnsFromSave(saveData: SaveData) {
  const normalized = normalizeSaveData(saveData);
  return {
    saveData: normalized,
    purpleDiamonds: normalized.purpleDiamonds,
    prestigeLevel: normalized.prestigeLevel ?? 0,
    ascensionShards: normalized.ascensionShards ?? 0,
    skillsData: normalized.skills ?? DEFAULT_SKILLS_DATA,
  };
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 64);
}

function sanitizePassword(password: string): string {
  return password.trim().slice(0, 128);
}

async function upgradePasswordIfNeeded(
  saveId: string,
  plain: string,
  needsRehash: boolean,
): Promise<void> {
  if (!needsRehash) return;
  const next = await hashPassword(plain);
  await db
    .update(gameSaves)
    .set({ password: next })
    .where(eq(gameSaves.id, saveId));
}

/**
 * Lista saves (metadados públicos leves — sem senha).
 * Preferir unlock por nome na UI; esta lista é só utilitária/admin.
 */
export async function listSaves(): Promise<{
  ok: boolean;
  saves?: SaveListItem[];
  error?: string;
}> {
  try {
    const rows = await db
      .select({
        id: gameSaves.id,
        saveName: gameSaves.saveName,
        saveData: gameSaves.saveData,
        purpleDiamonds: gameSaves.purpleDiamonds,
        prestigeLevel: gameSaves.prestigeLevel,
        ascensionShards: gameSaves.ascensionShards,
        updatedAt: gameSaves.updatedAt,
      })
      .from(gameSaves)
      .orderBy(asc(gameSaves.saveName));

    const saves: SaveListItem[] = rows.map((row) => {
      const data = mergeSaveRow(row);
      return {
        id: row.id,
        saveName: row.saveName,
        gold: data.gold,
        gems: data.gems,
        purpleDiamonds: data.purpleDiamonds,
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    return { ok: true, saves };
  } catch (error) {
    console.error("[listSaves]", error);
    return { ok: false, error: "Falha ao listar saves" };
  }
}

/** Cria um save novo com nome + senha (senha hasheada) e abre sessão. */
export async function createSave(
  saveName: string,
  password: string,
): Promise<{
  ok: boolean;
  id?: string;
  saveName?: string;
  saveData?: SaveData;
  error?: string;
}> {
  const name = sanitizeName(saveName);
  const pass = sanitizePassword(password);

  if (name.length < 2) {
    return { ok: false, error: "Nome deve ter pelo menos 2 caracteres" };
  }
  if (pass.length < 1) {
    return { ok: false, error: "Informe uma senha" };
  }

  try {
    const existing = await db
      .select({ id: gameSaves.id })
      .from(gameSaves)
      .where(eq(gameSaves.saveName, name))
      .limit(1);

    if (existing[0]) {
      return { ok: false, error: "Já existe um save com este nome" };
    }

    const saveData = createDefaultSaveData();
    const passwordHash = await hashPassword(pass);
    const [inserted] = await db
      .insert(gameSaves)
      .values({
        saveName: name,
        password: passwordHash,
        ...columnsFromSave(saveData),
      })
      .returning({ id: gameSaves.id, saveName: gameSaves.saveName });

    if (!inserted) {
      return { ok: false, error: "Falha ao criar save" };
    }

    await setSaveSessionCookie(inserted.id);

    return {
      ok: true,
      id: inserted.id,
      saveName: inserted.saveName,
      saveData,
    };
  } catch (error) {
    console.error("[createSave]", error);
    return { ok: false, error: "Falha ao criar save" };
  }
}

/**
 * Autentica por nome + senha (sem listar saves).
 * Erro genérico se nome ou senha estiverem errados (não vaza existência).
 */
export async function unlockSaveByName(
  saveName: string,
  password: string,
): Promise<{
  ok: boolean;
  id?: string;
  saveName?: string;
  saveData?: SaveData;
  error?: string;
}> {
  const name = sanitizeName(saveName);
  const pass = sanitizePassword(password);

  if (name.length < 2) {
    return { ok: false, error: "Informe o nome do save" };
  }
  if (!pass) {
    return { ok: false, error: "Informe a senha" };
  }

  try {
    const rows = await db
      .select()
      .from(gameSaves)
      .where(eq(gameSaves.saveName, name))
      .limit(1);
    const row = rows[0];

    if (!row) {
      return { ok: false, error: "Nome ou senha incorretos" };
    }

    const check = await verifyPassword(row.password, pass);
    if (!check.ok) {
      return { ok: false, error: "Nome ou senha incorretos" };
    }

    await upgradePasswordIfNeeded(row.id, pass, check.needsRehash);
    await setSaveSessionCookie(row.id);

    return {
      ok: true,
      id: row.id,
      saveName: row.saveName,
      saveData: mergeSaveRow(row),
    };
  } catch (error) {
    console.error("[unlockSaveByName]", error);
    return { ok: false, error: "Falha ao autenticar save" };
  }
}

/**
 * Verifica a senha e retorna o progresso do save.
 * Senha incorreta → ok: false.
 */
export async function unlockSave(
  saveId: string,
  password: string,
): Promise<{
  ok: boolean;
  id?: string;
  saveName?: string;
  saveData?: SaveData;
  error?: string;
}> {
  if (!isSaveId(saveId)) {
    return { ok: false, error: "Save inválido" };
  }

  const pass = sanitizePassword(password);
  if (!pass) {
    return { ok: false, error: "Informe a senha" };
  }

  try {
    const rows = await db
      .select()
      .from(gameSaves)
      .where(eq(gameSaves.id, saveId))
      .limit(1);
    const row = rows[0];

    if (!row) {
      return { ok: false, error: "Save não encontrado" };
    }

    const check = await verifyPassword(row.password, pass);
    if (!check.ok) {
      return { ok: false, error: "Senha incorreta" };
    }

    await upgradePasswordIfNeeded(row.id, pass, check.needsRehash);
    await setSaveSessionCookie(row.id);

    return {
      ok: true,
      id: row.id,
      saveName: row.saveName,
      saveData: mergeSaveRow(row),
    };
  } catch (error) {
    console.error("[unlockSave]", error);
    return { ok: false, error: "Falha ao autenticar save" };
  }
}

/** Lê o progresso do save da sessão atual (UUID deve bater com o cookie). */
export async function loadSaveById(saveId: string): Promise<{
  ok: boolean;
  id?: string;
  saveName?: string;
  saveData?: SaveData;
  error?: string;
}> {
  const auth = await requireSaveSession(saveId);
  if (!auth.ok) return auth;

  try {
    const rows = await db
      .select()
      .from(gameSaves)
      .where(eq(gameSaves.id, saveId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { ok: false, error: "Save não encontrado" };
    }

    return {
      ok: true,
      id: row.id,
      saveName: row.saveName,
      saveData: mergeSaveRow(row),
    };
  } catch (error) {
    console.error("[loadSaveById]", error);
    return { ok: false, error: "Falha ao recarregar save" };
  }
}

/** Persiste o progresso — exige sessão do mesmo saveId. */
export async function saveGame(
  saveId: string,
  saveData: SaveData,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireSaveSession(saveId);
  if (!auth.ok) return auth;

  try {
    const payload = columnsFromSave(saveData);
    const updated = await db
      .update(gameSaves)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(gameSaves.id, saveId))
      .returning({ id: gameSaves.id });

    if (!updated[0]) {
      return { ok: false, error: "Save não encontrado" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[saveGame]", error);
    return { ok: false, error: "Falha ao salvar no banco" };
  }
}

/** Remove um save (exige senha) e encerra a sessão. */
export async function deleteSave(
  saveId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSaveId(saveId)) {
    return { ok: false, error: "Save inválido" };
  }

  const pass = sanitizePassword(password);
  try {
    const rows = await db
      .select({ id: gameSaves.id, password: gameSaves.password })
      .from(gameSaves)
      .where(eq(gameSaves.id, saveId))
      .limit(1);
    const row = rows[0];
    if (!row) return { ok: false, error: "Save não encontrado" };

    const check = await verifyPassword(row.password, pass);
    if (!check.ok) return { ok: false, error: "Senha incorreta" };

    await db.delete(gameSaves).where(eq(gameSaves.id, saveId));
    await clearSaveSessionCookie();
    return { ok: true };
  } catch (error) {
    console.error("[deleteSave]", error);
    return { ok: false, error: "Falha ao apagar save" };
  }
}

/** Encerra a sessão do save (cookie), sem apagar o progresso. */
export async function logoutSaveSession(): Promise<{ ok: boolean }> {
  await clearSaveSessionCookie();
  return { ok: true };
}

/**
 * Se o cookie de sessão ainda for válido, devolve o save sem pedir senha.
 * Útil após F5 / reabrir a aba.
 */
export async function restoreSaveFromSession(): Promise<{
  ok: boolean;
  id?: string;
  saveName?: string;
  saveData?: SaveData;
  error?: string;
}> {
  const session = await getSaveSession();
  if (!session) {
    return { ok: false, error: "Sem sessão" };
  }

  try {
    const rows = await db
      .select()
      .from(gameSaves)
      .where(eq(gameSaves.id, session.saveId))
      .limit(1);
    const row = rows[0];
    if (!row) {
      await clearSaveSessionCookie();
      return { ok: false, error: "Save não encontrado" };
    }

    // Renova o cookie (sliding expiration).
    await setSaveSessionCookie(row.id);

    return {
      ok: true,
      id: row.id,
      saveName: row.saveName,
      saveData: mergeSaveRow(row),
    };
  } catch (error) {
    console.error("[restoreSaveFromSession]", error);
    return { ok: false, error: "Falha ao restaurar sessão" };
  }
}
