import { useRef, useEffect, useCallback } from 'react';
import { useGraph } from '../hooks/useAnalytics';

interface GraphNode {
  id: string;
  label: string | null;
  is_investigated: boolean;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: string;
  tx_count: number;
}

export default function FlowGraph({ address }: { address: string }) {
  const { data, loading, error } = useGraph(address);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const nodes = nodesRef.current;
    const links = linksRef.current;

    // Draw links
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.3)';
    ctx.lineWidth = 1;
    for (const link of links) {
      const source = typeof link.source === 'string' ? nodes.find(n => n.id === link.source) : link.source;
      const target = typeof link.target === 'string' ? nodes.find(n => n.id === link.target) : link.target;
      if (source?.x != null && source?.y != null && target?.x != null && target?.y != null) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    }

    // Draw nodes
    for (const node of nodes) {
      if (node.x == null || node.y == null) continue;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.is_investigated ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = node.is_investigated ? '#6c63ff' : '#ff9800';
      ctx.fill();

      // Label
      ctx.fillStyle = '#ccc';
      ctx.font = '10px monospace';
      const label = node.label || node.id.slice(0, 8) + '...';
      ctx.fillText(label, node.x + 10, node.y + 4);
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    const graphData = data as { nodes: GraphNode[]; links: GraphLink[] };
    if (!graphData.nodes || graphData.nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // Simple circular layout
    const nodes = graphData.nodes.map((n, i) => ({
      ...n,
      x: width / 2 + Math.cos((2 * Math.PI * i) / graphData.nodes.length) * Math.min(width, height) * 0.35,
      y: height / 2 + Math.sin((2 * Math.PI * i) / graphData.nodes.length) * Math.min(width, height) * 0.35,
    }));

    // Center the investigated node
    const center = nodes.find(n => n.id === address.toLowerCase());
    if (center) {
      center.x = width / 2;
      center.y = height / 2;
    }

    nodesRef.current = nodes;
    linksRef.current = graphData.links;
    draw();
  }, [data, address, draw]);

  if (loading) return <div style={{ color: '#888', padding: '2rem' }}>Loading graph...</div>;
  if (error) return <div style={{ color: '#f44336' }}>Error: {error}</div>;
  if (!data || (data as { nodes: unknown[] }).nodes.length === 0) return <div style={{ color: '#888' }}>No graph data</div>;

  return <canvas ref={canvasRef} style={{ width: '100%', height: 400, display: 'block' }} />;
}
