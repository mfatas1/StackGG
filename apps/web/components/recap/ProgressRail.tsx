"use client";

/**
 * The scene-position indicator: a slim rail of ticks (one per scene), the current one lit in the
 * accent, grouped by act so you feel structure and "how far in" you are. Vertical on desktop
 * (right edge), horizontal on mobile (top).
 */
export function ProgressRail({
  scenes,
  active,
  onJump,
}: {
  scenes: { id: string; act: string }[];
  active: number;
  onJump: (i: number) => void;
}) {
  const currentAct = scenes[active]?.act ?? "";

  return (
    <>
      {/* desktop: vertical right rail */}
      <nav aria-label="Recap progress" className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-2.5 md:flex">
        <span className="mb-1 font-display text-2xs font-bold uppercase tracking-[0.3em] text-gold/80 [writing-mode:vertical-rl]">
          {currentAct}
        </span>
        {scenes.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onJump(i)}
            aria-label={`Go to scene ${i + 1}`}
            className="pointer-events-auto group flex items-center"
          >
            <span
              className={`block rounded-full transition-all duration-300 ${
                i === active ? "h-5 w-1.5 bg-gold" : "h-1.5 w-1.5 bg-line-strong group-hover:bg-ink-faint"
              }`}
            />
          </button>
        ))}
      </nav>

      {/* mobile: horizontal top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex flex-col gap-1 px-4 pt-2 md:hidden">
        <div className="flex gap-1">
          {scenes.map((s, i) => (
            <span key={s.id} className={`h-1 flex-1 rounded-full transition-colors ${i <= active ? "bg-gold" : "bg-line-strong/60"}`} />
          ))}
        </div>
        <span className="font-display text-2xs font-bold uppercase tracking-[0.3em] text-gold/80">{currentAct}</span>
      </div>
    </>
  );
}
