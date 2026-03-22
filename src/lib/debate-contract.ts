import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_DEBATE_CONTRACT_ADDRESS as `0x${string}` | undefined) ??
  "0x6DB0Cd6A96724573AA0FF69068e5b47B4051b56F";

export type WalletAccount = `0x${string}`;

export type DebateRoom = {
  id: string;
  topic: string;
  person1: string;
  person1_name: string;
  person2: string;
  person2_name: string;
  current_turn: string;
  argument_count: string;
  arguments_log: string;
  debate_summary: string;
  final_report: string;
  is_active: boolean;
  is_finalized: boolean;
};

export type EIP1193Provider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

export function createDebateClient(account?: WalletAccount, provider?: EIP1193Provider) {
  return createClient({
    chain: studionet,
    account,
    provider,
  });
}

const ROOM_KEYS = [
  "id",
  "topic",
  "person1",
  "person1_name",
  "person2",
  "person2_name",
  "current_turn",
  "argument_count",
  "arguments_log",
  "debate_summary",
  "final_report",
  "is_active",
  "is_finalized",
] as const;

function normalizeMultilineValue(value: string) {
  return value.replaceAll("\\n", "\n").trim();
}

export function parseRoom(raw: string): DebateRoom {
  const room: Partial<Record<(typeof ROOM_KEYS)[number], string>> = {};
  const lines = raw.split("\n");
  let currentKey: (typeof ROOM_KEYS)[number] | null = null;

  for (const line of lines) {
    const matchedKey = ROOM_KEYS.find((key) => line.startsWith(`${key}=`));

    if (matchedKey) {
      room[matchedKey] = line.slice(matchedKey.length + 1);
      currentKey = matchedKey;
      continue;
    }

    if (currentKey) {
      room[currentKey] = `${room[currentKey] ?? ""}\n${line}`;
    }
  }

  return {
    id: room.id ?? "",
    topic: normalizeMultilineValue(room.topic ?? ""),
    person1: room.person1 ?? "",
    person1_name: normalizeMultilineValue(room.person1_name ?? ""),
    person2: room.person2 ?? "",
    person2_name: normalizeMultilineValue(room.person2_name ?? ""),
    current_turn: room.current_turn ?? "1",
    argument_count: room.argument_count ?? "0",
    arguments_log: normalizeMultilineValue(room.arguments_log ?? ""),
    debate_summary: normalizeMultilineValue(room.debate_summary ?? ""),
    final_report: normalizeMultilineValue(room.final_report ?? ""),
    is_active: room.is_active === "True" || room.is_active === "true",
    is_finalized: room.is_finalized === "True" || room.is_finalized === "true",
  };
}

export function isWalletAccount(value: string | undefined): value is WalletAccount {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}
