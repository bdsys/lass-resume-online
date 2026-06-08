"use client";

import { useState } from "react";

type CfFields = {
  country:        string | null;
  region:         string | null;
  city:           string | null;
  continent:      string | null;
  asOrganization: string | null;
  asn:            number | null;
  colo:           string | null;
  tlsVersion:     string | null;
  httpProtocol:   string | null;
};

type IpData = { ip: string } & CfFields;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: IpData }
  | { status: "error"; message: string };

function InfoRow({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-[var(--color-border)] last:border-0">
      <span className="font-mono text-xs text-[var(--color-text-muted)] shrink-0">{label}</span>
      <span className="font-mono text-xs text-[var(--color-text)] text-right">{value}</span>
    </div>
  );
}

export function IpTool() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function reveal() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/ip?format=json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as IpData;
      setState({ status: "done", data });
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 max-w-lg space-y-4">
      {/* Terminal hint */}
      <p className="font-mono text-xs text-[var(--color-text-muted)]">
        <span className="text-[var(--color-accent)]">$</span>{" "}
        curl <span className="text-[var(--color-yellow)]">ip.andrewlass.com</span>
      </p>

      {/* Result or button */}
      {state.status === "done" ? (
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[var(--color-text-muted)] text-xs mb-1">Your IP address:</p>
            <p className="font-mono text-2xl font-semibold text-[var(--color-accent)]">
              {state.data.ip}
            </p>
          </div>

          {/* CF geo / network details */}
          {(state.data.city || state.data.country || state.data.colo) && (
            <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-2 space-y-0">
              <InfoRow label="City"          value={[state.data.city, state.data.region].filter(Boolean).join(", ")} />
              <InfoRow label="Country"       value={state.data.country} />
              <InfoRow label="Continent"     value={state.data.continent} />
              <InfoRow label="ASN"           value={state.data.asn !== null ? `AS${state.data.asn} ${state.data.asOrganization ?? ""}`.trim() : null} />
              <InfoRow label="CF Datacenter" value={state.data.colo} />
              <InfoRow label="TLS"           value={state.data.tlsVersion} />
              <InfoRow label="Protocol"      value={state.data.httpProtocol} />
            </div>
          )}

          <button
            onClick={() => setState({ status: "idle" })}
            className="font-mono text-xs text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-text)] transition-colors"
          >
            Clear
          </button>
        </div>
      ) : state.status === "error" ? (
        <div className="space-y-3">
          <p className="font-mono text-xs text-[var(--color-red)]">{state.message}</p>
          <button
            onClick={reveal}
            className="rounded px-4 py-2 font-mono text-xs border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <button
          onClick={reveal}
          disabled={state.status === "loading"}
          className="rounded px-4 py-2 font-mono text-sm border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.status === "loading" ? "Detecting…" : "Reveal my IP"}
        </button>
      )}

      {/* Explainer */}
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        Reads{" "}
        <code className="font-mono text-[var(--color-accent-dim)]">CF-Connecting-IP</code>{" "}
        and Cloudflare&apos;s{" "}
        <code className="font-mono text-[var(--color-accent-dim)]">request.cf</code>{" "}
        object for geo/network context — country, ASN, TLS version, and which Cloudflare
        datacenter is serving you. Fields show{" "}
        <code className="font-mono text-[var(--color-accent-dim)]">null</code>{" "}
        outside the Workers runtime.{" "}
        <code className="font-mono text-[var(--color-accent-dim)]">curl ip.andrewlass.com</code>{" "}
        returns just the IP as plain text.
      </p>
    </div>
  );
}
