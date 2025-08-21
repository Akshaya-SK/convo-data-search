// server/src/routes/plan.js
import { Router } from 'express';
import { buildPlan } from '../services/planner.js';
import crypto from 'crypto';

const router = Router();

// In-memory cache to dedupe identical requests within short TTL
const dedupeCache = new Map();
const DEDUPE_TTL_MS = 10 * 1000; // 10 seconds

function makeKey(schema, question) {
  // Build stable string (only column names and question matter for plan)
  const colNames = (schema?.columns || []).map(c => c.name).join('|');
  const raw = `${colNames}::${question || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// body: { schema: {columns:[{name,type}]}, question: string }
router.post('/', async (req, res) => {
  try {
    const { schema, question } = req.body;
    const key = makeKey(schema, question);

    // cleanup old entries
    const now = Date.now();
    for (const [k, v] of dedupeCache.entries()) {
      if (now - v.ts > DEDUPE_TTL_MS) dedupeCache.delete(k);
    }

    // If duplicate within TTL, return cached plan (fast)
    const cached = dedupeCache.get(key);
    if (cached) {
      console.debug('[plan] returning cached plan for key', key);
      return res.json({ plan: cached.plan, cached: true });
    }

    // Build plan (may call OpenAI or fallback)
    const plan = await buildPlan(schema, question);

    // Save to cache
    dedupeCache.set(key, { plan, ts: Date.now() });

    return res.json({ plan, cached: false });
  } catch (e) {
    console.error('[plan] failed', e);
    return res.status(500).json({ error: 'plan_failed' });
  }
});

export default router;
