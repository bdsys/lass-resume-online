import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/client-ip", () => ({
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/cf-env", () => ({
  getCf: vi.fn(),
}));

import { getClientIp } from "@/lib/client-ip";
import { getCf } from "@/lib/cf-env";

function req(path = "/api/ip", headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${path}`, { headers });
}

const MOCK_CF = {
  country: "US", region: "Washington", city: "Seattle",
  continent: "NA", asOrganization: "Comcast", asn: 7922,
  colo: "SEA", tlsVersion: "TLSv1.3", httpProtocol: "HTTP/2",
};

beforeEach(() => {
  vi.mocked(getClientIp).mockReturnValue("1.2.3.4");
  vi.mocked(getCf).mockResolvedValue(MOCK_CF);
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

  it("returns CF geo fields when getCf resolves", async () => {
    const res = await GET(req("/api/ip?format=json"));
    const data = await res.json() as Record<string, unknown>;
    expect(data.country).toBe("US");
    expect(data.city).toBe("Seattle");
    expect(data.asn).toBe(7922);
    expect(data.colo).toBe("SEA");
    expect(data.tlsVersion).toBe("TLSv1.3");
    expect(data.httpProtocol).toBe("HTTP/2");
  });

  it("returns null CF fields when getCf returns null (non-Workers runtime)", async () => {
    vi.mocked(getCf).mockResolvedValue(null);
    const res = await GET(req("/api/ip?format=json"));
    const data = await res.json() as Record<string, unknown>;
    expect(data.ip).toBe("1.2.3.4");
    expect(data.country).toBeNull();
    expect(data.colo).toBeNull();
    expect(data.tlsVersion).toBeNull();
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
