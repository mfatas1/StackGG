"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const REGIONS = [
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "na1", label: "NA" },
  { value: "kr", label: "KR" },
  { value: "br1", label: "BR" },
  { value: "tr1", label: "TR" },
  { value: "jp1", label: "JP" },
  { value: "oc1", label: "OCE" },
  { value: "la1", label: "LAN" },
  { value: "la2", label: "LAS" },
];

function RegionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {REGIONS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

export function RiotIdForm({ defaultRegion = "euw1" }: { defaultRegion?: string }) {
  const router = useRouter();
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState(defaultRegion);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!riotId.includes("#")) return;
        setLoading(true);
        router.push(`/player/${region}/${encodeURIComponent(riotId.trim())}`);
      }}
    >
      <input
        className="input flex-1"
        placeholder="Riot ID — e.g. StackMember1#5418"
        value={riotId}
        onChange={(e) => setRiotId(e.target.value)}
        autoFocus
      />
      <RegionSelect value={region} onChange={setRegion} />
      <button className="btn-accent" disabled={loading || !riotId.includes("#")}>
        {loading ? "Loading…" : "See your stats"}
      </button>
    </form>
  );
}

export function SignInForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/auth/magic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, redirectTo }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "Something went wrong.");
      setState("error");
      return;
    }
    setDevLink(data.devLink ?? null);
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-ink">Check your email for a sign-in link.</p>
        {devLink && (
          <p className="text-ink-faint">
            Dev mode — link:{" "}
            <a className="text-accent underline" href={devLink}>
              click to sign in
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
      <input
        className="input flex-1"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button className="btn-accent" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a link"}
      </button>
      {state === "error" && <span className="self-center text-sm text-loss">{err}</span>}
    </form>
  );
}

export function CreateCrewForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("euw1");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErr("");
    const res = await fetch("/api/crews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, riotId, region }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "Could not create crew.");
      setState("error");
      return;
    }
    router.push(`/crew/${data.slug}?created=1`);
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Crew name</label>
        <input className="input w-full" placeholder="The Bot Lane Diff" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Your Riot ID</label>
        <input className="input w-full" placeholder="Name#TAG" value={riotId} onChange={(e) => setRiotId(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Region</label>
        <RegionSelect value={region} onChange={setRegion} />
      </div>
      {state === "error" && <p className="text-sm text-loss">{err}</p>}
      <button className="btn-accent w-full" disabled={state === "loading"}>
        {state === "loading" ? "Creating & backfilling…" : "Create crew"}
      </button>
    </form>
  );
}

export function JoinForm({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("euw1");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErr("");
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviteCode, riotId, region, email: email || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "Could not join.");
      setState("error");
      return;
    }
    router.push(`/crew/${data.slug}?joined=1`);
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Your Riot ID</label>
        <input className="input w-full" placeholder="Name#TAG" value={riotId} onChange={(e) => setRiotId(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Region</label>
        <RegionSelect value={region} onChange={setRegion} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-dim">Email (optional)</label>
        <input className="input w-full" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {state === "error" && <p className="text-sm text-loss">{err}</p>}
      <button className="btn-accent w-full" disabled={state === "loading"}>
        {state === "loading" ? "Joining & backfilling…" : "Join crew"}
      </button>
    </form>
  );
}
