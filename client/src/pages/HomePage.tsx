import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AddressInput from '../components/AddressInput';
import { api } from '../api/client';

export default function HomePage() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<{ address: string; label: string | null; created_at: string }[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    api.listAddresses().then(setRecent).catch(() => {});
  }, []);

  const handleSubmit = async (address: string) => {
    await api.syncAddress(address);
    navigate(`/dashboard/${address.toLowerCase()}`);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow behind hero */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 300,
        background: 'radial-gradient(ellipse, rgba(240,165,0,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 620, position: 'relative' }}>

        {/* Classification label */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="fade-in">
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.25em',
            color: 'var(--amber)',
            opacity: 0.6,
            textTransform: 'uppercase',
            border: '1px solid rgba(240,165,0,0.2)',
            padding: '3px 12px',
            borderRadius: 2,
          }}>
            Blockchain Forensics Platform
          </span>
        </div>

        {/* Title */}
        <h1 className="fade-in delay-1" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.8rem, 6vw, 4.2rem)',
          fontWeight: 800,
          textAlign: 'center',
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          marginBottom: '1rem',
          color: 'var(--text)',
        }}>
          Investigate Any<br />
          <span style={{ color: 'var(--amber)' }}>Ethereum Address</span>
        </h1>

        <p className="fade-in delay-2" style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          color: 'var(--text-mid)',
          textAlign: 'center',
          marginBottom: '2.5rem',
          fontWeight: 300,
          lineHeight: 1.6,
        }}>
          Full transaction history · AI-powered analysis · Forensic reports
        </p>

        {/* Input */}
        <div className="fade-in delay-3">
          <AddressInput onSubmit={handleSubmit} />
        </div>

        {/* Feature chips */}
        <div className="fade-in delay-4" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.75rem' }}>
          {['Cashflow Analysis', 'Transfer Graph', 'AI Chat', 'Heuristic Flags', 'PDF Reports'].map(f => (
            <span key={f} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              color: 'var(--text-dim)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '3px 10px',
              borderRadius: 2,
              textTransform: 'uppercase',
            }}>{f}</span>
          ))}
        </div>

        {/* Recent investigations */}
        {recent.length > 0 && (
          <div className="fade-in delay-5" style={{ marginTop: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Recent Investigations
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {recent.map((addr, i) => (
                <li
                  key={addr.address}
                  onClick={() => navigate(`/dashboard/${addr.address}`)}
                  onMouseEnter={() => setHovered(addr.address)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0.9rem',
                    background: hovered === addr.address ? 'rgba(240,165,0,0.05)' : 'rgba(13,17,32,0.7)',
                    border: `1px solid ${hovered === addr.address ? 'rgba(240,165,0,0.25)' : 'rgba(240,165,0,0.08)'}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    animationDelay: `${0.3 + i * 0.05}s`,
                  }}
                  className="fade-in"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: hovered === addr.address ? 'var(--amber)' : 'var(--text-dim)', transition: 'background 0.18s' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: hovered === addr.address ? 'var(--mono)' : 'var(--text-mid)' }}>
                      {addr.label || `${addr.address.slice(0, 10)}…${addr.address.slice(-8)}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                      {new Date(addr.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span style={{ color: 'var(--amber)', opacity: hovered === addr.address ? 0.8 : 0, transition: 'opacity 0.18s', fontSize: '0.8rem' }}>→</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
