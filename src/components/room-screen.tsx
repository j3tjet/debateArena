"use client";

import { TransactionStatus } from "genlayer-js/types";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { DebateArenaLogo } from "./debate-arena-logo";
import {
  CONTRACT_ADDRESS,
  createDebateClient,
  isWalletAccount,
  parseRoom,
  type DebateRoom,
  type WalletAccount,
} from "../lib/debate-contract";

type StatusState = {
  type: "idle" | "error" | "success";
  message: string;
};

type RoomScreenProps = {
  roomId: string;
};

async function fetchRoom(roomId: string) {
  const client = createDebateClient();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_room",
    args: [BigInt(roomId)],
  });

  return parseRoom(String(result));
}

function RoomCard({
  title,
  value,
  extra,
}: {
  title: string;
  value: string;
  extra: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8fdfff]">{title}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
      <p className="mt-2 break-all font-mono text-xs text-[#b8c9ff]">{extra}</p>
    </article>
  );
}

export function RoomScreen({ roomId }: RoomScreenProps) {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [room, setRoom] = useState<DebateRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [isSubmittingArgument, setIsSubmittingArgument] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [argumentText, setArgumentText] = useState("");
  const [status, setStatus] = useState<StatusState>({ type: "idle", message: "" });

  const refreshRoom = async () => {
    setIsRefreshing(true);

    try {
      setRoom(await fetchRoom(roomId));
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo cargar la sala.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadRoom = async () => {
      setLoading(true);

      try {
        setRoom(await fetchRoom(roomId));
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "No se pudo cargar la sala.",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadRoom();
  }, [roomId]);

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
    };

    void syncAccounts();
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus({ type: "error", message: "MetaMask no esta disponible." });
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
        throw new Error("No se pudo leer la cuenta conectada.");
      }

      setAccount(nextAccount);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo conectar la wallet.",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const submitJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!account || !window.ethereum) {
      setStatus({ type: "error", message: "Conecta MetaMask para unirte a la sala." });
      return;
    }

    setIsSubmittingJoin(true);
    setStatus({ type: "idle", message: "" });

    try {
      const client = createDebateClient(account, window.ethereum);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "register_person2",
        args: [BigInt(roomId), joinName.trim()],
        value: 0n,
      });

      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
      });

      setJoinName("");
      setStatus({ type: "success", message: "Te uniste a la sala correctamente." });
      await refreshRoom();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo unir a la sala.",
      });
    } finally {
      setIsSubmittingJoin(false);
    }
  };

  const submitArgument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!account || !window.ethereum) {
      setStatus({ type: "error", message: "Conecta MetaMask para enviar un argumento." });
      return;
    }

    setIsSubmittingArgument(true);
    setStatus({ type: "idle", message: "" });

    try {
      const client = createDebateClient(account, window.ethereum);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "submit_argument",
        args: [BigInt(roomId), argumentText.trim()],
        value: 0n,
      });

      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
      });

      setArgumentText("");
      setStatus({ type: "success", message: "Argumento enviado." });
      await refreshRoom();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo enviar el argumento.",
      });
    } finally {
      setIsSubmittingArgument(false);
    }
  };

  const finalizeRoom = async () => {
    if (!account || !window.ethereum) {
      setStatus({ type: "error", message: "Conecta MetaMask para finalizar la sala." });
      return;
    }

    setIsFinalizing(true);
    setStatus({ type: "idle", message: "" });

    try {
      const client = createDebateClient(account, window.ethereum);
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "finalize_room",
        args: [BigInt(roomId)],
        value: 0n,
      });

      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
      });

      setStatus({ type: "success", message: "Sala finalizada." });
      await refreshRoom();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo finalizar la sala.",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-8 text-[#0d1b5e]">
        <section className="arena-panel mx-auto max-w-5xl rounded-[2rem] p-8">
          Cargando sala...
        </section>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen px-6 py-8 text-[#0d1b5e]">
        <section className="arena-panel mx-auto max-w-5xl rounded-[2rem] p-8">
          No se encontro la sala.
        </section>
      </main>
    );
  }

  const isPerson1 = account?.toLowerCase() === room.person1.toLowerCase();
  const isPerson2 = room.person2 ? account?.toLowerCase() === room.person2.toLowerCase() : false;
  const isMyTurn =
    (room.current_turn === "1" && isPerson1) || (room.current_turn === "2" && isPerson2);
  const canJoin = Boolean(account && room.person2 === "" && !isPerson1 && !room.is_finalized);
  const canDebate =
    Boolean(account) &&
    room.is_active &&
    !room.is_finalized &&
    (isPerson1 || isPerson2) &&
    isMyTurn;
  const canFinalize =
    Boolean(account) &&
    room.is_active &&
    !room.is_finalized &&
    Number(room.argument_count) >= 2 &&
    (isPerson1 || isPerson2);

  return (
    <main className="min-h-screen px-6 py-8 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-[2rem] bg-[linear-gradient(145deg,#08134f,#1738b4_45%,#6f24ff)] p-6 shadow-[0_30px_120px_rgba(42,57,182,0.32)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <DebateArenaLogo compact />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.36em] text-[#8fdfff]">
                Sala #{room.id}
              </p>
              <h1 className="mt-2 max-w-3xl text-4xl font-black tracking-tight text-balance">
                {room.topic}
              </h1>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14"
            >
              Inicio
            </Link>
            <button
              type="button"
              onClick={() => void refreshRoom()}
              disabled={isRefreshing}
              className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? "Refrescando..." : "Actualizar"}
            </button>
            <button
              type="button"
              onClick={connectWallet}
              disabled={isConnecting}
              className="rounded-full bg-[linear-gradient(135deg,#66ddff,#2f8fff)] px-5 py-2 text-sm font-black uppercase tracking-[0.1em] text-[#0b1d68] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {account
                ? `Wallet ${account.slice(0, 6)}...${account.slice(-4)}`
                : isConnecting
                  ? "Conectando..."
                  : "Conectar MetaMask"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <RoomCard title="Debatiente A" value={room.person1_name} extra={room.person1} />
          <RoomCard
            title="Debatiente B"
            value={room.person2_name || "Pendiente"}
            extra={room.person2 || "Sin registrar"}
          />
          <article className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8fdfff]">Estado</p>
            <p className="mt-2 text-xl font-bold text-white">
              {room.is_finalized ? "Finalizada" : room.is_active ? "Activa" : "Esperando rival"}
            </p>
            <p className="mt-2 text-sm text-[#d6e0ff]">
              Turno actual: {room.current_turn === "1" ? room.person1_name : room.person2_name || "B"}
            </p>
            <p className="mt-1 text-sm text-[#d6e0ff]">Argumentos: {room.argument_count} / 6</p>
          </article>
        </div>

        {status.message ? (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm ${
              status.type === "error"
                ? "border-red-300/30 bg-red-400/12 text-red-100"
                : "border-emerald-300/30 bg-emerald-400/12 text-emerald-100"
            }`}
          >
            {status.message}
          </p>
        ) : null}

        {canJoin ? (
          <form
            onSubmit={submitJoin}
            className="rounded-[1.8rem] border border-white/10 bg-white/8 p-6"
          >
            <h2 className="text-2xl font-black">Unirte como debatiente B</h2>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-semibold uppercase tracking-[0.15em] text-[#bfeeff]">
                Tu nombre
              </span>
              <input
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                required
                className="w-full rounded-2xl border border-white/14 bg-[#09113a]/42 px-4 py-3 text-white outline-none transition focus:border-[#8f4cff]"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmittingJoin}
              className="mt-4 rounded-full bg-[linear-gradient(135deg,#66ddff,#2f8fff)] px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#0b1d68] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingJoin ? "Uniendote..." : "Unirme a la sala"}
            </button>
          </form>
        ) : null}

        {canDebate ? (
          <form
            onSubmit={submitArgument}
            className="rounded-[1.8rem] border border-white/10 bg-white/8 p-6"
          >
            <h2 className="text-2xl font-black">Enviar argumento</h2>
            <p className="mt-2 text-sm text-[#d6e0ff]">
              Es tu turno. El contrato alterna entre A y B en cada envio.
            </p>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-semibold uppercase tracking-[0.15em] text-[#bfeeff]">
                Argumento
              </span>
              <textarea
                value={argumentText}
                onChange={(event) => setArgumentText(event.target.value)}
                required
                rows={6}
                className="w-full rounded-2xl border border-white/14 bg-[#09113a]/42 px-4 py-3 text-white outline-none transition focus:border-[#8f4cff]"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmittingArgument}
              className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#0d1b5e] transition hover:bg-[#ecf5ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingArgument ? "Enviando..." : "Enviar argumento"}
            </button>
          </form>
        ) : null}

        {canFinalize ? (
          <div className="rounded-[1.8rem] border border-white/10 bg-white/8 p-6">
            <h2 className="text-2xl font-black">Cerrar debate</h2>
            <p className="mt-2 text-sm text-[#d6e0ff]">
              Con al menos dos argumentos, cualquier participante puede lanzar la
              evaluacion final del contrato.
            </p>
            <button
              type="button"
              onClick={finalizeRoom}
              disabled={isFinalizing}
              className="mt-4 rounded-full border border-[#ff95d9]/30 bg-[linear-gradient(135deg,rgba(159,71,255,0.26),rgba(255,86,197,0.18))] px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFinalizing ? "Finalizando..." : "Finalizar sala"}
            </button>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[1.8rem] border border-white/10 bg-white/8 p-6">
            <h2 className="text-2xl font-black">Historia de argumentos</h2>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-[#d6e0ff]">
              {room.arguments_log || room.debate_summary || "Aun no hay argumentos enviados."}
            </pre>
          </article>

          <article className="rounded-[1.8rem] border border-white/10 bg-white/8 p-6">
            <h2 className="text-2xl font-black">Resumen del debate</h2>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-[#d6e0ff]">
              {room.debate_summary || "Aun no hay argumentos enviados."}
            </pre>
          </article>
        </div>

        <article className="rounded-[1.8rem] border border-white/10 bg-white/8 p-6">
          <h2 className="text-2xl font-black">Reporte final</h2>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-[#d6e0ff]">
            {room.final_report || "La sala todavia no ha sido finalizada."}
          </pre>
        </article>
      </section>
    </main>
  );
}
