"use client";
/**
 * components/zcash-wallet-provider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the EVM wallet-provider.tsx entirely.
 *
 * How it works
 * ────────────
 *   1. On mount, checks localStorage for a saved t-address.
 *   2. If window.zcash is injected (e.g. Zingo / YWallet extension),
 *      connect() calls window.zcash.getAddress() automatically.
 *   3. Otherwise, connect() opens a small modal asking the user to
 *      paste their Zcash t-address.
 *   4. The address is persisted in localStorage so the user stays
 *      "connected" across page refreshes.
 *
 * Interface parity with the old EVM provider
 * ───────────────────────────────────────────
 *   address              string | null   (now a t-address instead of 0x…)
 *   isConnected          boolean
 *   isConnecting         boolean
 *   connect()            open modal / call window.zcash
 *   disconnect()         clear address + localStorage
 *   chainId              always null (Zcash has no chain ID concept)
 *   ensureCorrectNetwork no-op — always resolves true
 *   refreshProvider      no-op
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { isValidTAddress, getInjectedAddress, hasInjectedZcashWallet } from "@/lib/zcash";
import { toast } from "sonner";
import { X, Wallet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// ─── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "zcash_wallet_address";

// ─── Context type ─────────────────────────────────────────────────────────────

interface ZcashWalletContextType {
  address:             string | null;
  isConnected:         boolean;
  isConnecting:        boolean;
  connect:             () => Promise<void>;
  disconnect:          () => void;
  // kept for interface compat with old EVM provider:
  chainId:             null;
  ensureCorrectNetwork: () => Promise<boolean>;
  refreshProvider:     () => Promise<void>;
  // signer / provider not applicable; kept as null for compat
  signer:   null;
  provider: null;
}

const ZcashWalletContext = createContext<ZcashWalletContextType>({
  address:             null,
  isConnected:         false,
  isConnecting:        false,
  connect:             async () => {},
  disconnect:          () => {},
  chainId:             null,
  ensureCorrectNetwork: async () => true,
  refreshProvider:     async () => {},
  signer:   null,
  provider: null,
});

// ─── Connect Modal ────────────────────────────────────────────────────────────

function ConnectModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (address: string) => void;
  onClose:   () => void;
}) {
  const [value, setValue]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Try injected wallet first
    if (hasInjectedZcashWallet()) {
      setLoading(true);
      getInjectedAddress()
        .then((addr) => {
          if (addr) onConfirm(addr);
          else setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [onConfirm]);

  const validate = (v: string) => {
    if (!v.trim()) { setError("Please enter your Zcash t-address."); return false; }
    if (!isValidTAddress(v.trim())) {
      setError("Invalid t-address. Must start with t1 or t3 and be 35 characters.");
      return false;
    }
    setError("");
    return true;
  };

  const handleConfirm = () => {
    if (validate(value)) onConfirm(value.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-card border-2 border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className="font-black text-foreground">Connect Zcash Wallet</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Reading from your Zcash wallet…</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Your Zcash t-address
                </label>
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => { setValue(e.target.value); if (error) setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
                  placeholder="t1Abc… or t3Xyz…"
                  className="w-full h-12 rounded-xl border-2 border-border bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-primary/60 transition-colors"
                />
                {error && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}
                {value && isValidTAddress(value.trim()) && !error && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Valid t-address
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Enter your Zcash transparent (t-) address. This is how you receive payouts and send stakes.
                It starts with <strong>t1</strong> (mainnet) or <strong>t3</strong> (P2SH).
              </p>

              <button
                onClick={handleConfirm}
                disabled={!value.trim()}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ZcashWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress]         = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showModal, setShowModal]     = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidTAddress(stored)) setAddress(stored);
    } catch {}
  }, []);

  const saveAddress = useCallback((addr: string) => {
    try { localStorage.setItem(STORAGE_KEY, addr); } catch {}
    setAddress(addr);
    setShowModal(false);
    setIsConnecting(false);
    toast.success(`Wallet connected: ${addr.slice(0, 8)}…${addr.slice(-4)}`);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);

    // Try injected wallet
    if (hasInjectedZcashWallet()) {
      try {
        const addr = await getInjectedAddress();
        if (addr) { saveAddress(addr); return; }
      } catch {
        // fall through to manual modal
      }
    }

    // Open manual modal
    setShowModal(true);
    // isConnecting will be cleared when modal confirms or closes
  }, [saveAddress]);

  const disconnect = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setAddress(null);
    toast.info("Wallet disconnected.");
  }, []);

  const isConnected = Boolean(address);

  return (
    <ZcashWalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        chainId:             null,
        ensureCorrectNetwork: async () => true,
        refreshProvider:     async () => {},
        signer:   null,
        provider: null,
      }}
    >
      {children}
      {showModal && (
        <ConnectModal
          onConfirm={saveAddress}
          onClose={() => { setShowModal(false); setIsConnecting(false); }}
        />
      )}
    </ZcashWalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet() {
  return useContext(ZcashWalletContext);
}

// Named exports for drop-in compatibility with old wallet-provider.tsx
export { ZcashWalletContext as WalletContext };
export { ZcashWalletProvider as WalletProvider };
export { useWallet as default };