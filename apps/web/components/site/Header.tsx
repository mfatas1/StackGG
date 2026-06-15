"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <span className="notch notch-sm grid h-7 w-7 place-items-center bg-primary text-primary-on">
        <span className="font-display text-base font-extrabold leading-none">S</span>
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-ink">
        Stack<span className="text-primary">GG</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
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
    <header className="sticky top-0 z-40 border-b border-line/40 bg-bg/55 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-1 text-sm">
          {email ? (
            <Link href="/account" className="px-3 py-1.5 font-medium text-ink-dim transition-colors hover:text-ink">
              My stacks
            </Link>
          ) : (
            <Link href="/stack/new" className="px-3 py-1.5 font-medium text-ink-dim transition-colors hover:text-ink">
              Create a stack
            </Link>
          )}
          <Link href="/legal" className="hidden px-3 py-1.5 font-medium text-ink-dim transition-colors hover:text-ink sm:inline-block">
            Legal
          </Link>
          {email ? (
            <button onClick={logout} className="px-3 py-1.5 font-medium text-ink-faint transition-colors hover:text-ink" title={`Signed in as ${email}`}>
              Sign out
            </button>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="notch notch-sm bg-primary/15 px-3 py-1.5 font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
