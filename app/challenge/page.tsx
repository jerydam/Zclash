"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { Header } from "@/components/header";
import {
  Plus, Trophy, Loader2, Gamepad2,
  RefreshCw, ChevronRight, Zap,
} from "lucide-react";
import { toast } from "sonner";
import Loading from "../loading/page";
import { formatZEC } from "@/lib/zcash";
import ZClashLoading from "@/components/loading";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://zclash-backend.onrender.com";

interface LobbyChallenge {
  code: string;
  topic: string;
  stake_amount: number;
  token_symbol: string;
  created_at: string;
  creator_username: string;
}

interface HistoryChallenge {
  code: string;
  topic: string;
  stake_amount: number;
  token_symbol: string;
  status: "waiting" | "active" | "finished";
  winner_address: string | null;
  created_at: string;
  finished_at: string | null;
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function QuizListPage() {
  const router = useRouter();
  const { address: userWalletAddress } = useWallet();

  const [tab, setTab] = useState<"lobby" | "history">("lobby");
  const [history, setHistory] = useState<HistoryChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [navigating, setNavigating] = useState<string | null>(null);
  const [showFullModal, setShowFullModal] = useState(false);

  const fetchLobby = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const r = await fetch(`${API_BASE_URL}/api/duel/lobby`);
      const d = await r.json();
      if (d.success) setLobbyChallenges((d.duels ?? d.challenges ?? []) as LobbyChallenge[]);

    } catch {
      toast.error("Failed to sync lobby");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  const [lobbyChallenges, setLobbyChallenges] = useState<LobbyChallenge[]>([]);
  const fetchHistory = async () => {
    if (!userWalletAddress) return;
    setHistoryLoading(true);
    try {
      const r = await fetch(
        `${API_BASE_URL}/api/duel/${userWalletAddress.toLowerCase()}/history?limit=50`
      );
      const d = await r.json();
      if (d.success)
        setHistory((d.history ?? []).filter((h: HistoryChallenge) => h.status === "finished"));
    } catch {
      toast.error("Failed to load match history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { fetchLobby(); }, []);
  useEffect(() => { if (tab === "history" && userWalletAddress) fetchHistory(); }, [tab, userWalletAddress]);
  useEffect(() => {
    if (tab !== "lobby") return;
    const t = setInterval(() => fetchLobby(true), 15000);
    return () => clearInterval(t);
  }, [tab]);

  const myWallet = userWalletAddress?.toLowerCase() ?? "";
  const wins = useMemo(
    () => history.filter((h) => h.winner_address?.toLowerCase() === myWallet),
    [history, myWallet]
  );

  const handleJoinAction = async (code: string) => {
    if (code.length < 4) return;
    setNavigating(code);
    if (!userWalletAddress) {
      router.push(`/challenge/${code}/pre-lobby`);
      setNavigating(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/duel/${code}`);
      const data = await res.json();
      if (data.success && data.challenge) {
        const c = data.challenge;
        const w = userWalletAddress.toLowerCase();
        const playerKeys = Object.keys(c.players || {});
        const isCreator = c.creator?.toLowerCase() === w;
        const isPlayer = playerKeys.some((p: string) => p.toLowerCase() === w);
        const isFull = playerKeys.length >= 2;
        if (isCreator || isPlayer) { router.push(`/challenge/${code}`); return; }
        if (isFull) { setShowFullModal(true); setNavigating(null); return; }
        if (c.status === "active" || c.status === "finished") {
          toast.error("This challenge is no longer open.");
          setNavigating(null);
          return;
        }
        router.push(`/challenge/${code}/pre-lobby`);
      } else {
        router.push(`/challenge/${code}/pre-lobby`);
      }
    } catch {
      router.push(`/challenge/${code}/pre-lobby`);
    }
  };

  return (
    <div className="bg-background text-foreground min-h-screen" style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      <Header pageTitle="Duel Arena" />

      <div className="flex flex-col gap-4 p-5">

        {/* Hero + Quick Join */}
        <div className="zcash-glow rounded-2xl p-5" style={{ background: "hsl(var(--primary))" }}>
          <h1 className="font-black text-4xl leading-none mb-1" style={{ fontFamily: "'Big Shoulders Display', sans-serif", color: "hsl(var(--primary-foreground))" }}>
            STAKE <span className="opacity-70">&</span> EARN
          </h1>
          <p className="text-xs mb-4" style={{ color: "hsla(var(--primary-foreground) / 0.7)" }}>
            Zcash-powered 1v1 quizzes. Winner takes the pool.
          </p>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoinAction(codeInput)}
              placeholder="ROOM CODE"
              maxLength={8}
              className="flex-1 h-12 rounded-xl px-4 text-sm font-bold font-mono outline-none"
              style={{
                border: "1.5px solid hsla(var(--primary-foreground) / 0.25)",
                background: "hsla(var(--primary-foreground) / 0.12)",
                color: "hsl(var(--primary-foreground))",
              }}
            />
            <button
              onClick={() => handleJoinAction(codeInput)}
              disabled={!codeInput || navigating !== null}
              className="h-12 px-5 rounded-xl font-black text-sm flex items-center gap-1.5 flex-shrink-0 transition-opacity"
              style={{
                background: "hsl(var(--primary-foreground))",
                color: "hsl(var(--primary))",
                opacity: !codeInput ? 0.6 : 1,
              }}
            >
              {navigating === codeInput
                ? <Loader2 size={16} className="animate-spin" />
                : <><Zap size={14} />DUEL</>}
            </button>
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={() => router.push("/challenge/create-challenge")}
          className="dd-btn w-full h-12 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Create Challenge
        </button>

        {/* Tab + Refresh row */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex p-1 rounded-xl border border-border bg-muted">
            {(["lobby", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                style={{
                  background: tab === t ? "hsl(var(--primary))" : "transparent",
                  color: tab === t ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t === "lobby" ? "PUBLIC" : "MY WINS"}
              </button>
            ))}
          </div>
          <button
            onClick={() => (tab === "lobby" ? fetchLobby(true) : fetchHistory())}
            disabled={isRefreshing || historyLoading}
            className="w-10 h-10 rounded-full border border-border bg-muted flex items-center justify-center flex-shrink-0 cursor-pointer"
          >
            <RefreshCw
              size={15}
              className={`text-primary ${isRefreshing || historyLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* LOBBY TAB */}
        {tab === "lobby" && (
          isLoading
            ?  <ZClashLoading context="tournament_list" hideVsBadge />
            : lobbyChallenges.length === 0
            ? (
              <div className="flex flex-col items-center py-12 gap-3 border-2 border-dashed border-border rounded-2xl text-center">
                <Gamepad2 size={40} className="text-muted-foreground" />
                <p className="text-lg font-black text-muted-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>No active duels</p>
                <p className="text-sm text-muted-foreground">Be first to create a public ZEC challenge.</p>
                <button
                  className="dd-btn px-6 py-2.5 rounded-xl text-sm mt-1"
                  onClick={() => router.push("/challenge/create-challenge")}
                >
                  Start Duel
                </button>
              </div>
            )
            : (
              <div className="flex flex-col gap-2.5">
                {lobbyChallenges.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleJoinAction(c.code)}
                    className="text-left w-full p-4 rounded-2xl border border-border bg-card hover:border-primary hover:-translate-y-0.5 transition-all cursor-pointer zcash-glow-sm"
                  >
                    <div className="flex items-start justify-between gap-2.5 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black truncate text-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
                          {c.topic}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">@{c.creator_username}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase flex-shrink-0 bg-primary text-primary-foreground">
                        Join Pool
                      </span>
                    </div>
                    <div className="flex items-center border-t border-b border-border py-2.5 mb-2.5">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Entry</p>
                        <p className="text-base font-black text-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
                          {formatZEC(c.stake_amount)} ZEC
                        </p>
                      </div>
                      <div className="w-px bg-border self-stretch" />
                      <div className="flex-1 text-center">
                        <p className="text-xs text-primary font-bold uppercase tracking-widest mb-0.5">Prize Pool</p>
                        <p className="text-base font-black text-primary" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
                          🏆 {formatZEC(c.stake_amount * 2)} ZEC
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">#{c.code}</span>
                      <div className="flex items-center gap-1 text-primary text-xs font-black">
                        {navigating === c.code
                          ? <Loader2 size={13} className="animate-spin" />
                          : <>CHALLENGE<ChevronRight size={12} /></>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
        )}

        {/* MY WINS TAB */}
        {tab === "history" && (
          !userWalletAddress
            ? (
              <div className="flex flex-col items-center py-12 gap-3 border border-border rounded-2xl text-center">
                <Trophy size={40} className="text-muted-foreground" />
                <p className="text-sm font-bold text-muted-foreground">Connect your wallet to see your wins.</p>
              </div>
            )
            : historyLoading
            ? <div className="flex justify-center py-12"><Loading /></div>
            : (
              <>
                {history.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Played", val: history.length, className: "text-foreground" },
                      { label: "Won", val: wins.length, className: "text-primary" },
                      { label: "Win Rate", val: `${history.length > 0 ? Math.round((wins.length / history.length) * 100) : 0}%`, className: "text-primary" },
                    ].map((s) => (
                      <div key={s.label} className="border border-border rounded-2xl bg-card p-3.5 text-center">
                        <p className={`text-2xl font-black ${s.className}`} style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>{s.val}</p>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {wins.length === 0
                  ? (
                    <div className="flex flex-col items-center py-10 gap-2.5 border-2 border-dashed border-border rounded-2xl text-center">
                      <Trophy size={36} className="text-muted-foreground" />
                      <p className="text-base font-black text-muted-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
                        {history.length === 0 ? "No matches played yet." : "No wins yet — keep playing!"}
                      </p>
                      {history.length === 0 && (
                        <button className="dd-btn px-5 py-2.5 rounded-xl text-xs mt-1" onClick={() => setTab("lobby")}>
                          Find a Challenge
                        </button>
                      )}
                    </div>
                  )
                  : (
                    <div className="flex flex-col gap-2">
                      {wins.map((item) => (
                        <button
                          key={item.code}
                          onClick={() => router.push(`/challenge/${item.code}`)}
                          className="flex items-center gap-3 p-3.5 rounded-2xl border zcash-border bg-primary/5 cursor-pointer text-left w-full hover:bg-primary/10 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-primary/10 border zcash-border flex items-center justify-center">
                            <Trophy size={15} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{item.topic}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              #{item.code}{item.finished_at && ` · ${timeAgo(item.finished_at)}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-primary/10 zcash-border text-primary">WON</span>
                            <span className="text-xs font-bold text-muted-foreground">{formatZEC(item.stake_amount)} ZEC</span>
                            <span className="text-xs font-black text-primary">+{formatZEC(item.stake_amount * 2)} ZEC</span>
                          </div>
                          <ChevronRight size={13} className="text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
              </>
            )
        )}
      </div>

      {/* Floating Support Button */}
      <button
        onClick={() => router.push("/support")}
        className="fixed bottom-24 right-5 w-11 h-11 rounded-full bg-primary text-primary-foreground border-none cursor-pointer flex items-center justify-center zcash-glow z-50 hover:-translate-y-1 transition-transform"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>

      {showFullModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] px-6">
          <div className="bg-card border border-border rounded-2xl p-7 max-w-sm w-full text-center">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-black text-foreground mb-2" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>Challenge Full</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              This duel already has two players. Create your own challenge to start a new game.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                className="dd-btn h-12 rounded-xl text-sm"
                onClick={() => { setShowFullModal(false); router.push("/challenge/create-challenge"); }}
              >
                Create New Challenge
              </button>
              <button
                className="dd-btn-ghost h-10 rounded-xl text-sm"
                onClick={() => setShowFullModal(false)}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}