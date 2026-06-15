"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import { Frame, PanelHead } from "./kit/Frame";
import { Button } from "./kit/Button";
import { Input } from "./kit/Field";

interface Member {
  puuid: string;
  riotId: string;
  role: string;
}

export function SettingsPanel({
  slug,
  initialName,
  inviteUrl,
  members,
  isOwner,
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
  const [invite, setInvite] = useState(inviteUrl);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOwner)
    return (
      <Frame>
        <div className="p-5 text-sm text-ink-dim">Only the stack owner can change these settings.</div>
      </Frame>
    );

  async function rename() {
    setSaving(true);
    await fetch(`/api/crews/${slug}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    setSaving(false);
    router.refresh();
  }
  async function regenerate() {
    setRegen(true);
    const res = await fetch(`/api/crews/${slug}/invite`, { method: "POST" });
    const data = await res.json();
    if (data.inviteCode) setInvite(invite.replace(/\/join\/.*$/, `/join/${data.inviteCode}`));
    setRegen(false);
  }
  async function copy() {
    await navigator.clipboard.writeText(invite).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  async function removeMember(puuid: string) {
    await fetch(`/api/crews/${slug}/members?puuid=${encodeURIComponent(puuid)}`, { method: "DELETE" });
    router.refresh();
  }
  async function del() {
    await fetch(`/api/crews/${slug}`, { method: "DELETE" });
    router.push("/account");
  }

  return (
    <div className="space-y-4">
      <Frame>
        <PanelHead title="Stack name" />
        <div className="flex gap-2 p-4 pt-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <Button onClick={rename} loading={saving} disabled={!name.trim() || name === initialName}>
            Save
          </Button>
        </div>
      </Frame>

      <Frame>
        <PanelHead title="Invite link" />
        <div className="space-y-2 p-4 pt-3">
          <div className="flex gap-2">
            <Input value={invite} readOnly className="font-mono text-2xs" />
            <Button variant="subtle" onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-win" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <button onClick={regenerate} className="inline-flex items-center gap-1.5 text-2xs text-ink-faint transition-colors hover:text-ink">
            <RefreshCw className={`h-3 w-3 ${regen ? "animate-spin" : ""}`} /> Regenerate (old link stops working)
          </button>
        </div>
      </Frame>

      <Frame>
        <PanelHead title="Members" />
        <ul className="divide-y divide-line/40 p-2">
          {members.map((m) => (
            <li key={m.puuid} className="flex items-center justify-between gap-2 px-2 py-2 text-sm">
              <span className="truncate">
                {m.riotId}
                {m.role === "owner" && <span className="ml-2 text-2xs text-gold">owner</span>}
              </span>
              {m.role !== "owner" && (
                <button onClick={() => removeMember(m.puuid)} className="text-2xs text-ink-faint transition-colors hover:text-loss" aria-label={`Remove ${m.riotId}`}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </Frame>

      <Frame tone="default" className="border-loss/20">
        <PanelHead title="Danger zone" />
        <div className="p-4 pt-3">
          {confirmDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-dim">Delete this stack permanently? This removes the page for everyone.</p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={del}>
                  <Trash2 className="h-4 w-4" /> Yes, delete it
                </Button>
                <Button variant="subtle" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete stack
            </Button>
          )}
        </div>
      </Frame>
    </div>
  );
}
