"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Mail, Check, Search, Clock, ChevronDown } from "lucide-react";
import { Button } from "./kit/Button";
import { Input, Field } from "./kit/Field";
import { ProfileIcon } from "./kit/Avatar";

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

function RegionSelect({
  value,
  onChange,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  size?: "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = REGIONS.find((r) => r.value === value) ?? REGIONS[0]!;
  const tall = size === "lg";

  function place() {
    const b = btnRef.current?.getBoundingClientRect();
    if (b) setPos({ top: b.bottom + 6, left: b.left, width: b.width });
  }

  // While open: reposition on scroll/resize and close on outside click. The menu
  // is portaled to <body> (escaping the Frame's clip-path), so the outside check
  // must consider both the trigger and the portaled list.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function openMenu() {
    place();
    setHi(REGIONS.findIndex((r) => r.value === value));
    setOpen(true);
  }
  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, REGIONS.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (hi >= 0) choose(REGIONS[hi]!.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Region"
        className={`notch notch-sm flex items-center justify-between gap-2 border border-line bg-surface-2/80 pl-3.5 pr-3 font-medium text-ink backdrop-blur transition-colors hover:border-primary/40 focus:border-primary/60 focus:outline-none ${
          tall ? "h-13 min-w-[5rem] text-base sm:h-14" : "h-11 min-w-[4.5rem] text-sm"
        }`}
      >
        {current.label}
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Region"
            style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 128) }}
            className="notch notch-sm z-[100] max-h-72 overflow-auto border border-line bg-bg/95 py-1 shadow-[0_12px_32px_oklch(0_0_0/0.5)] backdrop-blur-md"
          >
            {REGIONS.map((r, i) => (
              <li
                key={r.value}
                role="option"
                aria-selected={r.value === value}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r.value);
                }}
                className={`flex cursor-pointer items-center justify-between gap-6 px-3.5 py-2 text-sm ${
                  i === hi ? "bg-surface-3" : "hover:bg-surface-2"
                } ${r.value === value ? "font-medium text-primary" : "text-ink"}`}
              >
                {r.label}
                {r.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}

interface Suggestion {
  riotId: string;
  tag: string;
  region: string;
  profileIcon: number | null;
}
const RECENT_KEY = "stackgg:recent";
function readRecent(): Suggestion[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function pushRecent(s: Suggestion) {
  try {
    const key = (x: Suggestion) => `${x.riotId}#${x.tag}`.toLowerCase();
    const next = [s, ...readRecent().filter((r) => key(r) !== key(s))].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function RiotIdForm({ size = "md" }: { size?: "md" | "lg" }) {
  const router = useRouter();
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("euw1");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const valid = /.+#.+/.test(riotId);
  const showRecent = riotId.trim().length === 0 && recent.length > 0;
  const list = showRecent ? recent : results;

  useEffect(() => setRecent(readRecent()), []);
  useEffect(() => {
    const q = riotId.trim();
    if (q.length < 2) return setResults([]);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled) {
          setResults(data.results ?? []);
          setHi(-1);
        }
      } catch {
        /* ignore */
      }
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [riotId]);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(target: { riotId: string; tag: string; region: string }) {
    pushRecent({ ...target, profileIcon: null });
    setLoading(true);
    setOpen(false);
    router.push(`/player/${target.region}/${encodeURIComponent(`${target.riotId}#${target.tag}`)}`);
  }
  function submitFree() {
    if (!valid) return;
    const [name, tag] = riotId.trim().split("#");
    go({ riotId: name!, tag: tag!, region });
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      if (hi >= 0 && list[hi]) {
        e.preventDefault();
        go(list[hi]);
      }
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        submitFree();
      }}
    >
      <div ref={boxRef} className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          className={size === "lg" ? "h-13 pl-9 text-base sm:h-14" : "pl-9"}
          placeholder="Riot ID"
          value={riotId}
          onChange={(e) => {
            setRiotId(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open && list.length > 0}
          aria-controls="riotid-listbox"
          aria-autocomplete="list"
          aria-label="Riot ID"
          autoComplete="off"
        />
        {open && list.length > 0 && (
          <ul id="riotid-listbox" role="listbox" className="notch notch-sm absolute z-30 mt-1.5 max-h-72 w-full overflow-auto border border-line bg-bg/95 shadow-[0_12px_32px_oklch(0_0_0/0.5)] backdrop-blur-md">
            {showRecent && (
              <li className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-2xs uppercase tracking-wide text-ink-faint">
                <Clock className="h-3 w-3" /> Recent
              </li>
            )}
            {list.map((s, i) => (
              <li
                key={`${s.riotId}#${s.tag}#${s.region}`}
                role="option"
                aria-selected={i === hi}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(s);
                }}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${i === hi ? "bg-surface-3" : "hover:bg-surface-2"}`}
              >
                <ProfileIcon id={s.profileIcon} name={s.riotId} size={24} />
                <span className="font-medium">{s.riotId}</span>
                <span className="text-ink-faint">#{s.tag}</span>
                <span className="ml-auto bg-surface-2 px-1.5 py-0.5 text-2xs uppercase text-ink-faint">{s.region}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <RegionSelect value={region} onChange={setRegion} size={size} />
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

  if (state === "sent")
    return (
      <div className="notch flex items-start gap-3 border border-win/30 bg-win/10 p-4 text-sm">
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

  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
      <div className="relative flex-1">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input className="pl-9" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <Button loading={state === "sending"}>Email me a link</Button>
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
      setErr(data.error ?? "Could not create stack.");
      setState("error");
      return;
    }
    router.push(`/stack/${data.slug}?created=1`);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Stack name">
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
        {state === "loading" ? "Creating & pulling games…" : "Create stack"}
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
    router.push(`/stack/${data.slug}?joined=1`);
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
        {state === "loading" ? "Joining & pulling games…" : "Join stack"}
      </Button>
    </form>
  );
}

/** Link a Riot ID to the signed-in user (the "connect your account" form on /account). */
export function LinkRiotForm() {
  const router = useRouter();
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("euw1");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErr("");
    const res = await fetch("/api/account/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ riotId, region }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "Could not link that account.");
      setState("error");
      return;
    }
    setRiotId("");
    setState("idle");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Field label="Riot ID">
        <Input placeholder="Name#TAG" value={riotId} onChange={(e) => setRiotId(e.target.value)} required />
      </Field>
      <Field label="Region">
        <RegionSelect value={region} onChange={setRegion} />
      </Field>
      {state === "error" && <p className="text-sm text-loss">{err}</p>}
      <Button className="w-full" loading={state === "loading"}>
        {state === "loading" ? "Linking & pulling games…" : "Connect account"}
      </Button>
    </form>
  );
}

/** Unlink a claimed Riot account. */
export function UnlinkButton({ puuid }: { puuid: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function unlink() {
    setLoading(true);
    try {
      await fetch("/api/account/unlink", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ puuid }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      onClick={unlink}
      disabled={loading}
      className="text-2xs text-ink-faint transition-colors hover:text-loss disabled:opacity-50"
    >
      {loading ? "…" : "Unlink"}
    </button>
  );
}
