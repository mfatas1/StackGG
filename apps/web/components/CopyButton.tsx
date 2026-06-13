"use client";
import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "./ui";

export function CopyButton({ text, label = "Copy invite link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
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
      {copied ? <Check className="h-4 w-4 text-win" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Copied!" : label}
    </Button>
  );
}
