import { Router } from 'express';
import { getCashflow } from '../analytics/cashflow.js';
import { getCounterparties } from '../analytics/counterparty.js';
import { getTimeline } from '../analytics/timeline.js';
import { getTokenExposure } from '../analytics/tokens.js';
import { getTransferGraph } from '../analytics/graph.js';
import { getHeuristics } from '../analytics/heuristics.js';
import { getFirstFunder } from '../analytics/firstFunder.js';
import { getFullTransactionList } from '../analytics/transactionList.js';
import { getPortfolio } from '../analytics/portfolio.js';
import { getEthUsdPrice } from '../utils/ethPrice.js';

const router = Router();

router.get('/:addr/cashflow', async (req, res, next) => {
  try {
    const ethPrice = await getEthUsdPrice();
    res.json(getCashflow(req.params.addr, ethPrice));
  } catch (err) { next(err); }
});

router.get('/:addr/counterparties', (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json(getCounterparties(req.params.addr, limit));
  } catch (err) { next(err); }
});

router.get('/:addr/timeline', (req, res, next) => {
  try {
    const granularity = (req.query.granularity as string) || 'month';
    res.json(getTimeline(req.params.addr, granularity as 'day' | 'week' | 'month'));
  } catch (err) { next(err); }
});

router.get('/:addr/tokens', (req, res, next) => {
  try {
    res.json(getTokenExposure(req.params.addr));
  } catch (err) { next(err); }
});

router.get('/:addr/graph', (req, res, next) => {
  try {
    const hops = parseInt(req.query.hops as string) || 1;
    const limitParam = req.query.limit as string;
    const limit = limitParam === 'all' ? 0 : (parseInt(limitParam) || 10);
    const sortBy = (req.query.sortBy as string) === 'volume' ? 'volume' : 'tx_count';
    const firstFunder = getFirstFunder(req.params.addr);
    res.json(getTransferGraph(req.params.addr, hops, limit, firstFunder?.funder_address, sortBy));
  } catch (err) { next(err); }
});

router.get('/:addr/heuristics', (req, res, next) => {
  try {
    res.json(getHeuristics(req.params.addr));
  } catch (err) { next(err); }
});

router.get('/:addr/portfolio', async (req, res, next) => {
  try {
    const ethPrice = await getEthUsdPrice();
    res.json(await getPortfolio(req.params.addr, ethPrice));
  } catch (err) { next(err); }
});

router.get('/:addr/first-funder', (req, res, next) => {
  try {
    const result = getFirstFunder(req.params.addr);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:addr/transactions', async (req, res, next) => {
  try {
    const ethPrice = await getEthUsdPrice();
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const direction = (req.query.direction as string) || 'all';
    const sort = (req.query.sort as string) === 'asc' ? 'asc' : 'desc';
    const result = getFullTransactionList(req.params.addr, ethPrice, {
      offset, limit, direction: direction as 'in' | 'out' | 'self' | 'all', sort,
    });
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
