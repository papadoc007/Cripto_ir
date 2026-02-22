import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';

const s = {
  page: {
    minHeight: '100vh',
    background: '#0a0a1a',
    color: '#e0e0ff',
    fontFamily: 'Inter, sans-serif',
    padding: '2rem',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  backLink: {
    color: '#6c63ff',
    textDecoration: 'none',
    fontSize: '0.95rem',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#c0c0ff',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '1.5rem',
    alignItems: 'start',
  },
  sidebar: {
    background: 'rgba(20,20,50,0.8)',
    border: '1px solid rgba(100,120,255,0.2)',
    borderRadius: 12,
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  sidebarTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#8080c0',
    marginBottom: '0.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.8rem',
    color: '#9090c0',
    fontWeight: 600,
  },
  input: {
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(100,120,255,0.25)',
    borderRadius: 7,
    color: '#e0e0ff',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  logoPreview: {
    width: '100%',
    height: 80,
    objectFit: 'contain' as const,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 7,
    padding: 8,
    marginTop: 4,
  },
  logoPlaceholder: {
    width: '100%',
    height: 80,
    background: 'rgba(255,255,255,0.04)',
    border: '2px dashed rgba(100,120,255,0.3)',
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6060a0',
    fontSize: '0.8rem',
    marginTop: 4,
    cursor: 'pointer',
  },
  uploadBtn: {
    padding: '0.4rem 0.75rem',
    background: 'rgba(108,99,255,0.15)',
    border: '1px solid rgba(108,99,255,0.4)',
    borderRadius: 7,
    color: '#a0a0ff',
    cursor: 'pointer',
    fontSize: '0.8rem',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  divider: {
    borderTop: '1px solid rgba(100,120,255,0.15)',
    margin: '0.25rem 0',
  },
  btnRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  btn: {
    padding: '0.6rem 1rem',
    borderRadius: 8,
    border: '1px solid rgba(100,120,255,0.35)',
    background: 'rgba(30,30,60,0.7)',
    color: '#c0c0ff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    width: '100%',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #6c63ff, #5a52e0)',
    color: '#fff',
    border: 'none',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  previewPane: {
    background: 'rgba(20,20,50,0.5)',
    border: '1px solid rgba(100,120,255,0.2)',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 600,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 500,
    gap: '1rem',
    color: '#6060a0',
  },
  emptyIcon: {
    fontSize: '3rem',
    opacity: 0.4,
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  emptyHint: {
    fontSize: '0.85rem',
    opacity: 0.7,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 500,
    gap: '1.5rem',
    color: '#9090c0',
  },
  spinner: {
    width: 48,
    height: 48,
    border: '3px solid rgba(108,99,255,0.2)',
    borderTop: '3px solid #6c63ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#c0c0ff',
  },
  loadingHint: {
    fontSize: '0.85rem',
    opacity: 0.7,
    textAlign: 'center' as const,
    maxWidth: 300,
  },
  progressSteps: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
    marginTop: '0.5rem',
  },
  step: {
    fontSize: '0.8rem',
    color: '#6060a0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  stepActive: {
    color: '#a0a0ff',
  },
  stepDone: {
    color: '#60c060',
  },
};

const STEPS = [
  'Fetching transaction data',
  'Computing analytics',
  'Generating AI narrative',
  'Assembling report',
];

export default function ReportPage() {
  const { address } = useParams<{ address: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [caseRef, setCaseRef] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!address) return <div>No address</div>;

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLogoUrl(val);
    setLogoPreview(val || null);
  };

  const clearLogo = () => {
    setLogoUrl('');
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generate = async (format: 'html' | 'md') => {
    setLoading(true);
    setLoadingStep(0);
    try {
      // Simulate step progression for UX
      const stepTimer = setInterval(() => {
        setLoadingStep(prev => Math.min(prev + 1, STEPS.length - 1));
      }, 2500);

      const content = await api.generateReport(address, format, {
        logoUrl: logoUrl || undefined,
        companyName: companyName || undefined,
        caseRef: caseRef || undefined,
      });

      clearInterval(stepTimer);
      setLoadingStep(STEPS.length);

      if (format === 'html') {
        setHtml(content);
      } else {
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

  const printReport = () => {
    const iframe = document.querySelector('iframe[title="Report Preview"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #5050a0; }
        input:focus { border-color: rgba(108,99,255,0.6) !important; }
      `}</style>

      <div style={s.container}>
        <div style={s.header}>
          <Link to={`/dashboard/${address}`} style={s.backLink}>← Back to Dashboard</Link>
          <div style={s.title}>Investigation Report</div>
          <div style={{ color: '#6060a0', fontSize: '0.85rem', fontFamily: 'monospace' }}>
            {address.slice(0, 10)}…{address.slice(-6)}
          </div>
        </div>

        <div style={s.layout}>
          {/* Sidebar */}
          <div style={s.sidebar}>
            <div>
              <div style={s.sidebarTitle}>Report Branding</div>
            </div>

            {/* Logo upload */}
            <div style={s.field}>
              <div style={s.label}>Company Logo</div>
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo preview" style={s.logoPreview} />
                  <button style={s.uploadBtn} onClick={clearLogo}>Remove logo</button>
                </>
              ) : (
                <div style={s.logoPlaceholder} onClick={() => fileInputRef.current?.click()}>
                  + Upload logo
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoFile}
              />
              <input
                style={s.input}
                placeholder="Or paste image URL…"
                value={logoUrl.startsWith('data:') ? '' : logoUrl}
                onChange={handleLogoUrlChange}
              />
            </div>

            <div style={s.divider} />

            {/* Company name */}
            <div style={s.field}>
              <div style={s.label}>Company Name</div>
              <input
                style={s.input}
                placeholder="Acme Investigations"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>

            {/* Case reference */}
            <div style={s.field}>
              <div style={s.label}>Case Reference</div>
              <input
                style={s.input}
                placeholder={`CASE-${Date.now().toString().slice(-6)}`}
                value={caseRef}
                onChange={e => setCaseRef(e.target.value)}
              />
            </div>

            <div style={s.divider} />

            {/* Actions */}
            <div style={s.btnRow}>
              <button
                style={{
                  ...s.btn,
                  ...s.btnPrimary,
                  ...(loading ? s.btnDisabled : {}),
                }}
                onClick={() => generate('html')}
                disabled={loading}
              >
                {loading ? 'Generating…' : 'Generate HTML Report'}
              </button>

              <button
                style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
                onClick={() => generate('md')}
                disabled={loading}
              >
                Export Markdown
              </button>

              {html && (
                <>
                  <button style={s.btn} onClick={downloadHtml}>
                    Download HTML
                  </button>
                  <button style={s.btn} onClick={printReport}>
                    Print / Save PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview pane */}
          <div style={s.previewPane}>
            {loading ? (
              <div style={s.loadingState}>
                <div style={s.spinner} />
                <div style={s.loadingText}>Generating Report</div>
                <div style={s.loadingHint}>
                  The AI is analyzing transaction patterns and writing the narrative. This takes about 10–20 seconds.
                </div>
                <div style={s.progressSteps}>
                  {STEPS.map((step, i) => (
                    <div
                      key={i}
                      style={{
                        ...s.step,
                        ...(i < loadingStep ? s.stepDone : {}),
                        ...(i === loadingStep ? s.stepActive : {}),
                      }}
                    >
                      <span>{i < loadingStep ? '✓' : i === loadingStep ? '›' : '·'}</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            ) : html ? (
              <iframe
                srcDoc={html}
                style={{ width: '100%', height: '80vh', minHeight: 700, border: 'none', display: 'block' }}
                title="Report Preview"
              />
            ) : (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>📋</div>
                <div style={s.emptyText}>No report generated yet</div>
                <div style={s.emptyHint}>
                  Configure branding on the left, then click Generate HTML Report
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
