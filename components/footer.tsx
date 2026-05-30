"use client"

import React from "react"
import { Mail, Youtube } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
  </svg>
)

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

interface FooterProps {
  className?: string
}

export const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  const socialLinks = [
    { name: "X (Twitter)",  href: "https://x.com/FaucetDrops",             icon: XIcon,        hoverColor: "#38bdf8" },
    { name: "YouTube",      href: "https://www.youtube.com/@Faucet_Drops",  icon: Youtube,      hoverColor: "#f87171" },
    { name: "Telegram",     href: "https://t.me/FaucetDropschat",           icon: TelegramIcon, hoverColor: "#60a5fa" },
    { name: "Discord",      href: "https://discord.gg/jSAXVw2brJ",          icon: DiscordIcon,  hoverColor: "#818cf8" },
    { name: "Email",        href: "mailto:drops.faucet@gmail.com",          icon: Mail,         hoverColor: "#34d399" },
  ]

  return (
    <footer
      className={`mt-8 ${className}`}
      style={{
        background: "#07090f",
        borderTop: "1px solid rgba(244,183,40,0.12)",
        backgroundImage: `
          linear-gradient(rgba(244,183,40,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(244,183,40,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 text-center md:text-left">
            <div className="flex items-center gap-2.5">
              <Image
                src="/favicon.png"
                alt="FaucetDrops Logo"
                width={36}
                height={36}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-md object-contain flex-shrink-0"
              />
              <span
                className="font-bold text-sm tracking-wide md:hidden"
                style={{ color: "#F4B728", fontFamily: "'Figtree', sans-serif" }}
              >
                Built by FaucetDrops
              </span>
            </div>

            {/* divider */}
            <div
              className="hidden md:block w-px h-5"
              style={{ background: "rgba(244,183,40,0.18)" }}
            />

            <span
              className="text-xs sm:text-sm"
              style={{ color: "rgba(250,248,240,0.38)" }}
            >
              Automated onchain reward and engagement platform
            </span>
          </div>

          {/* Socials + copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">

            {/* Social icons */}
            <div className="flex items-center gap-0.5">
              {socialLinks.map(({ name, href, icon: Icon, hoverColor }) => (
                <Link
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  title={name}
                  className="group h-8 w-8 flex items-center justify-center rounded-lg transition-colors duration-200"
                  style={{ color: "rgba(244,183,40,0.45)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(244,183,40,0.45)")}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>

            {/* thin vertical divider */}
            <div
              className="hidden sm:block w-px h-4"
              style={{ background: "rgba(244,183,40,0.15)" }}
            />

            {/* Copyright + links */}
            <div
              className="flex items-center gap-4 text-xs"
              style={{ color: "rgba(250,248,240,0.28)", fontFamily: "'Figtree', sans-serif" }}
            >
              <span>&copy; {new Date().getFullYear()} ZClash</span>
              <div className="flex items-center gap-3">
                {[{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }].map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="transition-colors duration-200"
                    style={{ color: "rgba(250,248,240,0.28)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F4B728")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(250,248,240,0.28)")}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* bottom gold rule */}
        <div
          className="mt-5 pt-4 flex items-center justify-center gap-2"
          style={{ borderTop: "1px solid rgba(244,183,40,0.08)" }}
        >
          <span style={{ color: "#F4B728", fontSize: 12, opacity: 0.4 }}>⚡</span>
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: "rgba(244,183,40,0.3)", fontFamily: "'Figtree', sans-serif", letterSpacing: "0.2em" }}
          >
            Stake · Duel · Conquer
          </span>
          <span style={{ color: "#F4B728", fontSize: 12, opacity: 0.4 }}>⚡</span>
        </div>
      </div>
    </footer>
  )
}