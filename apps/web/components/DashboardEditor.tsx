"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff, Check } from "lucide-react";
import type { DashboardConfig, DashboardPanel, DashboardPreset, PanelWidth } from "@crewstats/shared";
import { Frame, PanelHead } from "./kit/Frame";
import { Button } from "./kit/Button";
import { PRESET_LABELS, applyPreset, getPanelMeta } from "@/lib/dashboard";

const PRESET_KEYS: Exclude<DashboardPreset, "custom">[] = ["balanced", "competitive", "casual"];

/**
 * Owner-only dashboard layout editor (docs/dashboard-revamp.md). Pick a preset or hand-tune:
 * toggle each panel, set its width, and reorder. Saves the whole config to PATCH /api/crews.
 */
export function DashboardEditor({ slug, initial, isOwner }: { slug: string; initial: DashboardConfig; isOwner: boolean }) {
  const router = useRouter();
  const [preset, setPreset] = useState<DashboardPreset>(initial.preset);
  const [panels, setPanels] = useState<DashboardPanel[]>(initial.panels);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Any hand edit makes the layout "custom"; resave clears the saved flag.
  function edit(next: DashboardPanel[]) {
    setPanels(next);
    setPreset("custom");
    setSaved(false);
  }

  function choosePreset(p: Exclude<DashboardPreset, "custom">) {
    setPanels(applyPreset(p));
    setPreset(p);
    setSaved(false);
  }

  const toggleVisible = (id: string) =>
    edit(panels.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)));

  const setWidth = (id: string, width: PanelWidth) =>
    edit(panels.map((p) => (p.id === id ? { ...p, width } : p)));

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= panels.length) return;
    const next = [...panels];
    [next[index], next[target]] = [next[target]!, next[index]!];
    edit(next);
  }

  async function save() {
    setSaving(true);
    const config: DashboardConfig = { version: 1, preset, panels };
    await fetch(`/api/crews/${slug}/layout`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <Frame>
      <PanelHead title="Dashboard layout" />
      <div className="space-y-4 p-4 pt-3">
        <p className="text-2xs text-ink-dim">
          {isOwner
            ? "This is the stack's public layout — what everyone sees by default."
            : "This is your personal view of this stack. Only you see it."}
        </p>
        {/* Presets */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PRESET_KEYS.map((key) => {
            const on = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => choosePreset(key)}
                aria-pressed={on}
                className={`notch border p-3 text-left transition-colors ${
                  on ? "border-gold/60 bg-gold/10" : "border-line bg-bg/40 hover:border-gold/40"
                }`}
              >
                <div className="text-sm font-semibold text-ink">{PRESET_LABELS[key].label}</div>
                <div className="mt-0.5 text-2xs leading-snug text-ink-dim">{PRESET_LABELS[key].blurb}</div>
              </button>
            );
          })}
        </div>
        <p className="text-2xs text-ink-faint">
          Active layout: <span className="font-semibold text-ink-dim">{PRESET_LABELS[preset].label}</span>
        </p>

        {/* Per-panel controls */}
        <ul className="divide-y divide-line/40">
          {panels.map((p, i) => {
            const meta = getPanelMeta(p.id);
            if (!meta) return null;
            const canResize = meta.allowedWidths.length > 1;
            return (
              <li key={p.id} className={`flex items-center gap-3 py-2.5 ${p.visible ? "" : "opacity-55"}`}>
                {/* Reorder */}
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-ink-faint transition-colors hover:text-ink disabled:opacity-25" aria-label={`Move ${meta.title} up`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === panels.length - 1} className="text-ink-faint transition-colors hover:text-ink disabled:opacity-25" aria-label={`Move ${meta.title} down`}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Label */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{meta.title}</div>
                  <div className="truncate text-2xs text-ink-dim">{meta.blurb}</div>
                </div>

                {/* Width */}
                <div className="notch notch-sm inline-flex gap-0.5 border border-line bg-bg/60 p-0.5">
                  {(["half", "full"] as PanelWidth[]).map((w) => {
                    const allowed = meta.allowedWidths.includes(w);
                    const on = p.width === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        disabled={!allowed}
                        onClick={() => setWidth(p.id, w)}
                        className={`notch notch-sm px-2 py-1 text-2xs font-medium uppercase tracking-wide transition-colors ${
                          on ? "bg-surface-3 text-ink" : "text-ink-faint hover:text-ink"
                        } disabled:cursor-not-allowed disabled:opacity-30`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>

                {/* Visibility */}
                <button
                  type="button"
                  onClick={() => toggleVisible(p.id)}
                  aria-pressed={p.visible}
                  className={`notch notch-sm grid h-7 w-7 place-items-center border transition-colors ${
                    p.visible ? "border-gold/50 text-gold" : "border-line text-ink-faint hover:text-ink"
                  }`}
                  aria-label={p.visible ? `Hide ${meta.title}` : `Show ${meta.title}`}
                >
                  {p.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <Button onClick={save} loading={saving}>
            Save layout
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-2xs text-win">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>
    </Frame>
  );
}
