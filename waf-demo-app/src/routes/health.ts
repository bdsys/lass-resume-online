import { Router } from "express";

const router = Router();

/** Fly.io health-check endpoint. Gate-exempt. */
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

export { router as healthRouter };
