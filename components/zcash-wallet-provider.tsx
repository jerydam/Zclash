"use client";
/**
 * components/zcash-wallet-provider.tsx
 *
 * Connect flow per detected environment:
 *   zcash_extension  → call getInjectedAddress() immediately, no modal
 *   brave            → Brave has Zcash but NO JS API for dApps; modal with hint
 *   metamask_snap    → modal with MetaMask snap instructions
 *   none             → modal: mobile deep-link tab + paste address tab
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from "react"
import {
  detectWallet, getInjectedAddress, isValidTAddress,
  zcashAddressHint, type DetectedWallet,
} from "@/lib/zcash"
import { toast } from "sonner"
import { X, Wallet, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "zcash_wallet_address"

// ── Context ───────────────────────────────────────────────────────────────────

interface ZcashWalletContextType {
  address:              string | null
  isConnected:          boolean
  isConnecting:         boolean
  detected:             DetectedWallet
  connect:              () => Promise<void>
  disconnect:           () => void
  chainId:              null
  ensureCorrectNetwork: () => Promise<boolean>
  refreshProvider:      () => Promise<void>
  signer:               null
  provider:             null
}

const ZcashWalletContext = createContext<ZcashWalletContextType>({
  address: null, isConnected: false, isConnecting: false,
  detected: { type: "none" },
  connect: async () => {}, disconnect: () => {},
  chainId: null, ensureCorrectNetwork: async () => true,
  refreshProvider: async () => {}, signer: null, provider: null,
})

// ── Modal ─────────────────────────────────────────────────────────────────────

type ModalTab = "wallet" | "manual"

function ConnectModal({
  detected,
  onConfirm,
  onClose,
}: {
  detected:  DetectedWallet
  onConfirm: (address: string) => void
  onClose:   () => void
}) {
  const isMobile = typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent)

  const defaultTab: ModalTab =
    detected.type === "brave" || detected.type === "metamask_snap" || !isMobile
      ? "manual"
      : "wallet"

  const [tab, setTab]     = useState<ModalTab>(defaultTab)
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tab === "manual") setTimeout(() => inputRef.current?.focus(), 80)
  }, [tab])

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (!trimmed)                  { setError("Please enter your Zcash t-address."); return }
    if (!isValidTAddress(trimmed)) { setError("Invalid t-address — must start with t1 or t3 and be 35 chars."); return }
    onConfirm(trimmed)
  }

  const hint        = zcashAddressHint(detected)
  const showWalletTab = isMobile || detected.type === "none"

  const walletLinks = [
    { name: "Zashi",     url: "https://electriccoin.co/zashi/" },
    { name: "Nighthawk", url: "https://nighthawkwallet.com/" },
    { name: "YWallet",   url: "https://ywallet.app/" },
    { name: "Brave",     url: "https://brave.com/wallet/" },
  ]

  return (
    // backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* card */}
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className="font-bold text-sm text-foreground">Connect Zcash wallet</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* tabs — only shown when wallet tab is relevant */}
        {showWalletTab && (
          <div className="flex border-b border-border">
            {(["wallet", "manual"] as ModalTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px",
                  tab === t
                    ? "text-foreground border-foreground"
                    : "text-muted-foreground border-transparent hover:text-foreground/70"
                )}
              >
                {t === "wallet" ? "Wallet app" : "Paste address"}
              </button>
            ))}
          </div>
        )}

        <div className="p-5 space-y-4">

          {/* ── Wallet app tab ── */}
          {tab === "wallet" && showWalletTab && (
            <div className="space-y-3">

              {/* mobile deep link */}
              {isMobile && (
                <a
                  href="zcash://"
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors no-underline"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">Open in Zcash wallet</p>
                    <p className="text-xs text-muted-foreground">Zashi · Nighthawk · YWallet</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </a>
              )}

              {/* no extension on desktop */}
              {!isMobile && detected.type === "none" && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-center space-y-1.5">
                  <p className="text-sm font-bold text-foreground">No wallet detected</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Zcash browser extensions are not yet widely available.
                    <br />Install a wallet below or paste your address.
                  </p>
                </div>
              )}

              {/* wallet download chips */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Get a Zcash wallet
                </p>
                <div className="flex flex-wrap gap-2">
                  {walletLinks.map((w) => (
                    <a
                      key={w.name}
                      href={w.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors no-underline"
                    >
                      {w.name}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setTab("manual")}
                className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                Already have an address? Paste it →
              </button>
            </div>
          )}

          {/* ── Manual / paste tab ── */}
          {(tab === "manual" || !showWalletTab) && (
            <div className="space-y-3">

              {/* contextual hint for Brave / MetaMask */}
              {detected.type !== "none" && (
                <div className={cn(
                  "flex gap-2.5 p-3 rounded-xl border text-xs leading-relaxed",
                  detected.type === "brave"
                    ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40 text-orange-800 dark:text-orange-300"
                    : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/40 text-yellow-800 dark:text-yellow-300"
                )}>
                  <span className="text-base leading-none shrink-0">
                    {detected.type === "brave" ? "🦁" : "🦊"}
                  </span>
                  <div>
                    <p className="font-bold mb-0.5">
                      {detected.type === "brave" ? "Brave Wallet detected" : "MetaMask detected"}
                    </p>
                    <p className="opacity-90">{hint}</p>
                  </div>
                </div>
              )}

              {/* address input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="zcash-addr-input"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Your Zcash t-address
                </label>
                <input
                  id="zcash-addr-input"
                  ref={inputRef}
                  value={value}
                  onChange={(e) => { setValue(e.target.value); if (error) setError("") }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleConfirm() }}
                  placeholder="t1Abc… or t3Xyz…"
                  spellCheck={false}
                  className="w-full h-11 rounded-xl border-2 border-border bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-primary/60 transition-colors"
                />
                {error && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}
                {value && isValidTAddress(value.trim()) && !error && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Valid t-address
                  </p>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Transparent (t-) address from any Zcash wallet.
                Starts with <strong>t1</strong> (mainnet) or <strong>t3</strong> (P2SH).
              </p>

              <button
                onClick={handleConfirm}
                disabled={!value.trim()}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Connect wallet
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ZcashWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress]           = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showModal, setShowModal]       = useState(false)
  const [detected, setDetected]         = useState<DetectedWallet>({ type: "none" })
  const detectionDone = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && isValidTAddress(stored)) setAddress(stored)
    } catch {}

    if (!detectionDone.current) {
      detectionDone.current = true
      detectWallet().then(setDetected).catch(() => {})
    }
  }, [])

  const saveAddress = useCallback((addr: string) => {
    try { localStorage.setItem(STORAGE_KEY, addr) } catch {}
    setAddress(addr)
    setShowModal(false)
    setIsConnecting(false)
    toast.success(`Wallet connected: ${addr.slice(0, 8)}…${addr.slice(-4)}`)
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    if (detected.type === "zcash_extension") {
      try {
        const addr = await getInjectedAddress()
        if (addr) { saveAddress(addr); return }
      } catch {}
    }
    setShowModal(true)
  }, [detected, saveAddress])

  const disconnect = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setAddress(null)
    toast.info("Wallet disconnected.")
  }, [])

  return (
    <ZcashWalletContext.Provider value={{
      address,
      isConnected:          Boolean(address),
      isConnecting,
      detected,
      connect,
      disconnect,
      chainId:              null,
      ensureCorrectNetwork: async () => true,
      refreshProvider:      async () => {},
      signer:               null,
      provider:             null,
    }}>
      {children}
      {showModal && (
        <ConnectModal
          detected={detected}
          onConfirm={saveAddress}
          onClose={() => { setShowModal(false); setIsConnecting(false) }}
        />
      )}
    </ZcashWalletContext.Provider>
  )
}

// ── Hooks + named exports ─────────────────────────────────────────────────────

export function useWallet() { return useContext(ZcashWalletContext) }
export { ZcashWalletContext as WalletContext }
export { ZcashWalletProvider as WalletProvider }
export { useWallet as default }