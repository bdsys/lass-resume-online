import { describe, it, expect } from "vitest";
import { getClientIp } from "./client-ip";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.com/", { headers });
}

describe("getClientIp", () => {
  it("returns CF-Connecting-IP when present", () => {
    const r = req({ "cf-connecting-ip": "1.2.3.4" });
    expect(getClientIp(r)).toBe("1.2.3.4");
  });

  it("trims whitespace from CF-Connecting-IP", () => {
    const r = req({ "cf-connecting-ip": "  1.2.3.4  " });
    expect(getClientIp(r)).toBe("1.2.3.4");
  });

  it("ignores an empty CF-Connecting-IP and falls through to XFF", () => {
    const r = req({ "cf-connecting-ip": "   ", "x-forwarded-for": "5.6.7.8, 9.10.11.12" });
    expect(getClientIp(r)).toBe("5.6.7.8");
  });

  it("returns first segment of X-Forwarded-For when CF-Connecting-IP absent", () => {
    const r = req({ "x-forwarded-for": "5.6.7.8, 9.10.11.12" });
    expect(getClientIp(r)).toBe("5.6.7.8");
  });

  it("returns the sole XFF value when no comma", () => {
    const r = req({ "x-forwarded-for": "5.6.7.8" });
    expect(getClientIp(r)).toBe("5.6.7.8");
  });

  it("returns null when both headers are absent", () => {
    const r = req({});
    expect(getClientIp(r)).toBeNull();
  });

  it("returns null when XFF is present but empty", () => {
    const r = req({ "x-forwarded-for": "   " });
    expect(getClientIp(r)).toBeNull();
  });

  it("prefers CF-Connecting-IP over XFF when both present", () => {
    const r = req({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(getClientIp(r)).toBe("1.2.3.4");
  });
});
