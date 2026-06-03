/**
 * lib/zcash.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zcash helpers: address utils, wallet detection, escrow API, injected wallet.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ─── Global window augmentation (single declaration) ─────────────────────────

declare global {
  interface Window {
    zcash?: {
      getAddress?:      () => Promise<string>;
      request?:         (a: { method: string; params?: unknown }) => Promise<string>;
      sendTransaction?: (params: {
        to: string; amount: string; memo?: string;
      }) => Promise<{ txid: string }>;
    };
    zashi?:   { getAddress?: () => Promise<string> };
    ywallet?: { getAddress?: () => Promise<string> };
    ethereum?: {
      request:        (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?:    boolean;
      isBraveWallet?: boolean;
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EscrowInfo {
  escrowAddress:  string;
  balanceZEC:     number;
  stakePerPlayer: number;
  totalExpected:  number;
}

export interface SyncResult {
  verified:        boolean;
  alreadyVerified?: boolean;
  escrowBalance?:  number;
  escrowAddress?:  string;
  expectedAmount?: number;
  message?:        string;
}

export type DetectedWallet =
  | { type: "zcash_extension"; name: string }
  | { type: "brave";           name: "Brave Wallet" }
  | { type: "metamask_snap";   name: "MetaMask" }
  | { type: "none" };

// ─── Address helpers ──────────────────────────────────────────────────────────

/**
 * Validate a Zcash transparent address.
 * Accepts t1 (mainnet P2PKH), t3 (mainnet P2SH), t2/tm (testnet).
 */
export function isValidTAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  // Base58 charset: excludes 0, O, I, l
  return /^t[13][a-km-zA-HJ-NP-Z1-9]{33}$/.test(address.trim())
    || (address.length === 35 && (address.startsWith("tm") || address.startsWith("t2")));
}

/** Pretty-print ZEC: 8dp when <1, 4dp otherwise, trailing zeros stripped. */
export function formatZEC(amount: number): string {
  if (!amount && amount !== 0) return "0";
  if (amount % 1 === 0) return amount.toString();
  if (amount < 1) return amount.toFixed(8).replace(/\.?0+$/, "");
  return amount.toFixed(4).replace(/\.?0+$/, "");
}

/** Build a zcash: URI for QR codes / wallet deep-links. */
export function buildZcashURI(address: string, amount: number, memo?: string): string {
  let uri = `zcash:${address}?amount=${amount.toFixed(8)}`;
  if (memo) uri += `&memo=${encodeURIComponent(memo)}`;
  return uri;
}

// ─── Wallet detection ─────────────────────────────────────────────────────────

/**
 * Async detection — distinguishes Brave from MetaMask via clientVersion RPC.
 * Call once on mount; cache the result.
 */
export async function detectWallet(): Promise<DetectedWallet> {
  if (typeof window === "undefined") return { type: "none" };

  // Native Zcash extension (future: Zingo desktop, etc.)
  if (window.zcash?.getAddress || window.zcash?.request || window.zcash?.sendTransaction)
    return { type: "zcash_extension", name: "Zcash Wallet" };
  if (window.zashi?.getAddress)   return { type: "zcash_extension", name: "Zashi" };
  if (window.ywallet?.getAddress) return { type: "zcash_extension", name: "YWallet" };

  if (window.ethereum) {
    // isBraveWallet is the fast path set by Brave itself
    if (window.ethereum.isBraveWallet)
      return { type: "brave", name: "Brave Wallet" };

    if (window.ethereum.isMetaMask) {
      try {
        const v = await window.ethereum.request({ method: "web3_clientVersion" }) as string;
        if (typeof v === "string" && v.startsWith("BraveWallet"))
          return { type: "brave", name: "Brave Wallet" };
      } catch {}
      return { type: "metamask_snap", name: "MetaMask" };
    }
  }

  return { type: "none" };
}

/**
 * Sync detection — safe for SSR / initial render.
 * Cannot run the async clientVersion check so may misclassify old Brave
 * builds that don't set isBraveWallet; async detectWallet() is preferred.
 */
export function detectWalletSync(): DetectedWallet {
  if (typeof window === "undefined") return { type: "none" };
  if (window.zcash?.getAddress || window.zcash?.request || window.zcash?.sendTransaction)
    return { type: "zcash_extension", name: "Zcash Wallet" };
  if (window.zashi?.getAddress)   return { type: "zcash_extension", name: "Zashi" };
  if (window.ywallet?.getAddress) return { type: "zcash_extension", name: "YWallet" };
  if (window.ethereum?.isBraveWallet) return { type: "brave", name: "Brave Wallet" };
  if (window.ethereum?.isMetaMask)    return { type: "metamask_snap", name: "MetaMask" };
  return { type: "none" };
}

/** Returns true only when a native Zcash extension is injected (not Brave/MM). */
export function hasInjectedZcashWallet(): boolean {
  return detectWalletSync().type === "zcash_extension";
}

/**
 * Attempt to get the address from a native Zcash extension.
 * Returns null for Brave/MetaMask — they expose no Zcash JS API to dApps.
 */
export async function getInjectedAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    if (window.zcash?.getAddress)   return await window.zcash.getAddress();
    if (window.zcash?.request)      return await window.zcash.request({ method: "getAddress" });
    if (window.zashi?.getAddress)   return await window.zashi.getAddress();
    if (window.ywallet?.getAddress) return await window.ywallet.getAddress();
  } catch {}
  return null;
}

/**
 * Send stake via a native Zcash extension.
 * Returns txid on success, null if no injected wallet is present.
 */
export async function sendStakeViaInjectedWallet(
  escrowAddress: string,
  amount: number,
  challengeCode: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // Prefer the richer sendTransaction API
  if (window.zcash?.sendTransaction) {
    const { txid } = await window.zcash.sendTransaction({
      to:     escrowAddress,
      amount: formatZEC(amount),
      memo:   `QuizHub:${challengeCode}`,
    });
    return txid;
  }

  // Fallback: generic request API
  if (window.zcash?.request) {
    return await window.zcash.request({
      method: "sendTransaction",
      params: { to: escrowAddress, amount, memo: `QuizHub:${challengeCode}` },
    } as unknown as { method: string }) ?? null;
  }

  return null;
}

/**
 * Human-readable hint for where to find a Zcash t-address,
 * tailored to the detected wallet environment.
 */
export function zcashAddressHint(wallet: DetectedWallet): string {
  switch (wallet.type) {
    case "brave":
      return "Open Brave Wallet → select your Zcash account → copy the address shown.";
    case "metamask_snap":
      return "Open MetaMask → if you have the Zcash Snap installed, find your ZEC address there.";
    case "zcash_extension":
      return `Your ${wallet.name} address will be fetched automatically.`;
    default:
      return "Open your Zcash wallet app and copy your transparent (t-) address.";
  }
}

// ─── Backend API helpers ──────────────────────────────────────────────────────

/** Fetch the escrow address + ZEC balance for a challenge. */
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
 * Ask the backend to verify ZEC arrival at the escrow address.
 * On success the backend broadcasts "stake_verified" over the game WebSocket.
 */
export async function syncStake(
  code: string,
  walletAddress: string,
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
  txid: string,
): Promise<void> {
  await fetch(`${API_BASE_URL}/api/challenge/${code}/on-chain-confirmed`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ playerWallet, txid }),
  }).catch(() => {});
}