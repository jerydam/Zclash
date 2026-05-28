"use client";

/**
 * /app/challenge/create-challenge/page.tsx — Zcash edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from EVM version
 * ────────────────────────
 *   REMOVED  createWalletClient / viem imports
 *   REMOVED  QUIZ_HUB_ABI / QUIZ_HUB_ADDRESSES contract call
 *   REMOVED  createQuizOnChain() — no on-chain creation step
 *   REMOVED  TOKENS_BY_CHAIN / token selector — ZEC is the only token
 *   REMOVED  ensureCorrectNetwork() / chainId switching
 *   CHANGED  TxPhase: "idle" | "backend" | "done"  (no "Creating" step)
 *   CHANGED  On success the backend returns escrowAddress — shown to user
 *   ADDED    Display escrow address so creator knows where to send their stake
 */

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Header } from "@/components/header";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";
import {
  Loader2, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Rocket, Globe, Lock, ArrowLeft,
  Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatZEC, isValidTAddress } from "@/lib/zcash";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://faucetpay-backend.koyeb.app";

const MIN_STAKE = 0.0001; // ZEC minimum (≈ $0.01)

// ─── Wizard steps ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: "topic",  emoji: "🎯", label: "Topic",  desc: "What to quiz about" },
  { id: "stake",  emoji: "💰", label: "Stake",  desc: "Set the wager"       },
  { id: "launch", emoji: "🚀", label: "Launch", desc: "Go live"             },
];

function WizardProgress({ current, setStep }: { current: number; setStep: (n: number) => void }) {
  return (
    <div className="relative flex items-center justify-between w-full max-w-xs mx-auto px-2 mb-8">
      <div className="absolute top-5 left-8 right-8 h-1 bg-border rounded-full z-0" />
      <div
        className="absolute top-5 left-8 h-1 rounded-full z-0 transition-all duration-500 bg-primary"
        style={{ width: `calc(${(current / (STEPS.length - 1)) * 100}%)` }}
      />
      {STEPS.map((step, idx) => {
        const done   = idx < current;
        const active = idx === current;
        return (
          <button
            key={step.id}
            onClick={() => idx < current && setStep(idx)}
            disabled={idx > current}
            className="relative z-10 flex flex-col items-center gap-1.5"
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-lg border-[3px] transition-all duration-300 shadow-sm",
              done   ? "bg-primary border-primary text-primary-foreground scale-95"
                     : active
                     ? "bg-card border-primary text-primary scale-110 shadow-lg"
                     : "bg-card border-border text-muted-foreground"
            )}>
              {done ? "✓" : step.emoji}
            </div>
            <span className={cn(
              "text-[10px] font-bold hidden sm:block transition-colors",
              active ? "text-primary" : "text-muted-foreground/50"
            )}>
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type TxPhase = "idle" | "backend" | "done";

function TxStatusPill({ phase }: { phase: TxPhase }) {
  const labels: Record<TxPhase, string> = {
    idle:    "",
    backend: "🤖 Generating questions…",
    done:    "✅ Challenge live!",
  };
  if (phase === "idle") return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-card border-2 border-primary/30 shadow-xl flex items-center gap-3 text-sm font-bold text-foreground whitespace-nowrap">
      {phase !== "done" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
      {labels[phase]}
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({
  code,
  escrowAddress,
  stakeAmount,
  topic,
  onProceed,
}: {
  code: string;
  escrowAddress: string;
  stakeAmount: string;
  topic: string;
  onProceed: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header pageTitle="Challenge Created!" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-8xl animate-bounce">🎉</div>
          <div className="bg-card rounded-3xl border-2 border-primary/20 p-6 shadow-2xl space-y-5">
            <div>
              <h2 className="text-2xl font-black text-foreground">Challenge is Live!</h2>
              <p className="text-muted-foreground text-sm mt-1">Topic: {topic}</p>
            </div>

            {/* Challenge code */}
            <div className="bg-primary/5 rounded-2xl p-4 border-2 border-primary/20">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Challenge Code</p>
              <div className="text-4xl font-black tracking-[0.15em] text-primary">{code}</div>
            </div>

            {/* Escrow address — creator must send their stake here */}
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800 text-left space-y-2">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                Send your stake here
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
                Send exactly <strong>{stakeAmount} ZEC</strong> to this escrow address to activate your slot.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono text-amber-800 dark:text-amber-200 break-all flex-1">
                  {escrowAddress}
                </code>
                <button
                  onClick={() => copy(escrowAddress)}
                  className="shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                >
                  {copied ? <Check size={14} className="text-amber-700 dark:text-amber-300" /> : <Copy size={14} className="text-amber-700 dark:text-amber-300" />}
                </button>
              </div>
            </div>

            <button
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              onClick={onProceed}
            >
              Go to Lobby <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateChallengePage() {
  const router       = useRouter();
  const { address: userWalletAddress } = useWallet();
  const searchParams = useSearchParams();

  const [wizardStep, setWizardStep]       = useState(0);
  const [txPhase, setTxPhase]             = useState<TxPhase>("idle");
  const [createdCode, setCreatedCode]     = useState<string | null>(null);
  const [escrowAddress, setEscrowAddress] = useState<string>("");

  // Step 0
  const [topic, setTopic]                       = useState("");
  const [creatorUsername, setCreatorUsername]   = useState("");
  const [isPublic, setIsPublic]                 = useState(!searchParams.get("inviteUsername"));
  const [questionCount, setQuestionCount]       = useState(15);

  // Private invite
  const [inviteUsername, setInviteUsername]         = useState(searchParams.get("inviteUsername") ?? "");
  const [inviteWallet, setInviteWallet]             = useState(searchParams.get("inviteWallet") ?? "");
  const [usernameStatus, setUsernameStatus]         = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [resolvedUsername, setResolvedUsername]     = useState(searchParams.get("inviteUsername") ?? "");

  // Step 1 — ZEC amount only
  const [stakeAmount, setStakeAmount] = useState("");

  // Mark invite as found when pre-filled from URL
  useEffect(() => {
    if (searchParams.get("inviteWallet") && searchParams.get("inviteUsername")) {
      setUsernameStatus("found");
    }
  }, [searchParams]);

  // Load profile username
  useEffect(() => {
    if (!userWalletAddress) return;
    fetch(`${API_BASE_URL}/api/players/${userWalletAddress}`)
      .then((r) => r.json())
      .then((d) => { if (d.username) setCreatorUsername(d.username); })
      .catch(() => {});
  }, [userWalletAddress]);

  // Username lookup for private invite
  const lookupUsername = async (username: string) => {
    if (!username.trim() || username.length < 3) return;
    setUsernameStatus("loading");
    try {
      const res  = await fetch(`${API_BASE_URL}/api/players/by-username/${encodeURIComponent(username.trim())}`);
      if (!res.ok) { setUsernameStatus("notfound"); return; }
      const data = await res.json();
      setInviteWallet(data.wallet);
      setResolvedUsername(data.username);
      setUsernameStatus("found");
    } catch {
      setUsernameStatus("notfound");
    }
  };

  // ── Advance guard ──────────────────────────────────────────────────────────

  const canAdvance = useCallback((): boolean => {
    const id = STEPS[wizardStep]?.id;
    if (id === "topic") {
      const topicOk = topic.trim().length > 3 && !!userWalletAddress;
      if (!isPublic) return topicOk && usernameStatus === "found";
      return topicOk;
    }
    if (id === "stake")
      return !!stakeAmount && parseFloat(stakeAmount) >= MIN_STAKE;
    return true;
  }, [wizardStep, topic, stakeAmount, userWalletAddress, isPublic, usernameStatus]);

  // ── Create challenge ───────────────────────────────────────────────────────
  // No on-chain transaction. Backend allocates the escrow address and
  // returns it — we display it so the creator can send their stake.

  const handleCreate = async () => {
    if (!userWalletAddress || !topic.trim() || !stakeAmount) {
      toast.error("Please fill all required fields");
      return;
    }

    setTxPhase("backend");

    try {
      if (creatorUsername) {
        await fetch(
          `${API_BASE_URL}/api/players/register?wallet=${userWalletAddress}&username=${creatorUsername}`,
          { method: "POST" }
        ).catch(() => {});
      }

      const res = await fetch(`${API_BASE_URL}/api/challenge/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic:           topic.trim(),
          questionCount,
          creatorAddress:  userWalletAddress,
          creatorUsername: creatorUsername || userWalletAddress.slice(0, 8),
          stakeAmount:     parseFloat(stakeAmount),
          tokenSymbol:     "ZEC",
          // chainId is unused on Zcash backend but kept for schema compat
          chainId:         0,
          isPublic,
          inviteWallet: !isPublic && inviteWallet.trim() ? inviteWallet.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.detail ?? "Challenge creation failed");

      setCreatedCode(data.code);
      setEscrowAddress(data.escrowAddress ?? "");
      setTxPhase("done");
      toast.success(`🎉 Challenge live! Code: ${data.code}`);
    } catch (err: any) {
      setTxPhase("idle");
      toast.error(`❌ ${err?.message ?? "Unknown error"}`);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────

  if (createdCode) {
    return (
      <SuccessScreen
        code={createdCode}
        escrowAddress={escrowAddress}
        stakeAmount={stakeAmount}
        topic={topic}
        onProceed={() => router.push(`/challenge/${createdCode}/pre-lobby`)}
      />
    );
  }

  // ── Step renders ───────────────────────────────────────────────────────────

  const renderStepTopic = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center space-y-2 pb-2">
        <div className="text-5xl">🎯</div>
        <h2 className="text-xl font-black text-foreground">What's the quiz about?</h2>
        <p className="text-sm text-muted-foreground">AI will generate {questionCount} questions on your topic</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground">Topic <span className="text-destructive">*</span></Label>
        <Textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder='"Zcash privacy features", "World geography capitals", "Solidity security"'
          className="resize-none h-24 rounded-xl border-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground">Number of Questions</Label>
        <div className="grid grid-cols-4 gap-2">
          {[15, 18, 21, 24, 27, 30].map((num) => (
            <button
              key={num}
              onClick={() => setQuestionCount(num)}
              className={cn(
                "py-2 rounded-xl border-2 text-xs font-bold transition-all",
                questionCount === num
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold text-foreground">Visibility</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { val: true,  icon: Globe, label: "Public",  desc: "Anyone can join" },
            { val: false, icon: Lock,  label: "Private", desc: "Invite only" },
          ] as const).map(({ val, icon: Icon, label, desc }) => (
            <button
              key={String(val)}
              onClick={() => setIsPublic(val)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                isPublic === val ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-black text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {!isPublic && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <Label className="text-sm font-bold text-foreground">Opponent username</Label>
          <div className="flex gap-2">
            <input
              value={inviteUsername}
              onChange={(e) => {
                setInviteUsername(e.target.value);
                setUsernameStatus("idle");
                setInviteWallet("");
              }}
              onBlur={() => lookupUsername(inviteUsername)}
              placeholder="e.g. axelrod"
              className="h-11 rounded-xl border-2 text-sm flex-1 px-3 bg-background border-border outline-none focus:border-primary/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => lookupUsername(inviteUsername)}
              disabled={usernameStatus === "loading"}
              className="px-4 rounded-xl border-2 border-border bg-card text-sm font-bold text-muted-foreground hover:border-primary/50 transition-all disabled:opacity-50"
            >
              {usernameStatus === "loading" ? "…" : "Find"}
            </button>
          </div>

          {usernameStatus === "found" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{resolvedUsername}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-1">— {inviteWallet.slice(0, 6)}…{inviteWallet.slice(-4)}</span>
            </div>
          )}
          {usernameStatus === "notfound" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">Username not found.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStepStake = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center space-y-2 pb-2">
        <div className="text-5xl">💰</div>
        <h2 className="text-xl font-black text-foreground">Set the stake</h2>
        <p className="text-sm text-muted-foreground">Both players must send this amount in ZEC. Winner takes the pool.</p>
      </div>

      {/* ZEC-only badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-muted-foreground font-medium">Zcash (ZEC) · trustless escrow</span>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-black text-muted-foreground uppercase tracking-wider">
          Amount per player <span className="text-destructive">(min {MIN_STAKE} ZEC)</span>
        </Label>
        <div className="relative">
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="0.0000"
            step="0.0001"
            className="h-12 w-full text-lg font-mono rounded-xl pr-16 border-2 border-border bg-background px-4 outline-none focus:border-primary/60 transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">ZEC</span>
          {stakeAmount && parseFloat(stakeAmount) < MIN_STAKE && parseFloat(stakeAmount) > 0 && (
            <p className="text-xs text-destructive font-bold mt-1">
              Minimum stake is {MIN_STAKE} ZEC
            </p>
          )}
        </div>
      </div>

      {/* Quick-pick amounts */}
      <div className="grid grid-cols-4 gap-2">
        {[0.01, 0.05, 0.1, 0.5].map((v) => (
          <button
            key={v}
            onClick={() => setStakeAmount(String(v))}
            className={cn(
              "py-2 rounded-xl border-2 text-xs font-bold transition-all",
              stakeAmount === String(v)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            {v} ZEC
          </button>
        ))}
      </div>
    </div>
  );

  const renderStepLaunch = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 max-w-xl mx-auto">
      <div className="text-center space-y-2 pb-2">
        <div className="text-5xl">🚀</div>
        <h2 className="text-xl font-black text-foreground">Ready to challenge?</h2>
        <p className="text-sm text-muted-foreground">Review and launch</p>
      </div>

      <div className="rounded-3xl border-2 border-border bg-card overflow-hidden p-5 space-y-4">
        {[
          { emoji: "🧠", label: "Topic",      value: topic || "—",                                 ok: !!topic },
          { emoji: "💰", label: "Stake",      value: `${stakeAmount} ZEC`,                          ok: !!stakeAmount && parseFloat(stakeAmount) >= MIN_STAKE },
          { emoji: isPublic ? "🌐" : "🔒", label: "Visibility", value: isPublic ? "Public" : `Duel vs ${resolvedUsername}`, ok: true },
          { emoji: "⚡",  label: "Settlement", value: "Automatic (zcashd)",                          ok: true },
        ].map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2.5 rounded-2xl px-3 py-2.5 border-2",
              item.ok
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200"
                : "bg-destructive/10 border-destructive/30"
            )}
          >
            <span className="text-xl">{item.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground">{item.label}</p>
              <p className="text-sm font-black truncate text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        After creation you'll receive a Zcash escrow address. Send your stake there, then wait for your opponent to do the same.
      </p>

      <button
        onClick={handleCreate}
        disabled={txPhase !== "idle" || !userWalletAddress}
        className={cn(
          "w-full h-16 rounded-2xl font-black text-lg transition-all",
          userWalletAddress ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground"
        )}
      >
        {txPhase !== "idle"
          ? <><Loader2 className="h-5 w-5 animate-spin mr-2 inline" /> Creating…</>
          : <><Rocket className="h-5 w-5 mr-2 inline" /> Launch Duel</>}
      </button>
    </div>
  );

  const stepContent = [renderStepTopic, renderStepStake, renderStepLaunch];
  const lastStep    = STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header pageTitle="Create Challenge" />
      <div className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-4 pb-24 pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl border-2 border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground">New Challenge</h1>
            <p className="text-xs text-muted-foreground">Step {wizardStep + 1} of {STEPS.length}</p>
          </div>
        </div>

        <WizardProgress current={wizardStep} setStep={setWizardStep} />

        <div className="bg-card rounded-3xl border-2 border-border p-5 shadow-sm">
          {stepContent[wizardStep]?.()}
        </div>

        {wizardStep < lastStep && (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
              disabled={wizardStep === 0}
              className="px-5 py-3 rounded-2xl border-2 border-border bg-card text-muted-foreground font-bold text-sm disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="h-4 w-4 inline mr-1" /> Back
            </button>
            <button
              onClick={() => setWizardStep((s) => Math.min(lastStep, s + 1))}
              disabled={!canAdvance()}
              className={cn(
                "px-5 py-3 rounded-2xl font-bold text-sm transition-all",
                canAdvance()
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Next <ChevronRight className="h-4 w-4 inline ml-1" />
            </button>
          </div>
        )}
      </div>
      <TxStatusPill phase={txPhase} />
    </div>
  );
}