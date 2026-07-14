"use client";
/**
 * components/verify-wallet-modal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Proves the connected wallet actually controls the claimed t-address.
 *
 * ZClash's "connect" flow is just pasting a t-address (no Zcash wallet exposes
 * a browser signing API the way MetaMask does), so anyone who knows a player's
 * public address could otherwise claim it and edit their profile. This modal
 * closes that gap the same way ZClash already proves stake payments: mint a
 * one-time deposit address, have the user send any small amount from their own
 * wallet, then check that their claimed address appears among the transaction's
 * inputs — only the private-key holder can produce that.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { X, Copy, Check, ExternalLink, ShieldCheck, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  startWalletVerification,
  confirmWalletVerification,
  buildZcashURI,
  formatZEC,
} from "@/lib/zcash";

interface VerifyWalletModalProps {
  walletAddress: string;
  onVerified:    () => void;
  onClose:       () => void;
}

export function VerifyWalletModal({ walletAddress, onVerified, onClose }: VerifyWalletModalProps) {
  const [loading, setLoading]           = useState(true);
  const [verifyAddress, setVerifyAddress] = useState("");
  const [minAmount, setMinAmount]       = useState(0.00001);
  const [expiresAt, setExpiresAt]       = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft]   = useState(0);
  const [copied, setCopied]             = useState(false);
  const [txid, setTxid]                 = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const info = await startWalletVerification(walletAddress);
      if (info.alreadyVerified) {
        toast.success("Wallet already verified!");
        onVerified();
        return;
      }
      setVerifyAddress(info.verifyAddress ?? "");
      setMinAmount(info.minAmount ?? 0.00001);
      setExpiresAt(info.expiresAt ? new Date(info.expiresAt).getTime() : null);
    } catch (err: any) {
      setError(err?.message ?? "Could not start verification");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, onVerified]);

  useEffect(() => { load(); }, [load]);

  // Countdown
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  // QR code
  useEffect(() => {
    if (!verifyAddress || !canvasRef.current) return;
    const uri = buildZcashURI(verifyAddress, minAmount);
    QRCode.toCanvas(canvasRef.current, uri, {
      width: 168, margin: 1, errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => {});
  }, [verifyAddress, minAmount]);

  const copy = () => {
    navigator.clipboard.writeText(verifyAddress);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const expired = expiresAt !== null && secondsLeft <= 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const handleVerify = async () => {
    const trimmed = txid.trim();
    if (!trimmed) { setError("Paste the transaction ID you sent from."); return; }
    setSubmitting(true);
    setError("");
    try {
      const result = await confirmWalletVerification(walletAddress, trimmed);
      if (result.verified) {
        toast.success("Wallet ownership verified!");
        onVerified();
      } else {
        setError(result.reason ?? "Could not verify — check the transaction ID.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const zcashURI = verifyAddress ? buildZcashURI(verifyAddress, minAmount) : "";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <p className="font-bold text-sm text-foreground">Verify wallet ownership</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Preparing verification…</p>
            </div>
          )}

          {!loading && verifyAddress && !expired && (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send any small amount of ZEC (at least{" "}
                <strong className="text-foreground">{formatZEC(minAmount)}</strong>) from{" "}
                <strong className="text-foreground">your own wallet</strong> to the address
                below. This only needs to happen once — it proves you control this address.
              </p>

              <div className="flex justify-center">
                <div className="bg-white p-2.5 rounded-xl border border-border">
                  <canvas ref={canvasRef} className="block" />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                <code className="text-[11px] font-mono text-foreground break-all flex-1 leading-relaxed">
                  {verifyAddress}
                </code>
                <button
                  onClick={copy}
                  className="shrink-0 w-7 h-7 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <a
                  href={zcashURI}
                  className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity inline-flex items-center gap-1"
                >
                  Open in Zcash wallet <ExternalLink className="h-3 w-3" />
                </a>
                <span className={cn(
                  "flex items-center gap-1 text-[11px] font-bold tabular-nums",
                  secondsLeft <= 60 ? "text-destructive" : "text-muted-foreground",
                )}>
                  <Clock className="h-3 w-3" /> {mm}:{ss}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Transaction ID
                </label>
                <input
                  value={txid}
                  onChange={(e) => { setTxid(e.target.value); if (error) setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
                  placeholder="Paste the txid you sent from…"
                  spellCheck={false}
                  className="w-full h-11 rounded-xl border-2 border-border bg-background px-3 font-mono text-xs text-foreground outline-none focus:border-primary/60 transition-colors"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <button
                onClick={handleVerify}
                disabled={submitting || !txid.trim()}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : "Verify wallet"}
              </button>
            </>
          )}

          {!loading && expired && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm font-bold text-foreground">Verification window expired</p>
              <p className="text-xs text-muted-foreground">Get a fresh deposit address to try again.</p>
              <button
                onClick={load}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all"
              >
                Get new address
              </button>
            </div>
          )}

          {!loading && !verifyAddress && !expired && error && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-xs text-destructive">{error}</p>
              <button
                onClick={load}
                className="px-4 py-2 rounded-xl border-2 border-border font-bold text-xs hover:bg-muted transition-all"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
