import { useState } from 'react';
import { usePortfolio } from '../hooks/useAnalytics';

interface Asset {
  asset_name: string;
  asset_symbol: string;
  contract_address: string | null;
  amount: string;
  usd_value: number;
  is_suspicious: boolean;
  suspicious_reason?: string;
}

const INITIAL_SHOW = 8;

function shortAddr(addr: string) { return addr.slice(0, 5) + '…' + addr.slice(-4); }
function fmtUsd(n: number) {
  if (n === 0) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Table header ──────────────────────────────────────────────────────────────
function TableHeader() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 150px 1fr 120px',
      padding: '0.45rem 0.9rem',
      background: 'rgba(240,165,0,0.05)',
      borderBottom: '1px solid var(--border)',
    }}>
      {['Asset', 'Contract', 'Amount', 'USD Value'].map(h => (
        <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.57rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          {h}
        </div>
      ))}
    </div>
  );
}

// ── Single asset row ──────────────────────────────────────────────────────────
function AssetRow({ asset, odd, suspicious = false }: { asset: Asset; odd: boolean; suspicious?: boolean }) {
  const isEth = asset.contract_address === null;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 150px 1fr 120px',
      alignItems: 'center', padding: '0.6rem 0.9rem',
      borderBottom: '1px solid rgba(240,165,0,0.05)',
      background: suspicious ? 'rgba(255,77,106,0.03)'
        : odd ? 'rgba(255,255,255,0.013)' : 'transparent',
    }}>
      {/* Asset name + symbol icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: suspicious ? 'rgba(255,77,106,0.15)'
            : isEth ? 'rgba(0,212,170,0.15)'
            : 'rgba(240,165,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700,
          color: suspicious ? 'var(--red)' : isEth ? 'var(--teal)' : 'var(--amber)',
        }}>
          {(asset.asset_symbol || '?').slice(0, 4)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500, color: suspicious ? '#b06060' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {asset.asset_name !== '—' ? asset.asset_name : asset.asset_symbol}
          </div>
          {suspicious && asset.suspicious_reason && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.57rem', color: 'rgba(255,77,106,0.65)', marginTop: 1 }}>
              {asset.suspicious_reason}
            </div>
          )}
        </div>
      </div>

      {/* Contract address */}
      <div>
        {asset.contract_address ? (
          <a
            href={`https://etherscan.io/token/${asset.contract_address}`}
            target="_blank" rel="noreferrer"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)', textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--mono)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-dim)')}
          >
            {shortAddr(asset.contract_address)} ↗
          </a>
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)' }}>—</span>
        )}
      </div>

      {/* Amount */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: suspicious ? 'rgba(255,77,106,0.6)' : 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>
        {asset.amount}{' '}
        <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{asset.asset_symbol}</span>
      </div>

      {/* USD value */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600,
        textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        color: suspicious ? 'var(--text-dim)' : asset.usd_value > 0 ? 'var(--teal)' : 'var(--text-dim)',
      }}>
        {fmtUsd(asset.usd_value)}
      </div>
    </div>
  );
}

// ── Expand button ─────────────────────────────────────────────────────────────
function ExpandBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '0.5rem',
        background: 'rgba(240,165,0,0.04)', border: 'none',
        borderTop: '1px solid rgba(240,165,0,0.08)',
        color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '0.63rem',
        letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.09)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.04)')}
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PortfolioSnapshot({ address }: { address: string }) {
  const { data, loading, error } = usePortfolio(address);
  const [showAllLegit, setShowAllLegit]     = useState(false);
  const [showSuspicious, setShowSuspicious] = useState(false);

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
      Fetching live balances…
    </div>
  );
  if (error) return (
    <div style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--red)', opacity: 0.8 }}>
      ⚠ {error}
    </div>
  );
  if (!data) return null;

  const snap = data as { assets: Asset[]; snapshot_date: string; total_usd: number; suspicious_count: number };
  const snapshotDate = new Date(snap.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // One row per contract — backend already sorted: ETH first, legit by USD desc, suspicious last
  const legitAssets = snap.assets.filter(a => !a.is_suspicious);
  const suspAssets  = snap.assets.filter(a => a.is_suspicious);

  const visibleLegit = showAllLegit ? legitAssets : legitAssets.slice(0, INITIAL_SHOW);
  const hiddenCount  = legitAssets.length - INITIAL_SHOW;

  return (
    <div>
      {/* Phishing warning */}
      {snap.suspicious_count > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '0.8rem 1rem', marginBottom: '1.25rem',
          background: 'rgba(255,77,106,0.07)', border: '1px solid rgba(255,77,106,0.28)', borderRadius: 3,
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--red)', marginBottom: '0.2rem' }}>
              Phishing / Dust Attack Detected
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.77rem', color: '#cc7070', lineHeight: 1.55 }}>
              This address holds <strong style={{ color: 'var(--red)' }}>{snap.suspicious_count} suspicious token{snap.suspicious_count > 1 ? 's' : ''}</strong> — unverified contracts impersonating stablecoins, tokens with URLs in their name, or classic dust-attack amounts.
              Do <strong>not</strong> interact with these contracts or visit any URLs they reference.
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Snapshot · {snapshotDate} · {legitAssets.length} asset{legitAssets.length !== 1 ? 's' : ''}
        </span>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--teal)' }}>
          {fmtUsd(snap.total_usd)}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', marginLeft: '0.5rem', fontWeight: 400 }}>
            est. total value
          </span>
        </div>
      </div>

      {/* Legit assets table — one row per contract */}
      <div style={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
        <TableHeader />
        {visibleLegit.map((asset, i) => (
          <AssetRow
            key={asset.contract_address ?? 'eth'}
            asset={asset}
            odd={i % 2 === 1}
          />
        ))}
        {!showAllLegit && hiddenCount > 0 && (
          <ExpandBtn label={`Show ${hiddenCount} more asset${hiddenCount !== 1 ? 's' : ''} ↓`} onClick={() => setShowAllLegit(true)} />
        )}
        {showAllLegit && hiddenCount > 0 && (
          <ExpandBtn label="Show less ↑" onClick={() => setShowAllLegit(false)} />
        )}
      </div>

      {/* Suspicious tokens — collapsed by default */}
      {suspAssets.length > 0 && (
        <div style={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,77,106,0.2)' }}>
          <button
            onClick={() => setShowSuspicious(v => !v)}
            style={{
              width: '100%', padding: '0.55rem 0.9rem',
              background: 'rgba(255,77,106,0.06)', border: 'none',
              display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--red)', flex: 1, textAlign: 'left' }}>
              Suspicious / Phishing Tokens ({suspAssets.length})
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(255,77,106,0.5)' }}>
              {showSuspicious ? '↑ hide' : '↓ show'}
            </span>
          </button>
          {showSuspicious && (
            <div style={{ borderTop: '1px solid rgba(255,77,106,0.15)' }}>
              <TableHeader />
              {suspAssets.map((asset, i) => (
                <AssetRow
                  key={asset.contract_address ?? i}
                  asset={asset}
                  odd={i % 2 === 1}
                  suspicious
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
