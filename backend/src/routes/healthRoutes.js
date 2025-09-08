import express from "express";
import { checkHealth } from "../services/healthService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const status = await checkHealth();
  res.json(status);
});

export default router;
