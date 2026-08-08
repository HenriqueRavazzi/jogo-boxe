import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  DEFAULT_SKILLS_DATA,
  gameSaves,
  type SaveData,
} from "@/db/schema";
import { isSaveId, normalizeSaveData } from "@/lib/saveSlots";

type Params = { params: Promise<{ saveId: string }> };

function columnsFromSave(saveData: SaveData) {
  const normalized = normalizeSaveData(saveData);
  return {
    saveData: normalized,
    purpleDiamonds: normalized.purpleDiamonds,
    skillsData: normalized.skills ?? DEFAULT_SKILLS_DATA,
  };
}

/** Atualiza o progresso do save autenticado (por UUID). */
export async function PUT(request: Request, { params }: Params) {
  const { saveId } = await params;
  if (!isSaveId(saveId)) {
    return NextResponse.json({ error: "Save inválido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { saveData?: SaveData };
    if (!body.saveData) {
      return NextResponse.json({ error: "saveData ausente" }, { status: 400 });
    }

    const payload = columnsFromSave(body.saveData);
    const updated = await db
      .update(gameSaves)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(gameSaves.id, saveId))
      .returning({ id: gameSaves.id });

    if (!updated[0]) {
      return NextResponse.json({ error: "Save não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, saveId });
  } catch (error) {
    console.error("[api/saves PUT]", error);
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  }
}
