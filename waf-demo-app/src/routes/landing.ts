import { Router } from "express";

const router = Router();

/** Public landing page explaining the demo. Gate-exempt. */
router.get("/", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WAF Demo — Intentionally Vulnerable App</title>
  <style>
    body { font-family: monospace; background: #0a0a0a; color: #d4d4d4;
           max-width: 820px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
    h1  { color: #4ade80; margin-bottom: 4px; }
    h2  { color: #86efac; font-size: 1em; text-transform: uppercase;
          letter-spacing: .08em; margin: 28px 0 8px; }
    .warning { border: 1px solid #ef4444; padding: 14px 16px; border-radius: 6px;
               color: #fca5a5; margin: 16px 0 24px; }
    .endpoint { background: #141414; border: 1px solid #262626; padding: 14px 16px;
                border-radius: 6px; margin: 8px 0; }
    .endpoint strong { color: #e5e5e5; }
    code  { color: #7dd3fc; }
    .dim  { color: #6b7280; font-size: .9em; }
    ul    { padding-left: 20px; }
    li    { margin: 4px 0; }
  </style>
</head>
<body>
  <h1>&gt; WAF Demo — Educational Vulnerable App</h1>
  <p class="dim">Part of Andrew Lass's developer/security portfolio — <a href="https://github.com/bdsys" style="color:#7dd3fc">github.com/bdsys</a></p>

  <div class="warning">
    ⚠&nbsp; This application is <strong>intentionally vulnerable</strong> for
    educational and demonstration purposes only.<br>
    It is <strong>authorized</strong>, sandboxed, and contains <strong>no real data</strong>.
    Exploiting it is expected — that's the point.
  </div>

  <p>
    A Cloudflare WAF (Phase 5) sits in front of this app in production and
    blocks each attack before it reaches these endpoints. The portfolio's
    <code>/security</code> dashboard will show the request and the WAF block
    response side by side in real time.
  </p>

  <h2>Endpoints (require X-Demo-Key header)</h2>

  <div class="endpoint">
    <strong>Reflected XSS</strong><br>
    <code>GET /api/echo?msg=&lt;script&gt;alert(1)&lt;/script&gt;</code><br>
    <span class="dim">User input is injected verbatim into an HTML response. A browser executes the script.</span>
  </div>

  <div class="endpoint">
    <strong>SQL Injection</strong><br>
    <code>GET /api/users?id=1' OR '1'='1</code><br>
    <span class="dim">String-concatenated query against in-memory SQLite. Injection returns all fake rows.</span>
  </div>

  <div class="endpoint">
    <strong>Path Traversal</strong><br>
    <code>GET /api/file?name=subdir/../secret-flag.txt</code><br>
    <span class="dim">Naive path.join allows escaping the intended directory within the demo sandbox.</span>
  </div>

  <h2>Isolation Guarantees</h2>
  <ul>
    <li>No real database — SQLite lives in process memory only, dies on restart</li>
    <li>No real secrets — all "sensitive" files are planted dummy content</li>
    <li>No shared infrastructure, secrets, or data with the main portfolio</li>
    <li>Rate limited (60 req / 5 min per IP) to prevent abuse</li>
    <li>Path traversal jailed to the <code>demo-files/</code> sandbox directory</li>
    <li>Endpoints require an integration key — public access returns 423 Locked</li>
  </ul>
</body>
</html>`);
});

export { router as landingRouter };
