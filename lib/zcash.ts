/**
 * lib/zcash.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement for all viem / ethers EVM helpers.
 * Import from "@/lib/zcash" anywhere in the app.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://zclash-backend.onrender.com";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EscrowInfo {
  escrowAddress:   string;
  balanceZEC:      number;
  stakePerPlayer:  number;
  totalExpected:   number;
}

export interface SyncResult {
  verified:        boolean;
  alreadyVerified?: boolean;
  escrowBalance?:  number;
  escrowAddress?:  string;
  expectedAmount?: number;
  message?:        string;
}

/** Optional injected Zcash wallet (e.g. Zingo, YWallet browser extension) */
export interface ZcashWalletProvider {
  getAddress:      () => Promise<string>;
  sendTransaction: (params: {
    to:     string;
    amount: string;   // human-readable ZEC, e.g. "0.5"
    memo?:  string;
  }) => Promise<{ txid: string }>;
}

declare global {
  interface Window { zcash?: ZcashWalletProvider }
}

// ─── Address helpers ──────────────────────────────────────────────────────────

/**
 * Lightweight Zcash transparent address format check.
 * Mainnet: t1… (P2PKH) or t3… (P2SH)
 * Testnet: tm… or t2…
 */
export function isValidTAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  return (
    address.length === 35 &&
    (address.startsWith("t1") ||
      address.startsWith("t3") ||
      address.startsWith("tm") ||
      address.startsWith("t2"))
  );
}

/** Pretty-print ZEC: 8dp when <1, 4dp otherwise, trailing zeros stripped. */
export function formatZEC(amount: number): string {
  if (amount === 0) return "0";
  if (amount < 1) return amount.toFixed(8).replace(/\.?0+$/, "");
  return amount.toFixed(4).replace(/\.?0+$/, "");
}

/** Build a zcash: URI for QR codes / wallet deep-links. */
export function buildZcashURI(address: string, amount: number, memo?: string): string {
  const params = new URLSearchParams();
  params.set("amount", formatZEC(amount));
  if (memo) params.set("memo", memo);
  return `zcash:${address}?${params.toString()}`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

/** Fetch the current escrow address + ZEC balance for a challenge. */
export async function getEscrowInfo(code: string): Promise<EscrowInfo> {
  const res = await fetch(`${API_BASE_URL}/api/challenge/${code}/escrow`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.detail ?? "Failed to fetch escrow info");
  return {
    escrowAddress:  data.escrowAddress,
    balanceZEC:     data.balanceZEC,
    stakePerPlayer: data.stakePerPlayer,
    totalExpected:  data.totalExpected,
  };
}

/**
 * Ask the backend to verify whether ZEC has arrived at the escrow address.
 * On success the backend broadcasts "stake_verified" over the game WebSocket.
 */
export async function syncStake(
  code: string,
  walletAddress: string
): Promise<SyncResult> {
  const res = await fetch(`${API_BASE_URL}/api/challenge/${code}/sync-stake`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ walletAddress }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return {
    verified:        data.verified ?? data.success,
    alreadyVerified: data.alreadyVerified,
    escrowBalance:   data.escrowBalance,
    escrowAddress:   data.escrowAddress,
    expectedAmount:  data.expectedAmount,
    message:         data.message,
  };
}

/** Record a Zcash txid after the user has sent funds (fire-and-forget). */
export async function notifyStakeSent(
  code: string,
  playerWallet: string,
  txid: string
): Promise<void> {
  await fetch(`${API_BASE_URL}/api/challenge/${code}/on-chain-confirmed`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ playerWallet, txid }),
  }).catch(() => {});
}

// ─── Injected wallet helpers ──────────────────────────────────────────────────

/** Returns true when a Zcash browser wallet is injected. */
export function hasInjectedZcashWallet(): boolean {
  return typeof window !== "undefined" && Boolean(window.zcash);
}

/**
 * If window.zcash is available, send the stake directly and return the txid.
 * Returns null if no injected provider is found (fall back to manual QR flow).
 */
export async function sendStakeViaInjectedWallet(
  escrowAddress: string,
  amount: number,
  challengeCode: string
): Promise<string | null> {
  if (typeof window === "undefined" || !window.zcash) return null;
  const { txid } = await window.zcash.sendTransaction({
    to:     escrowAddress,
    amount: formatZEC(amount),
    memo:   `QuizHub:${challengeCode}`,
  });
  return txid;
}

/**
 * If window.zcash is available, fetch the connected address.
 * Returns null otherwise.
 */
export async function getInjectedAddress(): Promise<string | null> {
  if (typeof window === "undefined" || !window.zcash) return null;
  try {
    return await window.zcash.getAddress();
  } catch {
    return null;
  }
}