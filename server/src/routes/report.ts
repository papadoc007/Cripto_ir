import { Router } from 'express';
import { generateReport } from '../report/generator.js';

const router = Router();

router.post('/:addr', async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    const format = (req.query.format as string) === 'md' ? 'md' : 'html';
    const { logoUrl, companyName, caseRef } = (req.body ?? {}) as {
      logoUrl?: string;
      companyName?: string;
      caseRef?: string;
    };

    const { content, contentType } = await generateReport(addr, {
      format,
      logoUrl: logoUrl || undefined,
      companyName: companyName || undefined,
      caseRef: caseRef || undefined,
    });

    res.setHeader('Content-Type', contentType);
    res.send(content);
  } catch (err) {
    next(err);
  }
});

export default router;
