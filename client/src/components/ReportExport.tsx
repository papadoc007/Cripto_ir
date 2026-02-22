import { api } from '../api/client';

const styles = {
  container: {
    display: 'flex',
    gap: '0.75rem',
  },
  btn: {
    padding: '0.6rem 1.25rem',
    borderRadius: 8,
    border: '1px solid rgba(100, 120, 255, 0.3)',
    background: 'rgba(30, 30, 60, 0.6)',
    color: '#c0c0ff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
};

export default function ReportExport({ address }: { address: string }) {
  const download = async (format: 'html' | 'md') => {
    const content = await api.generateReport(address, format);
    const blob = new Blob([content], { type: format === 'html' ? 'text/html' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${address.slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      <button style={styles.btn} onClick={() => download('html')}>Export HTML</button>
      <button style={styles.btn} onClick={() => download('md')}>Export Markdown</button>
    </div>
  );
}
