"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Trophy, Gavel, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import Image from "next/image";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div
        className={`bg-background text-foreground min-h-screen flex flex-col transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ maxWidth: 480, margin: "0 auto", fontFamily: "'Figtree', sans-serif" }}
      >
        <nav className="flex items-center justify-between px-6 pt-8 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-24 h-24 relative flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="ZClash Logo"
                width={96}
                height={96}
                priority
                className="object-contain"
              />
            </div>
          </div>
          <ThemeToggle />
        </nav>

        {/* Hero */}
        <section className="px-6 pb-10 flex-1 flex flex-col justify-center">
          <h1
            className="font-black leading-none mb-5 text-foreground"
            style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontSize: "clamp(3.4rem, 14vw, 5rem)",
              letterSpacing: "-0.01em",
            }}
          >
            STAKE.<br />
            <span className="text-primary">PLAY.</span><br />
            EARN.
          </h1>

          <p className="font-medium leading-relaxed mb-8 text-muted-foreground" style={{ fontSize: 15, maxWidth: 320 }}>
            Challenge anyone on any topic. Negotiate the stake, answer faster, take the pool — secured with Zcash.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/challenge")}
              className="dd-btn w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2"
            >
              <Gavel className="h-4 w-4" />
              Start a Duel
            </button>
            <button
              onClick={() => router.push("/quiz")}
              className="dd-btn-ghost w-full h-14 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Join a Tournament
            </button>
          </div>
        </section>

        {/* Mode cards */}
        <section className="px-6 pt-8 pb-10 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Choose your Battleground
          </p>

          {/* 1v1 Duel */}
          <div
            className="relative p-6 rounded-2xl border border-border bg-card hover:border-primary hover:-translate-y-1 transition-all cursor-pointer group zcash-glow-sm"
            onClick={() => router.push("/challenge")}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-t-2xl" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 border zcash-border">
                <Gavel className="h-5 w-5 text-primary" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3
              className="font-black text-2xl uppercase tracking-tight mb-2 text-foreground"
              style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}
            >
              1v1 Staked Duel
            </h3>
            <p className="font-medium leading-relaxed text-muted-foreground" style={{ fontSize: 14 }}>
              Pick a topic. Negotiate the stake live. Winner takes the entire escrow.
            </p>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {["Negotiation", "ZEC Escrow", "Instant Payout"].map(tag => (
                <span key={tag} className="text-xs font-bold text-primary uppercase tracking-wider">{tag}</span>
              ))}
            </div>
          </div>

          {/* Tournaments */}
          <div
            className="relative p-6 rounded-2xl border border-border bg-card hover:border-primary hover:-translate-y-1 transition-all cursor-pointer group zcash-glow-sm"
            onClick={() => router.push("/quiz")}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-t-2xl" />
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 border zcash-border">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3
              className="font-black text-2xl uppercase tracking-tight mb-2 text-foreground"
              style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}
            >
              Live Tournaments
            </h3>
            <p className="font-medium leading-relaxed text-muted-foreground" style={{ fontSize: 14 }}>
              Join multi-player matches hosted by creators. Top positions split a shielded ZEC prize pool automatically.
          </p>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {["Multiplayer Pool", "Shielded Payouts", "Live Leaderboard"].map(tag => (
                <span key={tag} className="text-xs font-bold text-primary uppercase tracking-wider">{tag}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer className="pb-20" />
    </>
  );
}