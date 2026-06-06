"use client";

import { useState } from "react";
import type { WafDemoResult, AttackType, AttackResult } from "@/app/api/waf-demo/route";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ATTACKS: { type: AttackType; label: string }[] = [
  { type: "xss",       label: "XSS Attack" },
  { type: "sqli",      label: "SQL Injection" },
  { type: "traversal", label: "Path Traversal" },
  { type: "benign",    label: "Benign Request" },
];

const BODY_MAX_CHARS = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: number): string {
  if (status === 200) return "text-[var(--color-green)]";
  if (status === 0)   return "text-[var(--color-yellow)]";
  return "text-[var(--color-red)]";
}

function statusLabel(status: number): string {
  if (status === 200) return "200 OK";
  if (status === 0)   return "0 NETWORK ERROR";
  if (status === 403) return "403 Forbidden";
  return `${status}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PanelProps {
  hostname: string;
  status: number | null;
  body: string | null;
  loading: boolean;
  /** WAF-specific: show rule name + cf-ray when blocked */
  wafInfo?: { ruleName: string | undefined; cfRay: string | undefined } | null;
}

function Panel({ hostname, status, body, loading, wafInfo }: PanelProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex flex-col gap-2 transition-opacity ${
        loading ? "opacity-50 animate-pulse" : "opacity-100"
      }`}
    >
      {/* Hostname */}
      <p className="font-mono text-xs text-[var(--color-text-muted)]">
        &gt; {hostname}
      </p>

      {/* Divider */}
      <div className="border-t border-[var(--color-border)]" />

      {status === null && !loading && (
        <p className="font-mono text-xs text-[var(--color-text-dim)] mt-1">
          &gt; Select an attack above
        </p>
      )}

      {status !== null && (
        <>
          {/* Status */}
          <p className={`font-mono text-sm font-semibold ${statusColor(status)}`}>
            STATUS {statusLabel(status)}
          </p>

          {/* WAF rule info — only shown on the protected panel when blocked */}
          {wafInfo && status === 403 && (
            <div className="flex flex-col gap-0.5">
              {wafInfo.ruleName && (
                <p className="font-mono text-xs text-[var(--color-text-muted)]">
                  Rule: {wafInfo.ruleName}
                </p>
              )}
              <p className="font-mono text-xs text-[var(--color-text-dim)]">
                cf-ray: {wafInfo.cfRay ?? "—"}
              </p>
            </div>
          )}

          {/* Body */}
          {body && (
            <pre className="font-mono text-xs text-[var(--color-text)] mt-1 overflow-x-auto whitespace-pre-wrap break-all">
              {body}
            </pre>
          )}
        </>
      )}

      {loading && (
        <p className="font-mono text-xs text-[var(--color-text-dim)] mt-1">
          &gt; awaiting response…
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WafDemo() {
  const [directResult, setDirectResult]   = useState<AttackResult | null>(null);
  const [wafResult, setWafResult]         = useState<AttackResult | null>(null);
  const [resultLabel, setResultLabel]     = useState<string | null>(null);
  const [loadingDirect, setLoadingDirect] = useState(false);
  const [loadingWaf, setLoadingWaf]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [activeAttack, setActiveAttack]   = useState<AttackType | null>(null);

  async function runAttack(attack: AttackType) {
    setActiveAttack(attack);
    setDirectResult(null);
    setWafResult(null);
    setResultLabel(null);
    setError(null);
    setLoadingDirect(true);
    setLoadingWaf(true);

    try {
      // Phase 1: server-side direct fetch (shows raw exploit)
      const res = await fetch("/api/waf-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attack }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Server error: ${res.status}`);
        setLoadingDirect(false);
        setLoadingWaf(false);
        return;
      }

      const data = (await res.json()) as WafDemoResult;
      setDirectResult(data.direct);
      setResultLabel(data.label);
      setLoadingDirect(false);

      // Phase 2: browser-side WAF fetch — real external request, WAF fires
      try {
        const wafRes = await fetch(data.wafFetch.url, {
          headers: { "X-Demo-Key": data.wafFetch.demoKey },
        });
        const body = (await wafRes.text()).slice(0, BODY_MAX_CHARS);
        const cfRay = wafRes.headers.get("cf-ray") ?? undefined;
        setWafResult({ status: wafRes.status, body, ...(cfRay !== undefined && { cfRay }) });
      } catch {
        // WAF 403 blocks lack CORS headers → browser throws TypeError.
        // We surface this as a confirmed block.
        setWafResult({ status: 403, body: "Blocked by Cloudflare WAF" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again.");
      setLoadingDirect(false);
    } finally {
      setLoadingWaf(false);
    }
  }

  return (
    <div className="flex flex-col gap-6" aria-live="polite" aria-atomic="false">
      {/* Attack buttons */}
      <div className="flex flex-wrap gap-3" role="group" aria-label="Attack controls">
        {ATTACKS.map(({ type, label }) => {
          const isActive = activeAttack === type;
          return (
            <button
              key={type}
              onClick={() => { void runAttack(type); }}
              disabled={loadingDirect || loadingWaf}
              aria-pressed={isActive}
              className={`font-mono text-sm px-4 py-2 rounded border transition-colors
                ${isActive
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-bg-elevated)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] bg-[var(--color-bg-card)] hover:border-[var(--color-accent-dim)] hover:text-[var(--color-text)]"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading indicator */}
      {(loadingDirect || loadingWaf) && (
        <p className="font-mono text-xs text-[var(--color-text-muted)] animate-pulse">
          &gt; firing attack…{" "}
          <span className="text-[var(--color-text-dim)]">
            (Fly app scales to zero — first request may take up to 10s)
          </span>
        </p>
      )}

      {/* Error state */}
      {error && !loadingDirect && !loadingWaf && (
        <div className="rounded-lg border border-[var(--color-red-dim)] bg-[var(--color-bg-card)] p-4">
          <p className="font-mono text-sm text-[var(--color-red)]">
            &gt; Error: {error}
          </p>
        </div>
      )}

      {/* Split panels — always shown when no error */}
      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">
              Unprotected
            </p>
            <Panel
              hostname="lass-waf-demo.fly.dev"
              status={directResult?.status ?? null}
              body={directResult?.body ?? null}
              loading={loadingDirect}
            />
          </div>
          <div>
            <p className="font-mono text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">
              Protected (Cloudflare WAF)
            </p>
            <Panel
              hostname="waf-demo.andrewlass.com"
              status={wafResult?.status ?? null}
              body={wafResult?.body ?? null}
              loading={loadingWaf}
              wafInfo={wafResult ? {
                ruleName: wafResult.status === 403 ? `${resultLabel ?? ""} blocked` : undefined,
                cfRay:    wafResult.cfRay,
              } : null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
