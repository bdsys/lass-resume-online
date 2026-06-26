"use client";

/**
 * plug-in-button.tsx  (drop-in replacement)
 * ────────────────────────────────────────────────────────────────────────────
 * Same matrix-rain CTA you already have — the ONLY change is the click handler:
 * instead of letting <Link> navigate immediately, it triggers the full-screen
 * wormhole transition via useWormhole(), which navigates at the cover-peak.
 *
 * Direction is inferred from href ("/journey" = plug in, anything else = unplug),
 * or pass `direction` explicitly. The variant comes from WORMHOLE_CONFIG unless
 * overridden with `variant`.
 *
 * Requires <WormholeProvider> mounted above this in the tree (see layout.tsx).
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWormhole } from "@/components/transition/WormholeTransition"; // ← adjust path
import type { WormholeVariant } from "@/lib/wormhole-engine";

type Variant = "toolbar" | "pill";

interface PlugInButtonProps {
  /** Where the button points. Default "/journey". Use "/" for the Unplug return. */
  href?: string;
  /** Visual size/shape. "toolbar" = compact nav chip, "pill" = homepage CTA. */
  variant?: Variant;
  /** Button label. Default "Plug in…". */
  label?: string;
  /** Always animate the idle rain (true), or only on hover/focus (false). */
  alwaysOn?: boolean;
  /** Transition direction. Inferred from href when omitted. */
  direction?: "plug" | "unplug";
  /** Override the configured wormhole variant for this button. */
  transitionVariant?: WormholeVariant;
}

export function PlugInButton({
  href = "/journey",
  variant = "pill",
  label = "Plug in…",
  alwaysOn,
  direction,
  transitionVariant,
}: PlugInButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const { play } = useWormhole();

  const dir = direction ?? (href === "/journey" ? "plug" : "unplug");
  const rainOn = alwaysOn ?? variant === "pill";
  const active = rainOn || hovered;

  // ── idle matrix-rain painted onto the button (unchanged from your version) ──
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
    let W = 0, H = 0, last = 0;

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
        ctx.font = "11px var(--font-geist-mono, monospace)";
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

    if (reduce || !active) {
      ctx.fillStyle = "#06140d";
      ctx.fillRect(0, 0, W, H);
    } else {
      rafRef.current = requestAnimationFrame(draw);
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
      onClick={(e) => {
        // Honor new-tab / modifier clicks — let the browser handle those.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        play({ href, direction: dir, variant: transitionVariant });
      }}
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
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: "var(--font-geist-mono, monospace)",
          fontSize: isPill ? 14 : 12.5,
          fontStyle: "italic",
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "#bbf7d0",
          textShadow: "0 0 10px #10b981",
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </Link>
  );
}
