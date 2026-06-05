"use client";

import { useState } from "react";
import type { WafDemoResult, AttackType } from "@/app/api/waf-demo/route";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ATTACKS: { type: AttackType; label: string }[] = [
  { type: "xss",       label: "XSS Attack" },
  { type: "sqli",      label: "SQL Injection" },
  { type: "traversal", label: "Path Traversal" },
  { type: "benign",    label: "Benign Request" },
];

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
  const [result, setResult]             = useState<WafDemoResult | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [activeAttack, setActiveAttack] = useState<AttackType | null>(null);

  async function runAttack(attack: AttackType) {
    setActiveAttack(attack);
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/waf-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attack }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Server error: ${res.status}`);
        return;
      }

      const data = (await res.json()) as WafDemoResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setLoading(false);
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
              disabled={loading}
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
      {loading && (
        <p className="font-mono text-xs text-[var(--color-text-muted)] animate-pulse">
          &gt; firing attack…{" "}
          <span className="text-[var(--color-text-dim)]">
            (Fly app scales to zero — first request may take up to 10s)
          </span>
        </p>
      )}

      {/* Error state */}
      {error && !loading && (
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
              status={result?.direct.status ?? null}
              body={result?.direct.body ?? null}
              loading={loading}
            />
          </div>
          <div>
            <p className="font-mono text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-widest">
              Protected (Cloudflare WAF)
            </p>
            <Panel
              hostname="waf-demo.andrewlass.com"
              status={result?.waf.status ?? null}
              body={result?.waf.body ?? null}
              loading={loading}
              wafInfo={result ? {
                // result.label is the attack label from the server (e.g. "SQL Injection")
                ruleName: result.waf.status === 403 ? `${result.label} blocked` : undefined,
                cfRay:    result.waf.cfRay,
              } : null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
