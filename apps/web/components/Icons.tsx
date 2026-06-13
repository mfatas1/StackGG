"use client";
import { useState } from "react";
import { champIcon, profileIcon } from "@/lib/format";

export function ChampIcon({ name, size = 32 }: { name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-sm bg-surface-3 text-[10px] font-medium text-ink-dim"
        style={{ width: size, height: size }}
        title={name}
      >
        {name.slice(0, 2)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={champIcon(name)}
      alt={name}
      width={size}
      height={size}
      title={name}
      className="rounded"
      onError={() => setErr(true)}
    />
  );
}

export function ProfileIcon({ id, name, size = 40 }: { id: number | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const url = profileIcon(id);
  if (!url || err) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-ink-dim"
        style={{ width: size, height: size }}
        title={name}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      title={name}
      className="rounded-full"
      onError={() => setErr(true)}
    />
  );
}
