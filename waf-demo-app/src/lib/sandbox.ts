/**
 * Jailed file reader for the path traversal demo.
 *
 * Reads files relative to the demo-files/ sandbox root.
 * Traversal *within* the sandbox is allowed — that is the demonstrated vulnerability.
 * Traversal *outside* the sandbox root is blocked (the jail).
 *
 * Example:
 *   readWithinSandbox("subdir/../secret-flag.txt")  → allowed (traversal within root)
 *   readWithinSandbox("../../etc/passwd")            → throws OutOfJailError
 */
import path from "path";
import fs from "fs";

export class OutOfJailError extends Error {
  constructor(attempted: string) {
    super(`Path traversal blocked: "${attempted}" escapes the sandbox`);
    this.name = "OutOfJailError";
  }
}

/**
 * Compute the default sandbox root relative to this source/compiled file.
 * Works in both dev (src/lib/) and production (dist/lib/) because both sit
 * two directories below the waf-demo-app root.
 */
function defaultRoot(): string {
  return path.resolve(__dirname, "../../demo-files");
}

export function readWithinSandbox(name: string, root = defaultRoot()): string {
  const target = path.resolve(root, name);

  // The jail: target must be root itself or a descendant of root.
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new OutOfJailError(name);
  }

  // fs.readFileSync throws ENOENT if the file is missing — caller handles it.
  return fs.readFileSync(target, "utf-8");
}
