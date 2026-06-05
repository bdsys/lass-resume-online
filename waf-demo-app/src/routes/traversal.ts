import { Router } from "express";
import { readWithinSandbox, OutOfJailError } from "../lib/sandbox";

const router = Router();

/**
 * Path traversal endpoint.
 *
 * INTENTIONAL VULNERABILITY: the `name` param is resolved with path.resolve() against the
 * sandbox root without prior validation, allowing ../  sequences to escape the intended
 * subdirectory.  The jail (in sandbox.ts) permits traversal *within* demo-files/ but blocks
 * any path that escapes the sandbox root entirely.
 *
 * Normal:  ?name=subdir/note.txt          → reads the intended file
 * Exploit: ?name=subdir/../secret-flag.txt → traverses to the planted secret
 * Blocked: ?name=../../etc/passwd          → 403 (OutOfJailError)
 */
router.get("/api/file", (req, res) => {
  const name = (req.query.name as string) ?? "";
  try {
    const content = readWithinSandbox(name);
    res.type("text").send(content);
  } catch (err) {
    if (err instanceof OutOfJailError) {
      res
        .status(403)
        .json({ error: "Access denied", detail: "Path traversal blocked by sandbox jail" });
    } else if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "File not found" });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});

export { router as traversalRouter };
