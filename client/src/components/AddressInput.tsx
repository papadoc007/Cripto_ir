import { useState } from 'react';

const styles = {
  form: {
    display: 'flex',
    gap: '0.75rem',
    maxWidth: 600,
    margin: '0 auto',
  },
  input: {
    flex: 1,
    padding: '0.85rem 1.2rem',
    borderRadius: 10,
    border: '1px solid rgba(100, 120, 255, 0.3)',
    background: 'rgba(20, 20, 50, 0.8)',
    color: '#e0e0ff',
    fontSize: '1rem',
    fontFamily: 'monospace',
    outline: 'none',
  },
  button: {
    padding: '0.85rem 2rem',
    borderRadius: 10,
    border: 'none',
    background: '#6c63ff',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '0.85rem',
    marginTop: '0.5rem',
  },
};

export default function AddressInput({ onSubmit }: { onSubmit: (address: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="0x..."
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <button type="submit" style={styles.button}>Investigate</button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}
