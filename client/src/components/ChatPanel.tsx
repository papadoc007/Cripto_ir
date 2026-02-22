import { useState } from 'react';
import { api } from '../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: 500,
  },
  messages: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '1rem 0',
  },
  message: (role: 'user' | 'assistant') => ({
    padding: '0.75rem 1rem',
    marginBottom: '0.75rem',
    borderRadius: 10,
    maxWidth: '85%',
    marginLeft: role === 'user' ? 'auto' : 0,
    marginRight: role === 'assistant' ? 'auto' : 0,
    background: role === 'user' ? 'rgba(108, 99, 255, 0.2)' : 'rgba(40, 40, 70, 0.6)',
    border: `1px solid ${role === 'user' ? 'rgba(108, 99, 255, 0.3)' : 'rgba(100, 120, 255, 0.1)'}`,
    color: '#ddd',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  }),
  form: {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(100, 120, 255, 0.15)',
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: 8,
    border: '1px solid rgba(100, 120, 255, 0.25)',
    background: 'rgba(20, 20, 50, 0.8)',
    color: '#e0e0ff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  button: {
    padding: '0.75rem 1.5rem',
    borderRadius: 8,
    border: 'none',
    background: '#6c63ff',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};

export default function ChatPanel({ address }: { address: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const result = await api.askQuestion(question, address);
      setMessages(prev => [...prev, { role: 'assistant', content: result.narrative }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={{ color: '#666', padding: '2rem', textAlign: 'center' }}>
            Ask questions about this address. e.g., "What are the top counterparties by inflow?" or "Show me monthly activity"
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={styles.message(msg.role)}>{msg.content}</div>
        ))}
        {loading && (
          <div style={styles.message('assistant')}>Analyzing...</div>
        )}
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question about this address..."
          disabled={loading}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? '...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}
