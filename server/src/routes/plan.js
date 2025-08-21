// server/src/routes/plan.js
import { Router } from 'express';
import { buildPlan } from '../services/planner.js';
const router = Router();

// body: { schema: {columns:[{name,type}]}, question: string }
router.post('/', async (req, res) => {
  try {
    const { schema, question } = req.body;
    const plan = await buildPlan(schema, question);
    return res.json({ plan });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'plan_failed' });
  }
});

export default router;
