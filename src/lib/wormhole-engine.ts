/**
 * wormhole-engine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Framework-agnostic, dependency-free canvas animation engine for the
 * "Plug in…" (enter the Matrix) and "Unplug…" (return to reality) full-screen
 * route transitions.
 *
 * Six variants total — pick one per direction (see PLUG_VARIANTS / UNPLUG_VARIANTS):
 *   PLUG   → "warp"          Wormhole tunnel of code rushing toward you (Z-warp)
 *            "vortex"        Code spirals into a glowing portal that swallows the screen
 *            "glitch"        Reality tears (RGB split / scanlines) then matrix rain swallows it
 *   UNPLUG → "reverse-warp"  Code recedes, white flash, "wake up"
 *            "crt-power-down" The rain collapses to a line, then a dot — old CRT switching off
 *            "signal-lost"   TV static / snow + "SIGNAL LOST", cut to black
 *
 * Usage:
 *   await playWormhole(canvas, {
 *     direction: "plug",
 *     variant: "warp",
 *     onSwap: () => router.push("/journey"),   // fires at the opaque "peak"
 *   });
 *
 * The canvas should be a fixed, full-viewport element (position:fixed; inset:0;
 * pointer-events:none). The engine sizes its backing store, runs the animation,
 * navigates at the cover-peak via onSwap(), then fades the canvas out and
 * resolves. It does NOT touch the canvas's CSS opacity except to drive the
 * tail-reveal fade.
 */

export type PlugVariant = "warp" | "vortex" | "glitch";
export type UnplugVariant = "reverse-warp" | "crt-power-down" | "signal-lost";
export type WormholeVariant = PlugVariant | UnplugVariant;

export const PLUG_VARIANTS: PlugVariant[] = ["warp", "vortex", "glitch"];
export const UNPLUG_VARIANTS: UnplugVariant[] = [
  "reverse-warp",
  "crt-power-down",
  "signal-lost",
];

export interface PlayOptions {
  direction: "plug" | "unplug";
  variant: WormholeVariant;
  /** Total transition length in ms. Default 1400. */
  duration?: number;
  /** Particle-count multiplier. Default 1. */
  density?: number;
  /** Glow / flash intensity multiplier. Default 1. */
  glow?: number;
  /** Render a simple fade instead of the full effect. Default false. */
  reducedMotion?: boolean;
  /** Monospace family used for the glyph rain. */
  fontFamily?: string;
  /** Fires once, at the variant's cover-peak — do your route navigation here. */
  onSwap?: () => void;
}

const GLYPHS =
  "01<>{}[]#$_/\\=+*アカサタナハマヤラ012345".split("");

// Cover-peak (0–1) at which onSwap() fires, per variant. Chosen so the incoming
// page is hidden behind opaque coverage at the moment it mounts.
const SWAP_AT: Record<string, number> = {
  warp: 0.55,
  vortex: 0.6,
  glitch: 0.6,
  "reverse-warp": 0.55,
  "crt-power-down": 0.8,
  "signal-lost": 0.62,
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
const smooth = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};

interface Scene {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ps?: any[];
  cols?: number[];
  slices?: { y: number; h: number; dx: number }[];
  noise?: HTMLCanvasElement;
  nctx?: CanvasRenderingContext2D | null;
}

export function playWormhole(
  canvas: HTMLCanvasElement,
  opts: PlayOptions,
): Promise<void> {
  const {
    direction,
    variant,
    duration = 1400,
    density = 1,
    glow = 1,
    reducedMotion = false,
    fontFamily = "ui-monospace, 'Geist Mono', monospace",
    onSwap,
  } = opts;

  return new Promise<void>((resolve) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onSwap?.();
      resolve();
      return;
    }

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.opacity = "1";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const font = (px: number) => `${px | 0}px ${fontFamily}`;
    const scene: Scene = {};

    const makeCols = (w: number) => {
      const n = Math.max(12, Math.floor(w / 13));
      return Array.from({ length: n }, () => Math.random() * -30);
    };

    // ── scene setup ──────────────────────────────────────────────────────────
    if (!reducedMotion) {
      if (variant === "warp" || variant === "reverse-warp") {
        const N = Math.round(260 * density);
        scene.ps = [];
        for (let i = 0; i < N; i++)
          scene.ps.push({
            x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(0.05, 1),
            baseA: rnd(0, 6.28), ch: glyph(),
          });
      } else if (variant === "vortex") {
        const N = Math.round(240 * density);
        scene.ps = [];
        for (let i = 0; i < N; i++)
          scene.ps.push({
            ang: rnd(0, 6.28), rad: rnd(0.05, 1.1), ch: glyph(), sp: rnd(0.7, 1.5),
          });
      } else if (variant === "glitch") {
        scene.cols = makeCols(W);
        scene.slices = Array.from({ length: 14 }, () => ({
          y: Math.random() * H, h: rnd(6, 30), dx: rnd(-30, 30),
        }));
      } else if (variant === "crt-power-down") {
        scene.cols = makeCols(W);
      } else if (variant === "signal-lost") {
        const nc = document.createElement("canvas");
        nc.width = 160; nc.height = 90;
        scene.noise = nc;
        scene.nctx = nc.getContext("2d");
      }
    }

    // ── draws ────────────────────────────────────────────────────────────────
    const drawFade = (p: number) => {
      ctx.clearRect(0, 0, W, H);
      const a = p < 0.5 ? p / 0.5 : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = direction === "plug" ? "#04130c" : "#05080a";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    };

    const drawWarp = (p: number, dirSign: 1 | -1) => {
      ctx.fillStyle = "rgba(2,12,7,0.34)";
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, spread = Math.min(W, H) * 0.55;
      const speed = 0.005 * (1 + p * 13), twist = p * 1.1;
      for (const pt of scene.ps!) {
        pt.z += dirSign > 0 ? -speed : speed;
        if (dirSign > 0) {
          if (pt.z < 0.04) { pt.z = 1; pt.x = rnd(-1, 1); pt.y = rnd(-1, 1); pt.ch = glyph(); }
        } else {
          if (pt.z > 1) { pt.z = 0.05; pt.x = rnd(-1, 1); pt.y = rnd(-1, 1); pt.ch = glyph(); }
        }
        const k = 1 / pt.z;
        const ang = (1 - pt.z) * twist * dirSign + pt.baseA;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const rx = pt.x * ca - pt.y * sa, ry = pt.x * sa + pt.y * ca;
        const sx = cx + rx * k * spread, sy = cy + ry * k * spread;
        if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
        ctx.font = font(Math.max(8, Math.min(42, k * 9)));
        const near = Math.min(1, (k - 1) * 0.5);
        ctx.fillStyle = near > 0.7 ? "#eafff3" : Math.random() < 0.2 ? "#bbf7d0" : "#19c37d";
        ctx.globalAlpha = Math.max(0.12, Math.min(1, 0.25 + near));
        ctx.fillText(pt.ch, sx, sy);
      }
      ctx.globalAlpha = 1;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * (0.1 + p * 0.6));
      gr.addColorStop(0, `rgba(120,255,190,${0.06 + p * 0.25 * glow})`);
      gr.addColorStop(1, "rgba(2,12,7,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      if (dirSign > 0 && p > 0.82) {
        const a = (p - 0.82) / 0.18;
        ctx.fillStyle = `rgba(220,255,235,${a * 0.9 * glow})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (dirSign < 0 && p > 0.5) {
        const a = Math.min(1, (p - 0.5) / 0.18);
        ctx.fillStyle = `rgba(238,255,246,${a})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const drawVortex = (p: number) => {
      ctx.fillStyle = "rgba(2,12,7,0.30)";
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, maxR = Math.hypot(W, H) * 0.55;
      const pull = 0.004 * (1 + p * 5), spin = 0.03 + p * 0.05;
      for (const pt of scene.ps!) {
        pt.ang += spin * pt.sp; pt.rad -= pull * pt.sp;
        if (pt.rad < 0.02) { pt.rad = rnd(0.9, 1.15); pt.ch = glyph(); }
        const r = pt.rad * maxR * (1 - p * 0.15);
        const sx = cx + Math.cos(pt.ang) * r, sy = cy + Math.sin(pt.ang) * r;
        const near = 1 - pt.rad;
        ctx.font = font(Math.max(9, Math.min(30, 10 + near * 20)));
        ctx.fillStyle = near > 0.8 ? "#eafff3" : Math.random() < 0.2 ? "#bbf7d0" : "#19c37d";
        ctx.globalAlpha = Math.max(0.12, Math.min(1, 0.3 + near * 0.7));
        ctx.fillText(pt.ch, sx, sy);
      }
      ctx.globalAlpha = 1;
      const portalR = Math.pow(p, 2.2) * maxR * 1.4;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, portalR));
      gr.addColorStop(0, `rgba(180,255,210,${0.5 + 0.5 * glow})`);
      gr.addColorStop(0.5, "rgba(25,195,125,0.35)");
      gr.addColorStop(1, "rgba(2,12,7,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      if (p > 0.85) {
        const a = (p - 0.85) / 0.15;
        ctx.fillStyle = `rgba(220,255,235,${a * 0.85 * glow})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const drawGlitch = (p: number) => {
      if (p < 0.4) {
        const a = p / 0.4;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = `rgba(2,16,9,${a * 0.35})`;
        ctx.fillRect(0, 0, W, H);
        for (const s of scene.slices!) {
          if (Math.random() < 0.5) {
            const dx = s.dx * a * (Math.random() < 0.5 ? 1 : -1) * 2;
            ctx.fillStyle = Math.random() < 0.5
              ? `rgba(25,195,125,${0.15 + a * 0.4})`
              : `rgba(180,255,210,${0.1 + a * 0.3})`;
            ctx.fillRect(dx, s.y, W, s.h);
            ctx.fillStyle = `rgba(255,40,80,${0.06 + a * 0.12})`;
            ctx.fillRect(dx - 3, s.y, W, 2);
            ctx.fillStyle = `rgba(40,140,255,${0.06 + a * 0.12})`;
            ctx.fillRect(dx + 3, s.y + s.h - 2, W, 2);
          }
          if (Math.random() < 0.06) { s.y = Math.random() * H; s.h = rnd(6, 30); }
        }
        ctx.fillStyle = `rgba(0,0,0,${0.08 + a * 0.12})`;
        for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
        if (Math.random() < 0.3) {
          ctx.fillStyle = `rgba(220,255,235,${0.2 * a})`;
          ctx.fillRect(0, Math.random() * H, W, rnd(2, 16));
        }
      } else {
        const q = (p - 0.4) / 0.6;
        ctx.fillStyle = `rgba(2,12,7,${0.25 + q * 0.2})`;
        ctx.fillRect(0, 0, W, H);
        const cols = scene.cols!, step = W / cols.length;
        ctx.font = font(13);
        for (let i = 0; i < cols.length; i++) {
          cols[i] += 1 + q * 2.2 + (i % 3) * 0.2;
          const headY = cols[i] * 15;
          for (let t = 0; t < 3; t++) {
            const y = headY - t * 15;
            if (y < 0 || y > H) continue;
            ctx.fillStyle = t === 0 ? "#eafff3" : t === 1 ? "#bbf7d0" : "#19c37d";
            ctx.globalAlpha = t === 0 ? 1 : 0.5;
            ctx.fillText(glyph(), i * step, y);
          }
          if (headY > H && Math.random() > 0.95) cols[i] = Math.random() * -10;
        }
        ctx.globalAlpha = 1;
        const front = q * H * 1.15;
        ctx.fillStyle = "rgba(2,16,9,0.92)";
        ctx.fillRect(0, 0, W, Math.max(0, front - 120));
        const fg = ctx.createLinearGradient(0, front - 120, 0, front);
        fg.addColorStop(0, "rgba(2,16,9,0)");
        fg.addColorStop(1, "rgba(2,16,9,0.9)");
        ctx.fillStyle = fg;
        ctx.fillRect(0, Math.max(0, front - 120), W, 120);
      }
    };

    const drawPower = (p: number) => {
      ctx.fillStyle = "#02080a";
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, cols = scene.cols!;
      let bandFrac = 1, lineW = 1;
      if (p < 0.3) bandFrac = 1;
      else if (p < 0.6) bandFrac = 1 - smooth((p - 0.3) / 0.3);
      else bandFrac = 0.012;
      if (p >= 0.6 && p < 0.8) lineW = 1 - smooth((p - 0.6) / 0.2);
      else if (p >= 0.8) lineW = 0;

      if (p < 0.6) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, cy - (H * bandFrac) / 2 - 2, W, H * bandFrac + 4);
        ctx.clip();
        ctx.translate(0, cy);
        ctx.scale(1, Math.max(0.02, bandFrac));
        ctx.translate(0, -cy);
        ctx.fillStyle = "rgba(2,14,8,0.3)";
        ctx.fillRect(0, 0, W, H);
        const step = W / cols.length;
        ctx.font = font(13);
        for (let i = 0; i < cols.length; i++) {
          cols[i] += 1.4;
          const y = cols[i] * 15;
          ctx.fillStyle = Math.random() < 0.16 ? "#eafff3" : "#19c37d";
          ctx.fillText(glyph(), i * step, y);
          if (y > H && Math.random() > 0.93) cols[i] = Math.random() * -10;
        }
        ctx.restore();
        const by = (H * bandFrac) / 2;
        ctx.fillStyle = `rgba(225,255,240,${0.9 * glow})`;
        ctx.fillRect(0, cy - by - 1, W, 2);
        ctx.fillRect(0, cy + by - 1, W, 2);
      }
      if (p >= 0.58) {
        const w = W * lineW;
        ctx.fillStyle = `rgba(235,255,245,${p < 0.84 ? 1 : Math.max(0, 1 - (p - 0.84) / 0.12)})`;
        ctx.fillRect(cx - w / 2, cy - 1.5, Math.max(2, w), 3);
        if (p > 0.8) {
          const dotA = Math.max(0, 1 - (p - 0.8) / 0.16);
          const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * glow);
          gr.addColorStop(0, `rgba(235,255,245,${dotA})`);
          gr.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gr;
          ctx.fillRect(cx - 50, cy - 50, 100, 100);
        }
      }
    };

    const drawStatic = (p: number) => {
      const cx = W / 2, cy = H / 2, nctx = scene.nctx!, nc = scene.noise!;
      const id = nctx.createImageData(nc.width, nc.height), d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v * 0.3; d[i + 1] = v; d[i + 2] = v * 0.5; d[i + 3] = 255;
      }
      nctx.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (p < 0.58) {
        ctx.drawImage(nc, 0, 0, W, H);
        const ry = ((p * 2.2) % 1) * H;
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(0, ry, W, Math.max(20, H * 0.06));
        if (Math.random() < 0.85) {
          const bw = Math.min(W * 0.7, 460), bh = 64;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
          ctx.fillStyle = "#d9ffe9";
          ctx.font = `600 26px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("SIGNAL LOST", cx, cy);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }
        if (p > 0.48 && Math.random() < 0.3) {
          ctx.fillStyle = Math.random() < 0.5 ? "#000" : "#fff";
          ctx.fillRect(0, 0, W, H);
        }
      } else {
        ctx.drawImage(nc, 0, 0, W, H);
        const a = Math.min(1, (p - 0.58) / 0.18);
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const render = (p: number) => {
      if (reducedMotion) return drawFade(p);
      switch (variant) {
        case "warp": return drawWarp(p, 1);
        case "vortex": return drawVortex(p);
        case "glitch": return drawGlitch(p);
        case "reverse-warp": return drawWarp(p, -1);
        case "crt-power-down": return drawPower(p);
        case "signal-lost": return drawStatic(p);
      }
    };

    // ── master loop ────────────────────────────────────────────────────────────
    const swapAt = reducedMotion ? 0.5 : SWAP_AT[variant] ?? 0.5;
    const start = performance.now();
    let swapped = false;
    let raf = 0;

    const tick = (now: number) => {
      let p = (now - start) / duration;
      if (p > 1) p = 1;
      if (!swapped && p >= swapAt) {
        swapped = true;
        onSwap?.();
      }
      render(p);
      if (p > 0.86) canvas.style.opacity = String(Math.max(0, 1 - (p - 0.86) / 0.14));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, W, H);
        canvas.style.opacity = "0";
        if (!swapped) onSwap?.();
        resolve();
      }
    };
    raf = requestAnimationFrame(tick);
  });
}
