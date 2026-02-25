import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { ChainAbuseResult, ChainAbuseReportSummary } from '@cripto-ir/shared';

const CATEGORY_COLORS: Record<string, string> = {
  PHISHING: '#ef4444',
  RUG_PULL: '#f97316',
  SCAM: '#eab308',
  HACK: '#a855f7',
  FRAUD: '#ec4899',
  RANSOMWARE: '#ef4444',
  DARKNET: '#6b7280',
};

function CategoryChip({ cat }: { cat: string }) {
  const color = CATEGORY_COLORS[cat] ?? '#6b7280';
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.45rem',
      borderRadius: 3,
      border: `1px solid ${color}55`,
      background: `${color}18`,
      color,
      fontFamily: 'var(--font-mono)',
      fontSize: '0.6rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      {cat.replace(/_/g, ' ')}
    </span>
  );
}

function truncateAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function ReportBadge({ summary }: { summary: ChainAbuseReportSummary }) {
  if (summary.report_count === 0) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.65rem',
        borderRadius: 3,
        border: '1px solid #10b98155',
        background: '#10b98112',
        color: '#10b981',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        letterSpacing: '0.08em',
      }}>
        ✓ NOT REPORTED
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.65rem',
      borderRadius: 3,
      border: '1px solid #ef444455',
      background: '#ef444412',
      color: '#ef4444',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.65rem',
      letterSpacing: '0.08em',
    }}>
      ⚠ {summary.report_count} REPORT{summary.report_count !== 1 ? 'S' : ''}
    </span>
  );
}

export default function ChainAbusePanel({ address }: { address: string }) {
  const [data, setData] = useState<ChainAbuseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingTop10, setCheckingTop10] = useState(false);
  const [showTop10Confirm, setShowTop10Confirm] = useState(false);

  async function load(withCounterparties = false) {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getChainAbuse(address, withCounterparties);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(false); }, [address]);

  async function handleRefresh() {
    await api.clearChainAbuseCache(address);
    await load(false);
  }

  async function handleCheckTop10() {
    setShowTop10Confirm(false);
    setCheckingTop10(true);
    try {
      const result = await api.getChainAbuse(address, true);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setCheckingTop10(false);
    }
  }

  const dimStyle: React.CSSProperties = { color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' };

  if (loading) {
    return (
      <div style={{ ...dimStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />
        QUERYING CHAINABUSE…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...dimStyle, color: '#ef4444' }}>
        ERROR: {error}
      </div>
    );
  }

  if (!data) return null;

  if ((data as unknown as { api_key_missing: boolean }).api_key_missing) {
    return (
      <div style={{
        padding: '0.75rem 1rem',
        border: '1px solid rgba(240,165,0,0.2)',
        borderRadius: 3,
        background: 'rgba(240,165,0,0.04)',
      }}>
        <span style={{ ...dimStyle, color: 'var(--amber)' }}>
          ⚠ CHAINABUSE_API_KEY not configured — add it to .env to enable scam lookups
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Main address result */}
      <div style={{
        padding: '0.85rem 1rem',
        border: `1px solid ${data.main.report_count > 0 ? '#ef444430' : '#10b98120'}`,
        borderRadius: 3,
        background: data.main.report_count > 0 ? '#ef44440a' : '#10b9810a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
            MAIN ADDRESS
          </span>
          <ReportBadge summary={data.main} />
          {data.main.top_categories.map(cat => <CategoryChip key={cat} cat={cat} />)}
          <a
            href={data.main.chainabuse_url}
            target="_blank"
            rel="noreferrer"
            style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', textDecoration: 'none', letterSpacing: '0.08em' }}
          >
            VIEW ↗
          </a>
        </div>
        {data.main.latest_report_date && (
          <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
            Latest report: {new Date(data.main.latest_report_date).toLocaleDateString()}
          </div>
        )}
        {data.main.from_cache && data.main.cached_at && (
          <div style={{ marginTop: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', opacity: 0.6 }}>
            cached {new Date(data.main.cached_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Counterparty results */}
      {data.counterparties.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Reported Counterparties
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Address', 'Reports', 'Categories', ''].map(h => (
                  <th key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textAlign: 'left', padding: '0.3rem 0.5rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.counterparties.map(cp => (
                <tr key={cp.address} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--mono)', padding: '0.4rem 0.5rem' }}>
                    {truncateAddr(cp.address)}
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem' }}>
                    <ReportBadge summary={cp} />
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {cp.top_categories.map(cat => <CategoryChip key={cat} cat={cat} />)}
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem' }}>
                    <a href={cp.chainabuse_url} target="_blank" rel="noreferrer"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', textDecoration: 'none', letterSpacing: '0.08em' }}>
                      VIEW ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            color: 'var(--text-dim)',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'transparent',
            padding: '0.35rem 0.75rem',
            borderRadius: 3,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          ↺ Refresh
        </button>

        {!showTop10Confirm ? (
          <button
            onClick={() => setShowTop10Confirm(true)}
            disabled={checkingTop10}
            title="Uses up to 10 ChainAbuse API calls (free tier limit: 10/month)"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              color: 'var(--text-dim)',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'transparent',
              padding: '0.35rem 0.75rem',
              borderRadius: 3,
              cursor: 'pointer',
              textTransform: 'uppercase',
              opacity: 0.7,
            }}
          >
            {checkingTop10 ? 'Checking…' : 'Check Top 10 Counterparties'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#eab308', letterSpacing: '0.06em' }}>
              ⚠ Uses up to 10 API calls (10/month free limit)
            </span>
            <button
              onClick={handleCheckTop10}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                color: 'var(--bg)',
                background: '#eab308',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: 3,
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Confirm
            </button>
            <button
              onClick={() => setShowTop10Confirm(false)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                color: 'var(--text-dim)',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'transparent',
                padding: '0.35rem 0.6rem',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
