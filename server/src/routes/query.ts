import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { createQueryPlan } from '../query/planner.js';
import { executePlan } from '../query/executor.js';
import { narrateResults } from '../query/narrator.js';

const router = Router();

const QueryBodySchema = z.object({
  question: z.string().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

router.post('/', validate(QueryBodySchema), async (req, res, next) => {
  try {
    const { question, address } = req.body as { question: string; address: string };
    const addr = address.toLowerCase();

    const plan = await createQueryPlan(question, addr);
    const results = executePlan(plan, addr);
    const narrative = await narrateResults(question, results);

    res.json({ plan, results, narrative });
  } catch (err) {
    next(err);
  }
});

export default router;
