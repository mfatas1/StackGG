import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded font-semibold transition-all duration-150 ease-out-quint focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-on hover:bg-primary-strong shadow-glow/0 hover:shadow-glow",
  ghost: "border border-line bg-surface text-ink hover:bg-surface-2 hover:border-line-strong",
  subtle: "bg-surface-2 text-ink hover:bg-surface-3",
  danger: "border border-loss/40 text-loss hover:bg-loss/10",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
  }
>(function Button({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded border border-line bg-surface-2 px-3.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-primary/60 ${className}`}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={`h-11 rounded border border-line bg-surface-2 px-3 text-sm text-ink transition-colors focus:border-primary/60 ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function Panel({
  children,
  className = "",
  as: As = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return <As className={`rounded-lg border border-line bg-surface-2/60 ${className}`}>{children}</As>;
}

export function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4">
      <h2 className="text-sm font-semibold text-ink-dim">{title}</h2>
      {action}
    </div>
  );
}

export function Empty({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-dashed border-line px-4 py-8 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <p className="max-w-xs text-sm text-ink-faint">{children}</p>
    </div>
  );
}

export function SampleSize({ games, label = "games" }: { games: number; label?: string }) {
  return (
    <span className="text-2xs font-medium text-ink-faint">
      {games} {label}
    </span>
  );
}

export function FormPills({ form }: { form: ("W" | "L")[] }) {
  if (!form.length) return <span className="text-ink-faint">—</span>;
  return (
    <span className="inline-flex gap-1" aria-label={`Recent form: ${form.join(", ")}`}>
      {form.map((r, i) => (
        <span
          key={i}
          className={`grid h-5 w-5 place-items-center rounded font-mono text-2xs font-bold ${
            r === "W" ? "bg-win/15 text-win" : "bg-loss/15 text-loss"
          }`}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export function Bar({ value, tone = "primary" }: { value: number | null; tone?: "primary" | "win" | "auto" }) {
  if (value == null) return <span className="text-ink-faint">—</span>;
  const w = Math.max(2, Math.round(value * 100));
  const color = tone === "auto" ? (value >= 0.5 ? "bg-win" : "bg-loss") : tone === "win" ? "bg-win" : "bg-primary";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-3">
      <div className={`h-full rounded-pill ${color} transition-[width] duration-700 ease-out-expo`} style={{ width: `${w}%` }} />
    </div>
  );
}

const TIER_TONE: Record<string, string> = {
  IRON: "text-ink-faint",
  BRONZE: "text-[oklch(0.65_0.08_50)]",
  SILVER: "text-ink-dim",
  GOLD: "text-gold",
  PLATINUM: "text-[oklch(0.78_0.10_190)]",
  EMERALD: "text-win",
  DIAMOND: "text-[oklch(0.75_0.12_250)]",
  MASTER: "text-[oklch(0.70_0.16_320)]",
  GRANDMASTER: "text-loss",
  CHALLENGER: "text-[oklch(0.82_0.12_200)]",
};

export function tierTone(tier?: string | null): string {
  return (tier && TIER_TONE[tier]) || "text-ink-dim";
}
