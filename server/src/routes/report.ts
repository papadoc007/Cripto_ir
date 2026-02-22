import { Router } from 'express';
import { generateReport } from '../report/generator.js';

const router = Router();

router.post('/:addr', (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    const format = (req.query.format as string) === 'md' ? 'md' : 'html';
    const { content, contentType } = generateReport(addr, format);
    res.setHeader('Content-Type', contentType);
    res.send(content);
  } catch (err) {
    next(err);
  }
});

export default router;
