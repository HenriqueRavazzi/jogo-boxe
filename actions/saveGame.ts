"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  DEFAULT_SKILLS_DATA,
  gameSaves,
  type SaveData,
} from "@/db/schema";
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
    skillsData: normalized.skillLevels ?? DEFAULT_SKILLS_DATA,
  };
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 64);
}

function sanitizePassword(password: string): string {
  return password.trim().slice(0, 128);
}

/** Lista todos os saves (sem senha). */
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

/** Cria um save novo com nome + senha. */
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
    const [inserted] = await db
      .insert(gameSaves)
      .values({
        saveName: name,
        password: pass,
        ...columnsFromSave(saveData),
      })
      .returning({ id: gameSaves.id, saveName: gameSaves.saveName });

    if (!inserted) {
      return { ok: false, error: "Falha ao criar save" };
    }

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
 * Verifica a senha e retorna o progresso do save.
 * Senha incorreta → ok: false sem vazar se o save existe além da mensagem genérica.
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

    if (row.password !== pass) {
      return { ok: false, error: "Senha incorreta" };
    }

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

/** Persiste o progresso no save autenticado (por UUID). */
export async function saveGame(
  saveId: string,
  saveData: SaveData,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSaveId(saveId)) {
    return { ok: false, error: "Save inválido" };
  }

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

/** Remove um save (exige senha). */
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
    if (row.password !== pass) return { ok: false, error: "Senha incorreta" };

    await db.delete(gameSaves).where(eq(gameSaves.id, saveId));
    return { ok: true };
  } catch (error) {
    console.error("[deleteSave]", error);
    return { ok: false, error: "Falha ao apagar save" };
  }
}
