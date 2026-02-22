import { marked } from 'marked';
import type { ReportNarrative } from './llmNarrative.js';
import type { CashflowData, CounterpartyData, TokenExposure, HeuristicFlag } from '@cripto-ir/shared';
import type { FirstFunder } from '@cripto-ir/shared';
import { weiToEthNumber } from '../utils/ethPrice.js';

function fmt(n: number, decimals = 4): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}
function fmtUsd(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#7c3aed',
};
const RISK_BG: Record<string, string> = {
  LOW: '#f0fdf4',
  MEDIUM: '#fffbeb',
  HIGH: '#fef2f2',
  CRITICAL: '#f5f3ff',
};

export interface ReportData {
  address: string;
  generatedAt: string;
  caseRef: string;
  logoUrl: string | null;
  companyName: string;
  narrative: ReportNarrative;
  cashflow: CashflowData[];
  counterparties: CounterpartyData[];
  tokens: TokenExposure[];
  heuristics: HeuristicFlag[];
  firstFunder: FirstFunder | null;
  txCount: number;
  ethPrice: number;
}

export function generateHtmlReport(data: ReportData): string {
  const riskColor = RISK_COLORS[data.narrative.riskLevel] ?? '#6b7280';
  const riskBg = RISK_BG[data.narrative.riskLevel] ?? '#f9fafb';

  const totalInflowEth = data.cashflow.reduce((s, m) => s + m.inflow_eth, 0);
  const totalOutflowEth = data.cashflow.reduce((s, m) => s + m.outflow_eth, 0);
  const totalInflowUsd = data.cashflow.reduce((s, m) => s + m.inflow_usd, 0);
  const totalOutflowUsd = data.cashflow.reduce((s, m) => s + m.outflow_usd, 0);
  const activeMonths = data.cashflow.filter(m => m.tx_count_in + m.tx_count_out > 0).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Investigation Report – ${data.address.slice(0, 10)}...</title>
<style>
  :root {
    --primary: #1e3a5f;
    --accent: #2563eb;
    --text: #1f2937;
    --muted: #6b7280;
    --border: #e5e7eb;
    --bg: #f9fafb;
    --white: #ffffff;
    --risk: ${riskColor};
    --risk-bg: ${riskBg};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.6; }

  /* ── Cover / Header ── */
  .cover {
    background: linear-gradient(135deg, var(--primary) 0%, #0f2744 100%);
    color: white;
    padding: 48px 56px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    page-break-after: avoid;
  }
  .cover-left { flex: 1; }
  .cover-right { text-align: right; }
  .logo-area {
    margin-bottom: 32px;
  }
  .logo-area img {
    max-height: 56px;
    max-width: 200px;
    object-fit: contain;
  }
  .logo-placeholder {
    width: 160px;
    height: 48px;
    background: rgba(255,255,255,0.12);
    border: 2px dashed rgba(255,255,255,0.3);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,0.4);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .report-type {
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
    margin-bottom: 12px;
  }
  .cover h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }
  .cover-subtitle {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    font-family: monospace;
    word-break: break-all;
    max-width: 480px;
    margin-bottom: 24px;
  }
  .cover-meta { font-size: 12px; color: rgba(255,255,255,0.5); }
  .cover-meta span { display: block; margin-bottom: 4px; }
  .risk-badge {
    display: inline-block;
    padding: 6px 16px;
    background: var(--risk);
    color: white;
    border-radius: 20px;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-top: 16px;
  }

  /* ── Body ── */
  .body { max-width: 1100px; margin: 0 auto; padding: 40px 48px; }

  /* ── Stats Bar ── */
  .stats-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin: -28px 0 40px;
    position: relative;
    z-index: 1;
  }
  .stat-card {
    background: var(--white);
    border-radius: 10px;
    padding: 20px 24px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    border-top: 3px solid var(--accent);
  }
  .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .stat-value { font-size: 22px; font-weight: 700; color: var(--primary); }
  .stat-sub { font-size: 11px; color: var(--muted); margin-top: 4px; }

  /* ── Section ── */
  .section { margin-bottom: 40px; }
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--border);
  }
  .section-num {
    width: 28px;
    height: 28px;
    background: var(--accent);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .section h2 { font-size: 17px; font-weight: 700; color: var(--primary); }

  /* ── Narrative blocks ── */
  .narrative { background: var(--white); border-radius: 10px; padding: 24px 28px; border-left: 4px solid var(--accent); box-shadow: 0 1px 6px rgba(0,0,0,0.05); }
  .narrative p { margin-bottom: 12px; color: #374151; }
  .narrative p:last-child { margin-bottom: 0; }

  /* ── Risk box ── */
  .risk-box {
    background: var(--risk-bg);
    border: 1px solid var(--risk);
    border-radius: 10px;
    padding: 20px 24px;
    border-left: 4px solid var(--risk);
  }
  .risk-box p { color: #374151; margin-bottom: 8px; }
  .risk-box p:last-child { margin-bottom: 0; }

  /* ── Key findings ── */
  .findings-list { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .findings-list li {
    background: var(--white);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    font-size: 13px;
    color: #374151;
  }
  .findings-list li::before { content: '▸'; color: var(--accent); font-size: 14px; flex-shrink: 0; margin-top: 1px; }

  /* ── First funder ── */
  .funder-card {
    background: var(--white);
    border-radius: 10px;
    padding: 20px 24px;
    box-shadow: 0 1px 6px rgba(0,0,0,0.06);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
  }
  .funder-field label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 4px; }
  .funder-field .val { font-family: monospace; font-size: 13px; color: var(--primary); word-break: break-all; }
  .funder-field .val a { color: var(--accent); text-decoration: none; }
  .funder-field .val a:hover { text-decoration: underline; }
  .funder-tag { display: inline-block; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-bottom: 4px; }

  /* ── Tables ── */
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table thead th { background: var(--primary); color: white; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .data-table tbody td { padding: 9px 14px; border-bottom: 1px solid var(--border); }
  .data-table tbody tr:last-child td { border-bottom: none; }
  .data-table tbody tr:nth-child(even) { background: #f8fafc; }
  .data-table tbody tr:hover { background: #eff6ff; }
  .mono { font-family: monospace; font-size: 12px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .in { color: #15803d; font-weight: 600; }
  .out { color: #dc2626; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-purple { background: #f3e8ff; color: #6b21a8; }

  /* ── Flag cards ── */
  .flags-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .flag-card { background: var(--white); border-radius: 10px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border-left: 4px solid; }
  .flag-card.high { border-color: #ef4444; }
  .flag-card.medium { border-color: #f59e0b; }
  .flag-card.low { border-color: #22c55e; }
  .flag-title { font-weight: 700; font-size: 14px; color: var(--primary); margin-bottom: 6px; }
  .flag-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }

  /* ── Cashflow table colors ── */
  .cf-pos { color: #15803d; }
  .cf-neg { color: #dc2626; }

  /* ── Footer ── */
  .footer { margin-top: 56px; padding: 24px 48px; background: var(--primary); color: rgba(255,255,255,0.5); display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
  .footer strong { color: rgba(255,255,255,0.8); }

  /* ── Page breaks ── */
  @media print {
    body { background: white; }
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section { page-break-inside: avoid; }
    .stat-card { box-shadow: none; border: 1px solid var(--border); }
    .data-table thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- ══ COVER ══ -->
<div class="cover">
  <div class="cover-left">
    <div class="logo-area">
      ${data.logoUrl
      ? `<img src="${data.logoUrl}" alt="${data.companyName} logo" />`
      : `<div class="logo-placeholder">Your Logo Here</div>`}
    </div>
    <div class="report-type">Blockchain Forensics Report</div>
    <h1>Address Investigation</h1>
    <div class="cover-subtitle">${data.address}</div>
    <div class="risk-badge">Risk: ${data.narrative.riskLevel}</div>
  </div>
  <div class="cover-right">
    <div class="cover-meta">
      <span><strong style="color:rgba(255,255,255,0.8)">Prepared by</strong></span>
      <span>${data.companyName}</span>
      <br/>
      <span><strong style="color:rgba(255,255,255,0.8)">Case Reference</strong></span>
      <span>${data.caseRef}</span>
      <br/>
      <span><strong style="color:rgba(255,255,255,0.8)">Generated</strong></span>
      <span>${new Date(data.generatedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</span>
      <br/>
      <span><strong style="color:rgba(255,255,255,0.8)">Total Transactions</strong></span>
      <span>${data.txCount.toLocaleString()}</span>
    </div>
  </div>
</div>

<!-- ══ BODY ══ -->
<div class="body">

  <!-- Stats Bar -->
  <div class="stats-bar">
    <div class="stat-card">
      <div class="stat-label">Total Inflow</div>
      <div class="stat-value in">${fmt(totalInflowEth, 2)} ETH</div>
      <div class="stat-sub">${fmtUsd(totalInflowUsd)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Outflow</div>
      <div class="stat-value out">${fmt(totalOutflowEth, 2)} ETH</div>
      <div class="stat-sub">${fmtUsd(totalOutflowUsd)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Net Flow</div>
      <div class="stat-value" style="color:${totalInflowEth - totalOutflowEth >= 0 ? '#15803d' : '#dc2626'}">${fmt(totalInflowEth - totalOutflowEth, 2)} ETH</div>
      <div class="stat-sub">${fmtUsd(totalInflowUsd - totalOutflowUsd)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Period</div>
      <div class="stat-value">${activeMonths}</div>
      <div class="stat-sub">Active months</div>
    </div>
  </div>

  <!-- 1. Executive Summary -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">1</div>
      <h2>Executive Summary</h2>
    </div>
    <div class="narrative">
      ${data.narrative.executiveSummary.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('')}
    </div>
  </div>

  <!-- 2. Key Findings -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">2</div>
      <h2>Key Findings</h2>
    </div>
    <ul class="findings-list">
      ${data.narrative.keyFindings.map(f => `<li>${f}</li>`).join('')}
    </ul>
  </div>

  <!-- 3. First Funder -->
  ${data.firstFunder ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">3</div>
      <h2>Initial Funding Source</h2>
    </div>
    <div class="funder-card">
      <div class="funder-field">
        <label>Funder Address</label>
        <div class="funder-tag">FIRST FUNDER</div>
        <div class="val">
          <a href="https://etherscan.io/address/${data.firstFunder.funder_address}" target="_blank">
            ${data.firstFunder.funder_address}
          </a>
        </div>
      </div>
      <div class="funder-field">
        <label>Transaction Hash</label>
        <div class="val">
          <a href="https://etherscan.io/tx/${data.firstFunder.tx_hash}" target="_blank">
            ${data.firstFunder.tx_hash.slice(0, 20)}...${data.firstFunder.tx_hash.slice(-8)}
          </a>
        </div>
      </div>
      <div class="funder-field">
        <label>Amount / Date</label>
        <div class="val" style="font-size:16px;font-weight:700;color:#15803d;font-family:inherit">${fmt(data.firstFunder.value_eth, 4)} ETH</div>
        <div class="val" style="color:#6b7280;font-size:12px;font-family:inherit">${new Date(data.firstFunder.timestamp * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
        <div class="val" style="color:#9ca3af;font-size:11px;font-family:inherit">Block ${data.firstFunder.block_number.toLocaleString()}</div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- 4. Behavioral Analysis -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">${data.firstFunder ? '4' : '3'}</div>
      <h2>Behavioral Analysis</h2>
    </div>
    <div class="narrative">
      ${data.narrative.behavioralAnalysis.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('')}
    </div>
  </div>

  <!-- 5. Risk Assessment -->
  <div class="section">
    <div class="section-header">
      <div class="section-num">${data.firstFunder ? '5' : '4'}</div>
      <h2>Risk Assessment</h2>
    </div>
    <div class="risk-box">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <span class="badge badge-${data.narrative.riskLevel === 'LOW' ? 'green' : data.narrative.riskLevel === 'MEDIUM' ? 'yellow' : data.narrative.riskLevel === 'HIGH' ? 'red' : 'purple'}" style="font-size:13px;padding:4px 14px">
          ${data.narrative.riskLevel} RISK
        </span>
      </div>
      ${data.narrative.riskAssessment.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('')}
    </div>
  </div>

  <!-- 6. Suspicious Activity Flags -->
  ${data.heuristics.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">${data.firstFunder ? '6' : '5'}</div>
      <h2>Suspicious Activity Flags</h2>
    </div>
    <div class="flags-grid">
      ${data.heuristics.map(flag => `
        <div class="flag-card ${flag.severity}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span class="badge badge-${flag.severity === 'high' ? 'red' : flag.severity === 'medium' ? 'yellow' : 'green'}">${flag.severity.toUpperCase()}</span>
          </div>
          <div class="flag-title">${flag.title}</div>
          <div class="flag-desc">${flag.description}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- 7. Monthly Cashflow -->
  ${data.cashflow.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">${data.firstFunder ? '7' : '6'}</div>
      <h2>Monthly Cashflow</h2>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Month</th>
          <th class="num">Inflow ETH</th>
          <th class="num">Outflow ETH</th>
          <th class="num">Net ETH</th>
          <th class="num">Inflow USD</th>
          <th class="num">Outflow USD</th>
          <th class="num">Volume USD</th>
          <th class="num">Txns In</th>
          <th class="num">Txns Out</th>
        </tr>
      </thead>
      <tbody>
        ${data.cashflow.map(m => `
          <tr>
            <td class="mono">${m.month}</td>
            <td class="num in">${fmt(m.inflow_eth)}</td>
            <td class="num out">${fmt(m.outflow_eth)}</td>
            <td class="num ${m.netflow_eth >= 0 ? 'cf-pos' : 'cf-neg'}">${fmt(m.netflow_eth)}</td>
            <td class="num">${fmtUsd(m.inflow_usd)}</td>
            <td class="num">${fmtUsd(m.outflow_usd)}</td>
            <td class="num">${fmtUsd(m.total_volume_usd)}</td>
            <td class="num">${m.tx_count_in}</td>
            <td class="num">${m.tx_count_out}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- 8. Top Counterparties -->
  ${data.counterparties.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">${data.firstFunder ? '8' : '7'}</div>
      <h2>Top Counterparties</h2>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Address</th>
          <th class="num">Transactions</th>
          <th class="num">Inflow ETH</th>
          <th class="num">Outflow ETH</th>
          <th>First Seen</th>
          <th>Last Seen</th>
        </tr>
      </thead>
      <tbody>
        ${data.counterparties.slice(0, 25).map((cp, i) => `
          <tr>
            <td style="color:#9ca3af;font-size:12px">${i + 1}</td>
            <td class="mono">
              <a href="https://etherscan.io/address/${cp.address}" target="_blank" style="color:#2563eb;text-decoration:none">
                ${cp.address.slice(0, 12)}...${cp.address.slice(-6)}
              </a>
            </td>
            <td class="num">${cp.tx_count}</td>
            <td class="num in">${fmt(weiToEthNumber(cp.total_in))}</td>
            <td class="num out">${fmt(weiToEthNumber(cp.total_out))}</td>
            <td style="font-size:12px;color:#6b7280">${new Date(cp.first_seen * 1000).toLocaleDateString()}</td>
            <td style="font-size:12px;color:#6b7280">${new Date(cp.last_seen * 1000).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- 9. Token Exposure -->
  ${data.tokens.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">${data.firstFunder ? '9' : '8'}</div>
      <h2>Token Exposure</h2>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Token Name</th>
          <th>Symbol</th>
          <th>Contract</th>
          <th class="num">Transfers</th>
        </tr>
      </thead>
      <tbody>
        ${data.tokens.slice(0, 20).map(t => `
          <tr>
            <td>${t.token_name || '—'}</td>
            <td><span class="badge badge-green">${t.token_symbol}</span></td>
            <td class="mono" style="font-size:11px;color:#6b7280">
              <a href="https://etherscan.io/token/${t.contract_address}" target="_blank" style="color:#2563eb;text-decoration:none">
                ${t.contract_address.slice(0, 10)}...${t.contract_address.slice(-6)}
              </a>
            </td>
            <td class="num">${t.transfer_count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

</div>

<!-- ══ FOOTER ══ -->
<div class="footer">
  <div>
    <strong>${data.companyName}</strong> &nbsp;·&nbsp; Blockchain Forensics Report
    &nbsp;·&nbsp; Case: ${data.caseRef}
  </div>
  <div>
    Confidential &nbsp;·&nbsp; Generated ${new Date(data.generatedAt).toLocaleDateString()}
    &nbsp;·&nbsp; ETH price reference: $${data.ethPrice.toLocaleString()}
  </div>
</div>

</body>
</html>`;
}

// Keep backward-compatible simple markdown->html for markdown export
export function markdownToHtml(md: string): string {
  const body = marked.parse(md, { async: false }) as string;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { font-family: sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 2rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #ddd; }
    th { background: #1e3a5f; color: white; }
    tr:nth-child(even) { background: #f5f5f5; }
    code { background: #eee; padding: 0.2rem 0.4rem; border-radius: 3px; }
  </style></head><body>${body}</body></html>`;
}
