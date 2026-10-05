"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getStatus, type AppStatus } from "@/lib/client/api";
import { getStore } from "@/lib/store";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Today", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/labs", label: "Labs", icon: "M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10" },
  { href: "/food", label: "Food", icon: "M4 12h16a8 8 0 0 1-16 0ZM8 8c0-2 2-2 2-4M12 8c0-2 2-2 2-4M16 8c0-2 2-2 2-4" },
  { href: "/plan", label: "Plan", icon: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 9 2 2 4-4" },
  { href: "/coach", label: "Coach", icon: "M4 5h16v11H9l-5 4V5Zm4 5h8M8 13h5" },
];

const MENU = [...NAV, { href: "/markers", label: "All markers", icon: "" }, { href: "/profile", label: "Profile", icon: "" }];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    getStatus().then(setStatus);
  }, []);

  if (path.startsWith("/login")) return <>{children}</>;

  async function signOut() {
    await getStore().signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {status && !status.cloud && (
        <div className="bg-kombu px-4 py-1.5 text-center text-[11px] text-cream/85">
          Demo mode — data stays in this browser. Connect Supabase to sync privately across devices.
        </div>
      )}
      {status && !status.ai && (
        <div className="bg-alert-100 px-4 py-1.5 text-center text-[11px] text-alert">
          AI is not connected yet — add OPENROUTER_API_KEY on the server to enable analysis.
        </div>
      )}

      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border border-noir/10 bg-cream/85 py-2 pl-5 pr-2 shadow-[0_6px_24px_rgba(53,64,36,0.08)] backdrop-blur">
          <Link href="/" className="display text-2xl text-kombu">
            Soul<span className="text-moss">.</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {MENU.slice(0, 5).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "rounded-full px-3.5 py-1.5 text-sm transition",
                  isActive(path, n.href) ? "bg-kombu text-cream" : "text-noir/75 hover:bg-kombu/5"
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="hidden rounded-full border border-kombu/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-kombu md:inline-block">
              Profile
            </Link>
            <Link href="/labs?upload=1" className="hidden rounded-full bg-kombu px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cream md:inline-block">
              Upload labs
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="grid h-9 w-11 place-items-center rounded-full bg-moss/80 text-cream md:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M5 8h14M5 12h14M5 16h9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-kombu px-6 py-5 text-cream" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between">
            <span className="display text-2xl">Soul</span>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-cream">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <nav className="mt-auto mb-auto flex flex-col items-end gap-4 pr-2">
            {MENU.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cx("display text-3xl italic", isActive(path, n.href) ? "text-lime" : "text-cream/90")}>
                {n.label}
              </Link>
            ))}
          </nav>
          {status?.cloud && (
            <button onClick={signOut} className="self-start rounded-full border border-cream/40 px-4 py-2 text-xs uppercase tracking-wider">
              Sign out
            </button>
          )}
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12">{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-full border border-noir/10 bg-cream/95 p-1.5 shadow-[0_10px_30px_rgba(53,64,36,0.18)] backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cx(
              "flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition",
              isActive(path, n.href) ? "bg-kombu text-cream" : "text-noir/60"
            )}
          >
            <Icon d={n.icon} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
