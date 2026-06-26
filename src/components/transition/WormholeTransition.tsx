"use client";

/**
 * WormholeTransition.tsx
 * ────────────────────────────────────────────────────────────────────────────
 * Mounts a single fixed, full-viewport <canvas> overlay and provides a
 * `useWormhole()` hook so any button can trigger a cinematic route transition.
 *
 * Wire it up ONCE, high in the tree (e.g. in app/layout.tsx, wrapping
 * SiteChrome). Then call `play()` from a click handler — it runs the canvas
 * animation, navigates at the cover-peak, and fades out.
 *
 *   // layout.tsx
 *   <WormholeProvider>
 *     <SiteChrome>{children}</SiteChrome>
 *   </WormholeProvider>
 *
 *   // any client component
 *   const { play } = useWormhole();
 *   play({ href: "/journey", direction: "plug", variant: "warp" });
 *
 * The overlay sits at z-index 2147483000 with pointer-events:none, so it never
 * blocks the UI while idle. Respects prefers-reduced-motion automatically
 * (falls back to a quick fade).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  playWormhole,
  type WormholeVariant,
} from "@/lib/wormhole-engine"; // ← adjust path if you place the engine elsewhere

/** Pick your final variants here after previewing — one switch for the whole site. */
export const WORMHOLE_CONFIG: {
  plug: WormholeVariant;
  unplug: WormholeVariant;
  duration: number;
} = {
  plug: "glitch",          // "warp" | "vortex" | "glitch"
  unplug: "crt-power-down", // "reverse-warp" | "crt-power-down" | "signal-lost"
  duration: 1400,
};

interface PlayArgs {
  href: string;
  direction: "plug" | "unplug";
  /** Override the configured variant for this one call. */
  variant?: WormholeVariant;
}

interface WormholeCtx {
  play: (args: PlayArgs) => void;
  busy: boolean;
  /** User opted out of transitions (persisted). When true, play() navigates instantly. */
  disabled: boolean;
  setDisabled: (v: boolean) => void;
}

const Ctx = createContext<WormholeCtx | null>(null);
const STORAGE_KEY = "wormhole:disabled";

export function useWormhole(): WormholeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWormhole must be used within <WormholeProvider>");
  return ctx;
}

export function WormholeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Persisted user opt-out ("disable animations"). Read once on mount so SSR/
  // first paint is stable, then kept in localStorage.
  const [disabled, setDisabledState] = useState(false);
  const disabledRef = useRef(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY) === "1";
      disabledRef.current = v;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisabledState(v); // intentional: hydrating localStorage value once on mount
    } catch { /* no-op */ }
  }, []);
  const setDisabled = useCallback((v: boolean) => {
    disabledRef.current = v;
    setDisabledState(v);
    try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch { /* no-op */ }
  }, []);

  // Optional: lock scroll during the transition.
  useEffect(() => {
    document.body.style.overflow = busy ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [busy]);

  const play = useCallback(
    ({ href, direction, variant }: PlayArgs) => {
      if (busyRef.current) return;
      // User opted out → navigate normally, no animation at all.
      if (disabledRef.current) { router.push(href); return; }
      const canvas = canvasRef.current;
      if (!canvas) { router.push(href); return; }

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      const v = variant ?? WORMHOLE_CONFIG[direction];

      busyRef.current = true;
      setBusy(true);

      // Prefetch the destination so it's painted under the overlay by swap time.
      try { router.prefetch?.(href); } catch { /* no-op */ }

      void playWormhole(canvas, {
        direction,
        variant: v,
        duration: WORMHOLE_CONFIG.duration,
        reducedMotion: !!reduce,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        onSwap: () => router.push(href),
      }).then(() => {
        busyRef.current = false;
        setBusy(false);
      });
    },
    [router],
  );

  return (
    <Ctx.Provider value={{ play, busy, disabled, setDisabled }}>
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 2147483000,
          pointerEvents: "none",
          opacity: 0,
        }}
      />
    </Ctx.Provider>
  );
}

/**
 * WormholeToggle — drop-in "disable animations" control.
 * Place it anywhere inside <WormholeProvider> (e.g. the footer). When checked,
 * Plug in / Unplug navigate normally with no transition. The choice persists
 * across visits via localStorage.
 *
 *   import { WormholeToggle } from "@/components/transition/WormholeTransition";
 *   <WormholeToggle />
 */
export function WormholeToggle({ className }: { className?: string }) {
  const { disabled, setDisabled } = useWormhole();
  return (
    <label
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontFamily: "var(--font-geist-mono, monospace)",
        fontSize: 12,
        color: "var(--color-text-muted, #8a978f)",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={disabled}
        onChange={(e) => setDisabled(e.target.checked)}
        style={{ accentColor: "#10b981", width: 14, height: 14 }}
      />
      Disable animations
    </label>
  );
}
