import type { EIP1193Provider } from "../lib/debate-contract";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export {};
