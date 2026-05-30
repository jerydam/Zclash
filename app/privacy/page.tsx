"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Shield, Eye, Lock, Globe, Trash2, Bell, Cookie, RefreshCw, Mail } from "lucide-react";

interface Section {
  num: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    num: "01", title: "Introduction", icon: <Shield size={14} />,
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">
          ZClash operates a peer-to-peer quiz dueling platform where players compete using staked ZEC.
          This Privacy Policy explains how we collect, use, and protect your information.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">
          By connecting your wallet or using any feature of the platform, you agree to the practices described here.
        </p>
      </>
    ),
  },
  {
    num: "02", title: "Information We Collect", icon: <Eye size={14} />,
    content: (
      <>
        <h4 className="text-xs font-black uppercase tracking-widest text-foreground pt-3 border-t border-border">On-Chain Data</h4>
        <ul className="pt-2 space-y-1.5">
          {["Your public Zcash t-address — used to identify you and process payouts.",
            "Transaction IDs for stake deposits and refunds.",
            "All on-chain data is public by nature of the blockchain."].map(i => (
            <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
        <h4 className="text-xs font-black uppercase tracking-widest text-foreground pt-3 mt-2 border-t border-border">Off-Chain Data</h4>
        <ul className="pt-2 space-y-1.5">
          {["Username and optional avatar URL from your profile.",
            "Quiz answers and scores — stored to resolve outcomes and power leaderboards.",
            "Challenge history: topics, opponents, outcomes, and timestamps."].map(i => (
            <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "03", title: "How We Use Your Data", icon: <RefreshCw size={14} />,
    content: (
      <ul className="pt-3 space-y-1.5">
        {["Matching players, running game sessions, and resolving outcomes.",
          "Powering the leaderboard, rank snapshots, and tier progression.",
          "Sending in-app notifications for game events.",
          "Detecting and preventing cheating or abuse."].map(i => (
          <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
        ))}
      </ul>
    ),
  },
  {
    num: "04", title: "Data Sharing", icon: <Globe size={14} />,
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">We do not sell your personal information. We may share data only in these cases:</p>
        <ul className="pt-2 space-y-1.5">
          {["Zcash network — stake transactions are submitted publicly.",
            "AI providers — quiz topics (not wallet addresses) are sent to generate questions.",
            "Database infrastructure — Supabase/PostgreSQL stores your profile and game history.",
            "Legal requirements — if required by law or to protect the platform."].map(i => (
            <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "05", title: "Data Retention", icon: <Trash2 size={14} />,
    content: (
      <ul className="pt-3 space-y-1.5">
        {["Challenge history and scores kept indefinitely for leaderboard integrity.",
          "Notification inbox items auto-deleted after 90 days.",
          "Profile data kept until you request deletion.",
          "On-chain transaction data is permanent and outside our control."].map(i => (
          <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
        ))}
      </ul>
    ),
  },
  {
    num: "06", title: "Your Rights", icon: <Lock size={14} />,
    content: (
      <ul className="pt-3 space-y-1.5">
        {["Access the personal data we hold about you.",
          "Correct inaccurate profile information via profile settings.",
          "Request deletion of your off-chain profile data.",
          "Opt out of non-essential notifications via in-app settings."].map(i => (
          <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
        ))}
      </ul>
    ),
  },
  {
    num: "07", title: "Notifications", icon: <Bell size={14} />,
    content: (
      <ul className="pt-3 space-y-1.5">
        {["Notifications sent for game events: invites, results, rematches.",
          "Delivered via WebSocket and stored in your notification inbox.",
          "We do not send marketing emails unless you explicitly opt in."].map(i => (
          <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
        ))}
      </ul>
    ),
  },
  {
    num: "08", title: "Cookies & Storage", icon: <Cookie size={14} />,
    content: (
      <ul className="pt-3 space-y-1.5">
        {["localStorage used to persist your Zcash wallet address across sessions.",
          "Theme preference (dark/light) stored locally.",
          "No third-party advertising cookies or tracking pixels.",
          "Clear all local data by disconnecting your wallet and clearing browser storage."].map(i => (
          <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
        ))}
      </ul>
    ),
  },
  {
    num: "09", title: "Data Security", icon: <Shield size={14} />,
    content: (
      <ul className="pt-3 space-y-1.5">
        {["All API communication uses HTTPS/TLS encryption.",
          "Database connections require SSL.",
          "WebSocket connections are authenticated by wallet address per session.",
          "No system is completely secure — we cannot guarantee absolute security."].map(i => (
          <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
        ))}
      </ul>
    ),
  },
  {
    num: "10", title: "Policy Updates", icon: <RefreshCw size={14} />,
    content: (
      <p className="text-sm text-muted-foreground leading-relaxed pt-3">
        We may update this Privacy Policy with at least 7 days' notice. Continued use after the effective date constitutes acceptance.
      </p>
    ),
  },
];

function AccordionSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden bg-card transition-colors ${open ? "border-primary/40" : "border-border hover:border-primary/30"}`}>
      <div className="flex items-center gap-2.5 p-4 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <span className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center transition-colors ${open ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
          {section.icon}
        </span>
        <span className="text-xs font-black text-primary uppercase tracking-widest flex-shrink-0">{section.num}</span>
        <span className="flex-1 text-sm font-black text-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>{section.title}</span>
        <span className="text-muted-foreground flex-shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-border">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="bg-background text-foreground min-h-screen max-w-[480px] mx-auto pb-20" style={{ fontFamily: "'Figtree', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={16} className="text-foreground" />
        </button>
        <div>
          <div className="text-xl font-black text-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>Privacy Policy</div>
          <div className="text-xs text-muted-foreground mt-0.5">Last updated: April 27, 2026</div>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-2.5">

        {/* Hero card */}
        <div className="bg-primary/10 border border-primary/25 rounded-2xl p-5 mb-2 zcash-glow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-base font-black text-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>Your Privacy Matters</div>
              <div className="text-xs text-muted-foreground">ZClash · zclash.io</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We collect only what's needed to run the platform. We never sell your data and your wallet address is the only identifier we require.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {["✓ No data selling", "✓ No ad tracking", "✓ Wallet-only ID"].map(p => (
              <span key={p} className="text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">{p}</span>
            ))}
          </div>
        </div>

        {SECTIONS.map(s => <AccordionSection key={s.num} section={s} />)}

        {/* Contact */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border mt-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center flex-shrink-0">
            <Mail size={16} className="text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Privacy questions or data requests?</div>
            <a href="mailto:drops.faucet@gmail.com" className="text-sm font-bold text-primary hover:underline">
              drops.faucet@gmail.com
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground px-1 leading-relaxed mt-2">
          By connecting your wallet to ZClash, you acknowledge that you have read and understood this Privacy Policy.
        </p>
      </div>
    </div>
  );
}