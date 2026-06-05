import { Router } from "express";

const router = Router();

/**
 * Reflected XSS endpoint.
 *
 * INTENTIONAL VULNERABILITY: the `msg` query param is injected into HTML without sanitization.
 * A browser will execute any <script> tag or inline event handler in the value.
 */
router.get("/api/echo", (req, res) => {
  const msg = (req.query.msg as string) ?? "";
  // INTENTIONAL VULNERABILITY: do not escape or sanitize msg
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Echo — WAF Demo</title></head>
<body style="font-family:monospace;background:#0a0a0a;color:#d4d4d4;padding:24px">
  <p style="color:#6b7280;font-size:.8em">WAF Demo / Reflected XSS endpoint</p>
  <p>You said: ${msg}</p>
</body>
</html>`);
});

export { router as xssRouter };
