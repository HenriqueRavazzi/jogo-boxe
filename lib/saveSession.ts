/** Sessão HttpOnly do save autenticado (cookie assinado com HMAC). */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isSaveId } from "@/lib/saveSlots";

export const SAVE_SESSION_COOKIE = "jb_save_session";
/** 30 dias. */
export const SAVE_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

type SessionPayload = {
  saveId: string;
  exp: number;
};

function getSessionSecret(): string {
  const fromEnv = process.env.SAVE_SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  // Fallback local: deriva de DATABASE_URL (não ideal em prod — configure SAVE_SESSION_SECRET).
  const db = process.env.DATABASE_URL?.trim();
  if (db && db.length >= 16) return `jb-save:${db.slice(0, 48)}`;
  return "jb-dev-insecure-save-session";
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Token opaco: base64(json).hmac */
export function createSaveSessionToken(
  saveId: string,
  maxAgeSec = SAVE_SESSION_MAX_AGE_SEC,
): string {
  const payload: SessionPayload = {
    saveId,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function parseSaveSessionToken(
  token: string | undefined | null,
): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig || !safeEqual(sign(body), sig)) return null;

  try {
    const json = Buffer.from(body, "base64url").toString("utf8");
    const data = JSON.parse(json) as SessionPayload;
    if (!isSaveId(data.saveId)) return null;
    if (typeof data.exp !== "number" || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Grava cookie de sessão após login/criação. */
export async function setSaveSessionCookie(saveId: string): Promise<void> {
  const token = createSaveSessionToken(saveId);
  const jar = await cookies();
  jar.set(SAVE_SESSION_COOKIE, token, cookieOptions(SAVE_SESSION_MAX_AGE_SEC));
}

/** Remove cookie de sessão (logout / delete). */
export async function clearSaveSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SAVE_SESSION_COOKIE, "", cookieOptions(0));
}

/** Lê a sessão atual do cookie (server). */
export async function getSaveSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return parseSaveSessionToken(jar.get(SAVE_SESSION_COOKIE)?.value);
}

/**
 * Garante que o cookie aponta para este saveId.
 * Usado em load / save / delete.
 */
export async function requireSaveSession(
  saveId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSaveId(saveId)) {
    return { ok: false, error: "Save inválido" };
  }
  const session = await getSaveSession();
  if (!session || session.saveId !== saveId) {
    return { ok: false, error: "Sessão expirada — entre no save novamente" };
  }
  return { ok: true };
}

/** Extrai sessão de um header Cookie (Route Handlers). */
export function getSaveSessionFromCookieHeader(
  cookieHeader: string | null,
): SessionPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SAVE_SESSION_COOKIE}=([^;]*)`),
  );
  if (!match?.[1]) return null;
  try {
    return parseSaveSessionToken(decodeURIComponent(match[1]));
  } catch {
    return parseSaveSessionToken(match[1]);
  }
}
