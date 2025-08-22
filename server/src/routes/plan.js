// server/src/routes/plan.js
import { Router } from "express";
import { buildPlan } from "../services/planner.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { schema, numericColumns, question } = req.body;
    console.debug("[plan] incoming:", { question, numericColumns, schemaCols: schema?.columns?.map(c => c.name) });

    if (!schema || !question) {
      return res.status(400).json({ error: "Missing schema or question" });
    }

    const plan = await buildPlan(schema, question, numericColumns || []);

    console.debug("[plan] returning plan:", plan);
    return res.json({ plan });
  } catch (e) {
    console.error("[plan] failed", e);
    return res.status(500).json({ error: "plan_failed" });
  }
});

export default router;
