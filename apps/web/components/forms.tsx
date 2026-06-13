"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Mail, Check } from "lucide-react";
import { Button, Input, Select } from "./ui";

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
    <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Region">
      {REGIONS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </Select>
  );
}

export function RiotIdForm({ size = "md" }: { size?: "md" | "lg" }) {
  const router = useRouter();
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("euw1");
  const [loading, setLoading] = useState(false);
  const valid = /.+#.+/.test(riotId);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        setLoading(true);
        router.push(`/player/${region}/${encodeURIComponent(riotId.trim())}`);
      }}
    >
      <div className="relative flex-1">
        <Input
          className={size === "lg" ? "h-13 pl-9 text-base sm:h-14" : "pl-9"}
          placeholder="Riot ID — e.g. StackMember1#5418"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          aria-label="Riot ID"
          autoFocus
        />
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-ink-faint">#</span>
      </div>
      <RegionSelect value={region} onChange={setRegion} />
      <Button size={size === "lg" ? "lg" : "md"} loading={loading} disabled={!valid}>
        See your stats
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
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
      <div className="flex items-start gap-3 rounded border border-win/30 bg-win/10 p-4 text-sm">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-win" />
        <div className="space-y-1">
          <p className="font-medium text-ink">Check your email for a sign-in link.</p>
          {devLink && (
            <p className="text-ink-dim">
              Dev mode:{" "}
              <a className="font-medium text-primary underline underline-offset-2" href={devLink}>
                click to sign in
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          className="pl-9"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button loading={state === "sending"}>Email me a link</Button>
      {state === "error" && <span className="self-center text-sm text-loss">{err}</span>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-dim">{label}</span>
      {children}
    </label>
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
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Crew name">
        <Input placeholder="The Bot Lane Diff" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Your Riot ID">
        <Input placeholder="Name#TAG" value={riotId} onChange={(e) => setRiotId(e.target.value)} required />
      </Field>
      <Field label="Region">
        <RegionSelect value={region} onChange={setRegion} />
      </Field>
      {state === "error" && <p className="text-sm text-loss">{err}</p>}
      <Button className="w-full" loading={state === "loading"}>
        {state === "loading" ? "Creating & pulling games…" : "Create crew"}
      </Button>
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
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Your Riot ID">
        <Input placeholder="Name#TAG" value={riotId} onChange={(e) => setRiotId(e.target.value)} required />
      </Field>
      <Field label="Region">
        <RegionSelect value={region} onChange={setRegion} />
      </Field>
      <Field label="Email (optional)">
        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {state === "error" && <p className="text-sm text-loss">{err}</p>}
      <Button className="w-full" loading={state === "loading"}>
        {state === "loading" ? "Joining & pulling games…" : "Join crew"}
      </Button>
    </form>
  );
}
