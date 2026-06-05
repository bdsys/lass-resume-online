import { Router } from "express";
import { queryUsers } from "../lib/db";

const router = Router();

/**
 * SQL injection endpoint.
 *
 * INTENTIONAL VULNERABILITY: id is concatenated into the SQL string in queryUsers().
 * Payload: ?id=1' OR '1'='1  → dumps all rows from the fake users table.
 */
router.get("/api/users", (req, res) => {
  const id = (req.query.id as string) ?? "";
  try {
    const rows = queryUsers(id);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export { router as sqliRouter };
