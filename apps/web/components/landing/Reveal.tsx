"use client";
import { useEffect, useRef } from "react";

/**
 * Scroll reveal that ENHANCES an already-visible default (PLAN: never gate
 * content visibility on a class transition). SSR / no-JS / reduced-motion render
 * fully visible. When motion is allowed, JS hides then reveals on intersection,
 * with a safety timer so nothing can stay hidden.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: As = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(18px)";
    el.style.transition = `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;

    const reveal = () => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            reveal();
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    const safety = setTimeout(reveal, 1200); // never stay hidden
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, [delay]);

  return (
    <As ref={ref} className={className}>
      {children}
    </As>
  );
}
