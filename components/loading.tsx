"use client";
import React, { useEffect, useState } from "react";

// ─── Message presets per context ──────────────────────────────────────────────

export type LoadingContext =
  // ── Duel / challenge ──────────────────────────────────────────────────────
  | "default"
  | "challenge_create"
  | "challenge_join"
  | "challenge_lobby"
  | "stake_sending"
  | "stake_verifying"
  | "game_starting"
  | "question_loading"
  | "round_end"
  | "game_over"
  | "rematch"
  // ── Tournament / QuizHub ──────────────────────────────────────────────────
  | "tournament_create"       // host is creating a new tournament quiz
  | "tournament_ai_generate"  // AI generating tournament questions
  | "tournament_fund"         // host sending ZEC to pool address
  | "tournament_fund_verify"  // verifying pool funding tx on-chain
  | "tournament_lobby"        // waiting for players to join & mark ready
  | "tournament_starting"     // countdown before first question
  | "tournament_question"     // between questions / syncing
  | "tournament_leaderboard"  // leaderboard reveal after each question
  | "tournament_round_end"    // end of a round, scores tallying
  | "tournament_game_over"    // final scores + prize distribution
  | "tournament_rewards"      // ZEC prizes being dispatched to winners
  | "tournament_list"         // loading the public quiz lobby list
  | "tournament_results"      // fetching post-game results page
  // ── Shared ────────────────────────────────────────────────────────────────
  | "ai_generating"
  | "profile"
  | "history"
  | "wallet_connect"

const CONTEXT_MESSAGES: Record<LoadingContext, string[]> = {
  // ── Duel ──────────────────────────────────────────────────────────────────
  default: [
    "Generating your arena…",
    "Verifying ZEC escrow…",
    "Loading AI questions…",
    "Connecting to opponent…",
    "Preparing the duel…",
  ],
  challenge_create: [
    "Generating AI questions…",
    "Creating your escrow address…",
    "Publishing challenge to lobby…",
    "Setting up the arena…",
  ],
  challenge_join: [
    "Joining the duel…",
    "Checking stake requirements…",
    "Finding your escrow address…",
    "Connecting to lobby…",
  ],
  challenge_lobby: [
    "Waiting for opponent…",
    "Monitoring escrow balance…",
    "Listening for stake confirmation…",
    "Ready to duel…",
  ],
  stake_sending: [
    "Opening your Zcash wallet…",
    "Broadcasting transaction…",
    "Sending ZEC to escrow…",
    "Waiting for wallet confirmation…",
  ],
  stake_verifying: [
    "Scanning the blockchain…",
    "Verifying your transaction…",
    "Checking escrow balance…",
    "Waiting for block confirmation…",
    "Almost there…",
  ],
  game_starting: [
    "Both players staked — let's go!",
    "Loading questions…",
    "Syncing with opponent…",
    "Get ready to duel…",
  ],
  question_loading: [
    "Next question incoming…",
    "Think fast…",
    "Syncing with server…",
  ],
  round_end: [
    "Tallying scores…",
    "Calculating round results…",
    "Preparing next round…",
  ],
  game_over: [
    "Calculating final scores…",
    "Settling the escrow…",
    "Sending ZEC to winner…",
    "Recording match history…",
  ],
  rematch: [
    "Generating new questions…",
    "Creating fresh escrow…",
    "Setting up the rematch…",
    "Notifying opponent…",
  ],

  // ── Tournament / QuizHub ──────────────────────────────────────────────────
  tournament_create: [
    "Setting up your tournament…",
    "Generating pool address…",
    "Saving quiz structure…",
    "Almost ready to publish…",
  ],
  tournament_ai_generate: [
    "Prompting the AI…",
    "Crafting your questions…",
    "Balancing easy, medium & hard…",
    "Checking for duplicates…",
    "Finalising the question set…",
  ],
  tournament_fund: [
    "Opening your Zcash wallet…",
    "Sending ZEC to pool address…",
    "Broadcasting funding transaction…",
    "Waiting for wallet confirmation…",
  ],
  tournament_fund_verify: [
    "Scanning the blockchain…",
    "Verifying pool funding…",
    "Checking pool balance…",
    "Waiting for 1 confirmation…",
    "Almost funded…",
  ],
  tournament_lobby: [
    "Waiting for players to join…",
    "Watching for ready signals…",
    "Pool is funded — let's go…",
    "Preparing the leaderboard…",
  ],
  tournament_starting: [
    "All players ready!",
    "Shuffling questions…",
    "Syncing timers…",
    "Get ready…",
  ],
  tournament_question: [
    "Loading next question…",
    "Syncing with all players…",
    "Calculating scores…",
  ],
  tournament_leaderboard: [
    "Tallying answers…",
    "Updating leaderboard…",
    "Calculating streaks…",
    "Next question soon…",
  ],
  tournament_round_end: [
    "Round complete!",
    "Updating standings…",
    "Preparing next round…",
  ],
  tournament_game_over: [
    "Tournament finished!",
    "Calculating final standings…",
    "Preparing prize distribution…",
    "Recording results…",
  ],
  tournament_rewards: [
    "Dispatching ZEC prizes…",
    "Sending to top players…",
    "Broadcasting reward transactions…",
    "Almost done…",
  ],
  tournament_list: [
    "Loading active tournaments…",
    "Fetching prize pools…",
    "Checking player counts…",
  ],
  tournament_results: [
    "Loading final results…",
    "Fetching payout records…",
    "Building leaderboard…",
  ],

  // ── Shared ────────────────────────────────────────────────────────────────
  ai_generating: [
    "Prompting the AI…",
    "Crafting your questions…",
    "Balancing difficulty…",
    "Finalising the question set…",
  ],
  profile: [
    "Loading your profile…",
    "Fetching match history…",
    "Crunching your stats…",
  ],
  history: [
    "Loading your duels…",
    "Fetching win records…",
    "Calculating win rate…",
  ],
  wallet_connect: [
    "Detecting your wallet…",
    "Reading Zcash address…",
    "Verifying connection…",
  ],
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ZClashLoadingProps {
  /** Which context to pull messages from. Defaults to "default". */
  context?: LoadingContext
  /**
   * Override with a completely custom message list.
   * Takes priority over `context`.
   */
  messages?: string[]
  /**
   * Show a single static message instead of cycling.
   * Useful for "Verifying transaction…" with a known txid.
   */
  staticMessage?: string
  /** Hide the VS ghost badge at the bottom. Default: false */
  hideVsBadge?: boolean
  /** Custom wallet addresses for the VS badge. */
  playerA?: string
  playerB?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const ZClashLoading: React.FC<ZClashLoadingProps> = ({
  context = "default",
  messages,
  staticMessage,
  hideVsBadge = false,
  playerA,
  playerB,
}) => {
  const msgList = staticMessage
    ? [staticMessage]
    : (messages ?? CONTEXT_MESSAGES[context])

  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible]   = useState(true)

  useEffect(() => {
    // Don't cycle if there's only one message
    if (msgList.length <= 1) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % msgList.length)
        setVisible(true)
      }, 300)
    }, 2200)
    return () => clearInterval(interval)
  }, [msgList.length])

  // Reset index when context changes
  useEffect(() => { setMsgIndex(0); setVisible(true) }, [context])

  const shortAddr = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-3)}` : addr

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090f]">
      {/* Gold grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(244,183,40,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(244,183,40,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Wordmark */}
        <p
          className="text-[42px] font-black tracking-tight leading-none mb-1.5"
          style={{ fontFamily: "'Figtree', sans-serif" }}
        >
          <span className="text-[#F4B728]">Z</span>
          <span className="text-[#faf8f0]">Clash</span>
        </p>

        {/* Tagline */}
        <p
          className="text-[11px] font-bold tracking-[0.18em] uppercase mb-12"
          style={{ fontFamily: "'Figtree', sans-serif", color: "rgba(244,183,40,0.55)" }}
        >
          Stake · Duel · Conquer
        </p>

        {/* Spinning bolt ring */}
        <div className="relative w-[88px] h-[88px] mb-10">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "2px solid rgba(244,183,40,0.15)",
              borderTopColor: "#F4B728",
              animation: "zc-spin 1.1s linear infinite",
            }}
          />
          <div
            className="absolute inset-[10px] rounded-full"
            style={{
              border: "2px solid rgba(244,183,40,0.08)",
              borderBottomColor: "rgba(244,183,40,0.5)",
              animation: "zc-spin 1.8s linear infinite reverse",
            }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-[28px]"
            style={{ animation: "zc-pulse 1.4s ease-in-out infinite" }}
          >
            ⚡
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="w-[220px] h-[3px] rounded-full overflow-hidden mb-5"
          style={{ background: "rgba(244,183,40,0.12)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: "45%",
              background: "#F4B728",
              animation: "zc-slide 1.6s ease-in-out infinite",
            }}
          />
        </div>

        {/* Status message */}
        <p
          className="text-[13px] font-bold tracking-[0.06em] min-h-[20px] text-center px-6"
          style={{
            fontFamily: "'Figtree', sans-serif",
            color: "rgba(250,248,240,0.45)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          {msgList[msgIndex]}
        </p>

        {/* Dot indicators — hidden when static single message */}
        {msgList.length > 1 && (
          <div className="flex gap-[5px] mt-8">
            {msgList.map((_, i) => (
              <div
                key={i}
                className="w-[6px] h-[6px] rounded-full transition-all duration-300"
                style={{
                  background: i === msgIndex
                    ? "#F4B728"
                    : "rgba(244,183,40,0.2)",
                  transform: i === msgIndex ? "scale(1.4)" : "scale(1)",
                }}
              />
            ))}
          </div>
        )}

        {/* VS badge */}
        {!hideVsBadge && (
          <div className="flex items-center gap-[10px] mt-10" style={{ opacity: 0.3 }}>
            <span
              className="text-[11px] tracking-[0.04em]"
              style={{ fontFamily: "monospace", color: "rgba(244,183,40,0.6)" }}
            >
              {playerA ? shortAddr(playerA) : "t1xKr…9mQ"}
            </span>
            <span
              className="text-[12px] font-black tracking-[0.1em] text-[#F4B728]"
              style={{ fontFamily: "'Figtree', sans-serif" }}
            >
              VS
            </span>
            <span
              className="text-[11px] tracking-[0.04em]"
              style={{ fontFamily: "monospace", color: "rgba(244,183,40,0.6)" }}
            >
              {playerB ? shortAddr(playerB) : "t1pWz…4vN"}
            </span>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes zc-spin  { to { transform: rotate(360deg); } }
        @keyframes zc-pulse {
          0%, 100% { opacity: 0.7; transform: scale(0.92); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes zc-slide {
          0%   { transform: translateX(-100%); width: 45%; }
          50%  { width: 70%; }
          100% { transform: translateX(320%);  width: 45%; }
        }
      `}</style>
    </div>
  )
}

export default ZClashLoading