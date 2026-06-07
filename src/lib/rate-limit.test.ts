import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub cf-env so we control KV reads and writes
vi.mock("./cf-env", () => ({
  kvGet: vi.fn(),
  kvSet: vi.fn(),
}));

import { kvGet, kvSet } from "./cf-env";
import { checkPerCaller, checkDailyCap } from "./rate-limit";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(kvSet).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// checkPerCaller
// ---------------------------------------------------------------------------

describe("checkPerCaller", () => {
  it("allows when no prior count exists", async () => {
    vi.mocked(kvGet).mockResolvedValue(null);
    const result = await checkPerCaller("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(kvSet).toHaveBeenCalledWith("rl:ip:1.2.3.4", 1, 60);
  });

  it("allows when count is below limit", async () => {
    vi.mocked(kvGet).mockResolvedValue(0);
    const result = await checkPerCaller("1.2.3.4", { limitPerWindow: 2, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
  });

  it("denies when count equals the limit", async () => {
    vi.mocked(kvGet).mockResolvedValue(1);
    const result = await checkPerCaller("1.2.3.4", { limitPerWindow: 1, windowSeconds: 60 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(60);
    expect(kvSet).not.toHaveBeenCalled();
  });

  it("denies when count exceeds the limit", async () => {
    vi.mocked(kvGet).mockResolvedValue(5);
    const result = await checkPerCaller("1.2.3.4");
    expect(result.allowed).toBe(false);
  });

  it("uses 'unknown' key when IP is null", async () => {
    vi.mocked(kvGet).mockResolvedValue(null);
    const result = await checkPerCaller(null);
    expect(result.allowed).toBe(true);
    expect(kvSet).toHaveBeenCalledWith("rl:ip:unknown", 1, 60);
  });

  it("respects custom windowSeconds in retryAfterSeconds", async () => {
    vi.mocked(kvGet).mockResolvedValue(3);
    const result = await checkPerCaller("1.2.3.4", { limitPerWindow: 3, windowSeconds: 120 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// checkDailyCap
// ---------------------------------------------------------------------------

describe("checkDailyCap", () => {
  it("allows when no count exists for today", async () => {
    vi.mocked(kvGet).mockResolvedValue(null);
    const result = await checkDailyCap(500);
    expect(result.allowed).toBe(true);
    const today = new Date().toISOString().slice(0, 10);
    expect(kvSet).toHaveBeenCalledWith(`rl:day:${today}`, 1, 86_400);
  });

  it("allows when count is below the daily cap", async () => {
    vi.mocked(kvGet).mockResolvedValue(10);
    const result = await checkDailyCap(500);
    expect(result.allowed).toBe(true);
  });

  it("denies when count equals the daily cap", async () => {
    vi.mocked(kvGet).mockResolvedValue(500);
    const result = await checkDailyCap(500);
    expect(result.allowed).toBe(false);
    expect(kvSet).not.toHaveBeenCalled();
  });

  it("denies when count exceeds the daily cap", async () => {
    vi.mocked(kvGet).mockResolvedValue(999);
    const result = await checkDailyCap(500);
    expect(result.allowed).toBe(false);
  });
});
