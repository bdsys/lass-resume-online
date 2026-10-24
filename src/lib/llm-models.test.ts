import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — Anthropic Models API and cf-env (KV, secrets, background work)
// ---------------------------------------------------------------------------

const { mockModelsList } = vi.hoisted(() => ({ mockModelsList: vi.fn() }));

// A plain class (not vi.fn) so vi.resetAllMocks() doesn't wipe the constructor
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    models = { list: mockModelsList };
  },
}));

vi.mock("./cf-env", () => ({
  getSecret:       vi.fn(),
  kvGet:           vi.fn(),
  kvSet:           vi.fn(),
  runInBackground: vi.fn(),
}));

import { getSecret, kvGet, kvSet, runInBackground } from "./cf-env";
import {
  CLAUDE_MODEL_CACHE_KEY,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_GEMINI_MODEL,
  claudeThinkingParams,
  fetchNewestClaude,
  pickNewestInLine,
  resolveClaudeModel,
  resolveGeminiModel,
} from "./llm-models";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-24T12:00:00Z");

/** Shape of a Models API entry, including fields newer than the installed SDK types. */
function model(id: string, line: string | null, createdAt: string, disabled?: boolean, effort?: boolean) {
  return {
    id,
    line,
    created_at: createdAt,
    type: "model",
    capabilities: {
      thinking: { types: disabled === undefined ? {} : { disabled: { supported: disabled } } },
      ...(effort === undefined ? {} : { effort: { supported: effort } }),
    },
  };
}

/** Mimics the SDK's auto-paginating PagePromise (async iterable). */
function pages(items: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      yield* items;
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSecret).mockResolvedValue(undefined);
  vi.mocked(kvGet).mockResolvedValue(null);
  vi.mocked(kvSet).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// pickNewestInLine
// ---------------------------------------------------------------------------

describe("pickNewestInLine", () => {
  it("returns the most recently released model in the line", () => {
    const choice = pickNewestInLine(
      [
        model("claude-haiku-4-5-20251001", "haiku", "2025-10-01T00:00:00Z"),
        model("claude-haiku-5-5", "haiku", "2026-10-07T00:00:00Z", true, true),
        model("claude-opus-5-5", "opus", "2026-10-20T00:00:00Z"),
      ],
      "haiku",
    );
    expect(choice?.id).toBe("claude-haiku-5-5");
  });

  it("records whether the model accepts disabled thinking and effort", () => {
    const choice = pickNewestInLine([model("claude-haiku-5-5", "haiku", "2026-10-07T00:00:00Z", true, false)], "haiku");
    expect(choice).toEqual({ id: "claude-haiku-5-5", thinkingDisabledSupported: true, effortSupported: false });
  });

  it("returns null when no model is in the line", () => {
    expect(pickNewestInLine([model("claude-opus-5-5", "opus", "2026-10-20T00:00:00Z")], "haiku")).toBeNull();
  });

  it("ignores entries without a line field instead of guessing from the id", () => {
    expect(pickNewestInLine([model("claude-haiku-5-5", null, "2026-10-07T00:00:00Z")], "haiku")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchNewestClaude
// ---------------------------------------------------------------------------

describe("fetchNewestClaude", () => {
  it("picks the newest Haiku from the Models API", async () => {
    mockModelsList.mockReturnValue(
      pages([
        model("claude-haiku-4-5-20251001", "haiku", "2025-10-01T00:00:00Z"),
        model("claude-haiku-5-5", "haiku", "2026-10-07T00:00:00Z", true, true),
      ]),
    );
    const choice = await fetchNewestClaude("test-key");
    expect(choice?.id).toBe("claude-haiku-5-5");
  });
});

// ---------------------------------------------------------------------------
// resolveClaudeModel
// ---------------------------------------------------------------------------

describe("resolveClaudeModel", () => {
  it("uses the CLAUDE_MODEL override without touching KV", async () => {
    vi.mocked(getSecret).mockImplementation(async (n) => (n === "CLAUDE_MODEL" ? "claude-sonnet-5-5" : undefined));
    const choice = await resolveClaudeModel("test-key", NOW);
    expect(choice).toEqual({ id: "claude-sonnet-5-5" });
    expect(kvGet).not.toHaveBeenCalled();
    expect(runInBackground).not.toHaveBeenCalled();
  });

  it("uses a fresh cached choice without refreshing", async () => {
    vi.mocked(kvGet).mockResolvedValue({ id: "claude-haiku-5-5", thinkingDisabledSupported: true, fetchedAt: NOW - 1000 });
    const choice = await resolveClaudeModel("test-key", NOW);
    expect(choice).toEqual({ id: "claude-haiku-5-5", thinkingDisabledSupported: true });
    expect(runInBackground).not.toHaveBeenCalled();
  });

  it("serves a stale cached choice immediately and refreshes in the background", async () => {
    vi.mocked(kvGet).mockResolvedValue({ id: "claude-haiku-5-5", fetchedAt: NOW - 2 * DAY_MS });
    const choice = await resolveClaudeModel("test-key", NOW);
    expect(choice.id).toBe("claude-haiku-5-5");
    expect(runInBackground).toHaveBeenCalledOnce();
  });

  it("falls back to the default model on a cache miss and refreshes in the background", async () => {
    const choice = await resolveClaudeModel("test-key", NOW);
    expect(choice).toEqual({ id: DEFAULT_CLAUDE_MODEL });
    expect(runInBackground).toHaveBeenCalledOnce();
  });

  it("the background refresh caches the newest Haiku with a timestamp", async () => {
    mockModelsList.mockReturnValue(pages([model("claude-haiku-5-5", "haiku", "2026-10-07T00:00:00Z", true, true)]));
    await resolveClaudeModel("test-key", NOW);
    await vi.mocked(runInBackground).mock.calls[0][0];
    expect(kvSet).toHaveBeenCalledWith(
      CLAUDE_MODEL_CACHE_KEY,
      { id: "claude-haiku-5-5", thinkingDisabledSupported: true, effortSupported: true, fetchedAt: NOW },
      expect.any(Number),
    );
  });

  it("the background refresh leaves the cache alone when the lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockModelsList.mockImplementation(() => {
      throw new Error("network down");
    });
    await resolveClaudeModel("test-key", NOW);
    await vi.mocked(runInBackground).mock.calls[0][0];
    expect(kvSet).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resolveGeminiModel
// ---------------------------------------------------------------------------

describe("resolveGeminiModel", () => {
  it("defaults to Google's auto-updating Flash-Lite alias", async () => {
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-flash-lite-latest");
    expect(await resolveGeminiModel()).toBe("gemini-flash-lite-latest");
  });

  it("uses the GEMINI_MODEL override when set", async () => {
    vi.mocked(getSecret).mockImplementation(async (n) => (n === "GEMINI_MODEL" ? "gemini-3.8-flash" : undefined));
    expect(await resolveGeminiModel()).toBe("gemini-3.8-flash");
  });
});

// ---------------------------------------------------------------------------
// claudeThinkingParams
// ---------------------------------------------------------------------------

describe("claudeThinkingParams", () => {
  it("turns thinking off when the model accepts it", () => {
    expect(claudeThinkingParams({ id: "m", thinkingDisabledSupported: true, effortSupported: true }))
      .toEqual({ thinking: { type: "disabled" } });
  });

  it("falls back to low effort when thinking can't be turned off", () => {
    expect(claudeThinkingParams({ id: "m", thinkingDisabledSupported: false, effortSupported: true }))
      .toEqual({ output_config: { effort: "low" } });
  });

  it("sends nothing extra when capabilities are unknown", () => {
    expect(claudeThinkingParams({ id: "m" })).toEqual({});
  });
});
