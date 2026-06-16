import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-20 border-t border-line/40 bg-bg/55 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="notch notch-sm grid h-6 w-6 place-items-center bg-primary text-primary-on">
              <span className="font-display text-sm font-extrabold leading-none">S</span>
            </span>
            <span className="font-display font-bold">
              Stack<span className="text-primary">GG</span>
            </span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-dim">
            <Link href="/" className="hover:text-ink">Home</Link>
            <Link href="/stack/new" className="hover:text-ink">Create a stack</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/legal" className="hover:text-ink">Legal</Link>
          </nav>
        </div>
        <p className="mt-6 max-w-3xl text-2xs leading-relaxed text-ink-faint">
          StackGG isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or
          anyone officially involved in producing or managing Riot Games properties. Riot Games and League of Legends
          are trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </footer>
  );
}
