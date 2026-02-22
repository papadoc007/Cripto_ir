import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';

function Nav() {
  const loc = useLocation();
  const onDash = loc.pathname.startsWith('/dashboard/') || loc.pathname.startsWith('/report/');
  const addr = onDash ? loc.pathname.split('/')[2] : null;

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 2rem',
      height: 52,
      background: 'rgba(7,9,15,0.92)',
      borderBottom: '1px solid rgba(240,165,0,0.1)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: '1.5rem',
    }}>
      {/* Logo */}
      <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="8.5" y="0.5" width="3" height="19" rx="1.5" fill="rgba(240,165,0,0.9)" />
          <rect x="0.5" y="8.5" width="19" height="3" rx="1.5" fill="rgba(240,165,0,0.9)" />
          <circle cx="10" cy="10" r="3.5" stroke="rgba(240,165,0,0.9)" strokeWidth="1.5" fill="none" />
        </svg>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 800,
          letterSpacing: '0.18em',
          color: 'var(--amber)',
          textTransform: 'uppercase' as const,
        }}>
          Cripto IR
        </span>
      </a>

      {/* Status dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div className="pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--teal)', letterSpacing: '0.12em' }}>
          LIVE
        </span>
      </div>

      {/* Breadcrumb when on dashboard */}
      {addr && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>›</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--mono)',
            background: 'rgba(240,165,0,0.06)',
            border: '1px solid rgba(240,165,0,0.12)',
            padding: '2px 8px',
            borderRadius: 2,
          }}>
            {addr.slice(0, 8)}…{addr.slice(-6)}
          </span>
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          ETH MAINNET
        </span>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh' }}>
        <Nav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard/:address" element={<DashboardPage />} />
          <Route path="/report/:address" element={<ReportPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
