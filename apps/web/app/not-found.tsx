import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-28 text-center">
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">This page got dodged.</h1>
      <p className="mt-2 text-ink-dim">The stack, player, or page you&apos;re after doesn&apos;t exist.</p>
      <Link
        href="/"
        className="notch mt-6 inline-flex h-11 items-center bg-primary px-5 font-semibold text-primary-on transition-colors hover:bg-primary-strong"
      >
        Back to the Rift
      </Link>
    </div>
  );
}
