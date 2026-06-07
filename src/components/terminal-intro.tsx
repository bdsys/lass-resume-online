"use client";

import { useEffect, useRef, useState } from "react";
import { getResume } from "@/lib/resume";

interface Line {
  prompt: boolean;   // true = input line, false = output line
  text: string;
  color?: string;    // optional CSS color var name
}

const { headline, contact } = getResume();

const SCRIPT: Line[] = [
  { prompt: true,  text: "whoami" },
  { prompt: false, text: "Andrew Lass", color: "var(--color-accent)" },
  { prompt: true,  text: "uname -a" },
  { prompt: false, text: `${headline} — ${contact.location}` },
  { prompt: true,  text: "cat skills.txt" },
  { prompt: false, text: "AWS  ·  Python  ·  IaC  ·  CI/CD  ·  Web Tech  ·  DevOps" },
  { prompt: true,  text: "ls interests/" },
  { prompt: false, text: "cloud-networking/   cloud-governance/   cloud-security/   web-development/   systems-automation/", color: "var(--color-green)" },
];

const CHAR_DELAY   = 38;   // ms per character (input lines)
const LINE_PAUSE   = 320;  // ms after output before next prompt

export function TerminalIntro() {
  const [lines, setLines] = useState<{ line: Line; text: string; done: boolean }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      for (const line of SCRIPT) {
        if (cancelled) return;

        if (line.prompt) {
          // Type the prompt character by character
          for (let i = 0; i <= line.text.length; i++) {
            if (cancelled) return;
            setLines((prev) => {
              const next = [...prev];
              const idx = next.length - 1;
              if (i === 0 || next[idx]?.done) {
                next.push({ line, text: line.text.slice(0, i), done: false });
              } else {
                next[idx] = { line, text: line.text.slice(0, i), done: false };
              }
              return next;
            });
            await sleep(CHAR_DELAY);
          }
          // Mark prompt line done
          setLines((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], done: true };
            return next;
          });
          await sleep(LINE_PAUSE / 2);
        } else {
          // Output lines appear instantly
          setLines((prev) => [...prev, { line, text: line.text, done: true }]);
          await sleep(LINE_PAUSE);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  // Scroll to bottom as lines appear
  useEffect(() => {
    // scrollTo may be absent in jsdom (tests) — guard with optional call
    containerRef.current?.scrollTo?.({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  return (
    <div
      className="relative w-full max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
      aria-label="Terminal introduction"
      role="presentation"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <span className="w-3 h-3 rounded-full bg-[var(--color-red-dim)] opacity-70" />
        <span className="w-3 h-3 rounded-full bg-[var(--color-yellow)] opacity-40" />
        <span className="w-3 h-3 rounded-full bg-[var(--color-green-dim)] opacity-70" />
        <span className="ml-3 font-mono text-xs text-[var(--color-text-muted)]">
          bdsys@portfolio:~
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        className="p-4 font-mono text-sm leading-relaxed overflow-y-auto max-h-52 space-y-0.5"
      >
        {lines.map(({ line, text, done }, i) => (
          <div key={i} className="flex items-start gap-2">
            {line.prompt ? (
              <>
                <span className="select-none text-[var(--color-accent)] shrink-0">$</span>
                <span className="text-[var(--color-text)]">
                  {text}
                  {/* Show blinking cursor on the last incomplete line */}
                  {i === lines.length - 1 && !done && (
                    <span className="cursor-blink ml-0.5" aria-hidden="true" />
                  )}
                </span>
              </>
            ) : (
              <span
                className="pl-4"
                style={{ color: line.color ?? "var(--color-text-muted)" }}
              >
                {text}
              </span>
            )}
          </div>
        ))}

        {/* Idle cursor after all lines are done */}
        {lines.length === SCRIPT.length && lines[lines.length - 1]?.done && (
          <div className="flex items-start gap-2">
            <span className="select-none text-[var(--color-accent)] shrink-0">$</span>
            <span className="cursor-blink" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
