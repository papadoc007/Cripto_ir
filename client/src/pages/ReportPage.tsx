import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

const styles = {
  container: {
    maxWidth: 1000,
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  backLink: {
    color: '#6c63ff',
    textDecoration: 'none',
    fontSize: '0.95rem',
  },
  buttons: {
    display: 'flex',
    gap: '0.75rem',
  },
  btn: {
    padding: '0.5rem 1.5rem',
    borderRadius: 8,
    border: '1px solid rgba(100, 120, 255, 0.3)',
    background: 'rgba(30, 30, 60, 0.6)',
    color: '#c0c0ff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  btnPrimary: {
    background: '#6c63ff',
    color: '#fff',
    border: 'none',
  },
  preview: {
    background: '#fff',
    borderRadius: 12,
    padding: '2rem',
    minHeight: 400,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '3rem',
    color: '#888',
  },
};

export default function ReportPage() {
  const { address } = useParams<{ address: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!address) return <div>No address</div>;

  const generate = async (format: 'html' | 'md') => {
    setLoading(true);
    try {
      const content = await api.generateReport(address, format);
      if (format === 'html') {
        setHtml(content);
      } else {
        // Download markdown
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${address.slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadHtml = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${address.slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to={`/dashboard/${address}`} style={styles.backLink}>Back to Dashboard</Link>
        <div style={styles.buttons}>
          <button style={styles.btn} onClick={() => generate('md')} disabled={loading}>
            Export Markdown
          </button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => generate('html')} disabled={loading}>
            {loading ? 'Generating...' : 'Generate HTML Report'}
          </button>
          {html && (
            <button style={styles.btn} onClick={downloadHtml}>
              Download HTML
            </button>
          )}
        </div>
      </div>

      {loading && <div style={styles.loading}>Generating report...</div>}

      {html && (
        <div style={styles.preview}>
          <iframe
            srcDoc={html}
            style={{ width: '100%', minHeight: 600, border: 'none', borderRadius: 8 }}
            title="Report Preview"
          />
        </div>
      )}
    </div>
  );
}
