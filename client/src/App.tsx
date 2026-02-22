import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #0f1635 100%)',
  } as React.CSSProperties,
  nav: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'rgba(15, 20, 50, 0.8)',
    borderBottom: '1px solid rgba(100, 120, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  } as React.CSSProperties,
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#6c63ff',
    textDecoration: 'none',
    letterSpacing: '0.05em',
  } as React.CSSProperties,
};

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.app}>
        <nav style={styles.nav}>
          <a href="/" style={styles.logo}>CRIPTO IR</a>
        </nav>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard/:address" element={<DashboardPage />} />
          <Route path="/report/:address" element={<ReportPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
