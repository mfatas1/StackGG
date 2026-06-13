"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copy invite link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard may be blocked */
        }
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
