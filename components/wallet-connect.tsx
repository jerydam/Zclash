"use client";
/**
 * components/wallet-connect-button.tsx  (Zcash edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaced all EVM / MetaMask / window.ethereum references with the Zcash
 * wallet provider.  The public API (WalletConnectButton component + props)
 * is identical to the original so every import site works unchanged.
 *
 * Changes from EVM version
 * ────────────────────────
 *   REMOVED  usePrivy / Privy email & Google avatar logic
 *   REMOVED  window.ethereum checks
 *   REMOVED  BrowserProvider / ethers references
 *   CHANGED  address display  →  shows t1Abc…xyz4 instead of 0xAbc…xyz4
 *   CHANGED  connect()        →  opens Zcash connect modal / window.zcash
 *   KEPT     profile fetch from /api/profile/{wallet} (unchanged)
 *   KEPT     dropdown menu, avatar, dashboard link, copy address
 */

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/components/zcash-wallet-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, LogOut, Copy, ChevronDown, Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

interface WalletConnectButtonProps {
  className?: string;
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  const [dbUsername, setDbUsername]   = useState<string | null>(null);
  const [dbAvatarUrl, setDbAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const hasSyncedRef = useRef(false);

  // ── Fetch or create profile when wallet connects ──────────────────────────
  useEffect(() => {
    if (!isConnected || !address) {
      setDbUsername(null);
      setDbAvatarUrl(null);
      hasSyncedRef.current = false;
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchOrSync = async () => {
  try {
    // ✅ Don't lowercase — Zcash addresses are case-sensitive
    const res  = await fetch(`${API_BASE_URL}/api/profile/${address}`)
    const data = await res.json()
    const profile = data.profile ?? null

    // ✅ If any username exists, use it
    if (profile?.username) {
      if (isMounted) {
        setDbUsername(profile.username)
        setDbAvatarUrl(profile.avatar_url || "")
      }
      return
    }

    // No profile yet — create stub
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true
      const fallback = `user_${address.slice(-4)}`
      const syncRes  = await fetch(`${API_BASE_URL}/api/profile/sync`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          wallet_address: address,   // ✅ no lowercase
          username:   fallback,
          avatar_url: "",
          email:      "",
        }),
      })
      const syncData = await syncRes.json()
      if (syncData.success && syncData.profile && isMounted) {
        setDbUsername(syncData.profile.username)
        setDbAvatarUrl(syncData.profile.avatar_url || "")
        window.dispatchEvent(
          new CustomEvent("profileUpdated", {
            detail: {
              username:  syncData.profile.username,
              avatarUrl: syncData.profile.avatar_url,
            },
          })
        )
      }
    }
  } catch (err) {
    console.error("[WalletConnectButton] profile fetch failed:", err)
  } finally {
    if (isMounted) setLoading(false)
  }
}

    fetchOrSync();
    return () => { isMounted = false; };
  }, [address, isConnected]);

  // ── Listen for profile updates from modal ─────────────────────────────────
 useEffect(() => {
  const handler = (e: CustomEvent) => {
    const { username, avatarUrl } = e.detail ?? {}
    if (username)  setDbUsername(username)
    if (avatarUrl !== undefined) setDbAvatarUrl(avatarUrl)  // ✅ update even if empty string
  }
  window.addEventListener("profileUpdated" as any, handler)
  return () => window.removeEventListener("profileUpdated" as any, handler)
}, [])

  // Short display of t-address: t1Abc…xyz4
  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "—";

  const displayName   = dbUsername || shortAddress;
  const displayAvatar = dbAvatarUrl || "";
  const dashboardLink = dbUsername
    ? `/dashboard/${dbUsername}`
    : `/dashboard/${address?.toLowerCase() ?? ""}`;

  // ── Connecting state ──────────────────────────────────────────────────────
  if (isConnecting) {
    return (
      <Button
        size="sm"
        disabled
        variant="outline"
        className={cn(
          "text-xs font-bold uppercase tracking-widest px-6 opacity-50 border-border animate-pulse",
          className
        )}
      >
        Connecting…
      </Button>
    );
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <Button
        onClick={connect}
        size="sm"
        variant="default"
        className={cn(
          "text-xs font-bold uppercase tracking-widest px-6 shadow-md hover:scale-105 transition-all bg-primary text-primary-foreground hover:opacity-90",
          className
        )}
      >
        <Wallet className="mr-2 h-4 w-4" />
        Connect
      </Button>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex items-center gap-2 p-1 sm:pr-3 border-primary/20 hover:bg-primary/5 transition-all rounded-full h-9",
            className
          )}
        >
          <Avatar className="h-7 w-7 border border-background shadow-sm">
            <AvatarImage src={displayAvatar} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
              {loading
                ? <span className="animate-pulse">…</span>
                : displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-xs sm:text-sm font-medium max-w-[100px] truncate">
            {loading ? "…" : displayName}
          </span>
          <ChevronDown className="hidden sm:block h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 z-[200] rounded-xl"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none truncate">{displayName}</p>
            {address && (
              <p className="text-[10px] leading-none text-muted-foreground font-mono">
                {shortAddress}
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href={dashboardLink}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                loading && "opacity-50 pointer-events-none"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              if (address) {
                navigator.clipboard.writeText(address);
                toast.success("Address copied!");
              }
            }}
            className="cursor-pointer flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Address</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={disconnect}
          className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
        >
          <LogOut className="h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}