import { createElement } from "react";

/**
 * Frame — the signature lit Hextech panel that floats over the Rift. A notched
 * (beveled top-left + bottom-right) bordered surface: an outer layer paints the
 * border colour, the inner layer the translucent fill, both clipped, so the bevel
 * has a crisp 1px edge. Backdrop blur keeps the data legible over the 3D world.
 */
export function Frame({
  children,
  className = "",
  tone = "default",
  as = "div",
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "lit" | "gold";
  as?: React.ElementType;
  size?: "sm" | "md" | "lg";
}) {
  const border =
    tone === "gold" ? "bg-gold/45" : tone === "lit" ? "bg-primary/40" : "bg-line/70";
  const notch = size === "lg" ? "notch notch-lg" : size === "sm" ? "notch notch-sm" : "notch";
  const fill =
    tone === "lit" ? "bg-bg/75" : tone === "gold" ? "bg-bg/78" : "bg-bg/72";
  return createElement(
    as,
    { className: `${notch} ${border} p-px ${className}` },
    <div className={`${notch} ${fill} h-full w-full backdrop-blur-md`}>{children}</div>,
  );
}

/** Section header: a Cinzel title with a short gold tick (no tracked eyebrows). */
export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PanelHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
      <h3 className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-faint">{title}</h3>
      {action}
    </div>
  );
}

export function Empty({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="notch flex flex-col items-center gap-2 border border-dashed border-line/70 px-4 py-8 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <p className="max-w-xs text-sm text-ink-faint">{children}</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton notch ${className}`} aria-hidden />;
}
