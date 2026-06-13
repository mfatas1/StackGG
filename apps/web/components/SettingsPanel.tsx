"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button, Input, Panel } from "./ui";
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
  const [busy, setBusy] = useState(false);

  if (!isOwner) {
    return <p className="text-sm text-ink-dim">Only the crew owner can change these settings.</p>;
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/crews/${slug}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
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
    <div className="space-y-5">
      {msg && <p className="rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{msg}</p>}

      <Panel className="p-4">
        <form onSubmit={rename} className="space-y-2">
          <label className="block text-xs font-medium text-ink-dim">Crew name</label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button loading={busy}>Save</Button>
          </div>
        </form>
      </Panel>

      <Panel className="p-4">
        <label className="mb-2 block text-xs font-medium text-ink-dim">Invite link</label>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-surface px-2.5 py-2 font-mono text-xs text-ink-dim">{inviteUrl}</code>
          <CopyButton text={inviteUrl} label="Copy" />
          <Button variant="ghost" size="sm" onClick={regenerate} type="button">
            <RefreshCw className="h-4 w-4" /> Regenerate
          </Button>
        </div>
      </Panel>

      <Panel className="p-4">
        <label className="mb-2 block text-xs font-medium text-ink-dim">Members</label>
        <ul className="divide-y divide-line/50">
          {members.map((m) => (
            <li key={m.puuid} className="flex items-center justify-between py-2 text-sm">
              <span>
                {m.riotId} {m.role === "owner" && <span className="ml-1 text-2xs text-gold">owner</span>}
              </span>
              {m.role !== "owner" && (
                <button className="text-xs text-loss hover:underline" onClick={() => remove(m.puuid)} type="button">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="border-loss/30 p-4">
        <label className="mb-2 block text-xs font-medium text-ink-dim">Danger zone</label>
        <Button variant="danger" onClick={destroy} type="button">
          <Trash2 className="h-4 w-4" /> Delete crew
        </Button>
      </Panel>
    </div>
  );
}
