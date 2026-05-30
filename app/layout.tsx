"use client"

import type React from "react"
import { useEffect } from "react"
import { Inter } from "next/font/google"
import  "../styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { WalletProvider } from "@/components/zcash-wallet-provider"
import { BottomNav } from "@/components/bottom-nav"
import { PresenceProvider } from "@/components/presence-provider"
import css from "styled-jsx/css"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <title>ZClash — Stake & Duel with Zcash</title>
        <meta name="title" content="ZClash — Stake & Duel with Zcash" />
        <meta name="description" content="1v1 quiz duels powered by Zcash. Stake ZEC, answer fast, winner takes the pool. Private, fast, and fair." />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://app.zclash.io/" />
        <meta property="og:site_name" content="ZClash" />
        <meta property="og:title" content="ZClash — Stake & Duel with Zcash" />
        <meta property="og:description" content="1v1 quiz duels powered by Zcash. Stake ZEC, answer fast, winner takes the pool." />
        <meta property="og:image" content="https://app.zclash.io/opengraph-image" />
        <meta property="og:image:secure_url" content="https://app.zclash.io/opengraph-image" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="ZClash — 1v1 Zcash quiz duels" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://app.zclash.io/" />
        <meta name="twitter:title" content="ZClash — Stake & Duel with Zcash" />
        <meta name="twitter:description" content="1v1 quiz duels powered by Zcash. Stake ZEC, answer fast, winner takes the pool." />
        <meta name="twitter:image" content="https://app.zclash.io/opengraph-image" />
        <meta name="twitter:image:alt" content="ZClash — 1v1 Zcash quiz duels" />

        <meta name="keywords" content="zcash, zec, quiz duel, stake, crypto game, web3, 1v1, zclash" />
        <meta name="author" content="ZClash" />
        <link rel="canonical" href="https://app.zclash.io/" />
        <meta name="theme-color" content="#F4B728" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <WalletProvider>
            <PresenceProvider>
              <div className="min-h-screen flex flex-col">
                <main className="flex-1">
                  {children}
                </main>
              </div>
              <BottomNav />
              <Toaster richColors position="top-center" closeButton />
            </PresenceProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
