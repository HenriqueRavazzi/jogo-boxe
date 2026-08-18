"use client";

import { useState, type FormEvent } from "react";
import { RefreshCw } from "lucide-react";
import {
  createSave,
  deleteSave,
  loadSaveById,
  unlockSaveByName,
} from "@/actions/saveGame";
import { useGameStore } from "@/store/useGameStore";

type SaveMenuProps = {
  onSaveReady: () => void;
};

type Mode = "login" | "create";

/** Entrada no save por nome + senha (sem listar saves públicos). */
export function SaveMenu({ onSaveReady }: SaveMenuProps) {
  const hydrateFromSave = useGameStore((s) => s.hydrateFromSave);
  const clearActiveSave = useGameStore((s) => s.clearActiveSlot);
  const activeSaveId = useGameStore((s) => s.activeSaveId);
  const activeSaveName = useGameStore((s) => s.activeSaveName);

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const resetForm = () => {
    setPassword("");
    setError(null);
    setStatus(null);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await unlockSaveByName(name, password);
      if (!result.ok || !result.id || !result.saveData) {
        setError(result.error ?? "Nome ou senha incorretos");
        return;
      }
      hydrateFromSave(result.id, result.saveData, result.saveName);
      setPassword("");
      onSaveReady();
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createSave(name, password);
      if (!result.ok || !result.id || !result.saveData) {
        setError(result.error ?? "Não foi possível criar o save");
        return;
      }
      hydrateFromSave(result.id, result.saveData, result.saveName);
      setPassword("");
      setMode("login");
      onSaveReady();
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    clearActiveSave();
    resetForm();
  };

  const handleReload = async () => {
    if (!activeSaveId || busy) return;
    setBusy(true);
    setReloading(true);
    setError(null);
    setStatus(null);
    try {
      const result = await loadSaveById(activeSaveId);
      if (!result.ok || !result.id || !result.saveData) {
        setError(result.error ?? "Falha ao recarregar o save");
        return;
      }
      hydrateFromSave(result.id, result.saveData, result.saveName);
      setStatus("Save atualizado");
    } finally {
      setReloading(false);
      setBusy(false);
    }
  };

  const handleDeleteActive = async () => {
    if (!activeSaveId || !activeSaveName) return;
    const pass = window.prompt(
      `Apagar "${activeSaveName}"? Digite a senha para confirmar:`,
    );
    if (pass == null) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await deleteSave(activeSaveId, pass);
      if (!result.ok) {
        setError(result.error ?? "Falha ao apagar");
        return;
      }
      clearActiveSave();
      resetForm();
    } finally {
      setBusy(false);
    }
  };

  if (activeSaveId && activeSaveName) {
    return (
      <div className="flex w-full flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Save
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-sky-200/70">
              Conectado
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-sky-100">
              {activeSaveName}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleReload()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/40 bg-sky-500/10 text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-50"
            aria-label="Recarregar save"
            title="Puxar o progresso mais recente"
          >
            <RefreshCw
              className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`}
              aria-hidden
            />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleLogout}
            className="flex-1 rounded-lg border border-white/15 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            Sair do save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDeleteActive()}
            className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
          >
            Apagar
          </button>
        </div>
        {status && (
          <p className="text-center text-xs text-sky-300" role="status">
            {status}
          </p>
        )}
        {error && (
          <p className="text-center text-xs text-rose-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          {mode === "login" ? "Entrar no save" : "Novo save"}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode((m) => (m === "login" ? "create" : "login"));
            resetForm();
          }}
          className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
        >
          {mode === "login" ? "Criar save" : "Já tenho save"}
        </button>
      </div>

      <form
        onSubmit={(e) =>
          void (mode === "login" ? handleLogin(e) : handleCreate(e))
        }
        className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-900/80 p-3"
      >
        <p className="text-[11px] leading-snug text-zinc-400">
          {mode === "login"
            ? "Digite o nome e a senha do seu save para continuar."
            : "Escolha um nome e uma senha para criar um save novo."}
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do save"
          maxLength={64}
          required
          autoComplete="username"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-sky-400/50"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          maxLength={128}
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-sky-400/50"
        />
        <button
          type="submit"
          disabled={busy}
          className={`rounded-lg px-3 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 ${
            mode === "login"
              ? "bg-sky-600 hover:bg-sky-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {busy
            ? mode === "login"
              ? "Entrando..."
              : "Criando..."
            : mode === "login"
              ? "Entrar"
              : "Criar e entrar"}
        </button>
      </form>

      {error && (
        <p className="text-center text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
