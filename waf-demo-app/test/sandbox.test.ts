/**
 * Tests for src/lib/sandbox.ts
 *
 * The sandbox allows reads within demo-files/ (including traversal to sibling files),
 * but blocks any path that escapes the sandbox root.
 */
import { describe, it, expect } from "vitest";
import path from "path";
import { readWithinSandbox, OutOfJailError } from "../src/lib/sandbox";

// Pass the actual demo-files root explicitly so tests are cwd-independent.
const ROOT = path.resolve(__dirname, "../demo-files");

describe("readWithinSandbox()", () => {
  it("reads a file directly in the sandbox root", () => {
    const content = readWithinSandbox("public.txt", ROOT);
    expect(content).toContain("WAF Demo");
  });

  it("reads a file in a subdirectory", () => {
    const content = readWithinSandbox("subdir/note.txt", ROOT);
    expect(content).toContain("intended");
  });

  it("allows traversal to the planted secret within sandbox root", () => {
    const content = readWithinSandbox("subdir/../secret-flag.txt", ROOT);
    expect(content).toContain("FLAG");
  });

  it("blocks traversal that escapes the sandbox root (jail)", () => {
    expect(() => readWithinSandbox("../../etc/passwd", ROOT)).toThrow(OutOfJailError);
  });

  it("blocks absolute paths outside root", () => {
    expect(() => readWithinSandbox("/etc/passwd", ROOT)).toThrow(OutOfJailError);
  });

  it("throws ENOENT for a missing file within the sandbox", () => {
    expect(() => readWithinSandbox("nonexistent.txt", ROOT)).toThrow(/ENOENT/);
  });
});
