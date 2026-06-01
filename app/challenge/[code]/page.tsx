"use client";


import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, Trophy, Zap, Check, X,
  ArrowLeft, Share2, Home, Plus, Users, ShieldCheck,
  MessageSquare, Send, RefreshCw, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Loading from "@/app/loading";
import { useSearchParams } from "next/navigation";
import { WalletConnectButton } from "@/components/wallet-connect";
import { toast as sonnerToast } from "sonner";
import { RematchPopup, RematchInvite } from "@/components/RematchPopup";
import {
  syncStake,
  notifyStakeSent,
  getEscrowInfo,
  sendStakeViaInjectedWallet,
  hasInjectedZcashWallet,
  buildZcashURI,
  formatZEC,
} from "@/lib/zcash";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function getWsBaseUrl(): string {
  if (typeof window === "undefined") return "wss://127.0.0.1:8000";
  return window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
    ? "ws://127.0.0.1:8000"
    : "wss://faucetpay-backend.koyeb.app";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase =
  | "loading" | "lobby" | "countdown" | "question"
  | "reveal"  | "round_end" | "game_over";

interface PlayerState {
  walletAddress: string;
  username:  string;
  points:    number;
  ready:     boolean;
  txVerified: boolean;
  avatarUrl: string;
}

interface QuizOption { id: string; text: string }

interface CurrentQuestion {
  roundIndex:     number;
  questionIndex:  number;
  totalQuestions: number;
  question:       string;
  options:        QuizOption[];
  timeLimit:      number;
  startedAt:      number;
}

interface FinalScore { username: string; points: number }

const OPTION_STYLES: Record<string, { bg: string; shape: string; ring: string }> = {
  A: { bg: "bg-red-500 hover:bg-red-600",     shape: "▲", ring: "ring-red-400"  },
  B: { bg: "bg-blue-500 hover:bg-primary",   shape: "◆", ring: "ring-primary400" },
  C: { bg: "bg-blue-500 hover:bg-primary",   shape: "●", ring: "ring-primary400" },
  D: { bg: "bg-green-500 hover:bg-green-600", shape: "■", ring: "ring-green-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LinearTimer({ seconds, total }: { seconds: number; total: number }) {
  const pct   = Math.max(0, (seconds / total) * 100);
  const color = pct > 50 ? "bg-green-500" : pct > 25 ? "bg-blue-500" : "bg-red-500";
  return (
    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
      <div className={cn("h-full transition-all duration-300 ease-linear", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

const CONFETTI_COLORS = ["#FFD700","#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7"];
function Confetti({ active }: { active: boolean }) {
  const particles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 2, size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })), []);
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-sm" style={{
          left: `${p.x}%`, top: "-10%", width: p.size, height: p.size,
          backgroundColor: p.color,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
      <style>{`@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

// ─── EscrowPanel — replaces the "Stake to Play" EVM panel ────────────────────

function EscrowPanel({
  escrowAddress,
  stakeAmount,
  token,
  challengeCode,
  onSent,
  isSyncing,
}: {
  escrowAddress: string;
  stakeAmount:   number;
  token:         string;
  challengeCode: string;
  onSent:        () => void;
  isSyncing:     boolean;
}) {
  const [copied, setCopied] = useState(false);
  const zcashURI = buildZcashURI(escrowAddress, stakeAmount, `QuizHub:${challengeCode}`);

  const copy = () => {
    navigator.clipboard.writeText(escrowAddress);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4">
      <div className="shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
      <div className="flex flex-col gap-3 min-w-0 flex-1">
        <div>
          <p className="text-xs font-black text-amber-800 dark:text-amber-200 uppercase tracking-wide">
            Send your stake
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            Send exactly <strong>{formatZEC(stakeAmount)} {token}</strong> to this address, then tap "I've sent it".
          </p>
        </div>

        {/* Address row */}
        <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl px-3 py-2">
          <code className="text-[11px] font-mono text-amber-900 dark:text-amber-100 break-all flex-1 leading-relaxed">
            {escrowAddress}
          </code>
          <button
            onClick={copy}
            className="shrink-0 w-7 h-7 rounded-lg bg-amber-200 dark:bg-amber-800/60 flex items-center justify-center hover:bg-amber-300 dark:hover:bg-amber-700/60 transition-colors"
            title="Copy address"
          >
            {copied
              ? <Check size={13} className="text-amber-700 dark:text-amber-200" />
              : <Copy size={13} className="text-amber-700 dark:text-amber-200" />}
          </button>
        </div>

        {/* Open in Zcash wallet */}
        <a
          href={zcashURI}
          className="text-[11px] text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:opacity-70 transition-opacity"
        >
          Open in Zcash wallet
        </a>

        {/* "I've sent it" button */}
        <button
          onClick={onSent}
          disabled={isSyncing}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {isSyncing
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking on-chain…</>
            : <>I've sent it — verify my stake</>}
        </button>

        <p className="text-[10px] text-amber-500 dark:text-amber-500 leading-relaxed">
          The backend checks zcashd for incoming ZEC. Requires at least 1 confirmation (~75 seconds).
        </p>
      </div>
    </div>
  );
}

// ─── Floating Chat ────────────────────────────────────────────────────────────

interface FloatingChatProps {
  messages: any[];
  myWallet: string;
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  unreadCount: number;
}

function FloatingChat({ messages, myWallet, chatInput, setChatInput, onSend, chatBottomRef, unreadCount }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localUnread, setLocalUnread] = useState(0);

  useEffect(() => {
    if (!isOpen) setLocalUnread(unreadCount);
  }, [unreadCount, isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3">
      {isOpen && (
        <div
          className="w-[calc(100vw-48px)] sm:w-80 flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: "min(400px, 60vh)", animation: "slideUpFade 0.2s ease-out" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <p className="font-bold text-sm text-foreground">Lobby Chat</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0
              ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-muted-foreground text-xs">No messages yet. Say hi!</p>
                </div>
              )
              : messages.map((m, i) => {
                  const isMe = m.wallet?.toLowerCase() === myWallet;
                  return (
                    <div key={i} className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                      {!isMe && <span className="text-[10px] text-muted-foreground px-1 font-semibold">{m.sender}</span>}
                      <div className={cn(
                        "px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words leading-relaxed",
                        isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
                      )}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
            <div ref={chatBottomRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); onSend(); }}
            className="flex gap-2 px-3 py-3 border-t border-border shrink-0"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Say something…"
              maxLength={200}
              className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="w-8 h-8 rounded-xl bg-primary disabled:bg-muted/50 disabled:text-muted-foreground text-primary-foreground flex items-center justify-center transition-all active:scale-95 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => { if (isOpen) setIsOpen(false); else { setIsOpen(true); setLocalUnread(0); } }}
        className={cn(
          "relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95",
          isOpen ? "bg-muted text-foreground border border-border" : "bg-primary text-primary-foreground"
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        {!isOpen && localUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full border-2 border-background flex items-center justify-center">
            {localUnread > 9 ? "9+" : localUnread}
          </span>
        )}
      </button>
      <style>{`@keyframes slideUpFade{from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}

// ─── Rematch helpers ──────────────────────────────────────────────────────────

export async function sendRematchInvite(params: {
  code: string;
  userWalletAddress: string;
  setRematchPending: (v: boolean) => void;
  setRematchCountdown: React.Dispatch<React.SetStateAction<number | null>>;
  rematchTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  rematchTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}) {
  const { code, userWalletAddress, setRematchPending, setRematchCountdown, rematchTimerRef, rematchTimeoutRef } = params;
  if (!userWalletAddress) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/challenge/${code}/rematch-invite`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterWallet: userWalletAddress }),
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.detail ?? "Could not send invite");
    setRematchPending(true);
    sonnerToast.info("Rematch invite sent — waiting for opponent…");
    const TIMEOUT = 30;
    setRematchCountdown(TIMEOUT);
    rematchTimerRef.current = setInterval(() => {
      setRematchCountdown((prev) => {
        if (prev === null || prev <= 1) { clearInterval(rematchTimerRef.current!); rematchTimerRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
    rematchTimeoutRef.current = setTimeout(() => {
      setRematchPending(false); setRematchCountdown(null);
      sonnerToast.info("Rematch request timed out.");
    }, (TIMEOUT + 1) * 1000);
  } catch (err: any) {
    sonnerToast.error(err?.message ?? "Could not send rematch invite");
  }
}

export async function handleRematchCreate(params: {
  code: string;
  userWalletAddress: string;
  challenge: any;
  router: ReturnType<typeof useRouter>;
  setIsRequesting: (v: boolean) => void;
}) {
  const { code, userWalletAddress, router, setIsRequesting } = params;
  setIsRequesting(true);
  try {
    // On Zcash backend, /rematch creates a new challenge + escrow address.
    // No on-chain creation transaction needed.
    const res = await fetch(`${API_BASE_URL}/api/challenge/${code}/rematch`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterWallet: userWalletAddress }),
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.detail ?? "Rematch creation failed");
    sonnerToast.success("Rematch ready! Heading to pre-lobby…");
    router.push(`/challenge/${d.newCode}/pre-lobby`);
  } catch (err: any) {
    sonnerToast.error(err?.message ?? "Could not create rematch.");
  } finally {
    setIsRequesting(false);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChallengePage() {
  const params = useParams();
  const router = useRouter();
  const code   = ((params.code as string) ?? "").toUpperCase();

  const { address: userWalletAddress } = useWallet();
  const myWallet = useMemo(() => userWalletAddress?.toLowerCase() ?? "", [userWalletAddress]);

  const searchParams     = useSearchParams();
  const agreedStake      = searchParams.get("stake");
  const cameFromPreLobby = searchParams.get("agreed") === "1";

  // ── Core state ──────────────────────────────────────────────────────────────
  const [phase, setPhase]         = useState<GamePhase>("loading");
  const [challenge, setChallenge] = useState<any>(null);
  const [players, setPlayers]     = useState<PlayerState[]>([]);
  const [username, setUsername]   = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  // ── Zcash staking state ─────────────────────────────────────────────────────
  const [escrowAddress, setEscrowAddress]   = useState<string>("");
  const [isStaking, setIsStaking]           = useState(false);     // injected wallet sending
  const [stakeVerifying, setStakeVerifying] = useState(false);
  const [isSyncing, setIsSyncing]           = useState(false);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [showEscrowPanel, setShowEscrowPanel] = useState(false);    // show manual send UI

  // ── Game state ──────────────────────────────────────────────────────────────
  const [countdownVal, setCountdownVal]         = useState(3);
  const [currentQ, setCurrentQ]                 = useState<CurrentQuestion | null>(null);
  const [selectedId, setSelectedId]             = useState<string | null>(null);
  const [timeLeft, setTimeLeft]                 = useState(0);
  const [revealCorrectId, setRevealCorrectId]   = useState<string | null>(null);
  const [questionScores, setQuestionScores]     = useState<Record<string, number>>({});
  const [totalScores, setTotalScores]           = useState<Record<string, number>>({});
  const [currentRoundName, setCurrentRoundName] = useState("");
  const [roundScores, setRoundScores]           = useState<Record<string, number>>({});
  const [finalScores, setFinalScores]           = useState<Record<string, FinalScore>>({});
  const [gameOutcome, setGameOutcome]           = useState<"winner" | "tie" | null>(null);
  const [winner, setWinner]                     = useState<string | null>(null);
  const [showConfetti, setShowConfetti]         = useState(false);
  const [canRematch, setCanRematch]             = useState(false);

  // ── Chat ────────────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput]       = useState("");
  const [unreadCount, setUnreadCount]   = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdIntervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef             = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const joinCalledRef     = useRef(false);
  const usernameRef       = useRef(username);
  const myWalletRef       = useRef(myWallet);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { myWalletRef.current = myWallet; }, [myWallet]);

  const [rematchInvite, setRematchInvite]             = useState<RematchInvite | null>(null);
  const [isRequestingRematch, setIsRequestingRematch] = useState(false);
  const [rematchPending, setRematchPending]           = useState(false);
  const [inviteCountdown, setInviteCountdown]         = useState<number | null>(null);
  const inviteTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rematchCountdown, setRematchCountdown]       = useState<number | null>(null);
  const rematchTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const rematchTimeoutRef = useRef<ReturnType<typeof setTimeout>  | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const myPlayerEntry = players.find((p) => p.walletAddress.toLowerCase() === myWallet);
  const myTxVerified  = myPlayerEntry?.txVerified ?? false;
  const myReady       = myPlayerEntry?.ready ?? false;
  const displayStake  = agreedStake ?? challenge?.stake;
  const totalPool     = challenge
    ? (agreedStake ? (parseFloat(agreedStake) * 2).toFixed(4) : (challenge.stake * 2).toFixed(4))
    : "0.0000";

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  const clearRematchTimers = useCallback(() => {
    if (rematchTimerRef.current)   clearInterval(rematchTimerRef.current);
    if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
    rematchTimerRef.current   = null;
    rematchTimeoutRef.current = null;
  }, []);

  useEffect(() => () => { if (inviteTimerRef.current)  clearInterval(inviteTimerRef.current);  }, []);
  useEffect(() => () => clearRematchTimers(), [clearRematchTimers]);
  useEffect(() => () => { if (cdIntervalRef.current)   clearInterval(cdIntervalRef.current);   }, []);

  const sendWhenReady = useCallback((payload: object) => {
    const ws = wsRef.current;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else if (ws.readyState === WebSocket.CONNECTING) {
      const onOpen = () => { ws.send(JSON.stringify(payload)); ws.removeEventListener("open", onOpen); };
      ws.addEventListener("open", onOpen);
    }
  }, []);

  // ── Profile ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userWalletAddress) return;
    fetch(`${API_BASE_URL}/api/players/${userWalletAddress}`)
      .then((r) => r.json())
      .then((d) => {
        setUsername(d.username ?? `User${userWalletAddress.slice(-4).toUpperCase()}`);
        setAvatarUrl(d.avatar_url ?? "");
      })
      .catch(() => setUsername(`User${userWalletAddress.slice(-4).toUpperCase()}`));
  }, [userWalletAddress]);

  // ── Load challenge ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!code) return;
    fetch(`${API_BASE_URL}/api/challenge/${code}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { toast.error("Challenge not found"); router.push("/challenge"); return; }
        setChallenge(d.challenge);
        // Store escrow address from challenge data
        if (d.challenge.escrowAddress || d.challenge.escrow_address) {
          setEscrowAddress(d.challenge.escrowAddress ?? d.challenge.escrow_address ?? "");
        }
        const playerEntries: PlayerState[] = Object.entries(d.challenge.players ?? {}).map(
          ([wallet, data]: [string, any]) => ({
            walletAddress: wallet,
            username:      data.username,
            points:        data.points,
            ready:         data.ready,
            txVerified:    data.txVerified,
            avatarUrl:     data.avatar_url ?? "",
          })
        );
        setPlayers(playerEntries);
        const amCreator = userWalletAddress &&
          d.challenge.creator?.toLowerCase() === userWalletAddress.toLowerCase();
        const alreadyIn = userWalletAddress &&
          Object.keys(d.challenge.players ?? {}).some(
            (w: string) => w.toLowerCase() === userWalletAddress.toLowerCase()
          );
        if (amCreator)    { setIsCreator(true); setHasJoined(true); }
        else if (alreadyIn) setHasJoined(true);

        if (d.challenge.status === "active")        setPhase("question");
        else if (d.challenge.status === "finished") {
          setPhase("game_over");
          const hydratedScores: Record<string, FinalScore> = {};
          Object.entries(d.challenge.players ?? {}).forEach(([wallet, data]: [string, any]) => {
            hydratedScores[wallet] = { username: data.username, points: data.points ?? 0 };
          });
          setFinalScores(hydratedScores);
          const c = d.challenge;
          const rawWinner = c.winner ?? c.winner_address ?? c.winnerAddress ?? null;
          const derivedWinner = (() => {
            if (rawWinner) return rawWinner;
            const entries = Object.entries(c.players ?? {}) as [string, any][];
            if (entries.length < 2) return null;
            const sorted = entries.sort(([, a], [, b]) => (b.points ?? 0) - (a.points ?? 0));
            if ((sorted[0][1].points ?? 0) === (sorted[1][1].points ?? 0)) return null;
            return sorted[0][0];
          })();
          setWinner(derivedWinner);
          setGameOutcome(derivedWinner ? "winner" : "tie");
          setCanRematch(!!c.canRematch);
        }
        else setPhase("lobby");
      })
      .catch(() => toast.error("Failed to load challenge"));
  }, [code, userWalletAddress, router]);

  // Fetch escrow address separately if not in challenge object
  useEffect(() => {
    if (escrowAddress || !code || phase === "loading" || phase === "game_over") return;
    getEscrowInfo(code)
      .then((info) => setEscrowAddress(info.escrowAddress))
      .catch(() => {});
  }, [code, escrowAddress, phase]);

  useEffect(() => {
    if (cameFromPreLobby && agreedStake && userWalletAddress && !hasJoined) setHasJoined(true);
  }, [cameFromPreLobby, agreedStake, userWalletAddress, hasJoined]);

  useEffect(() => {
    if (!cameFromPreLobby || !agreedStake || !userWalletAddress || !challenge || !username) return;
    if (joinCalledRef.current) return;
    const isCreatorWallet = challenge.creator?.toLowerCase() === userWalletAddress.toLowerCase();
    if (isCreatorWallet) return;
    joinCalledRef.current = true;
    fetch(`${API_BASE_URL}/api/challenge/${code}/join`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: userWalletAddress, username, txHash: "pre-lobby-agreed" }),
    })
      .then((r) => r.json())
      .then((d) => {
        setPlayers((prev) => {
          if (prev.some((p) => p.walletAddress.toLowerCase() === userWalletAddress.toLowerCase())) return prev;
          return [...prev, { walletAddress: userWalletAddress, username, points: 0, ready: false, txVerified: false, avatarUrl: avatarUrl ?? "" }];
        });
        if (!d.success) console.warn("[auto-join]", d.detail);
        else toast.info(`Stake agreed at ${agreedStake} ZEC — send ZEC to the escrow address to lock it in!`);
      })
      .catch((err) => console.error("[auto-join]", err));
  }, [cameFromPreLobby, agreedStake, userWalletAddress, challenge, code, username]);

  const handleInviteDismiss = useCallback(() => {
    if (inviteTimerRef.current) clearInterval(inviteTimerRef.current);
    inviteTimerRef.current = null;
    setInviteCountdown(null);
    setRematchInvite(null);
  }, []);

  // ── Timer ────────────────────────────────────────────────────────────────────
  const startTimer = useCallback((startedAt: number, limit: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const tick = () => {
      const rem = Math.max(0, limit - (Date.now() - startedAt) / 1000);
      setTimeLeft(rem);
      if (rem <= 0 && timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
    tick();
    timerRef.current = setInterval(tick, 200);
  }, []);

  const handleReady = useCallback(() => {
    if (!userWalletAddress) return;
    sendWhenReady({ type: "ready", walletAddress: userWalletAddress });
  }, [userWalletAddress, sendWhenReady]);

  // ── WebSocket ─────────────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (!code || !userWalletAddress) return;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const ws = new WebSocket(`${getWsBaseUrl()}/ws/challenge/${code}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      if (userWalletAddress) {
        ws.send(JSON.stringify({ type: "rejoin", walletAddress: userWalletAddress, code }));
      }
    };

    ws.onmessage = async (ev) => {
      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }

      const currentMyWallet = myWalletRef.current;
      const currentUsername = usernameRef.current;

      switch (msg.type) {
        case "state_sync": {
          const c = msg.challenge;
          setChallenge(c);
          if (c.escrowAddress || c.escrow_address) {
            setEscrowAddress(c.escrowAddress ?? c.escrow_address ?? "");
          }
          setPlayers((prev) => {
            const incoming: PlayerState[] = Object.entries(c.players ?? {}).map(([w, d]: [string, any]) => ({
              walletAddress: w, username: d.username, points: d.points,
              ready: d.ready, txVerified: d.txVerified, avatarUrl: d.avatar_url ?? "",
            }));
            if (prev.length === 0) return incoming;
            return incoming.map((newP) => {
              const existing = prev.find((p) => p.walletAddress.toLowerCase() === newP.walletAddress.toLowerCase());
              return existing ? { ...newP, txVerified: newP.txVerified || existing.txVerified } : newP;
            });
          });
          break;
        }
        case "player_joined": {
          const p = msg.player;
          if (msg.escrowAddress) setEscrowAddress(msg.escrowAddress);
          setPlayers((prev) => {
            if (prev.some((e) => e.walletAddress === p.walletAddress)) return prev;
            return [...prev, { walletAddress: p.walletAddress, username: p.username, points: 0, ready: false, txVerified: false, avatarUrl: p.avatar_url ?? "" }];
          });
          toast.info(`${p.username} joined the lobby!`);
          break;
        }
        case "stake_verified": {
          const wallet = msg.wallet.toLowerCase();
          setPlayers((prev) => {
            const exists = prev.some((p) => p.walletAddress.toLowerCase() === wallet);
            if (!exists) return [...prev, { walletAddress: wallet, username: currentUsername, points: 0, ready: false, txVerified: true, avatarUrl: "" }];
            return prev.map((p) => p.walletAddress.toLowerCase() === wallet ? { ...p, txVerified: true } : p);
          });
          if (wallet === currentMyWallet) {
            setStakeVerifying(false);
            setIsSyncing(false);
            setShowEscrowPanel(false);
            toast.success("Stake verified ✓ — click Ready!");
          }
          break;
        }
        case "stake_failed": {
          if (msg.wallet.toLowerCase() === currentMyWallet) {
            setStakeVerifying(false);
            setIsSyncing(false);
            toast.error("Stake verification failed. Please check your transaction and try again.");
          }
          break;
        }
        case "player_ready": {
          setPlayers((prev) => prev.map((p) =>
            p.walletAddress.toLowerCase() === msg.wallet.toLowerCase() ? { ...p, ready: true } : p
          ));
          break;
        }
        case "game_start": toast.success(msg.message || "Game starting!"); break;
        case "round_announce": {
          if (cdIntervalRef.current) { clearInterval(cdIntervalRef.current); cdIntervalRef.current = null; }
          setCurrentRoundName(msg.round);
          setPhase("countdown");
          setCountdownVal(3);
          cdIntervalRef.current = setInterval(() => {
            setCountdownVal((prev) => {
              if (prev <= 1) { clearInterval(cdIntervalRef.current!); cdIntervalRef.current = null; return prev; }
              return prev - 1;
            });
          }, 1000);
          break;
        }
        case "question": {
          if (timerRef.current)    { clearInterval(timerRef.current);    timerRef.current    = null; }
          if (cdIntervalRef.current) { clearInterval(cdIntervalRef.current); cdIntervalRef.current = null; }
          const localStart = Date.now();
          setCurrentQ({
            roundIndex: msg.roundIndex, questionIndex: msg.questionIndex,
            totalQuestions: msg.totalQuestions, question: msg.data.question,
            options: msg.data.options, timeLimit: msg.data.timeLimit, startedAt: localStart,
          });
          setSelectedId(null);
          setRevealCorrectId(null);
          setQuestionScores({});
          setPhase("question");
          startTimer(localStart, msg.data.timeLimit);
          break;
        }
        case "question_end": {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          setTimeLeft(0);
          setRevealCorrectId(msg.correctId);
          setQuestionScores(msg.questionScores ?? {});
          setTotalScores(msg.totalScores ?? {});
          setPlayers((prev) => prev.map((p) => ({ ...p, points: msg.totalScores?.[p.walletAddress] ?? p.points })));
          setPhase("reveal");
          break;
        }
        case "reconnect_countdown": {
          const isOpponent = msg.wallet?.toLowerCase() !== currentMyWallet;
          if (isOpponent) toast.warning(msg.secondsLeft > 0 ? `Opponent disconnected — ${msg.secondsLeft}s to reconnect` : "Opponent ran out of time — awarding forfeit…", { id: "reconnect-countdown", duration: 4000 });
          break;
        }
        case "player_rejoined": {
          if (msg.wallet?.toLowerCase() !== currentMyWallet) toast.success(`${msg.username} reconnected!`, { id: "reconnect-countdown" });
          break;
        }
        case "round_end":    setRoundScores(msg.scores ?? {}); setPhase("round_end"); break;
        case "game_over": {
          setFinalScores(msg.finalScores ?? {});
          setGameOutcome(msg.outcome);
          setWinner(msg.winner ?? null);
          setCanRematch(!!msg.canRematch);
          setPhase("game_over");
          if (msg.winner === currentMyWallet) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 6000); }
          break;
        }
        case "rematch_declined": { clearRematchTimers(); setRematchPending(false); setRematchCountdown(null); toast.error(`${msg.declinerName ?? "Opponent"} declined the rematch.`); break; }
        case "rematch_timeout":  { clearRematchTimers(); setRematchPending(false); setRematchCountdown(null); if (msg.requesterWallet?.toLowerCase() === currentMyWallet) toast.info("Rematch request expired."); break; }
        case "player_left":      { clearRematchTimers(); setRematchPending(false); setRematchCountdown(null); setRematchInvite(null); toast.error(`${msg.username ?? "Opponent"} has left.`); break; }
        case "chat":             { setChatMessages((prev) => [...prev, msg]); setUnreadCount((prev) => prev + 1); break; }
        case "rematch_invite": {
          if (msg.requesterWallet?.toLowerCase() !== currentMyWallet) {
            setRematchInvite({ originalCode: msg.originalCode, topic: msg.topic, stakeAmount: msg.stakeAmount, tokenSymbol: msg.tokenSymbol, requesterWallet: msg.requesterWallet, requesterName: msg.requesterName });
            setInviteCountdown(30);
            if (inviteTimerRef.current) clearInterval(inviteTimerRef.current);
            inviteTimerRef.current = setInterval(() => {
              setInviteCountdown((prev) => { if (prev === null || prev <= 1) { clearInterval(inviteTimerRef.current!); inviteTimerRef.current = null; setRematchInvite(null); return null; } return prev - 1; });
            }, 1000);
          }
          break;
        }
        case "rematch_invite_accepted": {
          if (msg.acceptorWallet?.toLowerCase() !== currentMyWallet) {
            clearRematchTimers(); setRematchPending(false); setRematchCountdown(null);
            toast.success(`${msg.acceptorName} accepted! Creating the challenge…`);
            await handleRematchCreate({ code, userWalletAddress: userWalletAddress!, challenge, router, setIsRequesting: setIsRequestingRematch });
          }
          break;
        }
        case "rematch_ready": {
          if (msg.requesterWallet?.toLowerCase() !== currentMyWallet) {
            toast.success("Rematch ready! Heading to pre-lobby…");
            router.push(`/challenge/${msg.newCode}/pre-lobby`);
          }
          break;
        }
      }
    };

    ws.onclose = (ev) => {
      if (ev.code === 1000 || ev.code === 1008) return;
      if (reconnectAttempts.current >= 5) { toast.error("Connection lost. Refresh."); return; }
      reconnectAttempts.current += 1;
      setTimeout(() => { if (wsRef.current?.readyState !== WebSocket.OPEN) connectWS(); }, 2000 * reconnectAttempts.current);
    };
  }, [code, userWalletAddress, startTimer, clearRematchTimers]);

  useEffect(() => {
    if (!userWalletAddress) return;
    connectWS();
    return () => { wsRef.current?.close(1000); wsRef.current = null; };
  }, [userWalletAddress, connectWS]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * handleStake — replaces the EVM stakeOnChain() flow.
   * Two paths:
   *   a) window.zcash injected → call sendStakeViaInjectedWallet() directly
   *   b) otherwise → show the manual EscrowPanel (copy address, QR link)
   */
  const handleStake = useCallback(async () => {
    if (!userWalletAddress || !challenge) return;
    const stakeAmt = agreedStake ? parseFloat(agreedStake) : challenge.stake;

    // Try injected wallet first
    if (hasInjectedZcashWallet() && escrowAddress) {
      setIsStaking(true);
      try {
        toast.info("Confirm the stake in your Zcash wallet…");
        const txid = await sendStakeViaInjectedWallet(escrowAddress, stakeAmt, code);
        if (txid) {
          // Record txid on backend (fire-and-forget)
          await notifyStakeSent(code, userWalletAddress, txid);
          // Join if not already in
          if (!hasJoined) {
            await fetch(`${API_BASE_URL}/api/challenge/${code}/join`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ walletAddress: userWalletAddress, username, txHash: txid }),
            });
            setHasJoined(true);
          }
          setStakeVerifying(true);
          toast.success("Transaction sent! Waiting for confirmation…");
          // Backend will emit stake_verified via WS once confirmed
          return;
        }
      } catch (err: any) {
        if (err?.code === 4001 || err?.message?.includes("rejected")) {
          toast.error("Transaction rejected.");
          return;
        }
        // Fall through to manual panel on other errors
        toast.info("Wallet error — showing manual send instead.");
      } finally {
        setIsStaking(false);
      }
    }

    // Fallback: show manual escrow panel
    if (!escrowAddress) {
      // Fetch if not yet loaded
      try {
        const info = await getEscrowInfo(code);
        setEscrowAddress(info.escrowAddress);
      } catch { toast.error("Could not load escrow address."); return; }
    }

    if (!hasJoined) {
      await fetch(`${API_BASE_URL}/api/challenge/${code}/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: userWalletAddress, username, txHash: "manual-pending" }),
      });
      setHasJoined(true);
    }

    setShowEscrowPanel(true);
  }, [userWalletAddress, challenge, hasJoined, code, username, escrowAddress, agreedStake]);

  /**
   * handleSyncStake — "I've sent it" button handler.
   * Calls syncStake() which hits /api/challenge/{code}/sync-stake
   * → zcashd getreceivedbyaddress().  Backend broadcasts stake_verified via WS.
   */
  const handleSyncStake = useCallback(async () => {
    if (!userWalletAddress || !challenge) return;
    setIsSyncing(true);
    try {
      const result = await syncStake(code, userWalletAddress);
      if (!result.verified && !result.alreadyVerified) {
        const balance = result.escrowBalance ?? 0;
        const needed  = result.expectedAmount ?? (displayStake ? parseFloat(String(displayStake)) : 0);
        toast.error(
          balance > 0
            ? `Only ${formatZEC(balance)} ZEC received — need ${formatZEC(needed)} ZEC. Check your transaction or wait for confirmation.`
            : "No ZEC received yet at the escrow address. Send the funds first, then try again."
        );
        setIsSyncing(false);
        return;
      }
      if (result.alreadyVerified) {
        toast.success("Stake already verified! Click 'I'm Ready' to continue.");
        setIsSyncing(false);
        setShowEscrowPanel(false);
      }
      // If freshly verified, WS stake_verified event will fire and clear isSyncing
    } catch (err: any) {
      toast.error(err?.message ?? "Could not verify stake.");
      setIsSyncing(false);
    }
  }, [userWalletAddress, challenge, code, displayStake]);

  const handleSelectAnswer = useCallback((optId: string) => {
    if (!currentQ || timeLeft <= 0 || phase === "reveal") return;
    const timeTaken = currentQ.timeLimit - timeLeft;
    wsRef.current?.send(JSON.stringify({
      type: "submit_answer", walletAddress: userWalletAddress,
      roundIndex: currentQ.roundIndex, questionIndex: currentQ.questionIndex,
      answerId: optId, timeTaken,
    }));
    setSelectedId(optId);
  }, [currentQ, timeLeft, phase, userWalletAddress]);

  const handleSendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "chat", walletAddress: userWalletAddress, username, text }));
    setChatInput("");
  }, [chatInput, userWalletAddress, username]);

  const handleRefresh = useCallback(async () => {
    if (!code || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/challenge/${code}`);
      const d = await r.json();
      if (!d.success) { toast.error("Could not refresh lobby"); return; }
      setChallenge(d.challenge);
      if (d.challenge.escrowAddress || d.challenge.escrow_address) {
        setEscrowAddress(d.challenge.escrowAddress ?? d.challenge.escrow_address ?? "");
      }
      const incoming: PlayerState[] = Object.entries(d.challenge.players ?? {}).map(
        ([wallet, data]: [string, any]) => ({
          walletAddress: wallet, username: data.username, points: data.points,
          ready: data.ready, txVerified: data.txVerified, avatarUrl: data.avatar_url ?? "",
        })
      );
      setPlayers((prev) =>
        incoming.map((newP) => {
          const existing = prev.find((p) => p.walletAddress.toLowerCase() === newP.walletAddress.toLowerCase());
          return existing?.avatarUrl ? { ...newP, avatarUrl: existing.avatarUrl } : newP;
        })
      );
      toast.success("Lobby refreshed");
    } catch { toast.error("Refresh failed"); }
    finally { setIsRefreshing(false); }
  }, [code, isRefreshing]);

  // Avatar hydration
  const avatarKey = players.map((p) => `${p.walletAddress}:${p.avatarUrl}`).join("|");
  useEffect(() => {
    if (players.length === 0) return;
    const missing = players.filter((p) => !p.avatarUrl);
    if (missing.length === 0) return;
    missing.forEach((p) => {
      fetch(`${API_BASE_URL}/api/players/${p.walletAddress}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.avatar_url) {
            setPlayers((prev) => prev.map((pl) =>
              pl.walletAddress.toLowerCase() === p.walletAddress.toLowerCase()
                ? { ...pl, avatarUrl: d.avatar_url }
                : pl
            ));
          }
        }).catch(() => {});
    });
  }, [avatarKey]);

  const globalOverlays = (
    <>
      {rematchInvite && (
        <RematchPopup
          invite={rematchInvite}
          myWallet={myWallet}
          onDismiss={handleInviteDismiss}
          countdown={inviteCountdown}
        />
      )}
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER — early returns AFTER all hooks
  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header pageTitle="Challenge" />
        <Loading />
      </div>
    );
  }

  if (phase === "game_over") {
    const sortedPlayers = Object.entries(finalScores).sort(([, a], [, b]) => b.points - a.points);
    const isTie     = gameOutcome === "tie";
    const isWinner  = winner === myWallet;

    if (sortedPlayers.length === 0) {
      return (
        <div className="flex flex-col min-h-screen bg-background">
          <Header pageTitle="Challenge" />
          <div className="flex flex-col items-center justify-center flex-1 gap-3 px-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Loading results…</p>
          </div>
        </div>
      );
    }

    return (
      <>
        {globalOverlays}
        <div className="fixed inset-0 bg-background flex flex-col overflow-auto">
          <Confetti active={showConfetti} />
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
            <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
              <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-bold transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <Badge variant="outline" className="font-mono">{code}</Badge>
            </div>
          </div>

          <div className="max-w-2xl mx-auto w-full px-4 py-8 pb-24 space-y-5">
            <div className="text-center space-y-2">
              <div className="text-6xl">{isTie ? "🤝" : isWinner ? "🏆" : "🎯"}</div>
              <h1 className="text-3xl font-black text-foreground">
                {isTie ? "It's a tie!" : isWinner ? "You won!" : "Game over"}
              </h1>
              <p className="text-muted-foreground text-sm">{challenge?.topic}</p>
              <div className="inline-flex items-center gap-1.5 bg-muted/50 border border-border rounded-full px-3 py-1 text-xs font-bold text-muted-foreground">
                <span className="font-mono">{code}</span>
                <span>·</span>
                <span>{formatZEC(challenge?.stake ?? 0)} ZEC each</span>
                <span>·</span>
                <span className="text-primary">🏆 {totalPool} ZEC pool</span>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-blue-500" /> Final Leaderboard
                </h2>
              </div>
              <div className="divide-y divide-border">
                {sortedPlayers.map(([wallet, data], i) => {
                  const isMe        = wallet.toLowerCase() === myWallet;
                  const isThisWinner = wallet.toLowerCase() === winner?.toLowerCase();
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={wallet} className={cn("flex items-center gap-3 px-4 py-4", isMe && "bg-blue-50 dark:bg-blue-950/20")}>
                      <div className="text-xl w-8 text-center shrink-0">{medals[i] ?? `${i + 1}`}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-foreground text-sm">{data.username}</p>
                          {isMe         && <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground border-0">YOU</Badge>}
                          {isThisWinner && <Badge className="text-[9px] h-4 px-1.5 bg-blue-400 text-blue-900 border-0">WINNER</Badge>}
                          {isTie        && <Badge variant="outline" className="text-[9px] h-4 px-1.5">TIE</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{wallet.slice(0, 6)}…{wallet.slice(-4)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-2xl text-foreground leading-none">{data.points}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payout note — no claim button needed on Zcash */}
            <div className={cn("rounded-2xl p-4 border text-center space-y-1", isWinner ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" : isTie ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200" : "bg-muted/50 border-border")}>
              <p className="text-sm font-bold text-foreground">
                {isWinner ? "🏆 Payout sent automatically" : isTie ? "🤝 Refund sent automatically" : "💸 Payout sent to winner"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isWinner
                  ? `${totalPool} ZEC was sent directly to your Zcash address by the backend.`
                  : isTie
                  ? "Your stake was refunded to your Zcash address."
                  : "The winner's payout was sent by the backend automatically."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {canRematch && (
                <button
                  onClick={() => sendRematchInvite({ code, userWalletAddress: userWalletAddress!, setRematchPending, setRematchCountdown, rematchTimerRef, rematchTimeoutRef })}
                  disabled={isRequestingRematch || rematchPending}
                  className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-base hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {rematchPending
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Waiting{rematchCountdown !== null && rematchCountdown > 0 ? ` (${rematchCountdown}s)` : "…"}</>
                    : isRequestingRematch
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating challenge…</>
                    : <>🔁 Request Rematch</>}
                </button>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12" onClick={() => router.push("/challenge")}>
                  <Home className="mr-2 h-4 w-4" /> Hub
                </Button>
                <Button variant="outline" className="flex-1 h-12" onClick={() => router.push("/challenge/create-challenge")}>
                  <Plus className="mr-2 h-4 w-4" /> New
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (phase === "countdown") {
    return (
      <>
        {globalOverlays}
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-xl uppercase tracking-widest font-black">Round: {currentRoundName}</p>
            <div key={countdownVal} className="text-[10rem] font-black text-primary leading-none" style={{ animation: "zoomFade 0.9s ease-out forwards" }}>
              {countdownVal}
            </div>
          </div>
          <style>{`@keyframes zoomFade{0%{transform:scale(1.5);opacity:0}30%{transform:scale(1);opacity:1}80%{opacity:1}100%{transform:scale(0.8);opacity:0}}`}</style>
        </div>
      </>
    );
  }

  if ((phase === "question" || phase === "reveal") && currentQ) {
    const isReveal = phase === "reveal";
    return (
      <div className="fixed inset-0 bg-background flex flex-col overflow-hidden z-40">
        {!isReveal && <LinearTimer seconds={timeLeft} total={currentQ.timeLimit} />}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
          <Badge variant="outline" className="font-mono">Q{currentQ.questionIndex + 1}/{currentQ.totalQuestions}</Badge>
          <span className="text-xs font-bold text-muted-foreground capitalize">{currentRoundName} round</span>
          <div className="flex items-center gap-1 font-bold text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">
            <Zap className="h-3.5 w-3.5" /> {myPlayerEntry?.points ?? 0}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
          <h2 className={cn("font-bold text-foreground leading-snug max-w-xl transition-all duration-500", isReveal ? "text-xl mb-6" : "text-2xl md:text-3xl")}>
            {currentQ.question}
          </h2>
          {isReveal && (
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl mb-6">
                <div className="bg-muted/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">Current Standings</div>
                <div className="divide-y divide-border">
                  {[...players].sort((a, b) => b.points - a.points).map((p, i) => (
                    <div key={p.walletAddress} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-muted-foreground w-4">{i + 1}</span>
                        <Avatar className="h-6 w-6"><AvatarImage src={p.avatarUrl || undefined} /><AvatarFallback className="text-[8px]">{p.username.slice(0, 2)}</AvatarFallback></Avatar>
                        <span className={cn("text-sm font-bold", p.walletAddress.toLowerCase() === myWallet ? "text-primary" : "text-foreground")}>{p.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {questionScores[p.walletAddress] > 0 && <span className="text-[10px] font-black text-emerald-500 animate-bounce">+{questionScores[p.walletAddress]}</span>}
                        <span className="font-black text-sm">{p.points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {isReveal && (
          <div className="flex justify-center px-4 pb-4 shrink-0">
            <div className={cn("px-8 py-3 rounded-full font-black text-lg border-2 shadow-lg animate-in zoom-in duration-300", selectedId === revealCorrectId ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-400" : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-400")}>
              {selectedId === revealCorrectId ? "✓ Correct!" : "✗ Incorrect"}
            </div>
          </div>
        )}
        <div className="w-full max-w-2xl mx-auto px-4 grid grid-cols-2 gap-3 pb-8 shrink-0">
          {currentQ.options.map((opt) => {
            const style      = OPTION_STYLES[opt.id] ?? OPTION_STYLES.A;
            const isSelected = selectedId === opt.id;
            const isCorrect  = isReveal && opt.id === revealCorrectId;
            const isWrong    = isReveal && isSelected && opt.id !== revealCorrectId;
            return (
              <button
                key={opt.id}
                disabled={isReveal || timeLeft <= 0}
                onClick={() => handleSelectAnswer(opt.id)}
                className={cn(
                  "relative flex items-center justify-between rounded-2xl text-white font-bold transition-all duration-150 shadow-md px-3 py-4",
                  style.bg,
                  isSelected && !isReveal && `ring-4 ${style.ring} ring-offset-2 ring-offset-background scale-[1.02] z-10`,
                  isReveal && !isCorrect && !isWrong && "opacity-40 grayscale",
                  isCorrect && "ring-4 ring-white brightness-110",
                  isWrong   && "opacity-70 ring-4 ring-red-400",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-90">{style.shape}</span>
                  <span className="leading-tight text-left text-sm">{opt.text}</span>
                </div>
                {isCorrect && <Check className="h-4 w-4 shrink-0" />}
                {isWrong   && <X    className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        <FloatingChat messages={chatMessages} myWallet={myWallet} chatInput={chatInput} setChatInput={setChatInput} onSend={handleSendChat} chatBottomRef={chatBottomRef} unreadCount={unreadCount} />
      </div>
    );
  }

  if (phase === "round_end") {
    const sorted = Object.entries(roundScores).sort(([, a], [, b]) => b - a);
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl">📊</div>
          <h2 className="text-2xl font-black text-foreground">Round {currentRoundName} complete</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {sorted.map(([wallet, pts], i) => {
              const player = players.find((p) => p.walletAddress === wallet);
              const isMe   = wallet.toLowerCase() === myWallet;
              return (
                <div key={wallet} className={cn("flex items-center gap-3 px-4 py-3 border-b border-border last:border-0", isMe && "bg-primary/5")}>
                  <span className="font-black text-muted-foreground w-4">{i + 1}</span>
                  <span className="flex-1 text-left font-bold text-foreground text-sm">
                    {player?.username ?? wallet.slice(0, 8)}
                    {isMe && <Badge className="ml-2 text-[9px] h-4 px-1 bg-primary text-primary-foreground border-0">YOU</Badge>}
                  </span>
                  <span className="font-black text-lg text-foreground">{pts}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground animate-pulse">Next round starting…</p>
        </div>
      </div>
    );
  }

  const amCreator = challenge && userWalletAddress &&
    challenge.creator?.toLowerCase() === userWalletAddress.toLowerCase();

  if (!hasJoined && !amCreator && phase === "lobby") {
    if (typeof window !== "undefined") router.replace(`/challenge/${code}/pre-lobby`);
    return null;
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  const allVerified = players.length >= 2 && players.every((p) => p.txVerified);
  const allReady    = allVerified && players.every((p) => p.ready);

  return (
    <>
      {rematchInvite && (
        <RematchPopup invite={rematchInvite} myWallet={myWallet} onDismiss={handleInviteDismiss} countdown={inviteCountdown} />
      )}
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/challenge")} className="hover:bg-muted p-2 rounded-full transition-colors"><ArrowLeft className="h-5 w-5" /></button>
              <button onClick={handleRefresh} disabled={isRefreshing} className="hover:bg-muted p-2 rounded-full transition-colors disabled:opacity-50">
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black tracking-tighter">{code}</p>
                  <Badge variant="secondary" className="text-[10px] uppercase">ZEC</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{challenge?.topic}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-2xl flex flex-col items-center min-w-[90px]">
                <p className="text-[9px] font-black text-primary uppercase leading-none mb-1">Total Pool</p>
                <p className="text-xl font-black text-primary leading-none">{totalPool} <span className="text-xs">ZEC</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full px-4 py-6 pb-32 space-y-5">
          {/* Players */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Players
              </h2>
              {allReady && (
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Both ready — starting!
                </span>
              )}
            </div>
            {players.length === 0
              ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground text-sm">Waiting for opponent…</p>
                </div>
              )
              : (
                <div className="grid grid-cols-2 gap-3 p-4">
                  {players.map((p) => {
                    const isMe   = p.walletAddress.toLowerCase() === myWallet;
                    const isHost = p.walletAddress.toLowerCase() === challenge?.creator?.toLowerCase();
                    const statusLabel = (() => {
                      if (p.ready)       return { text: "Ready ✓",       cls: "text-emerald-500" };
                      if (p.txVerified)  return { text: "Stake verified", cls: "text-primary"   };
                      return               { text: "Awaiting stake…",    cls: "text-muted-foreground" };
                    })();
                    return (
                      <div key={p.walletAddress} className={cn("flex flex-col items-center gap-2 rounded-2xl p-4 border text-center transition-colors", p.ready ? "border-emerald-400/40 bg-emerald-500/5" : p.txVerified ? "border-blue-400/30 bg-blue-500/5" : "border-border bg-muted/20")}>
                        <Avatar className="h-14 w-14 border-2 border-border">
                          <AvatarImage src={p.avatarUrl || undefined} />
                          <AvatarFallback className="font-bold text-base">{p.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-black text-foreground text-sm">{p.username}</p>
                        <p className={cn("text-[10px] font-semibold", statusLabel.cls)}>{statusLabel.text}</p>
                        <div className="flex gap-1 flex-wrap justify-center">
                          {isMe   && <Badge className="text-[9px] h-4 px-1 bg-primary text-primary-foreground border-0">YOU</Badge>}
                          {isHost && <Badge variant="outline" className="text-[9px] h-4 px-1">Host</Badge>}
                        </div>
                      </div>
                    );
                  })}
                  {players.length < 2 && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl p-4 border border-dashed border-border text-center">
                      <div className="h-14 w-14 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                        <Users className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                      <p className="font-bold text-muted-foreground/50 text-sm">Waiting…</p>
                    </div>
                  )}
                </div>
              )}
          </div>

          {players.length < 2 && (
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/challenge/${code}`); toast.success("Invite link copied!"); }}
              className="w-full h-11 rounded-2xl border border-border bg-card text-sm font-bold hover:bg-muted transition-all flex items-center justify-center gap-2 text-foreground"
            >
              <Share2 className="h-4 w-4" /> Copy invite link
            </button>
          )}

          {/* Staking actions */}
          {hasJoined && (
            <div className="space-y-3 pt-2">
              {!myTxVerified && !showEscrowPanel && (
                <>
                  <Button
                    className="w-full h-16 text-lg font-black rounded-2xl shadow-[0_4px_0_rgb(30,80,200)] active:translate-y-1 active:shadow-none transition-all"
                    onClick={handleStake}
                    disabled={isStaking || stakeVerifying}
                  >
                    {isStaking
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Confirming…</>
                      : stakeVerifying
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying…</>
                      : <><Zap className="mr-2 h-6 w-6" /> Stake {displayStake ? `${formatZEC(parseFloat(String(displayStake)))} ZEC` : "…"} to Play</>}
                  </Button>
                  <button
                    onClick={handleSyncStake}
                    disabled={isSyncing}
                    className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors py-1"
                  >
                    {isSyncing ? "Checking on-chain…" : "Already sent? Verify my stake"}
                  </button>
                </>
              )}

              {/* Manual escrow panel — shown when no injected wallet */}
              {!myTxVerified && showEscrowPanel && escrowAddress && (
                <EscrowPanel
                  escrowAddress={escrowAddress}
                  stakeAmount={displayStake ? parseFloat(String(displayStake)) : (challenge?.stake ?? 0)}
                  token="ZEC"
                  challengeCode={code}
                  onSent={handleSyncStake}
                  isSyncing={isSyncing}
                />
              )}

              {myTxVerified && !myReady && (
                <Button
                  className="w-full h-16 text-lg font-black rounded-2xl shadow-[0_4px_0_rgb(16,120,60)] active:translate-y-1 active:shadow-none transition-all"
                  onClick={handleReady}
                >
                  <Check className="mr-2 h-6 w-6" /> I'm Ready
                </Button>
              )}

              {myReady && (
                <div className={cn("w-full h-16 flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed", allReady ? "bg-emerald-500/10 border-emerald-500/50" : "bg-muted/50 border-border")}>
                  <Loader2 className={cn("h-5 w-5 animate-spin", allReady ? "text-emerald-500" : "text-primary")} />
                  <span className={cn("font-bold uppercase tracking-widest text-sm", allReady ? "text-emerald-500" : "text-muted-foreground")}>
                    {allReady ? "Game Starting..." : "Waiting for Opponent..."}
                  </span>
                </div>
              )}

              {/* Security info */}
              {!myTxVerified && (
                <div className="flex gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4">
                  <div className="shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-0">
                    <p className="text-xs font-black text-blue-800 dark:text-blue-200 uppercase tracking-wide">Zcash Escrow</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-blue-600 dark:text-primary">Your stake</span>
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-200 font-mono">
                          {displayStake ? formatZEC(parseFloat(String(displayStake))) : "…"} ZEC
                        </span>
                      </div>
                      <div className="h-px bg-blue-200 dark:bg-blue-800/60" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-blue-600 dark:text-primary">Winner takes</span>
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-200 font-mono">{totalPool} ZEC</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-blue-500 leading-relaxed pt-0.5">
                      Funds are held in a zcashd escrow address. Payout is automatic when the game ends — no claim step needed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {userWalletAddress && (
          <FloatingChat
            messages={chatMessages} myWallet={myWallet}
            chatInput={chatInput} setChatInput={setChatInput}
            onSend={handleSendChat} chatBottomRef={chatBottomRef}
            unreadCount={unreadCount}
          />
        )}
      </div>
    </>
  );
}