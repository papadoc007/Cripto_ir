import { useState, useRef } from 'react';

export default function AddressInput({ onSubmit }: { onSubmit: (address: string) => void }) {
  const [value, setValue]     = useState('');
  const [error, setError]     = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError('Invalid Ethereum address — must start with 0x followed by 40 hex characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const isValid = /^0x[a-fA-F0-9]{40}$/.test(value.trim());

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        {/* Input wrapper with amber border glow when focused */}
        <div style={{
          display: 'flex',
          border: `1px solid ${focused ? 'rgba(240,165,0,0.45)' : error ? 'rgba(255,77,106,0.4)' : 'rgba(240,165,0,0.15)'}`,
          borderRadius: 3,
          background: 'rgba(11,14,25,0.9)',
          boxShadow: focused ? '0 0 0 3px rgba(240,165,0,0.06)' : 'none',
          transition: 'all 0.2s',
          overflow: 'hidden',
        }}>
          {/* Prompt prefix */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.9rem',
            borderRight: `1px solid ${focused ? 'rgba(240,165,0,0.2)' : 'rgba(240,165,0,0.08)'}`,
            background: 'rgba(240,165,0,0.04)',
            flexShrink: 0,
            transition: 'border-color 0.2s',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: focused ? 'var(--amber)' : 'var(--text-dim)', transition: 'color 0.2s' }}>
              0x
            </span>
          </div>

          <input
            ref={inputRef}
            type="text"
            placeholder="Enter Ethereum address…"
            value={value}
            onChange={e => { setValue(e.target.value); if (error) setError(''); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              flex: 1,
              padding: '0.9rem 1rem',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--mono)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88rem',
              letterSpacing: '0.03em',
            }}
          />

          {/* Valid indicator */}
          {value.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', paddingRight: '0.75rem' }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: isValid ? 'var(--teal)' : 'var(--red)',
                transition: 'background 0.2s',
              }} />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0 1.5rem',
              background: loading ? 'rgba(240,165,0,0.4)' : 'var(--amber)',
              border: 'none',
              color: '#07090f',
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Loading…' : 'Investigate'}
          </button>
        </div>
      </form>

      {error && (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--red)',
          marginTop: '0.6rem',
          paddingLeft: '0.25rem',
          letterSpacing: '0.02em',
          opacity: 0.85,
        }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
