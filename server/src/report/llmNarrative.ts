import { llmChat } from '../utils/llm.js';
import { weiToEthNumber } from '../utils/ethPrice.js';
import type { CashflowData, HeuristicFlag, CounterpartyData } from '@cripto-ir/shared';
import type { FirstFunder } from '@cripto-ir/shared';

interface NarrativeInput {
  address: string;
  txCount: number;
  cashflow: CashflowData[];
  counterparties: CounterpartyData[];
  heuristics: HeuristicFlag[];
  firstFunder: FirstFunder | null;
  ethPrice: number;
}

export interface ReportNarrative {
  executiveSummary: string;
  behavioralAnalysis: string;
  riskAssessment: string;
  keyFindings: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export async function generateNarrative(input: NarrativeInput): Promise<ReportNarrative> {
  const totalInflow = input.cashflow.reduce((s, m) => s + BigInt(m.inflow), 0n);
  const totalOutflow = input.cashflow.reduce((s, m) => s + BigInt(m.outflow), 0n);
  const totalInflowEth = weiToEthNumber(totalInflow.toString());
  const totalOutflowEth = weiToEthNumber(totalOutflow.toString());
  const totalInflowUsd = input.cashflow.reduce((s, m) => s + m.inflow_usd, 0);
  const totalOutflowUsd = input.cashflow.reduce((s, m) => s + m.outflow_usd, 0);
  const activeMonths = input.cashflow.filter(m => m.tx_count_in + m.tx_count_out > 0).length;
  const highFlags = input.heuristics.filter(h => h.severity === 'high').length;
  const medFlags = input.heuristics.filter(h => h.severity === 'medium').length;

  const contextData = {
    address: input.address,
    totalTransactions: input.txCount,
    activeMonths,
    totalInflow: `${totalInflowEth.toFixed(4)} ETH (~$${totalInflowUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })})`,
    totalOutflow: `${totalOutflowEth.toFixed(4)} ETH (~$${totalOutflowUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })})`,
    topCounterparties: input.counterparties.slice(0, 5).map(c => ({
      address: c.address,
      txCount: c.tx_count,
      totalIn: `${weiToEthNumber(c.total_in).toFixed(4)} ETH`,
      totalOut: `${weiToEthNumber(c.total_out).toFixed(4)} ETH`,
    })),
    heuristicFlags: input.heuristics.map(h => ({ type: h.type, severity: h.severity, title: h.title })),
    firstFunder: input.firstFunder ? {
      address: input.firstFunder.funder_address,
      timestamp: new Date(input.firstFunder.timestamp * 1000).toISOString(),
      amount: `${input.firstFunder.value_eth.toFixed(4)} ETH`,
    } : null,
  };

  const systemPrompt = `You are a senior blockchain forensics investigator writing a professional investigation report.
Your writing is factual, precise, and professional — suitable for legal or law-enforcement audiences.
Always ground your analysis in the provided data. Do not invent facts.
Respond with valid JSON only.`;

  const userPrompt = `Based on the following blockchain analytics data, generate a professional investigation narrative.

DATA:
${JSON.stringify(contextData, null, 2)}

Respond with a JSON object with exactly these fields:
{
  "executiveSummary": "2-3 paragraph professional summary of the address activity",
  "behavioralAnalysis": "2-3 paragraph detailed behavioral analysis of transaction patterns, counterparty relationships, and financial flows",
  "riskAssessment": "1-2 paragraph risk assessment explaining the risk level and reasoning",
  "keyFindings": ["array of 4-7 concise bullet-point findings, each starting with a strong verb"],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`;

  try {
    const response = await llmChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      jsonMode: true,
    });

    let json = response.trim();
    const match = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) json = match[1].trim();

    return JSON.parse(json) as ReportNarrative;
  } catch {
    // Fallback narrative
    const riskLevel = highFlags >= 2 ? 'HIGH' : highFlags >= 1 || medFlags >= 2 ? 'MEDIUM' : 'LOW';
    return {
      executiveSummary: `This report provides an analysis of Ethereum address ${input.address}. The address has conducted ${input.txCount.toLocaleString()} transactions over ${activeMonths} active months, with total inflows of ${totalInflowEth.toFixed(4)} ETH and outflows of ${totalOutflowEth.toFixed(4)} ETH.`,
      behavioralAnalysis: `The address demonstrates ${activeMonths > 12 ? 'sustained' : 'limited'} on-chain activity. ${input.heuristics.length > 0 ? `${input.heuristics.length} behavioral patterns were detected during analysis.` : 'No significant behavioral anomalies were detected.'}`,
      riskAssessment: `Based on the available data, this address presents a ${riskLevel} risk profile. ${highFlags > 0 ? `${highFlags} high-severity flags were identified requiring further investigation.` : 'No critical flags were detected.'}`,
      keyFindings: [
        `Processed ${input.txCount.toLocaleString()} total transactions`,
        `Active across ${activeMonths} months`,
        `Total inflow: ${totalInflowEth.toFixed(4)} ETH`,
        `Total outflow: ${totalOutflowEth.toFixed(4)} ETH`,
        `${input.counterparties.length} unique counterparties identified`,
      ],
      riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    };
  }
}
