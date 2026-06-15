"use client";
import { createElement, useEffect, useRef, useState } from "react";

/** Mono count-up on first view; final value immediately under reduced-motion. */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 900,
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setDisplay(value);
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0]?.isIntersecting || ran.current) return;
        ran.current = true;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setDisplay(value * eased);
          if (t < 1) requestAnimationFrame(tick);
        };
        setDisplay(0);
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);
  return (
    <span ref={ref} className={`tnum ${className}`}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Scroll reveal that ENHANCES an already-visible default (never gates content). */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
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
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            reveal();
            io.disconnect();
          }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    const safety = setTimeout(reveal, 1200);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, [delay]);
  return createElement(as, { ref, className }, children);
}
