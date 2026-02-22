import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AddressInput from '../components/AddressInput';
import { api } from '../api/client';

const styles = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '4rem 2rem',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#8888aa',
    marginBottom: '3rem',
  },
  recentTitle: {
    fontSize: '1.2rem',
    color: '#aaa',
    marginTop: '3rem',
    marginBottom: '1rem',
    textAlign: 'left' as const,
  },
  addressList: {
    listStyle: 'none',
    padding: 0,
  },
  addressItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: 'rgba(30, 30, 60, 0.6)',
    borderRadius: 8,
    marginBottom: '0.5rem',
    cursor: 'pointer',
    border: '1px solid rgba(100, 120, 255, 0.15)',
    transition: 'border-color 0.2s',
  },
  addressText: {
    fontFamily: 'monospace',
    color: '#c0c0ff',
    fontSize: '0.95rem',
  },
  date: {
    color: '#666',
    fontSize: '0.85rem',
  },
};

export default function HomePage() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<{ address: string; label: string | null; created_at: string }[]>([]);

  useEffect(() => {
    api.listAddresses().then(setRecent).catch(() => {});
  }, []);

  const handleSubmit = async (address: string) => {
    await api.syncAddress(address);
    navigate(`/dashboard/${address.toLowerCase()}`);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Blockchain Investigation</h1>
      <p style={styles.subtitle}>Enter an Ethereum address to analyze its transaction history</p>
      <AddressInput onSubmit={handleSubmit} />

      {recent.length > 0 && (
        <>
          <h2 style={styles.recentTitle}>Recent Investigations</h2>
          <ul style={styles.addressList}>
            {recent.map(addr => (
              <li
                key={addr.address}
                style={styles.addressItem}
                onClick={() => navigate(`/dashboard/${addr.address}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(100, 120, 255, 0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(100, 120, 255, 0.15)')}
              >
                <span style={styles.addressText}>{addr.label || addr.address}</span>
                <span style={styles.date}>{new Date(addr.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
