"use client";

import { useEffect, useState } from "react";

export function WafCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/waf-demo", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.totalAttacks === "number") {
          setCount(data.totalAttacks);
        }
      })
      .catch(() => {
        // Non-fatal — counter just won't show
      });
  }, []);

  if (count === null) return null;

  return (
    <span className="font-mono text-[var(--color-accent)] font-semibold tabular-nums">
      {count.toLocaleString()}
    </span>
  );
}
