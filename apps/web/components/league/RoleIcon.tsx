"use client";
import { useState } from "react";
import { roleIcon } from "@/lib/format";

export function RoleIcon({ role, size = 16 }: { role?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const url = roleIcon(role);
  if (!url || err) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={role ?? ""}
      width={size}
      height={size}
      title={role ?? undefined}
      onError={() => setErr(true)}
      className="inline-block opacity-80 [filter:brightness(0)_invert(0.85)]"
    />
  );
}
