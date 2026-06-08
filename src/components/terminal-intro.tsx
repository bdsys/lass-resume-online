"use client";

import { useEffect, useRef, useReducer } from "react";
import { getResume } from "@/lib/resume";

// ── Resume data ────────────────────────────────────────────────────────────────

const resume = getResume();
const { name, headline, contact, pillars, skills, experience } = resume;

// ── Types ──────────────────────────────────────────────────────────────────────

interface Line {
  prompt: boolean;
  text: string;
  color?: string;
}

// ── Intro script ──────────────────────────────────────────────────────────────

const SCRIPT: Line[] = [
  { prompt: true,  text: "whoami" },
  { prompt: false, text: name,                                  color: "var(--color-accent)" },
  { prompt: true,  text: "uname -a" },
  { prompt: false, text: `${headline} — ${contact.location}` },
  { prompt: true,  text: "cat skills.txt" },
  { prompt: false, text: "Public Cloud  ·  Python  ·  IaC  ·  CI/CD  ·  Web Tech  ·  DevOps" },
  { prompt: true,  text: "ls interests/" },
  {
    prompt: false,
    text: pillars.map((p) => `${p.toLowerCase().replace(/\s+/g, "-")}/`).join("   "),
    color: "var(--color-green)",
  },
];

const CHAR_DELAY = 38;    // ms per character
const LINE_PAUSE = 320;   // ms pause after output

// ── Commands ──────────────────────────────────────────────────────────────────

type CmdOutput = { text: string; color?: string }[];

function runCommand(input: string): CmdOutput {
  const cmd = input.trim().toLowerCase();

  if (cmd === "" || cmd === "clear") return [];   // handled specially

  if (cmd === "help") {
    return [
      { text: "Available commands:", color: "var(--color-accent)" },
      { text: "  whoami       — identity" },
      { text: "  uname -a     — title + location" },
      { text: "  cat resume   — summary" },
      { text: "  ls skills/   — skill areas" },
      { text: "  contact      — email + links" },
      { text: "  ls           — directories" },
      { text: "  clear        — clear terminal" },
      { text: "  help         — this message" },
    ];
  }

  if (cmd === "whoami") {
    return [{ text: name, color: "var(--color-accent)" }];
  }

  if (cmd === "uname -a" || cmd === "uname") {
    return [{ text: `${headline} — ${contact.location}` }];
  }

  if (cmd === "cat resume" || cmd === "cat resume.txt" || cmd === "cat resume.md") {
    return [{ text: resume.summary.split(".")[0] + ".", color: "var(--color-text-muted)" }];
  }

  if (cmd === "ls skills/" || cmd === "ls skills" || cmd === "cat skills.txt") {
    return skills.map((g) => ({
      text: `  ${g.area.toLowerCase().replace(/\s+/g, "-")}/`,
      color: "var(--color-green)",
    }));
  }

  if (cmd === "ls" || cmd === "ls .") {
    return [
      {
        text: "resume/   portfolio/   security/   tools/   interests/   skills/",
        color: "var(--color-green)",
      },
    ];
  }

  if (cmd === "contact") {
    const lines: CmdOutput = [
      { text: `email:    ${contact.email}`,              color: "var(--color-accent)" },
      { text: `github:   github.com/${contact.github}`,  color: "var(--color-accent)" },
    ];
    if (contact.linkedin) {
      lines.push({
        text: `linkedin: linkedin.com/in/${contact.linkedin}`,
        color: "var(--color-accent)",
      });
    }
    return lines;
  }

  if (cmd === "ls experience/" || cmd === "cat experience.txt") {
    return experience.slice(0, 3).map((e) => ({
      text: `  ${e.company} — ${e.title}`,
    }));
  }

  return [{ text: `command not found: ${input.trim()}`, color: "var(--color-red)" }];
}

// ── Reducer ───────────────────────────────────────────────────────────────────

type TermState = {
  history: Line[];
  done: boolean;
  inputVal: string;
};

type TermAction =
  | { type: "PUSH";        line: Line }
  | { type: "UPDATE_LAST"; line: Line }
  | { type: "INTRO_DONE" }
  | { type: "SET_INPUT";   value: string }
  | { type: "SUBMIT" }
  | { type: "CLEAR" };

function termReducer(state: TermState, action: TermAction): TermState {
  switch (action.type) {
    case "PUSH":
      return { ...state, history: [...state.history, action.line] };
    case "UPDATE_LAST": {
      if (state.history.length === 0) return state;
      const h = [...state.history];
      h[h.length - 1] = action.line;
      return { ...state, history: h };
    }
    case "INTRO_DONE":
      return { ...state, done: true };
    case "SET_INPUT":
      return { ...state, inputVal: action.value };
    case "SUBMIT": {
      const input = state.inputVal.trim();
      if (!input) return { ...state, inputVal: "" };
      if (input.toLowerCase() === "clear") {
        return { ...state, history: [], inputVal: "" };
      }
      const outputs = runCommand(input);
      return {
        ...state,
        history: [
          ...state.history,
          { prompt: true, text: input },
          ...outputs.map((o) => ({ prompt: false, ...o })),
        ],
        inputVal: "",
      };
    }
    case "CLEAR":
      return { ...state, history: [], inputVal: "" };
    default:
      return state;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TerminalIntro() {
  const [state, dispatch] = useReducer(termReducer, {
    history: [],
    done: false,
    inputVal: "",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // ── Intro animation (skipped when prefers-reduced-motion) ────────────────
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      for (const line of SCRIPT) {
        dispatch({ type: "PUSH", line });
      }
      dispatch({ type: "INTRO_DONE" });
      return;
    }

    let cancelled = false;

    async function run() {
      for (const line of SCRIPT) {
        if (cancelled) return;

        if (line.prompt) {
          // Push a blank prompt line, then update it character by character
          dispatch({ type: "PUSH", line: { ...line, text: "" } });
          for (let i = 1; i <= line.text.length; i++) {
            if (cancelled) return;
            dispatch({ type: "UPDATE_LAST", line: { ...line, text: line.text.slice(0, i) } });
            await sleep(CHAR_DELAY);
          }
          await sleep(LINE_PAUSE / 2);
        } else {
          // Output lines appear all at once
          dispatch({ type: "PUSH", line });
          await sleep(LINE_PAUSE);
        }
      }
      if (!cancelled) dispatch({ type: "INTRO_DONE" });
    }

    run();
    return () => { cancelled = true; };
  }, []);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    containerRef.current?.scrollTo?.({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.history]);

  // ── Focus input when animation completes ─────────────────────────────────
  useEffect(() => {
    if (state.done) {
      inputRef.current?.focus();
    }
  }, [state.done]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      dispatch({ type: "SUBMIT" });
    }
  }

  return (
    <section
      aria-label="Interactive terminal"
      className="relative w-full max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden"
    >
      {/* Title bar */}
      <div
        aria-hidden="true"
        className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
      >
        <span className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
        <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-40" />
        <span className="w-3 h-3 rounded-full bg-green-500 opacity-70" />
        <span className="ml-3 font-mono text-xs text-[var(--color-text-muted)]">
          bdsys@portfolio:~ — type &apos;help&apos; for commands
        </span>
      </div>

      {/* Scrollable history (decorative — screen readers use the input below) */}
      <div
        ref={containerRef}
        aria-hidden="true"
        data-testid="terminal-history"
        className="p-4 font-mono text-sm leading-relaxed overflow-y-auto h-64 space-y-0.5"
        onClick={() => state.done && inputRef.current?.focus()}
      >
        {state.history.map((line, i) =>
          line.prompt ? (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[var(--color-accent)] shrink-0 select-none">$</span>
              <span className="text-[var(--color-text)]">{line.text}</span>
            </div>
          ) : (
            <div key={i} className="pl-4" style={{ color: line.color ?? "var(--color-text-muted)" }}>
              {line.text}
            </div>
          )
        )}

        {/* Blinking cursor during animation */}
        {!state.done && (
          <div className="flex items-start gap-2" aria-hidden="true">
            <span className="text-[var(--color-accent)] shrink-0 select-none">$</span>
            <span
              className="inline-block w-2 h-4 bg-[var(--color-accent)]"
              style={{ animation: "blink 1s step-end infinite" }}
            />
          </div>
        )}
      </div>

      {/* Accessible input row — appears once animation completes */}
      {state.done && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-card)]"
          onClick={() => inputRef.current?.focus()}
        >
          <span
            aria-hidden="true"
            className="text-[var(--color-accent)] font-mono text-sm shrink-0 select-none"
          >
            $
          </span>
          <label htmlFor="terminal-input" className="sr-only">
            Terminal command input — type help for available commands
          </label>
          <input
            id="terminal-input"
            ref={inputRef}
            type="text"
            value={state.inputVal}
            onChange={(e) => dispatch({ type: "SET_INPUT", value: e.target.value })}
            onKeyDown={handleKey}
            placeholder="help"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent font-mono text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 outline-none caret-[var(--color-accent)]"
          />
        </div>
      )}
    </section>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
