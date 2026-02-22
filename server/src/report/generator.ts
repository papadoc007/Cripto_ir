import { getCashflow } from '../analytics/cashflow.js';
import { getCounterparties } from '../analytics/counterparty.js';
import { getTimeline } from '../analytics/timeline.js';
import { getTokenExposure } from '../analytics/tokens.js';
import { getHeuristics } from '../analytics/heuristics.js';
import { getTransactionCount } from '../db/queries.js';
import { generateMarkdownReport } from './templates.js';
import { markdownToHtml } from './html.js';

export function generateReport(address: string, format: 'md' | 'html' = 'html'): { content: string; contentType: string } {
  const cashflow = getCashflow(address);
  const counterparties = getCounterparties(address);
  const timeline = getTimeline(address);
  const tokens = getTokenExposure(address);
  const heuristics = getHeuristics(address);
  const txCount = getTransactionCount(address);

  const md = generateMarkdownReport(address, {
    cashflow,
    counterparties,
    timeline,
    tokens,
    heuristics,
    txCount,
  });

  if (format === 'md') {
    return { content: md, contentType: 'text/markdown' };
  }

  const html = markdownToHtml(md);
  return { content: html, contentType: 'text/html' };
}
