/**
 * GET /api/ip — returns the caller's IP address.
 *
 * Response format:
 *   - Default (no ?format=json, no Accept: application/json):
 *       text/plain — raw IP followed by a newline, e.g. "1.2.3.4\n"
 *       This is the format that curl/wget consumers expect (icanhazip-style).
 *
 *   - ?format=json OR Accept: application/json:
 *       application/json — { ip, country, region, city, continent,
 *                             asOrganization, asn, colo, tlsVersion, httpProtocol }
 *       CF geo/network fields are null outside the Workers runtime.
 *       Used by the on-site IP tool.
 *
 * The subdomain ip.andrewlass.com is rewritten to this route via the
 * next.config.ts host-based rewrite, so `curl https://ip.andrewlass.com`
 * also hits this handler (plain-text path unchanged).
 */

import { getClientIp } from "@/lib/client-ip";
import { getCf }       from "@/lib/cf-env";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const ip = getClientIp(request) ?? "unknown";

  const url = new URL(request.url);
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    (request.headers.get("accept") ?? "").includes("application/json");

  if (wantsJson) {
    const cf = await getCf();
    return Response.json({
      ip,
      country:        cf?.country        ?? null,
      region:         cf?.region         ?? null,
      city:           cf?.city           ?? null,
      continent:      cf?.continent      ?? null,
      asOrganization: cf?.asOrganization ?? null,
      asn:            cf?.asn            ?? null,
      colo:           cf?.colo           ?? null,
      tlsVersion:     cf?.tlsVersion     ?? null,
      httpProtocol:   cf?.httpProtocol   ?? null,
    });
  }

  return new Response(ip + "\n", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
