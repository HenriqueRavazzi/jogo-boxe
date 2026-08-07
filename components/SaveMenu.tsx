"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createSave,
  deleteSave,
  listSaves,
  unlockSave,
} from "@/actions/saveGame";
import type { SaveListItem } from "@/lib/saveSlots";
import { useGameStore } from "@/store/useGameStore";

type SaveMenuProps = {
  onSaveReady: () => void;
};

/** Lista dinâmica de saves + criar / desbloquear com senha. */
export function SaveMenu({ onSaveReady }: SaveMenuProps) {
  const hydrateFromSave = useGameStore((s) => s.hydrateFromSave);
  const clearActiveSave = useGameStore((s) => s.clearActiveSlot);
  const activeSaveId = useGameStore((s) => s.activeSaveId);
  const activeSaveName = useGameStore((s) => s.activeSaveName);

  const [saves, setSaves] = useState<SaveListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [unlockId, setUnlockId] = useState<string | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    const result = await listSaves();
    if (!result.ok || !result.saves) {
      setError(result.error ?? "Falha ao listar saves");
      setSaves([]);
    } else {
      setSaves(result.saves);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createSave(newName, newPassword);
      if (!result.ok || !result.id || !result.saveData) {
        setError(result.error ?? "Não foi possível criar o save");
        return;
      }
      hydrateFromSave(result.id, result.saveData, result.saveName);
      setNewName("");
      setNewPassword("");
      setShowCreate(false);
      setUnlockId(null);
      onSaveReady();
      await refreshList();
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!unlockId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await unlockSave(unlockId, unlockPassword);
      if (!result.ok || !result.id || !result.saveData) {
        setError(result.error ?? "Senha incorreta");
        return;
      }
      hydrateFromSave(result.id, result.saveData, result.saveName);
      setUnlockPassword("");
      setUnlockId(null);
      onSaveReady();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (save: SaveListItem) => {
    const pass = window.prompt(
      `Apagar "${save.saveName}"? Digite a senha para confirmar:`,
    );
    if (pass == null) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteSave(save.id, pass);
      if (!result.ok) {
        setError(result.error ?? "Falha ao apagar");
        return;
      }
      if (activeSaveId === save.id) {
        clearActiveSave();
      }
      if (unlockId === save.id) setUnlockId(null);
      await refreshList();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Saves
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setShowCreate((v) => !v);
            setUnlockId(null);
            setError(null);
          }}
          className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
        >
          {showCreate ? "Fechar" : "Novo Save"}
        </button>
      </div>

      {activeSaveName && (
        <p className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
          Ativo: <span className="font-bold">{activeSaveName}</span>
        </p>
      )}

      {showCreate && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-900/80 p-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Criar novo save
          </p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do save"
            maxLength={64}
            required
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-emerald-400/50"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Senha"
            maxLength={128}
            required
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-emerald-400/50"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Criando..." : "Criar e entrar"}
          </button>
        </form>
      )}

      {loadingList ? (
        <p className="text-center text-xs text-zinc-500">Carregando saves...</p>
      ) : saves.length === 0 ? (
        <p className="text-center text-xs text-zinc-500">
          Nenhum save ainda. Crie o primeiro.
        </p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
          {saves.map((save) => {
            const isActive = activeSaveId === save.id;
            const isUnlocking = unlockId === save.id;

            return (
              <li
                key={save.id}
                className={`rounded-xl border px-2 py-1.5 ${
                  isActive
                    ? "border-sky-400/60 bg-sky-500/10"
                    : "border-white/10 bg-black/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setUnlockId(save.id);
                      setUnlockPassword("");
                      setShowCreate(false);
                      setError(null);
                    }}
                    className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left transition hover:bg-white/5 disabled:opacity-50"
                  >
                    <span className="block truncate text-sm font-bold text-zinc-50">
                      {save.saveName}
                      {isActive && (
                        <span className="ml-2 text-[10px] font-medium text-sky-300">
                          ativo
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-zinc-500">
                      {save.gold.toLocaleString("pt-BR")} ouro ·{" "}
                      {save.gems.toLocaleString("pt-BR")} diamantes
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(save)}
                    className="shrink-0 rounded-lg border border-rose-500/40 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-50"
                  >
                    Apagar
                  </button>
                </div>

                {isUnlocking && (
                  <form
                    onSubmit={(e) => void handleUnlock(e)}
                    className="mt-2 flex flex-col gap-2 border-t border-white/5 px-1 pt-2"
                  >
                    <input
                      type="password"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      placeholder="Digite a senha"
                      autoFocus
                      required
                      className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-sky-400/50"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-500 disabled:opacity-50"
                      >
                        {busy ? "Entrando..." : "Desbloquear"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setUnlockId(null);
                          setUnlockPassword("");
                        }}
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-400 hover:bg-white/5"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="text-center text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
