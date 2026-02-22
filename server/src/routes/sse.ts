import { Router } from 'express';
import type { Response } from 'express';

const router = Router();

export const sseClients = new Map<string, Set<Response>>();

router.get('/progress/:addr', (req, res) => {
  const addr = req.params.addr.toLowerCase();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ message: 'Connected' })}\n\n`);

  if (!sseClients.has(addr)) {
    sseClients.set(addr, new Set());
  }
  sseClients.get(addr)!.add(res);

  req.on('close', () => {
    sseClients.get(addr)?.delete(res);
    if (sseClients.get(addr)?.size === 0) {
      sseClients.delete(addr);
    }
  });
});

export default router;
