"use client";
import { useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, X, Plus, SlidersHorizontal, Check, RotateCcw } from "lucide-react";
import type { DashboardConfig, DashboardPanel, PanelId, PanelWidth } from "@crewstats/shared";
import { Frame } from "./kit/Frame";
import { Button } from "./kit/Button";
import { getPanelMeta } from "@/lib/dashboard";

const CATEGORY_LABEL: Record<string, string> = { competitive: "Competitive", fun: "Casual", core: "Core" };
const GRID = "grid grid-cols-1 gap-x-4 gap-y-6 lg:grid-cols-2";

/**
 * In-page dashboard with direct-manipulation editing (docs/competitive-casual-revamp.md, v3).
 * Edit mode is WYSIWYG: the REAL panels stay in the REAL grid, each gets an edit strip
 * (drag handle · width · remove), and you drag the actual panel to reorder. Width/visibility
 * changes apply live, so the grid you edit is the grid you'll get. Saving routes server-side:
 * owner → public layout, member → personal override.
 */
export function DashboardCanvas({
  nodes,
  config,
  isMember,
  isOwner,
  slug,
}: {
  nodes: Record<PanelId, ReactNode>;
  config: DashboardConfig;
  isMember: boolean;
  isOwner: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  // `panels` is the editing buffer; view mode renders from the live `config` prop so a refresh
  // after save/reset always reflects server truth. Seed the buffer when editing starts.
  const [panels, setPanels] = useState<DashboardPanel[]>(config.panels);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dragId, setDragId] = useState<PanelId | null>(null);
  // Where the dragged panel would land: just before/after a target — drawn as an insertion line.
  const [over, setOver] = useState<{ id: PanelId; side: "before" | "after" } | null>(null);

  const visible = panels.filter((p) => p.visible);
  const hidden = panels.filter((p) => !p.visible);

  function startEdit() {
    setPanels(config.panels);
    setEditing(true);
  }
  const setWidth = (id: PanelId, width: PanelWidth) => setPanels((ps) => ps.map((p) => (p.id === id ? { ...p, width } : p)));
  const setVisible = (id: PanelId, vis: boolean) => setPanels((ps) => ps.map((p) => (p.id === id ? { ...p, visible: vis } : p)));

  function reorder(fromId: PanelId, toId: PanelId, side: "before" | "after") {
    if (fromId === toId) return;
    setPanels((ps) => {
      const moved = ps.find((p) => p.id === fromId);
      if (!moved) return ps;
      const arr = ps.filter((p) => p.id !== fromId); // remove first, then place relative to target
      let idx = arr.findIndex((p) => p.id === toId);
      if (idx < 0) idx = arr.length;
      else if (side === "after") idx += 1;
      arr.splice(idx, 0, moved);
      return arr;
    });
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/crews/${slug}/layout`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ config: { version: 1, preset: "custom", panels } satisfies DashboardConfig }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }
  function cancel() {
    setEditing(false);
  }
  async function resetDefault() {
    setResetting(true);
    await fetch(`/api/crews/${slug}/layout`, { method: "DELETE" });
    setResetting(false);
    setEditing(false);
    router.refresh();
  }

  // ---- View mode (renders from the live config prop) ----
  if (!editing) {
    const viewVisible = config.panels.filter((p) => p.visible);
    return (
      <div className="space-y-4">
        {isMember && (
          <div className="flex justify-end">
            <button
              onClick={startEdit}
              className="notch notch-sm inline-flex items-center gap-1.5 border border-line bg-bg/50 px-3 py-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-dim backdrop-blur transition-colors hover:border-gold/50 hover:text-ink"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Edit layout
            </button>
          </div>
        )}
        {viewVisible.length === 0 ? (
          <Frame>
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-sm text-ink-dim">This dashboard is empty.</p>
              {isMember && (
                <button onClick={startEdit} className="text-sm font-medium text-gold hover:underline">
                  Add some panels →
                </button>
              )}
            </div>
          </Frame>
        ) : (
          <div className={GRID}>
            {viewVisible.map((p) => (
              <div key={p.id} className={p.width === "full" ? "lg:col-span-2" : ""}>
                {nodes[p.id]}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Edit mode (WYSIWYG: real panels, real grid, drag to reorder) ----
  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-20">
        <Frame tone="lit">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div>
              <h3 className="font-display text-sm font-bold tracking-tight">Editing layout</h3>
              <p className="text-2xs text-ink-dim">
                {isOwner ? "The stack's public layout — everyone sees this." : "Your personal view — only you see it."}{" "}
                Drag a panel by its handle to reorder.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isOwner && (
                <Button variant="subtle" onClick={resetDefault} loading={resetting}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              )}
              <Button variant="subtle" onClick={cancel}>Cancel</Button>
              <Button onClick={save} loading={saving}>
                <Check className="h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        </Frame>
      </div>

      {visible.length === 0 ? (
        <Frame>
          <div className="p-8 text-center text-sm text-ink-dim">No panels shown — add some below.</div>
        </Frame>
      ) : (
        <div className={GRID}>
          {visible.map((p) => {
            const meta = getPanelMeta(p.id);
            if (!meta) return null;
            const canResize = meta.allowedWidths.length > 1;
            const isDragging = dragId === p.id;
            // Half panels sit side-by-side → insert left/right; full panels stack → insert top/bottom.
            const horizontal = p.width !== "full";
            const sideAt = (e: DragEvent): "before" | "after" => {
              const r = e.currentTarget.getBoundingClientRect();
              return horizontal
                ? e.clientX < r.left + r.width / 2 ? "before" : "after"
                : e.clientY < r.top + r.height / 2 ? "before" : "after";
            };
            const showLine = over?.id === p.id && dragId !== p.id;
            return (
              <div
                key={p.id}
                className={`relative ${p.width === "full" ? "lg:col-span-2" : ""} ${isDragging ? "opacity-40" : ""}`}
                draggable
                onDragStart={(e: DragEvent) => {
                  setDragId(p.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", p.id);
                }}
                onDragOver={(e: DragEvent) => {
                  e.preventDefault();
                  const side = sideAt(e);
                  if (over?.id !== p.id || over?.side !== side) setOver({ id: p.id, side });
                }}
                onDrop={(e: DragEvent) => {
                  e.preventDefault();
                  // Source rides in dataTransfer (React state is stale mid-drag); side from the cursor.
                  const fromId = (e.dataTransfer.getData("text/plain") || dragId) as PanelId | "";
                  if (fromId) reorder(fromId, p.id, sideAt(e));
                  setDragId(null);
                  setOver(null);
                }}
                onDragEnd={() => { setDragId(null); setOver(null); }}
              >
                {showLine && (
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute z-10 rounded-full bg-gold shadow-[0_0_8px_oklch(var(--gold)/0.7)] ${
                      horizontal
                        ? `inset-y-1 w-1 ${over!.side === "before" ? "-left-2" : "-right-2"}`
                        : `inset-x-1 h-1 ${over!.side === "before" ? "-top-3" : "-bottom-3"}`
                    }`}
                  />
                )}
                <div className="notch bg-line/70 p-px">
                  {/* Edit strip = grab affordance + controls (the whole panel is draggable) */}
                  <div className="flex cursor-grab items-center gap-2 bg-surface-3/70 px-2 py-1 active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 shrink-0 text-ink-faint" />
                    <span className="flex-1 truncate text-2xs font-semibold uppercase tracking-wide text-ink-dim">{meta.title}</span>
                    {canResize && (
                      <div className="inline-flex gap-0.5" onMouseDown={(e) => e.stopPropagation()}>
                        {(["half", "full"] as PanelWidth[]).map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWidth(p.id, w)}
                            className={`px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors ${p.width === w ? "text-gold" : "text-ink-faint hover:text-ink"}`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setVisible(p.id, false)}
                      className="grid h-5 w-5 place-items-center text-ink-faint transition-colors hover:text-loss"
                      aria-label={`Remove ${meta.title}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Real panel, inert while editing */}
                  <div className="pointer-events-none select-none">{nodes[p.id]}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add panels tray */}
      <Frame>
        <div className="p-4">
          <h4 className="mb-3 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Add panels</h4>
          {hidden.length === 0 ? (
            <p className="text-sm text-ink-dim">Every panel is on your dashboard.</p>
          ) : (
            <div className="space-y-4">
              {(["competitive", "fun", "core"] as const).map((cat) => {
                const items = hidden.filter((p) => getPanelMeta(p.id)?.category === cat);
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-faint/70">{CATEGORY_LABEL[cat]}</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {items.map((p) => {
                        const meta = getPanelMeta(p.id)!;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setVisible(p.id, true)}
                            className="notch group flex items-start gap-2 border border-line bg-bg/40 p-2.5 text-left transition-colors hover:border-gold/40"
                          >
                            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-gold" />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-ink">{meta.title}</span>
                              <span className="block text-2xs leading-snug text-ink-dim">{meta.blurb}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Frame>
    </div>
  );
}
