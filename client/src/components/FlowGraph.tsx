import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useGraph, useFirstFunder } from '../hooks/useAnalytics';

// ── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string | null;
  is_investigated: boolean;
  is_first_funder?: boolean;
  tx_count?: number;
  // runtime layout
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: string;
  tx_count: number;
}

type GraphMode = 'minimal' | 'top10' | 'top25' | 'full';
type SortBy = 'tx_count' | 'volume';

const MODE_LABELS: Record<GraphMode, string> = {
  minimal: 'Focus',
  top10: 'Top 10',
  top25: 'Top 25',
  full: 'All',
};
const MODE_LIMITS: Record<GraphMode, number | 'all'> = {
  minimal: 1,   // backend will always include first funder; limit=1 keeps it lean
  top10: 10,
  top25: 25,
  full: 'all',
};
const SORT_LABELS: Record<SortBy, string> = {
  tx_count: 'By Count',
  volume: 'By Volume',
};

// ── Colors ────────────────────────────────────────────────────────────────────
const COLOR_INVESTIGATED = '#7c6fff';  // purple
const COLOR_FUNDER       = '#f59e0b';  // amber/gold
const COLOR_PEER         = '#22d3ee';  // cyan
const COLOR_EDGE         = 'rgba(120, 140, 255, 0.35)';
const COLOR_EDGE_FUNDER  = 'rgba(245, 158, 11, 0.5)';

// ── Force simulation (simple Verlet) ─────────────────────────────────────────
function runForce(nodes: GraphNode[], links: GraphLink[], width: number, height: number, iterations = 120) {
  const REPULSION   = 4000;
  const ATTRACTION  = 0.04;
  const DAMPING     = 0.85;
  const CENTER_X    = width / 2;
  const CENTER_Y    = height / 2;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.is_investigated) { a.vx -= fx; a.vy -= fy; }
        if (!b.is_investigated) { b.vx += fx; b.vy += fy; }
      }
    }

    // Attraction along edges (spring)
    for (const link of links) {
      const a = nodes.find(n => n.id === link.source);
      const b = nodes.find(n => n.id === link.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = ATTRACTION * dist;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!a.is_investigated) { a.vx += fx; a.vy += fy; }
      if (!b.is_investigated) { b.vx -= fx; b.vy -= fy; }
    }

    // Weak center gravity
    for (const n of nodes) {
      if (!n.is_investigated) {
        n.vx += (CENTER_X - n.x) * 0.002;
        n.vy += (CENTER_Y - n.y) * 0.002;
      }
    }

    // Apply velocity + damping + bounds
    for (const n of nodes) {
      if (n.is_investigated) continue;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x  = Math.max(40, Math.min(width - 40, n.x + n.vx));
      n.y  = Math.max(40, Math.min(height - 40, n.y + n.vy));
    }
  }
}

// ── Tooltip state ─────────────────────────────────────────────────────────────
function nodeAt(nodes: GraphNode[], mx: number, my: number, r = 16): GraphNode | null {
  for (const n of nodes) {
    const dx = n.x - mx, dy = n.y - my;
    if (dx * dx + dy * dy < r * r) return n;
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FlowGraph({ address }: { address: string }) {
  const [mode, setMode] = useState<GraphMode>('minimal');
  const [sortBy, setSortBy] = useState<SortBy>('tx_count');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);

  const limit = MODE_LIMITS[mode];
  const { data: graphData, loading, error } = useGraph(address, 1, limit, sortBy);
  const { data: funderData } = useFirstFunder(address);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef  = useRef<GraphNode[]>([]);

  // ── Build layout whenever data changes ─────────────────────────────────────
  const layoutNodes: GraphNode[] = useMemo(() => {
    const gd = graphData as { nodes: GraphNode[]; links: GraphLink[] } | null;
    if (!gd?.nodes?.length) return [];

    const canvas = canvasRef.current;
    const width  = canvas?.parentElement?.clientWidth || 700;
    const height = 420;

    const funderAddr = (funderData as { funder_address?: string } | null)?.funder_address?.toLowerCase();

    // Initialise positions: center for investigated, circle spread for rest
    const nonCenter = gd.nodes.filter(n => !n.is_investigated);
    return gd.nodes.map((n, i) => {
      const idx = nonCenter.findIndex(nc => nc.id === n.id);
      const angle = (2 * Math.PI * idx) / nonCenter.length;
      const spread = Math.min(width, height) * 0.38;
      return {
        ...n,
        is_first_funder: n.is_first_funder || (funderAddr ? n.id === funderAddr : false),
        x: n.is_investigated ? width / 2 : width / 2 + Math.cos(angle) * spread,
        y: n.is_investigated ? height / 2 : height / 2 + Math.sin(angle) * spread,
        vx: 0, vy: 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, funderData]);

  // ── Draw ───────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = nodesRef.current;
    const gd    = graphData as { nodes: GraphNode[]; links: GraphLink[] } | null;
    const links = gd?.links ?? [];

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const maxTx = Math.max(...links.map(l => l.tx_count), 1);

    // ── Draw edges ─────────────────────────────────────────────────────────
    for (const link of links) {
      const src = nodes.find(n => n.id === link.source);
      const tgt = nodes.find(n => n.id === link.target);
      if (!src || !tgt) continue;

      const isFunderEdge = src.is_first_funder || tgt.is_first_funder;
      const lineWidth = 1 + (link.tx_count / maxTx) * 3;

      ctx.save();
      ctx.strokeStyle = isFunderEdge ? COLOR_EDGE_FUNDER : COLOR_EDGE;
      ctx.lineWidth   = lineWidth;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();

      // Arrow head on the edge midpoint → target
      const dx   = tgt.x - src.x;
      const dy   = tgt.y - src.y;
      const len  = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux   = dx / len, uy = dy / len;
      const tgtR = tgt.is_investigated ? 14 : tgt.is_first_funder ? 11 : 7;
      const ax   = tgt.x - ux * (tgtR + 2);
      const ay   = tgt.y - uy * (tgtR + 2);
      const arrowSize = 7;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - ux * arrowSize + uy * (arrowSize * 0.5), ay - uy * arrowSize - ux * (arrowSize * 0.5));
      ctx.lineTo(ax - ux * arrowSize - uy * (arrowSize * 0.5), ay - uy * arrowSize + ux * (arrowSize * 0.5));
      ctx.closePath();
      ctx.fillStyle = isFunderEdge ? COLOR_EDGE_FUNDER : COLOR_EDGE;
      ctx.fill();
      ctx.restore();
    }

    // ── Draw nodes ─────────────────────────────────────────────────────────
    for (const node of nodes) {
      const r = node.is_investigated ? 14 : node.is_first_funder ? 11 : 7;
      const color = node.is_investigated ? COLOR_INVESTIGATED
        : node.is_first_funder ? COLOR_FUNDER
        : COLOR_PEER;

      ctx.save();

      // Glow for important nodes
      if (node.is_investigated || node.is_first_funder) {
        ctx.shadowColor = color;
        ctx.shadowBlur  = 14;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Ring for first funder
      if (node.is_first_funder) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = COLOR_FUNDER;
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Label
      const shortAddr = node.id.slice(0, 6) + '…' + node.id.slice(-4);
      const displayLabel = node.label || shortAddr;
      const fontSize = node.is_investigated ? 11 : 10;
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = node.is_investigated ? '#e0e0ff' : node.is_first_funder ? '#fcd34d' : '#a0c8d0';
      ctx.textAlign = 'center';
      ctx.fillText(displayLabel, node.x, node.y + r + 14);
      ctx.textAlign = 'left';
    }
  }, [graphData]);

  // ── Run force + draw on layout change ─────────────────────────────────────
  useEffect(() => {
    if (!layoutNodes.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gd     = graphData as { nodes: GraphNode[]; links: GraphLink[] } | null;
    const width  = canvas.parentElement?.clientWidth || 700;
    const height = 420;
    canvas.width  = width;
    canvas.height = height;

    // Clone for mutation
    const mutableNodes: GraphNode[] = layoutNodes.map(n => ({ ...n }));
    nodesRef.current = mutableNodes;

    runForce(mutableNodes, gd?.links ?? [], width, height);
    draw();
  }, [layoutNodes, draw, graphData]);

  // ── Canvas mouse move for tooltip ─────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = nodeAt(nodesRef.current, mx, my);
    if (hit) {
      setTooltip({ x: e.clientX, y: e.clientY, node: hit });
    } else {
      setTooltip(null);
    }
  }, []);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    wrapper: {
      position: 'relative' as const,
      background: 'rgba(10,10,30,0.6)',
      borderRadius: 10,
      overflow: 'hidden' as const,
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid rgba(100,120,255,0.15)',
    },
    toolbarLabel: { fontSize: '0.8rem', color: '#6060a0', marginRight: '0.25rem' },
    modeBtn: (active: boolean) => ({
      padding: '0.3rem 0.75rem',
      borderRadius: 6,
      border: active ? 'none' : '1px solid rgba(100,120,255,0.3)',
      background: active ? '#6c63ff' : 'rgba(30,30,60,0.7)',
      color: active ? '#fff' : '#9090c0',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: active ? 700 : 400,
    }),
    legend: {
      display: 'flex', gap: '1.25rem', marginLeft: 'auto', alignItems: 'center',
    },
    legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#9090c0' },
    dot: (color: string) => ({
      width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0,
    }),
    loading: { padding: '3rem 2rem', color: '#6060a0', textAlign: 'center' as const, fontSize: '0.9rem' },
    error:   { padding: '2rem', color: '#f44336', fontSize: '0.85rem' },
    empty:   { padding: '3rem 2rem', color: '#6060a0', textAlign: 'center' as const, fontSize: '0.85rem' },
    tooltip: {
      position: 'fixed' as const,
      background: 'rgba(15,15,40,0.95)',
      border: '1px solid rgba(100,120,255,0.4)',
      borderRadius: 8,
      padding: '0.5rem 0.75rem',
      pointerEvents: 'none' as const,
      zIndex: 9999,
      maxWidth: 300,
    },
    ttAddr: { fontFamily: 'monospace', fontSize: '0.75rem', color: '#c0c0ff', wordBreak: 'break-all' as const },
    ttLabel: { fontSize: '0.8rem', color: '#f59e0b', marginBottom: '0.2rem', fontWeight: 700 as const },
    ttType: { fontSize: '0.7rem', color: '#9090c0', marginTop: '0.2rem' },
  };

  const nodeCount = (graphData as { nodes: unknown[] } | null)?.nodes.length ?? 0;
  const linkCount = (graphData as { links: unknown[] } | null)?.links.length ?? 0;

  return (
    <div style={s.wrapper}>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <span style={s.toolbarLabel}>View:</span>
        {(Object.keys(MODE_LABELS) as GraphMode[]).map(m => (
          <button
            key={m}
            style={s.modeBtn(mode === m)}
            onClick={() => setMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}

        {/* Sort toggle — only relevant when showing multiple counterparties */}
        {mode !== 'minimal' && (
          <>
            <span style={{ ...s.toolbarLabel, marginLeft: '0.75rem' }}>Sort:</span>
            {(Object.keys(SORT_LABELS) as SortBy[]).map(sv => (
              <button
                key={sv}
                style={sortBy === sv
                  ? { ...s.modeBtn(true), background: '#0e7490' }   // teal when active
                  : s.modeBtn(false)}
                onClick={() => setSortBy(sv)}
              >
                {SORT_LABELS[sv]}
              </button>
            ))}
          </>
        )}

        {!loading && nodeCount > 0 && (
          <span style={{ fontSize: '0.75rem', color: '#6060a0', marginLeft: '0.5rem' }}>
            {nodeCount} nodes · {linkCount} edges
          </span>
        )}

        {/* Legend */}
        <div style={s.legend}>
          <div style={s.legendItem}>
            <div style={s.dot(COLOR_INVESTIGATED)} />
            Target
          </div>
          <div style={s.legendItem}>
            <div style={s.dot(COLOR_FUNDER)} />
            First Funder
          </div>
          <div style={s.legendItem}>
            <div style={s.dot(COLOR_PEER)} />
            Counterparty
          </div>
        </div>
      </div>

      {/* Canvas / states */}
      {loading ? (
        <div style={s.loading}>Loading graph…</div>
      ) : error ? (
        <div style={s.error}>Error: {error}</div>
      ) : !graphData || nodeCount === 0 ? (
        <div style={s.empty}>No transaction data to graph yet</div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 420, display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{ ...s.tooltip, left: tooltip.x + 14, top: tooltip.y - 10 }}>
          {tooltip.node.label && <div style={s.ttLabel}>{tooltip.node.label}</div>}
          <div style={s.ttAddr}>{tooltip.node.id}</div>
          <div style={s.ttType}>
            {tooltip.node.is_investigated ? '🔍 Target address'
              : tooltip.node.is_first_funder ? '🟡 First funder'
              : `↔ ${tooltip.node.tx_count ?? ''} txns`}
          </div>
        </div>
      )}
    </div>
  );
}
