import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /tools/prompt.md", () => {
  it("returns 200 with text/markdown content-type", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/markdown/);
  });

  it("body contains the plugin marketplace add command", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain("plugin marketplace add bdsys/lass-labs");
  });

  it("body contains both plugin install commands", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain("plugin install whats-my-ip@lass-labs");
    expect(body).toContain("plugin install who-should-i-hire@lass-labs");
  });

  it("body contains a Resources section", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain("## Resources");
  });
});
