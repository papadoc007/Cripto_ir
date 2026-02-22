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

function shortAddr(addr: string) {
  return addr.slice(0, 5) + '…' + addr.slice(-4);
}
function fmtUsd(n: number) {
  if (n === 0) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortfolioSnapshot({ address }: { address: string }) {
  const { data, loading, error } = usePortfolio(address);

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
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
  const legitAssets = snap.assets.filter(a => !a.is_suspicious);
  const suspAssets  = snap.assets.filter(a => a.is_suspicious);

  return (
    <div>
      {/* ── Phishing warning ── */}
      {snap.suspicious_count > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: 'rgba(255,77,106,0.07)',
          border: '1px solid rgba(255,77,106,0.3)',
          borderRadius: 3,
          marginBottom: '1.25rem',
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--red)', marginBottom: '0.25rem' }}>
              Phishing / Dust Attack Detected
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#cc7070', lineHeight: 1.5 }}>
              This address holds <strong style={{ color: 'var(--red)' }}>{snap.suspicious_count} suspicious token{snap.suspicious_count > 1 ? 's' : ''}</strong> —
              tokens with URLs or "CLAIM REWARDS" in their name are a known phishing technique.
              Do <strong>not</strong> interact with these contracts or visit any URLs they reference.
            </div>
          </div>
        </div>
      )}

      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Snapshot · {snapshotDate}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--teal)' }}>
          {fmtUsd(snap.total_usd)}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', marginLeft: '0.5rem', fontWeight: 400 }}>
            total value
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>

        {/* Thead */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 1fr 110px',
          gap: 0,
          background: 'rgba(240,165,0,0.05)',
          borderBottom: '1px solid var(--border)',
          padding: '0.5rem 0.9rem',
        }}>
          {['Asset', 'Contract', 'Amount', 'USD Value'].map(h => (
            <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Legit assets */}
        {legitAssets.map((asset, i) => (
          <AssetRow key={asset.contract_address ?? 'eth'} asset={asset} index={i} total={legitAssets.length} />
        ))}

        {/* Suspicious separator */}
        {suspAssets.length > 0 && (
          <div style={{
            padding: '0.4rem 0.9rem',
            background: 'rgba(255,77,106,0.05)',
            borderTop: '1px solid rgba(255,77,106,0.15)',
            borderBottom: '1px solid rgba(255,77,106,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--red)', opacity: 0.8 }}>
              Suspicious / Phishing Tokens ({suspAssets.length})
            </span>
          </div>
        )}

        {suspAssets.map((asset, i) => (
          <AssetRow key={asset.contract_address ?? `susp-${i}`} asset={asset} index={i} total={suspAssets.length} suspicious />
        ))}
      </div>
    </div>
  );
}

function AssetRow({ asset, index, total, suspicious = false }: { asset: Asset; index: number; total: number; suspicious?: boolean }) {
  const isLast = index === total - 1;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 120px 1fr 110px',
      gap: 0,
      padding: '0.62rem 0.9rem',
      borderBottom: isLast ? 'none' : '1px solid rgba(240,165,0,0.05)',
      background: suspicious ? 'rgba(255,77,106,0.03)' : index % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
      alignItems: 'center',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = suspicious ? 'rgba(255,77,106,0.07)' : 'rgba(240,165,0,0.04)')}
    onMouseLeave={e => (e.currentTarget.style.background = suspicious ? 'rgba(255,77,106,0.03)' : index % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent')}
    >
      {/* Asset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: suspicious
            ? 'rgba(255,77,106,0.15)'
            : asset.contract_address === null
              ? 'rgba(0,212,170,0.15)'
              : 'rgba(240,165,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 600,
          color: suspicious ? 'var(--red)' : asset.contract_address === null ? 'var(--teal)' : 'var(--amber)',
        }}>
          {(asset.asset_symbol || '?').slice(0, 3)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: suspicious ? '#cc7070' : 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {asset.asset_name}
          </div>
          {suspicious && asset.suspicious_reason && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--red)', opacity: 0.7, marginTop: 1 }}>
              {asset.suspicious_reason}
            </div>
          )}
        </div>
      </div>

      {/* Contract */}
      <div>
        {asset.contract_address ? (
          <a
            href={`https://etherscan.io/token/${asset.contract_address}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: suspicious ? 'rgba(255,77,106,0.6)' : 'var(--text-dim)', textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = suspicious ? 'var(--red)' : 'var(--mono)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = suspicious ? 'rgba(255,77,106,0.6)' : 'var(--text-dim)')}
          >
            {shortAddr(asset.contract_address)}
          </a>
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>—</span>
        )}
      </div>

      {/* Amount */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: suspicious ? 'rgba(255,77,106,0.7)' : 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>
        {asset.amount} <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>{asset.asset_symbol}</span>
      </div>

      {/* USD Value */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.82rem',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        color: suspicious ? 'var(--text-dim)' : asset.usd_value > 0 ? 'var(--teal)' : 'var(--text-dim)',
        textAlign: 'right',
      }}>
        {fmtUsd(asset.usd_value)}
      </div>
    </div>
  );
}
