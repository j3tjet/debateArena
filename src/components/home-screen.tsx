"use client";

import { TransactionStatus } from "genlayer-js/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { DebateArenaLogo } from "./debate-arena-logo";
import {
  CONTRACT_ADDRESS,
  createDebateClient,
  isWalletAccount,
  type WalletAccount,
} from "../lib/debate-contract";

type StatusState = {
  type: "idle" | "error" | "success";
  message: string;
};

export function HomeScreen() {
  const router = useRouter();
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<StatusState>({ type: "idle", message: "" });

  useEffect(() => {
    if (!window.ethereum) return;

    const syncAccounts = async () => {
      const response = await window.ethereum?.request({ method: "eth_accounts" });
      const nextAccount = Array.isArray(response) ? response[0] : undefined;
      setAccount(isWalletAccount(nextAccount) ? nextAccount : null);
    };

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccount = Array.isArray(accounts) ? accounts[0] : undefined;
      setAccount(isWalletAccount(nextAccount) ? nextAccount : null);
      if (!nextAccount) setIsModalOpen(false);
    };

    void syncAccounts();
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus({
        type: "error",
        message: "MetaMask no esta disponible en este navegador.",
      });
      return;
    }

    setIsConnecting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const client = createDebateClient(undefined, window.ethereum);
      await client.connect("studionet");

      const response = await window.ethereum.request({ method: "eth_requestAccounts" });
      const nextAccount = Array.isArray(response) ? response[0] : undefined;

      if (!isWalletAccount(nextAccount)) {
        throw new Error("No se pudo leer una cuenta valida desde MetaMask.");
      }

      setAccount(nextAccount);
      setStatus({
        type: "success",
        message: `Wallet conectada: ${nextAccount.slice(0, 6)}...${nextAccount.slice(-4)}`,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo conectar MetaMask.",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const openCreateModal = () => {
    if (!account) {
      setStatus({
        type: "error",
        message: "Conecta MetaMask antes de crear una sala.",
      });
      return;
    }

    setStatus({ type: "idle", message: "" });
    setIsModalOpen(true);
  };

  const handleCreateRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!account || !window.ethereum) {
      setStatus({
        type: "error",
        message: "Necesitas una wallet conectada para crear una sala.",
      });
      return;
    }

    setIsCreating(true);
    setStatus({ type: "idle", message: "" });

    try {
      const client = createDebateClient(account, window.ethereum);
      const nextRoomId = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_next_room_id",
        args: [],
      });

      const roomId = String(nextRoomId);

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "create_room",
        args: [topic.trim(), name.trim()],
        value: 0n,
      });

      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
      });

      setIsModalOpen(false);
      setName("");
      setTopic("");
      router.push(`/salas/${roomId}`);
      router.refresh();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo crear la sala.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-8 text-[#0d1b5e] md:px-8">
      <section className="arena-panel mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-between gap-10 overflow-hidden rounded-[2rem] p-6 md:p-10">
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(85,211,255,0.22),transparent_70%)]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-6">
            <DebateArenaLogo />
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.45em] text-[#5d19d8]">
                Onchain debate rooms
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-none tracking-tight text-balance md:text-6xl">
                Crea, entra y resuelve debates con identidad wallet y turnos validados.
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={connectWallet}
            disabled={isConnecting}
            className="rounded-full border border-[#4463ff]/30 bg-[linear-gradient(135deg,#123fc8,#731cf5)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(88,67,226,0.28)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {account
              ? `Wallet ${account.slice(0, 6)}...${account.slice(-4)}`
              : isConnecting
                ? "Conectando..."
                : "Conectar MetaMask"}
          </button>
        </div>

        <div className="relative grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-[1.9rem] bg-[linear-gradient(135deg,#081a6c,#1d4fe0_48%,#812ef7)] p-[1px] shadow-[0_24px_80px_rgba(67,74,226,0.22)]">
            <div className="h-full rounded-[1.85rem] bg-[linear-gradient(180deg,rgba(8,20,90,0.94),rgba(25,20,92,0.92))] p-7 text-white md:p-8">
              <p className="text-sm uppercase tracking-[0.35em] text-[#77e6ff]">Contrato activo</p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#dbe4ff]">
                Este frontend trabaja contra la direccion publicada en Studio.
              </p>
              <p className="mt-4 break-all rounded-2xl border border-white/10 bg-white/8 px-4 py-3 font-mono text-sm text-[#bcd0ff]">
                {CONTRACT_ADDRESS}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-full bg-[linear-gradient(135deg,#66ddff,#2f8fff)] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#0b1d68] transition hover:brightness-105"
                >
                  Crear sala
                </button>
                <Link
                  href="/unirse"
                  className="rounded-full border border-white/20 bg-white/8 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/14"
                >
                  Unirse a sala
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[1.75rem] border border-[#5b74ff]/16 bg-white/72 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#5d19d8]">
                Flujo
              </p>
              <div className="mt-4 space-y-4 text-sm leading-6 text-[#30408a]">
                <p>1. Conecta MetaMask para habilitar acciones de escritura.</p>
                <p>2. Crear sala abre popup con nombre y tema.</p>
                <p>3. La segunda persona entra por ruta y toma el turno B.</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[#5b74ff]/16 bg-[linear-gradient(180deg,rgba(85,211,255,0.16),rgba(127,45,255,0.12))] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#1848b7]">
                Identidad visual
              </p>
              <p className="mt-4 text-sm leading-6 text-[#30408a]">
                Tome la paleta del logo: cyan electrico, azul profundo y violeta para
                los gradientes principales y estados destacados.
              </p>
            </div>
          </div>
        </div>

        {status.message ? (
          <p
            className={`relative rounded-2xl border px-4 py-3 text-sm ${
              status.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {status.message}
          </p>
        ) : null}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09113a]/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.9rem] border border-[#5870ff]/15 bg-[linear-gradient(180deg,#ffffff,#eef3ff)] p-6 shadow-[0_35px_120px_rgba(37,54,155,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5d19d8]">
                  Crear sala
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#0d1b5e]">
                  Abre una nueva arena.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-[#5870ff]/20 px-3 py-1 text-sm text-[#30408a]"
              >
                Cerrar
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateRoom}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[#30408a]">Tu nombre</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  className="w-full rounded-2xl border border-[#5870ff]/18 bg-white px-4 py-3 outline-none transition focus:border-[#7f2dff]"
                  placeholder="Ej. Sofia"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[#30408a]">Tema del debate</span>
                <textarea
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  required
                  minLength={5}
                  rows={4}
                  className="w-full rounded-2xl border border-[#5870ff]/18 bg-white px-4 py-3 outline-none transition focus:border-[#7f2dff]"
                  placeholder="Ej. La IA debe arbitrar debates publicos?"
                />
              </label>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-full bg-[linear-gradient(135deg,#1ab3ff,#6f25ff)] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creando sala..." : "Crear sala onchain"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
