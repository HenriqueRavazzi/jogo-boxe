import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameSaves, type SaveData } from "@/db/schema";
import { createDefaultSaveData, isSaveSlotId } from "@/lib/saveSlots";

type Params = { params: Promise<{ slotId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slotId } = await params;
  if (!isSaveSlotId(slotId)) {
    return NextResponse.json({ error: "Slot inválido" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(gameSaves)
      .where(eq(gameSaves.userId, slotId))
      .limit(1);
    const existing = rows[0];

    if (existing) {
      return NextResponse.json({
        slotId,
        saveData: existing.saveData,
        created: false,
      });
    }

    const saveData = createDefaultSaveData();
    await db.insert(gameSaves).values({
      userId: slotId,
      saveData,
    });

    return NextResponse.json({ slotId, saveData, created: true });
  } catch (error) {
    console.error("[api/saves GET]", error);
    return NextResponse.json(
      { error: "Falha ao carregar save" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { slotId } = await params;
  if (!isSaveSlotId(slotId)) {
    return NextResponse.json({ error: "Slot inválido" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { saveData?: SaveData };
    if (!body.saveData) {
      return NextResponse.json({ error: "saveData ausente" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(gameSaves)
      .where(eq(gameSaves.userId, slotId))
      .limit(1);

    if (rows[0]) {
      await db
        .update(gameSaves)
        .set({ saveData: body.saveData, updatedAt: new Date() })
        .where(eq(gameSaves.userId, slotId));
    } else {
      await db.insert(gameSaves).values({
        userId: slotId,
        saveData: body.saveData,
      });
    }

    return NextResponse.json({ ok: true, slotId });
  } catch (error) {
    console.error("[api/saves PUT]", error);
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { slotId } = await params;
  if (!isSaveSlotId(slotId)) {
    return NextResponse.json({ error: "Slot inválido" }, { status: 400 });
  }

  try {
    await db.delete(gameSaves).where(eq(gameSaves.userId, slotId));
    const saveData = createDefaultSaveData();
    await db.insert(gameSaves).values({
      userId: slotId,
      saveData,
    });

    return NextResponse.json({ ok: true, slotId, saveData });
  } catch (error) {
    console.error("[api/saves DELETE]", error);
    return NextResponse.json(
      { error: "Falha ao resetar save" },
      { status: 500 },
    );
  }
}
