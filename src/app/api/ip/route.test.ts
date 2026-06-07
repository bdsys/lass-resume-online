import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/client-ip", () => ({
  getClientIp: vi.fn(),
}));

import { getClientIp } from "@/lib/client-ip";

function req(path = "/api/ip", headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${path}`, { headers });
}

beforeEach(() => {
  vi.mocked(getClientIp).mockReturnValue("1.2.3.4");
});

// ---------------------------------------------------------------------------
// Plain-text (default)
// ---------------------------------------------------------------------------

describe("plain-text response (default)", () => {
  it("returns the IP followed by a newline", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("1.2.3.4\n");
  });

  it("sets content-type to text/plain", async () => {
    const res = await GET(req());
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
  });

  it("returns 'unknown' when getClientIp returns null", async () => {
    vi.mocked(getClientIp).mockReturnValue(null);
    const res = await GET(req());
    expect(await res.text()).toBe("unknown\n");
  });
});

// ---------------------------------------------------------------------------
// JSON — ?format=json
// ---------------------------------------------------------------------------

describe("JSON response via ?format=json", () => {
  it("returns application/json with the IP", async () => {
    const res = await GET(req("/api/ip?format=json"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ip: string };
    expect(data.ip).toBe("1.2.3.4");
  });

  it("returns 'unknown' in JSON when getClientIp returns null", async () => {
    vi.mocked(getClientIp).mockReturnValue(null);
    const res = await GET(req("/api/ip?format=json"));
    const data = (await res.json()) as { ip: string };
    expect(data.ip).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// JSON — Accept: application/json
// ---------------------------------------------------------------------------

describe("JSON response via Accept header", () => {
  it("returns JSON when Accept: application/json", async () => {
    const res = await GET(req("/api/ip", { accept: "application/json" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ip: string };
    expect(data.ip).toBe("1.2.3.4");
  });

  it("returns JSON when Accept includes application/json alongside other types", async () => {
    const res = await GET(
      req("/api/ip", { accept: "text/html, application/json, */*" }),
    );
    const data = (await res.json()) as { ip: string };
    expect(data.ip).toBe("1.2.3.4");
  });

  it("returns plain text when Accept is text/html only", async () => {
    const res = await GET(req("/api/ip", { accept: "text/html" }));
    expect(await res.text()).toBe("1.2.3.4\n");
  });
});

// ---------------------------------------------------------------------------
// getClientIp is called with the request object
// ---------------------------------------------------------------------------

describe("getClientIp integration", () => {
  it("passes the request to getClientIp", async () => {
    const r = req();
    await GET(r);
    expect(getClientIp).toHaveBeenCalledWith(r);
  });
});
