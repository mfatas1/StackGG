export default function Loading() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-line border-t-primary" />
      <p className="mt-4 text-ink-dim">Fetching match history from Riot…</p>
      <p className="mt-1 text-xs text-ink-faint">First load can take a few seconds.</p>
    </div>
  );
}
