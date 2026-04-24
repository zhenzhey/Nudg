"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderKanban, CalendarDays, Inbox, LogOut, ChevronDown } from "lucide-react";
import { NavbarInboxPopover } from "@/components/layout/navbar-inbox-popover";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
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
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
      >
        <span className="font-medium">{username}</span>
        <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 180 }}
          className="bg-surface border border-outline/20 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.10)] p-1 z-[200]"
        >
          <div className="px-3 py-2 border-b border-outline/10 mb-1">
            <p className="text-[11px] text-on-surface-variant truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:text-danger hover:bg-error-container/40 transition-colors"
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

  return (
    <header className="sticky top-0 z-50 h-14 bg-surface border-b border-outline/50 flex items-center justify-between px-6 shadow-card">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <span className="w-7 h-7 bg-neutral rounded-lg flex items-center justify-center text-on-neutral text-xs font-black">
          N
        </span>
        <span className="font-black text-base tracking-tight text-on-surface">Nudg</span>
      </Link>

      <nav className="hidden md:flex items-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-surface-container text-on-surface"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {/* Inbox link + quick capture button */}
        <Link
          href="/inbox"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/inbox"
              ? "bg-surface-container text-on-surface"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          )}
        >
          <Inbox size={15} />
          <span className="hidden md:block">Inbox</span>
        </Link>
        <NavbarInboxPopover />

        {/* Divider */}
        <div className="w-px h-4 bg-outline/20 mx-1" />

        {userEmail && <UserMenu userEmail={userEmail} />}
      </div>
    </header>
  );
}
