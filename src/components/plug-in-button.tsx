"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Variant = "toolbar" | "pill";

interface PlugInButtonProps {
  /** Where the button points. Default "/journey". Use "/" for the Unplug return. */
  href?: string;
  /** Visual size/shape. "toolbar" = compact nav chip, "pill" = homepage CTA. */
  variant?: Variant;
  /** Button label. Default "Plug in…". */
  label?: string;
  /** Always animate the rain (true), or only on hover/focus (false). Default: pill=true, toolbar=false. */
  alwaysOn?: boolean;
}

/**
 * Matrix-rain CTA button. The green glyph rain is painted on a <canvas> that
 * sizes itself to the button. Used for "Plug in…" (enter /journey) and
 * "Unplug…" (return to /).
 */
export function PlugInButton({
  href = "/journey",
  variant = "pill",
  label = "Plug in…",
  alwaysOn,
}: PlugInButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);

  const rainOn = alwaysOn ?? (variant === "pill");
  const active = rainOn || hovered;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const glyphs = "01<>{}[]#$_/\\=+*".split("");
    let cols: number[] = [];
    let W = 0;
    let H = 0;
    let last = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.max(6, Math.floor(W / 9));
      cols = Array.from({ length: n }, () => Math.random() * -20);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (t: number) => {
      if (t - last > 70) {
        last = t;
        ctx.fillStyle = "rgba(6,20,13,0.32)";
        ctx.fillRect(0, 0, W, H);
        ctx.font = "11px var(--font-mono, monospace)";
        const step = W / cols.length;
        for (let i = 0; i < cols.length; i++) {
          const x = i * step;
          const y = cols[i] * 11;
          ctx.fillStyle = Math.random() < 0.18 ? "#bbf7d0" : "#10b981";
          ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y);
          cols[i] = y > H && Math.random() > 0.96 ? 0 : cols[i] + 1;
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    if (reduce) {
      ctx.fillStyle = "#06140d";
      ctx.fillRect(0, 0, W, H);
    } else if (active) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      // idle: paint a static dim wash so the button still reads as "live"
      ctx.fillStyle = "#06140d";
      ctx.fillRect(0, 0, W, H);
    }

    return () => {
      stop();
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  const isPill = variant === "pill";

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={label}
      style={{
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        gap: isPill ? 10 : 7,
        textDecoration: "none",
        borderRadius: isPill ? 8 : 6,
        border: "1px solid #10b981",
        background: "#06140d",
        padding: isPill ? "10px 20px" : "6px 13px",
        boxShadow: active
          ? "0 0 24px rgba(16,185,129,0.45)"
          : "0 0 12px rgba(16,185,129,0.22)",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.55,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: isPill ? 14 : 12.5,
          fontStyle: "italic",
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "#bbf7d0",
          textShadow: "0 0 10px #10b981",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </Link>
  );
}
