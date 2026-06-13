"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2">
      <span className="relative grid h-7 w-7 place-items-center rounded-sm bg-primary text-primary-on">
        <span className="font-display text-base font-extrabold leading-none">S</span>
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        Stack<span className="text-primary">GG</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const isLanding = pathname === "/";
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => active && setEmail(d.email ?? null))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setEmail(null);
    router.refresh();
  }

  return (
    <header
      className={
        isLanding
          ? "absolute inset-x-0 top-0 z-40"
          : "sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-md"
      }
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/crew/new"
            className="rounded px-3 py-1.5 font-medium text-ink-dim transition-colors hover:text-ink"
          >
            Create a crew
          </Link>
          <Link
            href="/legal"
            className="hidden rounded px-3 py-1.5 font-medium text-ink-dim transition-colors hover:text-ink sm:inline-block"
          >
            Legal
          </Link>
          {email && (
            <button
              onClick={logout}
              className="rounded px-3 py-1.5 font-medium text-ink-faint transition-colors hover:text-ink"
              title={`Signed in as ${email}`}
            >
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
