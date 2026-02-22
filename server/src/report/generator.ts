import { getCashflow } from '../analytics/cashflow.js';
import { getCounterparties } from '../analytics/counterparty.js';
import { getTimeline } from '../analytics/timeline.js';
import { getTokenExposure } from '../analytics/tokens.js';
import { getHeuristics } from '../analytics/heuristics.js';
import { getFirstFunder } from '../analytics/firstFunder.js';
import { getTransactionCount } from '../db/queries.js';
import { getEthUsdPrice } from '../utils/ethPrice.js';
import { generateNarrative } from './llmNarrative.js';
import { generateHtmlReport, markdownToHtml } from './html.js';
import { generateMarkdownReport } from './templates.js';
import { config } from '../config.js';

export interface ReportOptions {
  format?: 'html' | 'md';
  logoUrl?: string;
  companyName?: string;
  caseRef?: string;
}

export async function generateReport(
  address: string,
  opts: ReportOptions = {}
): Promise<{ content: string; contentType: string }> {
  const {
    format = 'html',
    logoUrl = config.reportLogoUrl ?? null,
    companyName = config.reportCompanyName ?? 'Cripto IR',
    caseRef = `CASE-${Date.now()}`,
  } = opts;

  const ethPrice = await getEthUsdPrice();
  const addr = address.toLowerCase();

  // Gather all analytics data
  const cashflow = getCashflow(addr, ethPrice);
  const counterparties = getCounterparties(addr, 50);
  const timeline = getTimeline(addr);
  const tokens = getTokenExposure(addr);
  const heuristics = getHeuristics(addr);
  const firstFunder = getFirstFunder(addr);
  const txCount = getTransactionCount(addr);

  if (format === 'md') {
    const md = generateMarkdownReport(addr, { cashflow, counterparties, timeline, tokens, heuristics, txCount });
    return { content: md, contentType: 'text/markdown' };
  }

  // Generate LLM narrative
  const narrative = await generateNarrative({
    address: addr,
    txCount,
    cashflow,
    counterparties,
    heuristics,
    firstFunder,
    ethPrice,
  });

  const html = generateHtmlReport({
    address: addr,
    generatedAt: new Date().toISOString(),
    caseRef,
    logoUrl,
    companyName,
    narrative,
    cashflow,
    counterparties,
    tokens,
    heuristics,
    firstFunder,
    txCount,
    ethPrice,
  });

  return { content: html, contentType: 'text/html' };
}
