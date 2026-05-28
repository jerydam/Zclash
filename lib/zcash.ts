/**
 * zcash-utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in replacement for the viem / EVM helpers that were removed.
 *
 * What changed vs the old EVM layer
 * ──────────────────────────────────
 *   REMOVED  createWalletClient / createPublicClient / viem imports
 *   REMOVED  QUIZ_HUB_ABI / ERC20_ABI contract calls
 *   REMOVED  stakeOnChain()  (approve + writeContract)
 *   REMOVED  ensureCeloNetwork()
 *   REMOVED  handleClaim()   (claimReward contract call)
 *   REMOVED  deriveQuizId()  (keccak256 only needed on-chain)
 *
 *   ADDED    getEscrowInfo()     fetch /api/challenge/{code}/escrow
 *   ADDED    syncStake()         POST /api/challenge/{code}/sync-stake
 *   ADDED    notifyStakeSent()   POST /api/challenge/{code}/on-chain-confirmed
 *   ADDED    isValidTAddress()   lightweight Zcash t-address format check
 *   ADDED    formatZEC()         pretty-print ZEC amounts
 *   ADDED    ZcashWalletProvider window.zcash interface (type only)
 *
 * How staking works now
 * ──────────────────────
 *   1. On challenge creation the backend allocates a fresh t-address (escrowAddress).
 *   2. The UI shows that address + a QR code so the user can send ZEC from any
 *      Zcash wallet (mobile, desktop, or a browser extension that injects window.zcash).
 *   3. After sending, the user clicks "I've sent it".  The UI calls syncStake()
 *      which hits /api/challenge/{code}/sync-stake → zcashd getreceivedbyaddress().
 *   4. The backend broadcasts a WebSocket "stake_verified" event when confirmed.
 *   5. Payouts are automatic (settle_winner / refund_both) — no claim step needed.
 */

const API_BASE_URL = "https://faucetpay-backend.koyeb.app";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EscrowInfo {
  escrowAddress: string;
  balanceZEC: number;
  stakePerPlayer: number;
  totalExpected: number;
}

export interface SyncResult {
  verified: boolean;
  alreadyVerified?: boolean;
  escrowBalance?: number;
  escrowAddress?: string;
  expectedAmount?: number;
  message?: string;
}

/**
 * Optional: if a browser/mobile Zcash wallet injects window.zcash, we can
 * call sendTransaction() directly.  This matches the Ywallet / ZingoLib API
 * surface (draft spec).  Falls back gracefully if not present.
 */
export interface ZcashWalletProvider {
  getAddress: () => Promise<string>;
  sendTransaction: (params: {
    to: string;
    amount: string; // ZEC, human-readable e.g. "0.5"
    memo?: string;
  }) => Promise<{ txid: string }>;
}

declare global {
  interface Window {
    zcash?: ZcashWalletProvider;
  }
}

// ─── Address helpers ──────────────────────────────────────────────────────────

/**
 * Lightweight Zcash transparent address format check.
 * Mirrors zcash_engine.is_valid_t_address() on the backend.
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

/**
 * Format a ZEC amount for display: 8 decimal places when < 1, otherwise 4.
 */
export function formatZEC(amount: number): string {
  if (amount === 0) return "0";
  if (amount < 1) return amount.toFixed(8).replace(/\.?0+$/, "");
  return amount.toFixed(4).replace(/\.?0+$/, "");
}

// ─── QR code helper ───────────────────────────────────────────────────────────

/**
 * Returns a zcash: URI for use in QR codes or wallet deep links.
 * Format: zcash:t1Xyz...?amount=0.5&memo=QuizHub
 */
export function buildZcashURI(address: string, amount: number, memo?: string): string {
  const params = new URLSearchParams();
  params.set("amount", formatZEC(amount));
  if (memo) params.set("memo", memo);
  return `zcash:${address}?${params.toString()}`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch the current escrow address and balance for a challenge.
 * Use this to populate the "send ZEC here" UI and poll for incoming balance.
 */
export async function getEscrowInfo(code: string): Promise<EscrowInfo> {
  const res = await fetch(`${API_BASE_URL}/api/challenge/${code}/escrow`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.detail ?? "Failed to fetch escrow info");
  return {
    escrowAddress: data.escrowAddress,
    balanceZEC: data.balanceZEC,
    stakePerPlayer: data.stakePerPlayer,
    totalExpected: data.totalExpected,
  };
}

/**
 * Tell the backend the player has sent ZEC.
 * The backend checks zcashd getreceivedbyaddress() and broadcasts
 * a "stake_verified" WS event if confirmed.
 *
 * Returns SyncResult — callers should surface `message` when verified=false.
 */
export async function syncStake(
  code: string,
  walletAddress: string
): Promise<SyncResult> {
  const res = await fetch(`${API_BASE_URL}/api/challenge/${code}/sync-stake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return {
    verified: data.verified ?? data.success,
    alreadyVerified: data.alreadyVerified,
    escrowBalance: data.escrowBalance,
    escrowAddress: data.escrowAddress,
    expectedAmount: data.expectedAmount,
    message: data.message,
  };
}

/**
 * Record a Zcash txid after the user has sent funds.
 * This is optional metadata — it doesn't trigger verification.
 * The real verification always goes through syncStake().
 */
export async function notifyStakeSent(
  code: string,
  playerWallet: string,
  txid: string
): Promise<void> {
  await fetch(`${API_BASE_URL}/api/challenge/${code}/on-chain-confirmed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerWallet, txid }),
  }).catch(() => {}); // fire-and-forget
}

// ─── Injected wallet helper ───────────────────────────────────────────────────

/**
 * If a Zcash browser wallet is available (window.zcash), use it to
 * send the stake directly.  Returns the txid on success.
 *
 * Falls back with null if no injected provider is found — in that case
 * the UI should show the manual copy/QR flow.
 */
export async function sendStakeViaInjectedWallet(
  escrowAddress: string,
  amount: number,
  challengeCode: string
): Promise<string | null> {
  if (typeof window === "undefined" || !window.zcash) return null;

  const { txid } = await window.zcash.sendTransaction({
    to: escrowAddress,
    amount: formatZEC(amount),
    memo: `QuizHub:${challengeCode}`,
  });
  return txid;
}

/**
 * True when a Zcash wallet is injected into the browser.
 */
export function hasInjectedZcashWallet(): boolean {
  return typeof window !== "undefined" && Boolean(window.zcash);
}