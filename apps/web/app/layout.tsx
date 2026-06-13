import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrewStats — how your group plays together",
  description:
    "op.gg tells you how you play. CrewStats tells you how your group plays together. Cross-mode crew leaderboards, duo synergy, and head-to-head for your League friend group.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-5 w-5 rounded-sm bg-accent" />
              <span>CrewStats</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-ink-dim">
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
              <Link href="/legal" className="hover:text-ink">
                Legal
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-ink-faint">
            CrewStats isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of
            Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot
            Games and League of Legends are trademarks or registered trademarks of Riot Games, Inc.
          </div>
        </footer>
      </body>
    </html>
  );
}
