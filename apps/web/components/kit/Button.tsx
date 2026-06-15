import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "notch inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-on hover:bg-primary-strong hover:shadow-[0_0_24px_oklch(var(--primary)/0.4)]",
  ghost: "border border-line-strong/70 bg-bg/40 text-ink backdrop-blur-md hover:border-gold/60 hover:text-ink",
  subtle: "bg-surface-2/80 text-ink backdrop-blur hover:bg-surface-3",
  danger: "border border-loss/40 text-loss hover:bg-loss/10",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base sm:h-14",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }, ref) {
  return (
    <button ref={ref} disabled={disabled || loading} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
