"use client";

/**
 * JourneyExperience — the immersive "/journey" experience.
 *
 * Ported 1:1 from the Journey design prototype. Single self-contained client
 * component: animated DMZ packet-flow hero, "deploy" CI/CD pipeline, interactive
 * career backbone, live impact telemetry, and a command-line shell.
 *
 * Styling is inline (matching the prototype) via the small `css()` parser so the
 * design stays faithful; only keyframes live in the injected <style> block.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { getResume } from "@/lib/resume";

// ── Resume data ────────────────────────────────────────────────────────────────

const { contact } = getResume();

/* ──────────────────────────────────────────────────────────────────────────
   Style helpers
   ────────────────────────────────────────────────────────────────────────── */

const FONT_MONO = "var(--font-mono, 'Geist Mono', monospace)";
const FONT_SANS = "var(--font-sans, 'Geist', system-ui, sans-serif)";

/** Parse a "prop:val; prop:val" CSS string into a React style object. */
function css(input: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of input.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const rawKey = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!rawKey || !val) continue;
    const key = rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = val;
  }
  return out as CSSProperties;
}

const KEYFRAMES = `
@keyframes jblink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes jflow { 0%{transform:translateX(0);opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{transform:translateX(var(--dist,800px));opacity:0} }
@keyframes jbob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
@keyframes jpulsep { 0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0.5)} 70%{box-shadow:0 0 0 13px rgba(167,139,250,0)} }
@keyframes jscan { 0%{left:-32%} 100%{left:118%} }
@keyframes jeye { 0%,86%,100%{transform:scaleY(1)} 93%{transform:scaleY(0.12)} }
@keyframes jdraw { 0%{stroke-dashoffset:240} 55%{stroke-dashoffset:0} 86%{stroke-dashoffset:0;opacity:1} 100%{stroke-dashoffset:0;opacity:0.3} }
@keyframes jtype { 0%{max-width:0} 55%{max-width:12ch} 100%{max-width:12ch} }
@keyframes jcheckpop { 0%,32%{opacity:0.12;transform:scale(0.45)} 48%{opacity:1;transform:scale(1.25)} 62%,100%{opacity:1;transform:scale(1)} }
@keyframes jrise { 0%{transform:scaleY(0.04)} 62%{transform:scaleY(1)} 100%{transform:scaleY(1)} }
@keyframes jradar { to{transform:rotate(360deg)} }
`;

/* ──────────────────────────────────────────────────────────────────────────
   Data
   ────────────────────────────────────────────────────────────────────────── */

const PALETTE = {
  accent: "#22d3ee",
  green: "#10b981",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a78bfa",
  muted: "#64748b",
  text: "#e2e8f0",
  border: "#1e293b",
};

const STAGE_META = [
  "git push",
  "lint & scan",
  "tofu plan",
  "PR review",
  "tofu apply",
  "go live",
];

interface Metric {
  key: string;
  target: number;
  prefix: string;
  suffix: string;
  label: string;
  color: string;
}

const METRICS: Metric[] = [
  { key: "authored", target: 800, prefix: "~", suffix: "", label: "Pull requests authored", color: "#22d3ee" },
  { key: "reviewed", target: 840, prefix: "~", suffix: "", label: "Pull requests reviewed", color: "#22d3ee" },
  { key: "tickets", target: 2400, prefix: "~", suffix: "", label: "Jira tickets owned", color: "#a78bfa" },
  { key: "vulns", target: 1400, prefix: "", suffix: "+", label: "Vulnerabilities closed", color: "#ef4444" },
  { key: "tofu", target: 100, prefix: "", suffix: "+", label: "OpenTofu migration PRs", color: "#10b981" },
  { key: "envs", target: 7, prefix: "", suffix: "", label: "Environments live", color: "#f59e0b" },
];

const VULNS_RAW = [
  { label: "Pre-production", count: 363 },
  { label: "Cloud Custodian", count: 352 },
  { label: "AWS Inspector", count: 327 },
  { label: "Gov / FedRAMP", count: 284 },
  { label: "Tenable", count: 218 },
  { label: "Tenable.sc", count: 216 },
  { label: "US region", count: 150 },
  { label: "EU region", count: 141 },
];

const MILESTONES = [
  { hash: "a1f9c2e", tag: "opentofu", date: "2026-05", msg: "First production OpenTofu-managed FortiGate cluster cut over to a live environment" },
  { hash: "7d3b0a4", tag: "fortiai", date: "2026-05", msg: "FortiManager + FortiAI proof-of-concept deployed into a production environment" },
  { hash: "c4e8f15", tag: "dmz2.0", date: "2025-08", msg: "DMZ 2.0 final region cutover complete; all commercial environments live" },
  { hash: "9b21d77", tag: "govern", date: "2025-06", msg: "FortiManager design cleared all five governance boards (incl. FIPS)" },
  { hash: "2f6ac90", tag: "sarb", date: "2023-02", msg: "DMZ 2.0 firewall design approved at the architecture review board" },
  { hash: "0e1547b", tag: "init", date: "2021-06", msg: "Established codeowner on firewall-pipeline; the journey begins" },
];

interface Company {
  short: string;
  company: string;
  title: string;
  location: string;
  years: string;
  tags: string[];
  bullets: string[];
}

const COMPANIES: Company[] = [
  {
    short: "SAP Concur", company: "SAP (Concur)", title: "Sr. Cloud Security & Infrastructure Engineer", location: "Bellevue, WA", years: "2021 — Now",
    tags: ["AWS", "FortiGate", "FedRAMP", "OpenTofu", "Cloud migration"],
    bullets: [
      "Designed & led DMZ 2.0, a multi-region Gateway Load Balancer-fronted FortiGate re-architecture across 8+ global environments. Architecture-board approved in 2023; final cutover 2025.",
      "Drove the OpenTofu migration for the firewall fleet: ~100 PRs from CloudFormation/Ansible to declarative IaC; first production cutover 2026.",
      "Led the migration effort to move SAP Concur from a colo-hybrid deployment to a fully AWS-hosted network edge.",
      "Closed 1,400+ vulnerability tickets (~58% of assigned work) and authored an internal Claude Code plugin encoding 5 years of ops knowledge.",
    ],
  },
  {
    short: "Nintendo", company: "Nintendo of America", title: "Sr. Cloud Engineer, Platform Security & Governance", location: "Redmond, WA", years: "2018 — 2021",
    tags: ["AWS Org", "Control Tower", "Azure", "CDK"],
    bullets: [
      "Architected 100+ AWS accounts and 20+ Azure subscriptions from the ground up: structure, security baselines, cost allocation, network topology.",
      "Built a structured AWS Organization on Control Tower with custom CDK/Python account vending, enforcing posture from day one.",
      "Designed hub-spoke VPC/VNET architecture with Palo Alto firewalls, CloudFront, Route53 governance, and least-privilege IAM frameworks.",
    ],
  },
  {
    short: "PSE", company: "Puget Sound Energy", title: "Senior Systems Engineer", location: "Redmond, WA", years: "2017 — 2018",
    tags: ["VMware", "UCS", "PowerShell"],
    bullets: [
      "Operated a large-scale VMware ESXi environment on UCS hardware.",
      "Automated datacenter migration of thousands of VMs with PowerShell and GitLab.",
    ],
  },
  {
    short: "Univar", company: "Univar Inc.", title: "Contractor → Sr. Platform Engineer (FTE)", location: "Redmond, WA", years: "2014 — 2017",
    tags: ["AWS", "DirectConnect", "Ansible", "MPLS"],
    bullets: [
      "Started as a contractor and converted to full-time Senior Platform Engineer; founded the Cloud & Automation team for a Fortune 500 company.",
      "Designed Univar's AWS presence including DirectConnect for MPLS connectivity.",
      "Implemented CloudFormation IaC and automation with Ansible, Chef, and Python.",
      "Earlier drove IT engineering projects across the org: MPLS network implementation and call-center upgrades.",
    ],
  },
  {
    short: "MINDBODY", company: "MINDBODY", title: "Site Reliability Engineer → Sr. SRE", location: "San Luis Obispo, CA", years: "2012 — 2014",
    tags: ["SRE", "Deploys", "Automation"],
    bullets: [
      "Promoted from SRE to Senior SRE; automated and managed production deployments.",
      "Provided SRE mentoring to the engineering team.",
    ],
  },
  {
    short: "Digital West", company: "Digital West Networks, Inc.", title: "NOC Technician", location: "San Luis Obispo County, CA", years: "2011 — 2012",
    tags: ["NOC", "Data Center", "Linux"],
    bullets: [
      "Where it all started: front-line NOC support for Digital West customers, escalating to Engineering when needed.",
      "Ran data-center operations: remote-hands, cable terminating / pulling / planning, and power management.",
      "Leaned heavily on Linux systems knowledge to support email, web hosting, and other customer services.",
    ],
  },
];

const CAT_MAP: Record<string, number> = {
  sap: 0, sapconcur: 0, concur: 0, nintendo: 1, pse: 2, pugetsoundenergy: 2, univar: 3, mindbody: 4, digitalwest: 5, "digital-west": 5,
};

/* Static graphic markup for each pipeline stage (no interactivity). */
const STAGE_GFX: string[] = [
  // 0 — git push typing line
  `<div style="font-family:${FONT_MONO}; font-size:11px; color:#10b981; display:flex; align-items:center; white-space:nowrap;">
     <span>~$ git push&nbsp;</span>
     <span style="display:inline-block; overflow:hidden; max-width:12ch; animation:jtype 3s steps(11) infinite;">origin&nbsp;main</span>
     <span style="display:inline-block; width:6px; height:13px; background:#10b981; margin-left:3px; animation:jblink 0.9s step-end infinite;"></span>
   </div>`,
  // 1 — robot scanning code
  `<div style="display:flex; align-items:center; gap:9px;">
     <svg width="24" height="26" viewBox="0 0 24 26" fill="none">
       <line x1="12" y1="0" x2="12" y2="4" stroke="#22d3ee" stroke-width="1.4"></line>
       <circle cx="12" cy="1.2" r="1.5" fill="#22d3ee"></circle>
       <rect x="3" y="5" width="18" height="15" rx="3.5" stroke="#22d3ee" stroke-width="1.4" fill="#0a1c26"></rect>
       <rect x="7" y="10" width="3.4" height="5" rx="1" fill="#22d3ee" style="transform-box:fill-box; transform-origin:center; animation:jeye 2.8s ease-in-out infinite;"></rect>
       <rect x="13.6" y="10" width="3.4" height="5" rx="1" fill="#22d3ee" style="transform-box:fill-box; transform-origin:center; animation:jeye 2.8s ease-in-out infinite;"></rect>
     </svg>
     <div style="position:relative; width:58px; height:32px; overflow:hidden;">
       <div style="height:3px; width:90%; background:#1e3a4a; border-radius:2px; margin:3px 0;"></div>
       <div style="height:3px; width:68%; background:#1e3a4a; border-radius:2px; margin:3px 0;"></div>
       <div style="height:3px; width:80%; background:#1e3a4a; border-radius:2px; margin:3px 0;"></div>
       <div style="height:3px; width:52%; background:#1e3a4a; border-radius:2px; margin:3px 0;"></div>
       <div style="position:absolute; top:0; width:16px; height:100%; background:linear-gradient(90deg,transparent,rgba(34,211,238,0.55),transparent); animation:jscan 2.2s linear infinite;"></div>
     </div>
   </div>`,
  // 2 — blueprint
  `<svg width="78" height="44" viewBox="0 0 78 44" fill="none">
     <g stroke="#13303a" stroke-width="0.6">
       <line x1="0" y1="11" x2="78" y2="11"></line>
       <line x1="0" y1="22" x2="78" y2="22"></line>
       <line x1="0" y1="33" x2="78" y2="33"></line>
       <line x1="19" y1="0" x2="19" y2="44"></line>
       <line x1="39" y1="0" x2="39" y2="44"></line>
       <line x1="59" y1="0" x2="59" y2="44"></line>
     </g>
     <rect x="16" y="11" width="46" height="22" rx="2" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="240" style="animation:jdraw 3.4s ease-in-out infinite;"></rect>
     <line x1="16" y1="22" x2="62" y2="22" stroke="#0e7490" stroke-width="1.2" stroke-dasharray="240" style="animation:jdraw 3.4s ease-in-out infinite; animation-delay:0.5s;"></line>
     <circle cx="39" cy="22" r="2.4" fill="#22d3ee" style="animation:jblink 1.2s step-end infinite;"></circle>
   </svg>`,
  // 3 — 12/12 checks
  `<div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
     <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:3px;">
       ${Array.from({ length: 12 }, (_, i) => `<span style="width:7px; height:7px; border-radius:2px; background:#10b981; animation:jcheckpop 3.4s ease-in-out infinite; animation-delay:${(i * 0.1).toFixed(1)}s;"></span>`).join("")}
     </div>
     <span style="font-family:${FONT_MONO}; font-size:9px; color:#10b981; letter-spacing:0.05em;">12 / 12 checks</span>
   </div>`,
  // 4 — rising buildings
  `<div style="display:flex; align-items:flex-end; gap:3px; height:36px;">
     ${[14, 26, 20, 34, 24, 30, 18].map((h, i) => `<span style="width:7px; height:${h}px; background:linear-gradient(180deg,#22d3ee,#0e7490); border-radius:1.5px 1.5px 0 0; transform-origin:bottom; animation:jrise 3.4s ease-out infinite; animation-delay:${(i * 0.18).toFixed(2)}s;"></span>`).join("")}
   </div>`,
  // 5 — radar sweep
  `<svg width="46" height="46" viewBox="0 0 48 48" fill="none">
     <circle cx="24" cy="24" r="21" stroke="#10b981" stroke-width="1" opacity="0.35"></circle>
     <circle cx="24" cy="24" r="14" stroke="#10b981" stroke-width="0.8" opacity="0.25"></circle>
     <circle cx="24" cy="24" r="7" stroke="#10b981" stroke-width="0.8" opacity="0.2"></circle>
     <line x1="24" y1="3" x2="24" y2="45" stroke="#10b981" stroke-width="0.6" opacity="0.18"></line>
     <line x1="3" y1="24" x2="45" y2="24" stroke="#10b981" stroke-width="0.6" opacity="0.18"></line>
     <g style="transform-box:fill-box; transform-origin:center; animation:jradar 2.8s linear infinite;">
       <circle cx="24" cy="24" r="21" fill="transparent"></circle>
       <path d="M24 24 L24 3 A21 21 0 0 1 42 14 Z" fill="#10b981" opacity="0.18"></path>
       <line x1="24" y1="24" x2="24" y2="3" stroke="#34d399" stroke-width="1.2"></line>
     </g>
     <circle cx="34" cy="16" r="1.8" fill="#34d399" style="animation:jblink 1.4s step-end infinite;"></circle>
     <circle cx="16" cy="30" r="1.8" fill="#34d399" style="animation:jblink 1.4s step-end infinite; animation-delay:0.7s;"></circle>
     <circle cx="30" cy="33" r="1.6" fill="#34d399" style="animation:jblink 1.4s step-end infinite; animation-delay:1.1s;"></circle>
   </svg>`,
];

const STAGE_LABELS = ["git push", "lint & scan", "tofu plan", "PR review", "tofu apply", "go live"];

const STAGE_SUB_HTML: string[] = [
  `origin → main`,
  `tofu validate`,
  `<span style="color:#10b981;">+9</span> add <span style="color:#475569;">·</span> <span style="color:#f59e0b;">~4</span> change <span style="color:#475569;">·</span> <span style="color:#ef4444;">-3</span> destroy`,
  ``, // stage 4 sub is dynamic (reviewSub) — handled separately
  `Project Neo`,
  `7 environments`,
];

const STAGE_MS = 1500;

interface TermLine {
  prompt?: boolean;
  text: string;
  color?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────────────────── */

export function JourneyExperience({
  showPacketFlow = true,
  blockRate = 0.22,
}: {
  showPacketFlow?: boolean;
  blockRate?: number;
}) {
  const [selectedCompany, setSelectedCompany] = useState(0);
  const [pipelineStage, setPipelineStage] = useState(-1);
  const [deployState, setDeployState] = useState<"idle" | "running" | "merge" | "finished">("idle");
  const [merged, setMerged] = useState(false);
  const [nameText, setNameText] = useState("Andrew Lass");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [telemetryIn, setTelemetryIn] = useState(false);
  const [history, setHistory] = useState<TermLine[]>(() => [
    { prompt: false, text: "Welcome. This is Andrew Lass's career, as a shell.", color: PALETTE.green },
    { prompt: false, text: "Type 'help' to list commands, or tap a chip above.", color: PALETTE.muted },
  ]);
  const [inputVal, setInputVal] = useState("");

  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const termBodyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pipeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matrixRaf = useRef<number | null>(null);
  const cmdHistory = useRef<string[]>([]);
  const histIdx = useRef(-1);

  const selectedRef = useRef(0);
  useEffect(() => { selectedRef.current = selectedCompany; }, [selectedCompany]);

  /* ── terminal helpers ── */
  const scrollTerm = useCallback(() => {
    requestAnimationFrame(() => {
      const b = termBodyRef.current;
      if (b) b.scrollTop = b.scrollHeight;
    });
  }, []);
  const focusTerm = useCallback(() => inputRef.current?.focus(), []);

  /* ── pipeline state machine ── */
  const clearPipeTimers = useCallback(() => {
    if (pipeTimer.current) {
      clearTimeout(pipeTimer.current);
      pipeTimer.current = null;
    }
  }, []);

  const stopMatrix = useCallback(() => {
    if (matrixRaf.current) {
      cancelAnimationFrame(matrixRaf.current);
      matrixRaf.current = null;
    }
  }, []);

  const runStages = useCallback((from: number, to: number, onArrive: () => void) => {
    let i = from;
    const step = () => {
      setPipelineStage(i);
      if (i < to) {
        i++;
        pipeTimer.current = setTimeout(step, STAGE_MS);
      } else {
        pipeTimer.current = setTimeout(onArrive, STAGE_MS);
      }
    };
    pipeTimer.current = setTimeout(step, STAGE_MS);
  }, []);

  const startMatrix = useCallback(() => {
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;
    stopMatrix();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const glyphs = "01<>{}[]#$_/\\=+*".split("");
    let cols: number[] = [];
    let W = 0, H = 0, last = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cols = Array.from({ length: Math.max(6, Math.floor(W / 9)) }, () => Math.random() * -20);
    };
    resize();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const draw = (t: number) => {
      if (t - last > 70) {
        last = t;
        ctx.fillStyle = "rgba(6,20,13,0.32)";
        ctx.fillRect(0, 0, W, H);
        ctx.font = "11px 'Geist Mono', monospace";
        const step = W / cols.length;
        for (let i = 0; i < cols.length; i++) {
          const y = cols[i] * 11;
          ctx.fillStyle = Math.random() < 0.18 ? "#bbf7d0" : "#10b981";
          ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * step, y);
          cols[i] = y > H && Math.random() > 0.96 ? 0 : cols[i] + 1;
        }
      }
      matrixRaf.current = requestAnimationFrame(draw);
    };
    if (reduce) {
      ctx.fillStyle = "#06140d";
      ctx.fillRect(0, 0, W, H);
    } else {
      matrixRaf.current = requestAnimationFrame(draw);
    }
  }, [stopMatrix]);

  const deploy = useCallback(() => {
    clearPipeTimers();
    stopMatrix();
    setPipelineStage(-1);
    setMerged(false);
    setDeployState("running");
    runStages(0, 3, () => setDeployState("merge"));
  }, [clearPipeTimers, stopMatrix, runStages]);

  const merge = useCallback(() => {
    clearPipeTimers();
    setMerged(true);
    setDeployState("running");
    runStages(4, 5, () => setDeployState("finished"));
  }, [clearPipeTimers, runStages]);

  const deployAgain = useCallback(() => {
    clearPipeTimers();
    stopMatrix();
    setPipelineStage(-1);
    setMerged(false);
    setDeployState("idle");
  }, [clearPipeTimers, stopMatrix]);

  /* Re-run the matrix rain whenever the idle DEPLOY button is shown. */
  useEffect(() => {
    if (deployState === "idle") {
      // wait a tick for the canvas to mount
      const id = requestAnimationFrame(() => startMatrix());
      return () => {
        cancelAnimationFrame(id);
        stopMatrix();
      };
    }
  }, [deployState, startMatrix, stopMatrix]);

  /* ── command runner ── */
  const runCommand = useCallback((raw: string): TermLine[] => {
    const cmd = raw.trim().toLowerCase();
    const P = PALETTE;
    if (cmd === "") return [];
    if (cmd === "help") return [
      { text: "available commands:", color: P.accent },
      { text: "  whoami            identity" },
      { text: "  ls                list directories" },
      { text: "  cat experience/*  role detail (sap, nintendo, pse, univar...)" },
      { text: "  git log           career milestones" },
      { text: "  skills            core skill areas" },
      { text: "  stats             impact metrics" },
      { text: "  deploy            run the pipeline" },
      { text: "  contact           email + links" },
      { text: "  clear             clear the screen" },
    ];
    if (cmd === "whoami") return [{ text: "Andrew Lass · Senior Cloud Security & Infrastructure Engineer · Everett, WA", color: P.accent }];
    if (cmd === "ls" || cmd === "ls .") return [{ text: "experience/   skills/   projects/   contact   resume.pdf", color: P.green }];
    if (cmd === "ls experience/" || cmd === "ls experience") return COMPANIES.map((c) => ({ text: "  " + c.short.toLowerCase().replace(/\s+/g, "") + "/   " + c.company + " · " + c.years }));
    if (cmd.startsWith("cat experience/") || cmd.startsWith("cat ")) {
      const key = cmd.replace("cat experience/", "").replace("cat ", "").replace(/\/$/, "").trim();
      const idx = CAT_MAP[key];
      if (idx == null) return [{ text: "cat: " + key + ": no such role. try: sap, nintendo, pse, univar, mindbody, digitalwest", color: P.red }];
      const c = COMPANIES[idx];
      setSelectedCompany(idx);
      return [
        { text: c.company + " · " + c.title, color: P.accent },
        { text: c.location + "  ·  " + c.years, color: P.muted },
        ...c.bullets.map((b) => ({ text: "  • " + b })),
      ];
    }
    if (cmd === "skills" || cmd === "ls skills/" || cmd === "ls skills") return [
      { text: "Cloud Security   Networking   Governance", color: P.green },
      { text: "Infrastructure   DevOps       Automation", color: P.green },
    ];
    if (cmd === "git log") return MILESTONES.map((m, i) => ({ text: m.hash + "  " + m.date + "  " + m.msg, color: i === 0 ? P.text : P.muted }));
    if (cmd === "stats") return [
      { text: "~800 PRs authored · ~840 reviewed · ~2,400 tickets owned", color: P.accent },
      { text: "1,400+ vulns closed · 100+ OpenTofu PRs · 7 environments · 5 governance boards", color: P.accent },
    ];
    if (cmd === "deploy") {
      rootRef.current?.querySelector("#pipeline")?.scrollIntoView({ behavior: "smooth" });
      deploy();
      return [{ text: "triggering pipeline → scroll up to watch. merge the PR to ship.", color: P.yellow }];
    }
    if (cmd === "contact") return [
      { text: `email:    ${contact.email}`, color: P.accent },
      { text: `github:   github.com/${contact.github}`, color: P.accent },
      { text: `linkedin: linkedin.com/in/${contact.linkedin}`, color: P.accent },
    ];
    return [{ text: "command not found: " + raw.trim() + "  (try 'help')", color: P.red }];
  }, [deploy]);

  const recordCmd = useCallback((cmd: string) => {
    const c = cmd.trim();
    const list = cmdHistory.current;
    if (c && list[list.length - 1] !== c) list.push(c);
    histIdx.current = -1;
  }, []);

  const runEntry = useCallback((value: string, refocus: boolean) => {
    setInputVal(value);
    recordCmd(value);
    if (value.trim().toLowerCase() === "clear") {
      setHistory([]);
      setInputVal("");
      return;
    }
    const out = runCommand(value);
    setHistory((h) => [...h, { prompt: true, text: value.trim() }, ...out]);
    setInputVal("");
    scrollTerm();
    if (refocus) focusTerm();
  }, [recordCmd, runCommand, scrollTerm, focusTerm]);

  const onKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runEntry(inputVal, false);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const list = cmdHistory.current;
      if (!list.length) return;
      histIdx.current = histIdx.current < 0 ? list.length - 1 : Math.max(0, histIdx.current - 1);
      const v = list[histIdx.current];
      setInputVal(v);
      requestAnimationFrame(() => inputRef.current?.setSelectionRange(v.length, v.length));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx.current < 0) return;
      histIdx.current++;
      const list = cmdHistory.current;
      if (histIdx.current >= list.length) {
        histIdx.current = -1;
        setInputVal("");
      } else {
        const v = list[histIdx.current];
        setInputVal(v);
        requestAnimationFrame(() => inputRef.current?.setSelectionRange(v.length, v.length));
      }
    }
  }, [inputVal, runEntry]);

  /* ── name scramble (mount + on click) ── */
  const nameTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrambleName = useCallback(() => {
    const target = "Andrew Lass";
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (nameTimer.current) {
      clearInterval(nameTimer.current);
      nameTimer.current = null;
    }
    if (reduce) {
      setNameText(target);
      return;
    }
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*<>/\\[]{}=+01".split("");
    const lockAt = target.split("").map((_, i) => 4 + i * 2.2);
    let frame = 0;
    nameTimer.current = setInterval(() => {
      frame++;
      let out = "";
      let done = true;
      for (let i = 0; i < target.length; i++) {
        if (target[i] === " ") { out += " "; continue; }
        if (frame >= lockAt[i]) out += target[i];
        else { out += glyphs[(Math.random() * glyphs.length) | 0]; done = false; }
      }
      setNameText(out);
      if (done && nameTimer.current) {
        clearInterval(nameTimer.current);
        nameTimer.current = null;
        setNameText(target);
      }
    }, 45);
  }, []);

  useEffect(() => {
    // Schedule to next frame so setState is not synchronous within the effect body
    const raf = requestAnimationFrame(() => scrambleName());
    return () => {
      cancelAnimationFrame(raf);
      if (nameTimer.current) clearInterval(nameTimer.current);
    };
  }, [scrambleName]);

  /* ── hero packet-flow canvas (mount) ── */
  useEffect(() => {
    if (!showPacketFlow) return;
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, fw = 0, raf = 0;
    type Packet = { x: number; y: number; vx: number; state: string; life: number; size: number };
    const packets: Packet[] = [];
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.max(1, W * DPR);
      canvas.height = Math.max(1, H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      fw = W * 0.5;
    };
    const spawn = (x?: number) => {
      const y = 24 + Math.random() * Math.max(40, H - 48);
      packets.push({ x: x == null ? -8 : x, y, vx: 0.7 + Math.random() * 1.3, state: "in", life: 1, size: 1.4 + Math.random() * 1.6 });
    };
    const drawFirewall = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(14,116,144,0)");
      grad.addColorStop(0.5, "rgba(14,116,144,0.55)");
      grad.addColorStop(1, "rgba(14,116,144,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(fw - 1, 0, 2, H);
      for (let y = 18; y < H; y += 26) {
        ctx.fillStyle = "rgba(34,211,238,0.35)";
        ctx.fillRect(fw - 3, y, 6, 2);
      }
    };
    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      drawFirewall();
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.x += p.vx;
        if (p.state === "in" && p.x >= fw) {
          p.state = Math.random() < blockRate ? "block" : "pass";
          if (p.state === "block") p.vx *= 0.25;
        }
        if (p.state === "block") { p.life -= 0.03; p.y -= 0.3; }
        let color = "#22d3ee";
        if (p.state === "pass") color = "#10b981";
        if (p.state === "block") color = "#ef4444";
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        if (p.x > W + 10 || p.life <= 0) packets.splice(i, 1);
      }
      if (packets.length < 48 && Math.random() < 0.5) spawn();
      raf = requestAnimationFrame(frame);
    };
    resize();
    window.addEventListener("resize", resize);
    if (reduce) {
      for (let i = 0; i < 28; i++) spawn(Math.random() * W);
      drawFirewall();
      packets.forEach((p) => {
        ctx.fillStyle = p.x < fw ? "#22d3ee" : "#10b981";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      for (let i = 0; i < 24; i++) spawn(Math.random() * W);
      frame();
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [showPacketFlow, blockRate]);

  /* ── backbone flow dots (mount) ── */
  useEffect(() => {
    const host = flowRef.current;
    if (!host) return;
    const colors = [PALETTE.accent, PALETTE.green, PALETTE.accent];
    const build = () => {
      host.innerHTML = "";
      const dist = `${Math.max(320, Math.round(host.getBoundingClientRect().width))}px`;
      for (let i = 0; i < 4; i++) {
        const d = document.createElement("span");
        d.style.cssText = `position:absolute; top:0; left:0; width:7px; height:7px; border-radius:50%; background:${colors[i % colors.length]}; box-shadow:0 0 8px ${colors[i % colors.length]}; --dist:${dist}; animation:jflow ${4 + i * 0.8}s linear infinite; animation-delay:${i * 1.3}s;`;
        host.appendChild(d);
      }
    };
    build();
    window.addEventListener("resize", build);
    return () => window.removeEventListener("resize", build);
  }, []);

  /* ── telemetry count-up (on view, with fallbacks) ── */
  useEffect(() => {
    let fired = false;
    let countTimer: ReturnType<typeof setInterval> | null = null;
    const fire = () => {
      if (fired) return;
      fired = true;
      window.removeEventListener("scroll", scrollFallback);
      setTelemetryIn(true);
      const dur = 1500;
      const t0 = performance.now();
      countTimer = setInterval(() => {
        const p = Math.min(1, (performance.now() - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        const c: Record<string, number> = {};
        METRICS.forEach((m) => (c[m.key] = m.target * e));
        setCounts(c);
        if (p >= 1 && countTimer) {
          clearInterval(countTimer);
          countTimer = null;
          const f: Record<string, number> = {};
          METRICS.forEach((m) => (f[m.key] = m.target));
          setCounts(f);
        }
      }, 33);
    };
    const scrollFallback = () => {
      const el = rootRef.current?.querySelector("[data-io=telemetry]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.85 && r.bottom > 0) fire();
    };
    let io: IntersectionObserver | null = null;
    const el = rootRef.current?.querySelector("[data-io=telemetry]");
    if (typeof IntersectionObserver !== "undefined" && el) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) fire();
        });
      }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });
      io.observe(el);
      window.addEventListener("scroll", scrollFallback, { passive: true });
      scrollFallback();
    } else {
      fire();
    }
    const safety = setTimeout(fire, 2600);
    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", scrollFallback);
      clearTimeout(safety);
      if (countTimer) clearInterval(countTimer);
    };
  }, []);

  /* ── cleanup pipeline timers on unmount ── */
  useEffect(() => () => {
    clearPipeTimers();
    stopMatrix();
  }, [clearPipeTimers, stopMatrix]);

  /* ── derived render values ── */
  const stageStyles = STAGE_LABELS.map((_, i) => {
    let st: "pending" | "active" | "done";
    if (i < pipelineStage) st = "done";
    else if (i === pipelineStage && deployState === "running") st = "active";
    else if (i <= pipelineStage) st = "done";
    else st = "pending";
    const active = st === "active";
    const done = st === "done";
    const lit = active || done;
    const border = active ? "#22d3ee" : done ? "#10b981" : "#1e293b";
    const bg = active ? "#08222b" : done ? "#0d2420" : "#0f1f31";
    return {
      card: css(`background:${bg}; border:1px solid ${border}; border-radius:10px; padding:13px 13px 15px; height:100%; transition:all 0.45s ease;${active ? " box-shadow:0 0 22px rgba(34,211,238,0.22);" : ""}`),
      gfx: css(`height:46px; display:flex; align-items:center; justify-content:center; margin-bottom:11px; border-radius:7px; background:#08151f; border:1px solid ${active ? "#22d3ee" : "#13242f"}; overflow:hidden; transition:all 0.45s ease; opacity:${active ? "1" : done ? "0.78" : "0.3"};${active ? "" : ` filter:saturate(${done ? "0.9" : "0.4"});`}`),
      dot: css(`width:9px; height:9px; border-radius:50%; flex-shrink:0; background:${lit ? (active ? "#22d3ee" : "#10b981") : "#334155"};${lit ? ` box-shadow:0 0 8px ${active ? "#22d3ee" : "#10b981"};` : ""}`),
      label: css(`font-family:${FONT_MONO}; font-size:14px; font-weight:600; color:${lit ? "#e2e8f0" : "#475569"};`),
    };
  });
  const reviewSub = merged ? "1 approval" : "Pending approval";
  const runningStatus = pipelineStage >= 0 && STAGE_META[pipelineStage] ? `running ${STAGE_META[pipelineStage]} …` : "starting pipeline …";

  const orderedCompanies = COMPANIES.map((c, i) => ({ c, i })).reverse();
  const sel = COMPANIES[selectedCompany];

  const maxVuln = Math.max(...VULNS_RAW.map((v) => v.count));

  return (
    <div ref={rootRef} style={css(`font-family:${FONT_SANS}; background:#070d14; color:#e2e8f0; width:100%; overflow-x:hidden;`)}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* ════ HERO ════ */}
      <section style={css("position:relative; min-height:90vh; display:flex; flex-direction:column; justify-content:center; overflow:hidden; padding:80px 24px 64px;")}>
        <canvas ref={heroCanvasRef} style={css("position:absolute; inset:0; width:100%; height:100%; z-index:0;")} />
        <div style={css("position:absolute; inset:0; z-index:1; pointer-events:none; background:radial-gradient(ellipse 70% 60% at 50% 45%, transparent 30%, rgba(7,13,20,0.55) 100%);")} />

        <div style={css(`position:absolute; top:50%; left:24px; transform:translateY(-50%); z-index:1; font-family:${FONT_MONO}; font-size:11px; letter-spacing:0.22em; color:#334155;`)}>◀ UNTRUSTED</div>
        <div style={css(`position:absolute; top:11%; left:50%; transform:translateX(-50%); z-index:1; display:flex; flex-direction:column; align-items:center; gap:3px; font-family:${FONT_MONO}; color:#0e7490;`)}>
          <span style={css("font-size:13px; font-weight:600; letter-spacing:0.26em;")}>DMZ</span>
          <span style={css("width:28px; height:1px; background:#0e7490; opacity:0.5;")} />
          <span style={css("font-size:10px; letter-spacing:0.22em; color:#22d3ee;")}>INSPECTION</span>
        </div>
        <div style={css(`position:absolute; top:50%; right:24px; transform:translateY(-50%); z-index:1; font-family:${FONT_MONO}; font-size:11px; letter-spacing:0.22em; color:#334155;`)}>TRUSTED ▶</div>

        <div style={css("position:relative; z-index:2; max-width:1080px; margin:0 auto; width:100%;")}>
          <div style={css(`font-family:${FONT_MONO}; font-size:13px; letter-spacing:0.18em; color:#22d3ee; margin-bottom:20px;`)}>$ whoami</div>
          <h1 onClick={scrambleName} title="click to re-decode" style={css(`font-family:${FONT_MONO}; font-style:italic; font-size:clamp(40px,7.5vw,86px); font-weight:600; letter-spacing:-0.01em; line-height:1; margin:0; cursor:pointer; color:#34d399; text-shadow:0 0 16px rgba(16,185,129,0.45), 0 0 42px rgba(16,185,129,0.18);`)}>
            {nameText}
            <span style={css("display:inline-block; width:0.62ch; height:0.92em; vertical-align:-0.08em; margin-left:0.08em; background:#34d399; box-shadow:0 0 12px #34d399; animation:jblink 0.85s step-end infinite;")} />
          </h1>
          <p style={css(`font-family:${FONT_MONO}; font-size:clamp(14px,2.4vw,20px); color:#22d3ee; margin:18px 0 0; font-weight:500;`)}>Senior Cloud Security &amp; Infrastructure Engineer</p>
          <p style={css("max-width:580px; color:#94a3b8; font-size:16px; line-height:1.6; margin:22px 0 0;")}>Over a decade securing and automating cloud environments. Written as code. Tested automatically. Deployed continuously.</p>

          <div style={css("display:flex; flex-wrap:wrap; gap:12px; margin-top:32px;")}>
            <div style={css(`font-family:${FONT_MONO}; font-size:13px; color:#e2e8f0; background:#0f1f31; border:1px solid #1e293b; border-radius:999px; padding:8px 16px;`)}><span style={{ color: "#22d3ee" }}>12+</span> years</div>
            <div style={css(`font-family:${FONT_MONO}; font-size:13px; color:#e2e8f0; background:#0f1f31; border:1px solid #1e293b; border-radius:999px; padding:8px 16px;`)}><span style={{ color: "#10b981" }}>100+</span> AWS accounts architected</div>
            <div style={css(`font-family:${FONT_MONO}; font-size:13px; color:#e2e8f0; background:#0f1f31; border:1px solid #1e293b; border-radius:999px; padding:8px 16px;`)}><span style={{ color: "#ef4444" }}>7+</span> industries served</div>
          </div>
        </div>

        <a href="#pipeline" style={css(`position:absolute; bottom:28px; left:50%; transform:translateX(-50%); z-index:2; text-decoration:none; font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.15em; color:#64748b; display:flex; flex-direction:column; align-items:center; gap:8px;`)}>
          <span>SCROLL TO DEPLOY</span>
          <span style={css("display:inline-block; animation:jbob 1.6s ease-in-out infinite;")}>▾</span>
        </a>
      </section>

      {/* ════ PIPELINE ════ */}
      <section id="pipeline" style={css("max-width:1080px; margin:0 auto; padding:88px 24px;")}>
        <div style={css(`font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#64748b; margin-bottom:14px;`)}>{"// continuous delivery"}</div>
        <h2 style={css("font-size:clamp(26px,4vw,40px); font-weight:700; letter-spacing:-0.02em; margin:0 0 8px;")}>Deploy <span style={{ color: "#22d3ee" }}>andrew-lass</span> to production</h2>
        <p style={css(`font-family:${FONT_MONO}; font-size:14px; color:#64748b; margin:0 0 30px;`)}>$ git push&nbsp;&nbsp;·&nbsp;&nbsp;infrastructure-as-code that reviews, tests, and ships itself</p>

        {/* control row */}
        <div style={css("margin:0 0 30px; min-height:54px; display:flex; align-items:center; gap:16px; flex-wrap:wrap;")}>
          {deployState === "idle" && (
            <>
              <button onClick={deploy} style={css("position:relative; overflow:hidden; cursor:pointer; border:1px solid #10b981; background:#06140d; border-radius:9px; padding:15px 34px; box-shadow:0 0 24px rgba(16,185,129,0.35);")}>
                <canvas ref={matrixCanvasRef} style={css("position:absolute; inset:0; width:100%; height:100%; opacity:0.6;")} />
                <span style={css(`position:relative; z-index:1; font-family:${FONT_MONO}; font-size:15px; font-weight:600; letter-spacing:0.3em; color:#bbf7d0; text-shadow:0 0 10px #10b981;`)}>▶ DEPLOY</span>
              </button>
              <span style={css(`font-family:${FONT_MONO}; font-size:12px; color:#475569;`)}>push to ship · runs the 6-stage pipeline</span>
            </>
          )}
          {deployState === "running" && (
            <span style={css(`font-family:${FONT_MONO}; font-size:14px; color:#22d3ee; display:flex; align-items:center; gap:10px;`)}>
              <span style={css("width:10px; height:10px; border-radius:50%; background:#22d3ee; box-shadow:0 0 8px #22d3ee; animation:jblink 0.8s step-end infinite;")} />
              {runningStatus}
            </span>
          )}
          {deployState === "merge" && (
            <>
              <button onClick={merge} style={css("cursor:pointer; border:1px solid #a78bfa; background:#1b1436; border-radius:9px; padding:14px 28px; box-shadow:0 0 24px rgba(167,139,250,0.4); animation:jpulsep 1.5s ease-out infinite; display:flex; align-items:center; gap:9px;")}>
                <span style={css(`font-family:${FONT_MONO}; font-size:14px; font-weight:600; letter-spacing:0.04em; color:#ede9fe;`)}>⎇ Merge pull request</span>
              </button>
              <span style={css(`font-family:${FONT_MONO}; font-size:12px; color:#a78bfa;`)}>PR #1631 · pending approval · 12/12 checks green</span>
            </>
          )}
          {deployState === "finished" && (
            <>
              <span style={css(`font-family:${FONT_MONO}; font-size:14px; color:#10b981; display:flex; align-items:center; gap:9px;`)}>
                <span style={css("width:9px; height:9px; border-radius:50%; background:#10b981; box-shadow:0 0 10px #10b981;")} />
                ✓ Deployed · live across 7 environments
              </span>
              <button onClick={deployAgain} style={css(`cursor:pointer; border:1px solid #1e293b; background:#0f1f31; border-radius:7px; padding:9px 16px; font-family:${FONT_MONO}; font-size:12px; color:#94a3b8;`)}>↻ deploy again</button>
            </>
          )}
        </div>

        {/* stage cards */}
        <div style={css("display:flex; flex-wrap:wrap; gap:10px; align-items:stretch;")}>
          {STAGE_LABELS.map((label, i) => (
            <div key={i} style={css("flex:1 1 155px; min-width:150px;")}>
              <div style={stageStyles[i].card}>
                <div style={stageStyles[i].gfx} dangerouslySetInnerHTML={{ __html: STAGE_GFX[i] }} />
                <div style={css("display:flex; align-items:center; gap:8px; margin-bottom:5px;")}>
                  <span style={stageStyles[i].dot} />
                  <span style={css(`font-family:${FONT_MONO}; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#64748b;`)}>STAGE {i + 1}</span>
                </div>
                <div style={stageStyles[i].label}>{label}</div>
                {i === 3 ? (
                  <div style={css(`font-family:${FONT_MONO}; font-size:11px; color:#475569; margin-top:3px;`)}>{reviewSub}</div>
                ) : i === 2 ? (
                  // tofu plan output reveals only once the pipeline advances past the plan stage
                  pipelineStage >= 3 ? (
                    <div style={css(`font-family:${FONT_MONO}; font-size:11px; color:#475569; margin-top:3px; line-height:1.5;`)} dangerouslySetInnerHTML={{ __html: STAGE_SUB_HTML[i] }} />
                  ) : (
                    <div style={css(`font-family:${FONT_MONO}; font-size:11px; color:#334155; margin-top:3px; line-height:1.5;`)}>{pipelineStage === 2 ? "planning …" : "—"}</div>
                  )
                ) : i === 5 ? (
                  // go-live sub flips to "Monitoring performance" once the deploy finishes
                  <div style={css(`font-family:${FONT_MONO}; font-size:11px; color:${deployState === "finished" ? "#10b981" : "#475569"}; margin-top:3px; line-height:1.5;`)}>{deployState === "finished" ? "Monitoring performance" : "7 environments"}</div>
                ) : (
                  <div style={css(`font-family:${FONT_MONO}; font-size:11px; color:#475569; margin-top:3px; line-height:1.5;`)} dangerouslySetInnerHTML={{ __html: STAGE_SUB_HTML[i] }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={css("border-top:1px solid #1e293b; max-width:1080px; margin:0 auto;")} />

      {/* ════ CAREER BACKBONE ════ */}
      <section style={css("max-width:1080px; margin:0 auto; padding:88px 24px;")}>
        <div style={css(`font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#64748b; margin-bottom:14px;`)}>{"// network topology"}</div>
        <h2 style={css("font-size:clamp(26px,4vw,40px); font-weight:700; letter-spacing:-0.02em; margin:0 0 8px;")}>The career backbone</h2>
        <p style={css("color:#94a3b8; font-size:15px; margin:0 0 32px; max-width:620px;")}>Each node is an AS on my career path. Tap each node to inspect the traffic.</p>

        <div style={css("position:relative; overflow-x:auto; padding:8px 0 18px;")}>
          <div style={css("position:relative; min-width:680px;")}>
            <div style={css("position:absolute; top:34px; left:2%; right:2%; height:2px; background:linear-gradient(90deg,#1e293b,#0e7490); z-index:0;")} />
            <div ref={flowRef} style={css("position:absolute; top:30px; left:2%; width:96%; height:10px; z-index:1; pointer-events:none;")} />
            <div style={css("position:relative; z-index:2; display:flex; justify-content:space-between; gap:6px;")}>
              {orderedCompanies.map(({ c, i }) => {
                const selected = i === selectedCompany;
                return (
                  <button key={i} onClick={() => setSelectedCompany(i)} style={css(`display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; background:${selected ? "#102b3a" : "#0f1f31"}; border:1px solid ${selected ? "#22d3ee" : "#1e293b"}; border-radius:10px; padding:14px 10px 10px; transition:all 0.25s ease;${selected ? " box-shadow:0 0 18px rgba(34,211,238,0.25);" : ""}`)}>
                    <span style={css(`width:12px; height:12px; border-radius:50%; background:${selected ? "#22d3ee" : "#0b1622"}; border:2px solid ${selected ? "#22d3ee" : "#334155"};${selected ? " box-shadow:0 0 10px #22d3ee;" : ""}`)} />
                    <span style={css(`font-family:${FONT_MONO}; font-size:12px; font-weight:600; color:${selected ? "#e2e8f0" : "#94a3b8"}; white-space:nowrap;`)}>{c.short}</span>
                    <span style={css(`font-family:${FONT_MONO}; font-size:10px; color:#64748b; white-space:nowrap;`)}>{c.years}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={css("margin-top:28px; background:#0f1f31; border:1px solid #1e293b; border-radius:14px; padding:28px; display:flex; flex-wrap:wrap; gap:32px;")}>
          <div style={css("flex:1 1 280px; min-width:260px;")}>
            <div style={css("display:flex; align-items:center; gap:10px; margin-bottom:6px;")}>
              <span style={css("width:9px; height:9px; border-radius:50%; background:#22d3ee; box-shadow:0 0 10px #22d3ee;")} />
              <span style={css(`font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.12em; color:#22d3ee;`)}>{sel.years}</span>
            </div>
            <h3 style={css("font-size:26px; font-weight:700; margin:0; letter-spacing:-0.02em;")}>{sel.company}</h3>
            <p style={css(`font-family:${FONT_MONO}; font-size:14px; color:#94a3b8; margin:6px 0 2px;`)}>{sel.title}</p>
            <p style={css(`font-family:${FONT_MONO}; font-size:12px; color:#64748b; margin:0;`)}>{sel.location}</p>
            <div style={css("display:flex; flex-wrap:wrap; gap:8px; margin-top:18px;")}>
              {sel.tags.map((tag) => (
                <span key={tag} style={css(`font-family:${FONT_MONO}; font-size:11px; color:#a78bfa; background:rgba(167,139,250,0.08); border:1px solid rgba(167,139,250,0.25); border-radius:6px; padding:4px 10px;`)}>{tag}</span>
              ))}
            </div>
          </div>
          <div style={css("flex:2 1 360px; min-width:300px;")}>
            <ul style={css("list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:14px;")}>
              {sel.bullets.map((b, bi) => (
                <li key={bi} style={css("display:flex; gap:12px; align-items:flex-start; font-size:15px; line-height:1.55; color:#cbd5e1;")}>
                  <span style={css("flex-shrink:0; margin-top:7px; width:6px; height:6px; border-radius:1px; background:#10b981; transform:rotate(45deg);")} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div style={css("border-top:1px solid #1e293b; max-width:1080px; margin:0 auto;")} />

      {/* ════ TELEMETRY ════ */}
      <section data-io="telemetry" style={css("max-width:1080px; margin:0 auto; padding:88px 24px;")}>
        <div style={css("display:flex; align-items:center; gap:10px; margin-bottom:14px;")}>
          <div style={css(`font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#64748b;`)}>{"// 5-year telemetry"}</div>
          <span style={css("width:7px; height:7px; border-radius:50%; background:#10b981; animation:jblink 1.4s step-end infinite;")} />
        </div>
        <h2 style={css("font-size:clamp(26px,4vw,40px); font-weight:700; letter-spacing:-0.02em; margin:0 0 8px;")}>Impact, by the numbers</h2>
        <p style={css("color:#94a3b8; font-size:15px; margin:0 0 28px; max-width:620px;")}>Pulled straight from the five-year evidence package: GitHub, Jira, and the vulnerability scanners across seven environments.</p>

        <div style={css("background:linear-gradient(135deg,#0d2b22,#0b1622); border:1px solid #10b981; border-radius:14px; padding:24px 26px; margin:0 0 26px; display:flex; flex-wrap:wrap; align-items:baseline; gap:8px 28px;")}>
          <div style={css("display:flex; align-items:baseline; gap:10px;")}><span style={css(`font-family:${FONT_MONO}; font-size:clamp(24px,3.6vw,34px); font-weight:600; color:#34d399; letter-spacing:-0.02em;`)}>Millions</span><span style={css("color:#94a3b8; font-size:14px;")}>of people served</span></div>
          <span style={css("color:#1e3a32; font-size:22px;")}>·</span>
          <div style={css("display:flex; align-items:baseline; gap:10px;")}><span style={css(`font-family:${FONT_MONO}; font-size:clamp(24px,3.6vw,34px); font-weight:600; color:#34d399; letter-spacing:-0.02em;`)}>Billions</span><span style={css("color:#94a3b8; font-size:14px;")}>of connections secured</span></div>
          <div style={css(`flex-basis:100%; font-family:${FONT_MONO}; font-size:12px; color:#64748b; margin-top:4px;`)}>the reach of the internet-facing and corporate-network infrastructure I&apos;ve designed, built, and defended</div>
        </div>

        <div style={css("display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px;")}>
          {METRICS.map((m) => (
            <div key={m.key} style={css("background:#0f1f31; border:1px solid #1e293b; border-radius:12px; padding:22px 20px;")}>
              <div style={css(`font-family:${FONT_MONO}; font-size:clamp(28px,4vw,40px); font-weight:600; color:${m.color}; line-height:1; letter-spacing:-0.02em;`)}>{m.prefix + Math.round(counts[m.key] ?? 0).toLocaleString("en-US") + m.suffix}</div>
              <div style={css("font-size:13px; color:#94a3b8; margin-top:10px; line-height:1.35;")}>{m.label}</div>
            </div>
          ))}
        </div>

        <div style={css(`font-family:${FONT_MONO}; font-size:13px; color:#64748b; margin-top:18px; line-height:1.7;`)}>5 governance boards cleared&nbsp; ·&nbsp; 100+ AWS accounts architected&nbsp; ·&nbsp; 80+ runbooks &amp; wiki pages&nbsp; ·&nbsp; 7 global environments</div>

        <div style={css("display:flex; flex-wrap:wrap; gap:28px; margin-top:44px;")}>
          <div style={css("flex:1 1 380px; min-width:320px;")}>
            <div style={css(`font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:#94a3b8; margin-bottom:18px;`)}>1,400+ vulnerabilities closed · by source</div>
            <div style={css("display:flex; flex-direction:column; gap:11px;")}>
              {VULNS_RAW.map((v) => (
                <div key={v.label} style={css("display:flex; align-items:center; gap:12px;")}>
                  <div style={css(`flex:0 0 130px; font-family:${FONT_MONO}; font-size:12px; color:#94a3b8; text-align:right; white-space:nowrap;`)}>{v.label}</div>
                  <div style={css("flex:1; height:18px; background:#0d1b2a; border-radius:4px; overflow:hidden;")}>
                    <div style={css(`height:100%; width:${telemetryIn ? Math.round((v.count / maxVuln) * 100) : 0}%; background:linear-gradient(90deg,#0e7490,#22d3ee); border-radius:4px; transition:width 1.1s cubic-bezier(0.22,1,0.36,1);`)} />
                  </div>
                  <div style={css(`flex:0 0 44px; font-family:${FONT_MONO}; font-size:12px; color:#e2e8f0;`)}>~{Math.round(v.count / 10) * 10}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={css("flex:1 1 360px; min-width:300px;")}>
            <div style={css(`font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:#94a3b8; margin-bottom:18px;`)}>$ git log --oneline --milestones</div>
            <div style={css("display:flex; flex-direction:column; gap:0;")}>
              {MILESTONES.map((ms) => (
                <div key={ms.hash} style={css("display:flex; gap:14px; align-items:flex-start; padding-bottom:18px; position:relative;")}>
                  <div style={css("flex-shrink:0; display:flex; flex-direction:column; align-items:center;")}>
                    <span style={css("width:11px; height:11px; border-radius:50%; background:#0f1f31; border:2px solid #22d3ee; z-index:1;")} />
                    <span style={css("width:2px; flex:1; background:#1e293b; margin-top:2px;")} />
                  </div>
                  <div>
                    <div style={css("display:flex; align-items:center; gap:8px; flex-wrap:wrap;")}>
                      <span style={css(`font-family:${FONT_MONO}; font-size:12px; color:#f59e0b;`)}>{ms.hash}</span>
                      <span style={css(`font-family:${FONT_MONO}; font-size:10px; color:#a78bfa; background:rgba(167,139,250,0.08); border-radius:4px; padding:2px 7px;`)}>{ms.tag}</span>
                      <span style={css(`font-family:${FONT_MONO}; font-size:11px; color:#64748b;`)}>{ms.date}</span>
                    </div>
                    <div style={css("font-size:14px; color:#cbd5e1; line-height:1.45; margin-top:5px;")}>{ms.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={css("border-top:1px solid #1e293b; max-width:1080px; margin:0 auto;")} />

      {/* ════ TERMINAL ════ */}
      <section style={css("max-width:1080px; margin:0 auto; padding:88px 24px;")}>
        <div style={css(`font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#64748b; margin-bottom:14px;`)}>{"// interactive shell"}</div>
        <h2 style={css("font-size:clamp(26px,4vw,40px); font-weight:700; letter-spacing:-0.02em; margin:0 0 8px;")}>Explore from the command line</h2>
        <p style={css("color:#94a3b8; font-size:15px; margin:0 0 26px; max-width:620px;")}>Prefer to navigate like an engineer? Run a command, or tap a chip to autofill.</p>

        <div style={css("display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px;")}>
          {["whoami", "cat experience/sap", "git log", "stats", "deploy", "contact"].map((cmd) => (
            <button key={cmd} onClick={() => runEntry(cmd, true)} style={css(`font-family:${FONT_MONO}; font-size:12px; color:#22d3ee; background:#0f1f31; border:1px solid #1e293b; border-radius:6px; padding:7px 13px; cursor:pointer;`)}>{cmd}</button>
          ))}
        </div>

        <div style={css("border:1px solid #1e293b; border-radius:12px; overflow:hidden; background:#0b1622;")}>
          <div style={css("display:flex; align-items:center; gap:7px; padding:12px 16px; border-bottom:1px solid #1e293b; background:#132337;")}>
            <span style={css("width:11px; height:11px; border-radius:50%; background:#ef4444; opacity:0.7;")} />
            <span style={css("width:11px; height:11px; border-radius:50%; background:#f59e0b; opacity:0.6;")} />
            <span style={css("width:11px; height:11px; border-radius:50%; background:#10b981; opacity:0.7;")} />
            <span style={css(`margin-left:10px; font-family:${FONT_MONO}; font-size:12px; color:#64748b;`)}>andrew@journey:~ · type &apos;help&apos;</span>
          </div>
          <div ref={termBodyRef} onClick={focusTerm} style={css(`padding:18px; font-family:${FONT_MONO}; font-size:13.5px; line-height:1.65; height:320px; overflow-y:auto;`)}>
            {history.map((line, li) => (
              <div key={li} style={css(`display:flex; gap:8px; align-items:flex-start;${line.prompt ? " margin-top:6px;" : ""}`)}>
                {line.prompt && <span style={css("color:#22d3ee; flex-shrink:0;")}>$</span>}
                <span style={{ color: line.prompt ? "#e2e8f0" : line.color || "#94a3b8", whiteSpace: "pre-wrap" }}>{line.text}</span>
              </div>
            ))}
          </div>
          <div onClick={focusTerm} style={css("display:flex; align-items:center; gap:10px; padding:12px 18px; border-top:1px solid #1e293b;")}>
            <span style={css(`color:#22d3ee; font-family:${FONT_MONO}; font-size:13.5px; flex-shrink:0;`)}>$</span>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={onKey}
              placeholder="help"
              autoComplete="off"
              spellCheck={false}
              style={css(`flex:1; background:transparent; border:none; outline:none; color:#e2e8f0; font-family:${FONT_MONO}; font-size:13.5px; caret-color:#22d3ee;`)}
            />
          </div>
        </div>
      </section>

      {/* ════ CONTACT ════ */}
      <section style={css("max-width:1080px; margin:0 auto; padding:40px 24px 96px;")}>
        <div style={css("background:linear-gradient(135deg,#0f1f31,#0b1622); border:1px solid #0e7490; border-radius:16px; padding:40px; display:flex; flex-wrap:wrap; align-items:center; gap:24px; justify-content:space-between;")}>
          <div>
            <h2 style={css("font-size:26px; font-weight:700; margin:0; letter-spacing:-0.02em;")}>Let&apos;s build secure internet services together.</h2>
            <p style={css(`font-family:${FONT_MONO}; font-size:13px; color:#64748b; margin:8px 0 0;`)}>Everett, WA&nbsp; ·&nbsp; open to senior cloud security &amp; infra roles</p>
          </div>
          <div style={css("display:flex; flex-wrap:wrap; gap:12px;")}>
            <a href={`mailto:${contact.email}`} style={css(`text-decoration:none; font-family:${FONT_MONO}; font-size:14px; font-weight:600; color:#070d14; background:#22d3ee; border-radius:8px; padding:13px 22px;`)}>Get in touch</a>
            <a href={`https://linkedin.com/in/${contact.linkedin}`} target="_blank" rel="noopener noreferrer" style={css(`text-decoration:none; font-family:${FONT_MONO}; font-size:14px; font-weight:600; color:#e2e8f0; background:transparent; border:1px solid #1e293b; border-radius:8px; padding:13px 22px;`)}>LinkedIn</a>
            <a href={`https://github.com/${contact.github}`} target="_blank" rel="noopener noreferrer" style={css(`text-decoration:none; font-family:${FONT_MONO}; font-size:14px; font-weight:600; color:#e2e8f0; background:transparent; border:1px solid #1e293b; border-radius:8px; padding:13px 22px;`)}>GitHub</a>
          </div>
        </div>
      </section>
    </div>
  );
}
