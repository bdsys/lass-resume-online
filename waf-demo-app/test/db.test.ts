/**
 * Tests for src/lib/db.ts
 *
 * The DB is in-memory (better-sqlite3 :memory:) seeded at boot with 5 fake users.
 * No real PII; dies with the process — no persistent state.
 */
import { describe, it, expect } from "vitest";
import { getDb, queryUsers } from "../src/lib/db";

describe("getDb()", () => {
  it("seeds exactly 5 users", () => {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    expect(row.n).toBe(5);
  });

  it("user rows have id, name, role fields", () => {
    const db = getDb();
    const row = db.prepare("SELECT * FROM users WHERE id = 1").get() as {
      id: number;
      name: string;
      role: string;
    };
    expect(row.id).toBe(1);
    expect(typeof row.name).toBe("string");
    expect(typeof row.role).toBe("string");
  });
});

describe("queryUsers() — string-concatenated SQL (intentionally vulnerable)", () => {
  it("returns one row for a valid id", () => {
    const rows = queryUsers("1");
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Alice Admin");
    expect(rows[0].role).toBe("admin");
  });

  it("returns all rows via OR 1=1 injection", () => {
    const rows = queryUsers("1' OR '1'='1");
    expect(rows.length).toBeGreaterThan(1);
  });

  it("returns empty array for unknown id", () => {
    const rows = queryUsers("99999");
    expect(rows).toHaveLength(0);
  });

  it("does not expose password or sensitive columns", () => {
    const rows = queryUsers("1");
    expect(rows[0]).not.toHaveProperty("password");
    expect(rows[0]).not.toHaveProperty("email");
  });
});
