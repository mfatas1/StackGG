import { Crown } from "lucide-react";
import { FormPills } from "../ui";

const DEMO = [
  { name: "Sofía", tier: "Diamond", wr: 0.67, form: ["W", "W", "L", "W", "W"], vs: "+12pp", up: true },
  { name: "Mateo", tier: "Platinum", wr: 0.58, form: ["W", "L", "W", "W", "L"], vs: "+3pp", up: true },
  { name: "Drei", tier: "Platinum", wr: 0.52, form: ["L", "W", "W", "L", "W"], vs: "−1pp", up: false },
  { name: "Kasia", tier: "Gold", wr: 0.44, form: ["L", "L", "W", "L", "W"], vs: "−9pp", up: false },
] as const;

/** Static, demo-data preview of the crew standings (landing only). */
export function MiniStandings() {
  return (
    <div className="w-full rounded-lg border border-line bg-surface-2 shadow-pop">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-win" />
          <span className="text-sm font-semibold">The Bot Lane Diff</span>
        </div>
        <span className="text-2xs text-ink-faint tnum">312 shared games</span>
      </div>
      <div className="divide-y divide-line/50">
        {DEMO.map((r, i) => (
          <div key={r.name} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 px-4 py-2.5">
            <span className={`text-center font-mono text-sm ${i === 0 ? "text-gold" : "text-ink-faint"}`}>
              {i === 0 ? <Crown className="mx-auto h-4 w-4" /> : i + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-3 text-2xs font-semibold text-ink-dim">
                  {r.name.slice(0, 2)}
                </span>
                <span className="truncate text-sm font-medium">{r.name}</span>
                <span className="text-2xs text-ink-faint">{r.tier}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <FormPills form={[...r.form]} />
              </div>
              <span className="w-12 text-right font-mono text-sm tnum">{Math.round(r.wr * 100)}%</span>
              <span className={`w-12 text-right font-mono text-2xs ${r.up ? "text-win" : "text-loss"}`}>{r.vs}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
