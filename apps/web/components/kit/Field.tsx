"use client";
import { forwardRef } from "react";

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
    <select
      ref={ref}
      className={`notch notch-sm h-11 border border-line bg-surface-2/80 px-3 text-sm text-ink backdrop-blur transition-colors focus:border-primary/60 ${className}`}
      {...props}
    >
      {children}
    </select>
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
