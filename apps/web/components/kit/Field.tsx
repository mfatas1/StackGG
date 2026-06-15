"use client";
import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`notch notch-sm h-11 w-full border border-line bg-surface-2/80 px-3.5 text-sm text-ink backdrop-blur transition-colors placeholder:text-ink-faint focus:border-primary/60 ${className}`}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", children, ...props },
  ref,
) {
  return (
    <div className="relative flex">
      <select
        ref={ref}
        className={`notch notch-sm h-11 w-full cursor-pointer appearance-none border border-line bg-surface-2/80 pl-3.5 pr-9 text-sm font-medium text-ink backdrop-blur transition-colors hover:border-primary/40 focus:border-primary/60 focus:outline-none [&>option]:bg-surface-2 [&>option]:text-ink ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
    </div>
  );
});

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-dim">{label}</span>
      {children}
    </label>
  );
}
