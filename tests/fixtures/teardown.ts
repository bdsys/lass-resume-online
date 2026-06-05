import http from "node:http";

export default async function globalTeardown() {
  const server = (globalThis as Record<string, unknown>).__MOCK_SERVER__ as http.Server | undefined;
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log("[e2e] GitHub mock server closed");
  }
}
