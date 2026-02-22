import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import * as queries from '../db/queries.js';
import { syncAddress } from '../etherscan/sync.js';
import { sseClients } from './sse.js';

const router = Router();

const SyncBodySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

router.post('/sync', validate(SyncBodySchema), async (req, res, next) => {
  try {
    const { address } = req.body as { address: string };
    const addr = address.toLowerCase();

    // Start sync in background
    syncAddress(addr, (progress) => {
      const clients = sseClients.get(addr);
      if (clients) {
        const data = JSON.stringify(progress);
        for (const client of clients) {
          client.write(`data: ${data}\n\n`);
        }
      }
    }).catch(err => {
      console.error('Background sync error:', err);
    });

    res.json({ message: 'Sync started', address: addr });
  } catch (err) {
    next(err);
  }
});

router.get('/:addr', (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    const address = queries.getAddress(addr);
    if (!address) {
      res.status(404).json({ error: 'Address not found' });
      return;
    }
    const syncStates = queries.getAllSyncStates(addr);
    const txCount = queries.getTransactionCount(addr);
    res.json({ address, syncStates, txCount });
  } catch (err) {
    next(err);
  }
});

router.get('/', (_req, res, next) => {
  try {
    const addresses = queries.listAddresses();
    res.json(addresses);
  } catch (err) {
    next(err);
  }
});

export default router;
