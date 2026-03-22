"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { DebateArenaLogo } from "./debate-arena-logo";

export function JoinRoomScreen() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedRoomId = roomId.trim();

    if (!normalizedRoomId) return;

    router.push(`/salas/${normalizedRoomId}`);
  };

  return (
    <main className="min-h-screen px-6 py-8 text-[#0d1b5e]">
      <section className="arena-panel mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-5">
            <DebateArenaLogo compact />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.34em] text-[#5d19d8]">
                Join room
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                Entra a una sala existente por ID.
              </h1>
            </div>
          </div>

          <Link
            href="/"
            className="rounded-full border border-[#5870ff]/24 bg-white/80 px-4 py-2 text-sm font-semibold text-[#30408a] transition hover:border-[#2d4bdb]"
          >
            Volver
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.8rem] bg-[linear-gradient(135deg,rgba(25,84,255,0.08),rgba(127,45,255,0.09))] p-6"
        >
          <label className="block space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1848b7]">
              ID de la sala
            </span>
            <input
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              inputMode="numeric"
              required
              className="w-full rounded-2xl border border-[#5870ff]/18 bg-white px-4 py-4 text-lg outline-none transition focus:border-[#7f2dff]"
              placeholder="Ej. 1"
            />
          </label>

          <button
            type="submit"
            className="mt-5 rounded-full bg-[linear-gradient(135deg,#1ab3ff,#6f25ff)] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:brightness-105"
          >
            Entrar a la sala
          </button>
        </form>
      </section>
    </main>
  );
}
