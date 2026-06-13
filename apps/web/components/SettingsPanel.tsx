"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "./CopyButton";

interface Member {
  puuid: string;
  riotId: string;
  role: string;
}

export function SettingsPanel({
  slug,
  initialName,
  inviteUrl: initialInviteUrl,
  members,
  isOwner,
  baseUrl,
}: {
  slug: string;
  initialName: string;
  inviteUrl: string;
  members: Member[];
  isOwner: boolean;
  baseUrl: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [inviteUrl, setInviteUrl] = useState(initialInviteUrl);
  const [msg, setMsg] = useState("");

  if (!isOwner) {
    return <p className="text-sm text-ink-dim">Only the crew owner can change these settings.</p>;
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/crews/${slug}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setMsg(res.ok ? "Saved." : "Rename failed.");
    if (res.ok) router.refresh();
  }

  async function regenerate() {
    const res = await fetch(`/api/crews/${slug}/invite`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setInviteUrl(`${baseUrl}/join/${data.inviteCode}`);
      setMsg("Invite code regenerated. Old links no longer work.");
    }
  }

  async function remove(puuid: string) {
    const res = await fetch(`/api/crews/${slug}/members?puuid=${encodeURIComponent(puuid)}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function destroy() {
    if (!confirm("Delete this crew permanently? This cannot be undone.")) return;
    const res = await fetch(`/api/crews/${slug}`, { method: "DELETE" });
    if (res.ok) router.push("/");
  }

  return (
    <div className="space-y-6">
      {msg && <p className="rounded bg-bg-hover px-3 py-2 text-sm text-accent">{msg}</p>}

      <form onSubmit={rename} className="card space-y-2 p-4">
        <label className="block text-xs text-ink-dim">Crew name</label>
        <div className="flex gap-2">
          <input className="input flex-1" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-accent">Save</button>
        </div>
      </form>

      <div className="card space-y-2 p-4">
        <label className="block text-xs text-ink-dim">Invite link</label>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate rounded bg-bg-raised px-2 py-1 text-xs text-ink-dim">{inviteUrl}</code>
          <CopyButton text={inviteUrl} label="Copy" />
          <button className="btn-ghost" onClick={regenerate} type="button">
            Regenerate
          </button>
        </div>
      </div>

      <div className="card p-4">
        <label className="mb-2 block text-xs text-ink-dim">Members</label>
        <ul className="space-y-1">
          {members.map((m) => (
            <li key={m.puuid} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-bg-hover">
              <span>
                {m.riotId} {m.role === "owner" && <span className="text-xs text-gold">owner</span>}
              </span>
              {m.role !== "owner" && (
                <button className="text-xs text-loss hover:underline" onClick={() => remove(m.puuid)} type="button">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card border-loss/30 p-4">
        <label className="mb-2 block text-xs text-ink-dim">Danger zone</label>
        <button className="btn border border-loss/40 text-loss hover:bg-loss/10" onClick={destroy} type="button">
          Delete crew
        </button>
      </div>
    </div>
  );
}
