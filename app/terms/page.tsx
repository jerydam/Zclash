"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

interface Section {
  num: string;
  title: string;
  content: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    num: "01", title: "Introduction",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">
          Welcome to ZClash — a peer-to-peer quiz dueling platform where players stake
          ZEC and compete for rewards. By accessing or using ZClash, you agree to these Terms.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">
          These Terms form a legally binding agreement between you and ZClash. If you do not agree, please do not use our Service.
        </p>
      </>
    ),
  },
  {
    num: "02", title: "Eligibility & Account",
    content: (
      <>
        <h4 className="text-xs font-black uppercase tracking-widest text-foreground pt-3 border-t border-border">Age Requirement</h4>
        <p className="text-sm text-muted-foreground leading-relaxed pt-2">You must be at least 18 years old to participate in staked duels.</p>
        <h4 className="text-xs font-black uppercase tracking-widest text-foreground pt-3 border-t border-border mt-2">Wallet Responsibility</h4>
        <ul className="pt-2 space-y-1.5">
          {["You are solely responsible for the security of your wallet and private keys.",
            "ZClash is never liable for losses due to wallet mismanagement or key exposure.",
            "All transactions submitted through your connected wallet are your responsibility."].map(i => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "03", title: "How Duels Work",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">
          A duel is a 1v1 quiz match. Both players stake the agreed ZEC amount to an escrow address before the game begins. Questions are AI-generated across Easy, Medium, and Hard rounds.
        </p>
        <ul className="pt-2 space-y-1.5">
          {["The player with the most points wins the full pool.",
            "In a tie, both stakes are refunded to the original wallets.",
            "Results are resolved automatically after the game ends."].map(i => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "04", title: "Escrow & Fees",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">
          Staked ZEC is held at a generated escrow t-address for the duration of the game. The platform takes no fee — 100% of the pool goes to the winner.
        </p>
        <ul className="pt-2 space-y-1.5">
          {["Stakes are non-refundable once a game starts.",
            "In a tie, both stakes are returned in full.",
            "Network transaction fees (miners) are separate and borne by the player."].map(i => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "05", title: "Zcash & On-Chain Risk",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">
          Staked funds are held at Zcash t-addresses managed by our backend engine. By staking, you accept:
        </p>
        <ul className="pt-2 space-y-1.5">
          {["Software bugs could result in loss of funds — use at your own risk.",
            "Blockchain network issues may delay transactions.",
            "ZClash does not custody your funds long-term."].map(i => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "06", title: "Prohibited Conduct",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">You agree not to:</p>
        <ul className="pt-2 space-y-1.5">
          {["Use bots or automated tools to gain an unfair advantage.",
            "Collude with opponents to manipulate outcomes.",
            "Attempt to exploit or attack the backend or wallet infrastructure.",
            "Use the platform for money laundering or illegal activity."].map(i => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "07", title: "AI-Generated Content",
    content: (
      <>
        <p className="text-sm text-muted-foreground leading-relaxed pt-3">
          Quiz questions are generated by AI (Google Gemini, Groq, or Kimi). We do not guarantee accuracy.
        </p>
        <ul className="pt-2 space-y-1.5">
          {["Disputed questions do not void a completed duel.",
            "ZClash is not responsible for errors in AI-generated content."].map(i => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
          ))}
        </ul>
      </>
    ),
  },
  {
    num: "08", title: "Limitation of Liability",
    content: (
      <ul className="pt-3 space-y-1.5">
        {["ZClash provides the platform 'as is' with no guarantees of uptime.",
          "We are not liable for financial losses from network issues or wallet errors.",
          "We are not liable for indirect or consequential damages of any kind."].map(i => (
          <li key={i} className="text-sm text-muted-foreground leading-relaxed pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary before:text-xs">{i}</li>
        ))}
      </ul>
    ),
  },
  {
    num: "09", title: "Governing Law",
    content: (
      <p className="text-sm text-muted-foreground leading-relaxed pt-3">
        These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved in the courts of Lagos, Nigeria.
      </p>
    ),
  },
  {
    num: "10", title: "Changes to These Terms",
    content: (
      <p className="text-sm text-muted-foreground leading-relaxed pt-3">
        We may update these Terms with at least 7 days' notice. Continued use after the effective date constitutes acceptance.
      </p>
    ),
  },
];

function AccordionSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden bg-card transition-colors ${open ? "border-primary/40" : "border-border hover:border-primary/30"}`}>
      <div className="flex items-center gap-3 p-4 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <span className="text-xs font-black text-primary uppercase tracking-widest min-w-[28px]">{section.num}</span>
        <span className="flex-1 text-base font-black text-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>{section.title}</span>
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

export default function TermsPage() {
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
          <div className="text-xl font-black text-foreground" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>Terms & Conditions</div>
          <div className="text-xs text-muted-foreground mt-0.5">Last updated: April 27, 2026</div>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-2.5">

        {/* Fee highlight card */}
        <div className="bg-primary/10 border border-primary/25 rounded-2xl p-4 mb-2 zcash-glow-sm">
          <div className="text-xs font-black text-primary uppercase tracking-widest mb-2">⚡ Platform Fee</div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            ZClash charges no platform fee. 100% of the prize pool goes to the winner.
          </div>
          <div className="inline-block mt-2 px-3 py-1 rounded-lg bg-primary/15 border border-primary/30 text-sm font-black text-primary">
            0% fee · winner takes all
          </div>
        </div>

        {SECTIONS.map(s => <AccordionSection key={s.num} section={s} />)}

        {/* Contact */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border mt-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-base flex-shrink-0">✉️</div>
          <div>
            <div className="text-xs text-muted-foreground">Questions about these terms?</div>
            <a href="mailto:drops.faucet@gmail.com" className="text-sm font-bold text-primary hover:underline">
              drops.faucet@gmail.com
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground px-1 leading-relaxed mt-2">
          By connecting your wallet and playing a duel, you confirm that you have read and agreed to these Terms.
        </p>
      </div>
    </div>
  );
}