"use client";
/**
 * app/dashboard/[username]/page.tsx  (Zcash edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * Changes from EVM version
 * ────────────────────────
 *   REMOVED  usePrivy — no Privy on Zcash build
 *   REMOVED  Privy email / phone / Google avatar extraction
 *   REMOVED  EVM address format checks (0x…)
 *   CHANGED  useWallet from "@/components/zcash-wallet-provider"
 *   CHANGED  isAddress check: now uses t-address format (t1/t3, length 35)
 *   KEPT     all UI, stats, tier system, history tabs, profile editing
 */

import React, {
  useEffect, useState, useMemo, useCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@/components/zcash-wallet-provider";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Wallet, Copy, Pencil, Mail, Phone, Trophy,
  Swords, Loader2, ChevronRight, Crown,
  CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ProfileSettingsModal } from "@/components/profile-settings-modal";
import Loading from "@/app/loading";
import { cn } from "@/lib/utils";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfileData {
  wallet_address: string;
  username:       string;
  email?:         string;
  phone?:         string;
  bio?:           string;
  avatar_url?:    string;
}

interface ChallengeHistoryItem {
  code:             string;
  topic:            string;
  stake_amount:     number;
  token_symbol:     string;
  status:           "waiting" | "active" | "finished";
  winner_address:   string | null;
  created_at:       string;
  finished_at:      string | null;
  opponent_username?: string;
}

type FinishedGame = ChallengeHistoryItem & { status: "finished" };
type HistoryTab   = "all" | "won";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n % 1 === 0 ? n.toString() : n.toFixed(n < 1 ? 2 : 1);
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Zcash t-address: starts with t1 or t3, length 35 */
function isTAddress(s: string) {
  return s.length === 35 && (s.startsWith("t1") || s.startsWith("t3") || s.startsWith("tm") || s.startsWith("t2"));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ icon: Icon, label, value, accent }: {
  icon:    React.ElementType;
  label:   string;
  value:   string | number;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl bg-muted/40 border border-border">
      <Icon className={cn("h-3.5 w-3.5", accent ?? "text-muted-foreground")} />
      <span className="text-sm font-black text-foreground tabular-nums">{value}</span>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none text-center">
        {label}
      </span>
    </div>
  );
}

function ChallengeRow({
  item, myWallet, onClick,
}: {
  item:     FinishedGame;
  myWallet: string;
  onClick:  () => void;
}) {
  const isWinner = item.winner_address?.toLowerCase() === myWallet;
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all text-left"
    >
      <div className={cn(
        "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
        isWinner ? "bg-blue-500/10 border-blue-400/30" : "bg-muted/40 border-border",
      )}>
        {isWinner
          ? <Trophy className="h-4 w-4 text-blue-500" />
          : <XCircle className="h-4 w-4 text-muted-foreground/50" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">{item.topic}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.opponent_username && (
            <span className="text-[10px] text-muted-foreground">vs {item.opponent_username}</span>
          )}
          <span className="text-[10px] text-muted-foreground/60 font-mono">{item.code}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black",
          isWinner
            ? "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-400/30"
            : "text-muted-foreground bg-muted/30 border-border",
        )}>
          {isWinner ? "Won" : "Lost"}
        </span>
        <span className="text-[10px] text-muted-foreground font-bold tabular-nums">
          {fmt(item.stake_amount)} ZEC
        </span>
        {item.finished_at && (
          <span className="text-[9px] text-muted-foreground/50">{timeAgo(item.finished_at)}</span>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 transition-colors" />
    </button>
  );
}

// ── Tier system ───────────────────────────────────────────────────────────────

const TIERS = [
  { label: "Rookie",   minWins: 0,  stars: 1, color: "#9ca3af" },
  { label: "Hustler",  minWins: 3,  stars: 2, color: "#60a5fa" },
  { label: "Duelist",  minWins: 8,  stars: 3, color: "#34d399" },
  { label: "Veteran",  minWins: 20, stars: 4, color: "#fbbf24" },
  { label: "Champion", minWins: 50, stars: 5, color: "#f87171" },
];

function getTier(wins: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (wins >= TIERS[i].minWins) return TIERS[i];
  }
  return TIERS[0];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const routerParams = useParams();
  const router       = useRouter();
  // Zcash wallet — no Privy
  const { address: connectedAddress } = useWallet();

  const targetParam = routerParams.username as string;

  const [profile, setProfile]                     = useState<UserProfileData | null>(null);
  const [rawHistory, setRawHistory]               = useState<ChallengeHistoryItem[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [historyLoading, setHistoryLoading]       = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [activeTab, setActiveTab]                 = useState<HistoryTab>("all");
  const [editOpen, setEditOpen]                   = useState(false);

  const isOwner = useMemo(() => {
    if (!connectedAddress || !profile?.wallet_address) return false;
    return connectedAddress.toLowerCase() === profile.wallet_address.toLowerCase();
  }, [connectedAddress, profile]);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!targetParam) return;
    setLoading(true);
    try {
      // If it looks like a t-address, fetch by address; otherwise by username
      const isAddr = isTAddress(targetParam);
      const url = isAddr
        ? `${BACKEND_URL}/api/profile/${targetParam.toLowerCase()}`
        : `${BACKEND_URL}/api/profile/user/${targetParam}`;

      const res  = await fetch(url);
      const data = await res.json();
      const p    = isAddr ? data.profile : (data.success ? data.profile : null);

      if (!p && !isAddr) { setProfile(null); return; }

      setProfile({
        wallet_address: p?.wallet_address || targetParam.toLowerCase(),
        username:       p?.username || "Anon",
        email:          p?.email,
        phone:          p?.phone,
        bio:            p?.bio,
        avatar_url:     p?.avatar_url,
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [targetParam]);

  // ── Fetch history ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (wallet: string) => {
    setHistoryLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/challenge/${wallet}/history?limit=50`);
      const data = await res.json();
      if (data.success) setRawHistory(data.history ?? []);
    } catch {} finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    setInitialLoadComplete(false);
    setProfile(null);
    setRawHistory([]);
    fetchProfile();
  }, [targetParam, fetchProfile]);

  useEffect(() => {
    if (profile?.wallet_address) fetchHistory(profile.wallet_address);
  }, [profile?.wallet_address, fetchHistory]);

  useEffect(() => {
    const handler = () => fetchProfile();
    window.addEventListener("profileUpdated", handler);
    return () => window.removeEventListener("profileUpdated", handler);
  }, [fetchProfile]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const myWallet = profile?.wallet_address?.toLowerCase() ?? "";

  const played = useMemo(
    () => rawHistory.filter((h): h is FinishedGame => h.status === "finished"),
    [rawHistory]
  );
  const won = useMemo(
    () => played.filter((h) => h.winner_address?.toLowerCase() === myWallet),
    [played, myWallet]
  );
  const winRate  = played.length ? Math.round((won.length / played.length) * 100) : 0;
  const activeLive = rawHistory.filter((h) => h.status === "active" || h.status === "waiting");

  const filteredHistory = useMemo(
    () => (activeTab === "won" ? won : played),
    [activeTab, played, won]
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading && !initialLoadComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!profile && initialLoadComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <p className="text-xl font-semibold">User not found</p>
        <p className="text-muted-foreground text-sm">This profile doesn't exist.</p>
        <Button onClick={() => router.push("/")} className="mt-4">Go Home</Button>
      </div>
    );
  }

  if (!profile) return null;

  const displayAddress = profile.wallet_address
    ? `${profile.wallet_address.slice(0, 6)}…${profile.wallet_address.slice(-4)}`
    : "";
  const displayName   = profile.username || "Anon";
  const displayAvatar = profile.avatar_url || "";

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <Header
          pageTitle={isOwner ? "My Dashboard" : `${displayName}'s Profile`}
          hideAction
        />

        {/* ── Profile Card ──────────────────────────────────────────────────── */}
        <Card className="border border-border bg-card rounded-3xl overflow-hidden shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

          <CardContent className="p-6 space-y-5">
            {/* Avatar row */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-16 w-16 border-2 border-border shadow-sm">
                  <AvatarImage src={displayAvatar} className="object-cover" />
                  <AvatarFallback className="text-xl font-black bg-primary/10 text-primary">
                    {displayName[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                {activeLive.length > 0 && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-foreground truncate">{displayName}</h1>
                  {won.length >= 5 && (
                    <Crown className="h-4 w-4 text-blue-500 shrink-0" title="5+ wins" />
                  )}
                </div>

                <button
                  onClick={() => copyToClipboard(profile.wallet_address)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors group"
                >
                  <Wallet className="h-3 w-3" />
                  {displayAddress}
                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Contact badges — only show if data exists */}
                {(profile.email || profile.phone) && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {profile.email && (
                      <Badge variant="secondary" className="text-[10px] gap-1 py-0.5">
                        <Mail className="h-2.5 w-2.5" /> {profile.email}
                      </Badge>
                    )}
                    {profile.phone && (
                      <Badge variant="secondary" className="text-[10px] gap-1 py-0.5">
                        <Phone className="h-2.5 w-2.5" /> {profile.phone}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {isOwner && (
                <button
                  onClick={() => setEditOpen(true)}
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-xl border-2 border-border bg-card",
                    "flex items-center justify-center transition-all",
                    "hover:border-primary/50 hover:bg-primary/5 hover:scale-105 active:scale-95",
                  )}
                  title="Edit profile"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {profile.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-1.5">
              <StatPill icon={Swords}       label="Played"   value={played.length} accent="text-blue-500" />
              <StatPill icon={Trophy}       label="Won"      value={won.length}    accent="text-blue-500" />
              <StatPill icon={CheckCircle2} label="Win rate" value={`${winRate}%`} accent="text-emerald-500" />

              {/* Tier pill */}
              {(() => {
                const tier = getTier(won.length);
                return (
                  <div className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl bg-muted/40 border border-border">
                    <div className="flex gap-px">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width={10} height={10} viewBox="0 0 24 24"
                          fill={i < tier.stars ? tier.color : "none"}
                          stroke={i < tier.stars ? tier.color : "rgba(255,255,255,0.15)"}
                          strokeWidth={1.5}
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-black tabular-nums" style={{ color: tier.color }}>
                      {tier.label}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                      Tier
                    </span>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* ── Challenge History ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border">
            {([
              { key: "all", label: "All Played", count: played.length },
              { key: "won", label: "Won",         count: won.length   },
            ] as { key: HistoryTab; label: string; count: number }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
                  activeTab === t.key
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums",
                  activeTab === t.key
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-border rounded-3xl">
              {activeTab === "won" ? (
                <>
                  <Trophy className="h-10 w-10 text-muted-foreground/20" />
                  <p className="font-bold text-muted-foreground">No wins yet</p>
                  <p className="text-xs text-muted-foreground/60 text-center max-w-[200px]">
                    Win a challenge to see it here
                  </p>
                </>
              ) : (
                <>
                  <Swords className="h-10 w-10 text-muted-foreground/20" />
                  <p className="font-bold text-muted-foreground">No completed games yet</p>
                  {isOwner && (
                    <button
                      onClick={() => router.push("/challenge")}
                      className="mt-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      Browse Challenges
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <ChallengeRow
                  key={item.code}
                  item={item}
                  myWallet={myWallet}
                  onClick={() => router.push(`/challenge/${item.code}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <ProfileSettingsModal open={editOpen} onOpenChange={setEditOpen} />
      )}
    </main>
  );
}