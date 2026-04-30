"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LogOut, ChevronDown, Inbox } from "lucide-react";
import { NavbarInboxPopover } from "@/components/layout/navbar-inbox-popover";
import { useActiveProject } from "@/components/layout/active-project-context";

const navTabs = [
  { href: "/dashboard", label: "Dashboard", match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/") },
  { href: "/projects", label: "Map", match: (p: string) => p === "/projects" || p.startsWith("/projects/") },
  { href: "/calendar", label: "Calendar", match: (p: string) => p === "/calendar" || p.startsWith("/calendar/") },
  { href: "/inbox", label: "Portfolio", match: (p: string) => p === "/inbox" || p.startsWith("/inbox/") },
];

interface NavbarProps {
  userEmail?: string;
}

function UserMenu({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const username = userEmail.split("@")[0];

  const openMenu = () => {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openMenu}
        className="flex items-center gap-1 px-1.5 py-1 rounded text-[12px] text-atlas-dim hover:text-atlas-fg transition-colors"
      >
        <span>{username}</span>
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 180 }}
          className="bg-atlas-panel border border-atlas-border rounded-lg shadow-card p-1 z-[200]"
        >
          <div className="px-3 py-2 border-b border-atlas-border mb-1">
            <p className="text-[11px] text-atlas-dim truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-[12px] text-atlas-dim hover:text-atlas-fg hover:bg-atlas-panel-2 transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      )}
    </>
  );
}

export function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();
  const username = userEmail ? userEmail.split("@")[0] : null;
  const { active } = useActiveProject();

  return (
    <header className="sticky top-0 z-50 h-11 bg-atlas-panel border-b border-atlas-border flex items-center px-4 gap-[18px]">
      {/* Logo + breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] shrink-0 min-w-0">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-atlas-fg to-atlas-dim text-atlas-bg grid place-items-center font-bold text-[11px]">
            N
          </span>
          <span className="font-semibold tracking-[-0.005em] text-atlas-fg">Nudg</span>
        </Link>
        {username && (
          <>
            <span className="text-atlas-dimmer">/</span>
            <span className="text-atlas-dim shrink-0">{username}</span>
          </>
        )}
        {active?.title && (
          <>
            <span className="text-atlas-dimmer">/</span>
            <span className="text-atlas-fg font-medium truncate max-w-[260px]">{active.title}</span>
          </>
        )}
      </div>

      {/* Centered tabs */}
      <nav className="flex-1 hidden md:flex items-center justify-center gap-0.5 text-[12px]">
        {navTabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-2.5 py-[5px] rounded-md transition-colors",
                active
                  ? "bg-atlas-panel-2 text-atlas-fg font-medium"
                  : "text-atlas-dim hover:text-atlas-fg"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Right cluster */}
      <div className="flex items-center gap-2.5 text-atlas-dim text-[11px]">
        <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded bg-atlas-ai/15 text-atlas-ai">
          <span
            className="w-1.5 h-1.5 rounded-full bg-atlas-ai"
            style={{ boxShadow: "0 0 6px #0891b2" }}
          />
          AI on
        </span>
        <span className="px-2 py-[3px] border border-atlas-border rounded font-mono text-[10px] text-atlas-dim">
          ⌘K
        </span>
        <Link
          href="/inbox"
          className="text-atlas-dim hover:text-atlas-fg transition-colors"
          aria-label="Inbox"
        >
          <Inbox size={14} />
        </Link>
        <NavbarInboxPopover />
        {userEmail && (
          <>
            <div className="w-px h-3.5 bg-atlas-border" />
            <UserMenu userEmail={userEmail} />
          </>
        )}
      </div>
    </header>
  );
}
