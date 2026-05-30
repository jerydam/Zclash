"use client";
import React, { useEffect, useState } from "react";

const MESSAGES = [
  "Generating your arena…",
  "Verifying ZEC escrow…",
  "Loading AI questions…",
  "Connecting to opponent…",
  "Preparing the duel…",
];

const ZClashLoading: React.FC = () => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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
          style={{
            fontFamily: "'Figtree', sans-serif",
            color: "rgba(244,183,40,0.55)",
          }}
        >
          Stake · Duel · Conquer
        </p>

        {/* Spinning bolt ring */}
        <div className="relative w-[88px] h-[88px] mb-10">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: "2px solid rgba(244,183,40,0.15)",
              borderTopColor: "#F4B728",
              animation: "zc-spin 1.1s linear infinite",
            }}
          />
          {/* Inner ring */}
          <div
            className="absolute inset-[10px] rounded-full"
            style={{
              border: "2px solid rgba(244,183,40,0.08)",
              borderBottomColor: "rgba(244,183,40,0.5)",
              animation: "zc-spin 1.8s linear infinite reverse",
            }}
          />
          {/* Bolt icon */}
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
          className="text-[13px] font-bold tracking-[0.06em] min-h-[20px]"
          style={{
            fontFamily: "'Figtree', sans-serif",
            color: "rgba(250,248,240,0.45)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          {MESSAGES[msgIndex]}
        </p>

        {/* Dot indicators */}
        <div className="flex gap-[5px] mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-[6px] h-[6px] rounded-full"
              style={{
                background: "rgba(244,183,40,0.25)",
                animation: `zc-dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Ghost VS badge */}
        <div
          className="flex items-center gap-[10px] mt-10"
          style={{ opacity: 0.3 }}
        >
          <span
            className="text-[11px] tracking-[0.04em]"
            style={{
              fontFamily: "monospace",
              color: "rgba(244,183,40,0.6)",
            }}
          >
            t1xKr…9mQ
          </span>
          <span
            className="text-[12px] font-black tracking-[0.1em] text-[#F4B728]"
            style={{ fontFamily: "'Figtree', sans-serif" }}
          >
            VS
          </span>
          <span
            className="text-[11px] tracking-[0.04em]"
            style={{
              fontFamily: "monospace",
              color: "rgba(244,183,40,0.6)",
            }}
          >
            t1pWz…4vN
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes zc-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes zc-pulse {
          0%,
          100% {
            opacity: 0.7;
            transform: scale(0.92);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        @keyframes zc-slide {
          0% {
            transform: translateX(-100%);
            width: 45%;
          }
          50% {
            width: 70%;
          }
          100% {
            transform: translateX(320%);
            width: 45%;
          }
        }
        @keyframes zc-dot-pulse {
          0%,
          100% {
            background: rgba(244, 183, 40, 0.2);
            transform: scale(1);
          }
          50% {
            background: #f4b728;
            transform: scale(1.4);
          }
        }
      `}</style>
    </div>
  );
};

export default ZClashLoading;