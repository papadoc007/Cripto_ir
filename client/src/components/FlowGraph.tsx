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

const MODE_LABELS: Record<GraphMode, string> = { minimal: 'Focus', top10: 'Top 10', top25: 'Top 25', full: 'All' };
const MODE_LIMITS: Record<GraphMode, number | 'all'> = { minimal: 1, top10: 10, top25: 25, full: 'all' };
const SORT_LABELS: Record<SortBy, string> = { tx_count: 'By Count', volume: 'By Volume' };

// ── Colors ───────────────────────────────────────────────────────────────────
const COLOR_INVESTIGATED = '#7c6fff';
const COLOR_FUNDER       = '#f59e0b';
const COLOR_PEER         = '#22d3ee';
const COLOR_EDGE         = 'rgba(120,140,255,0.32)';
const COLOR_EDGE_FUNDER  = 'rgba(245,158,11,0.5)';

function nodeColor(n: GraphNode) {
  return n.is_investigated ? COLOR_INVESTIGATED : n.is_first_funder ? COLOR_FUNDER : COLOR_PEER;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function weiToEth(wei: string): number {
  try { return Number(BigInt(wei || '0')) / 1e18; } catch { return 0; }
}
function fmtEth(wei: string): string {
  const e = weiToEth(wei);
  if (e === 0) return '—';
  if (e < 0.0001) return '<0.0001 ETH';
  return e.toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' ETH';
}
function shortAddr(addr: string) { return addr.slice(0, 6) + '…' + addr.slice(-4); }

// ── Force simulation ──────────────────────────────────────────────────────────
function runForce(nodes: GraphNode[], links: GraphLink[], W: number, H: number, iters = 120) {
  const REPULSION = 4000, ATTRACTION = 0.04, DAMPING = 0.85;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = REPULSION / (d * d);
        const fx = (dx / d) * f, fy = (dy / d) * f;
        if (!a.is_investigated) { a.vx -= fx; a.vy -= fy; }
        if (!b.is_investigated) { b.vx += fx; b.vy += fy; }
      }
    }
    for (const l of links) {
      const a = nodes.find(n => n.id === l.source);
      const b = nodes.find(n => n.id === l.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ATTRACTION * d;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      if (!a.is_investigated) { a.vx += fx; a.vy += fy; }
      if (!b.is_investigated) { b.vx -= fx; b.vy -= fy; }
    }
    for (const n of nodes) {
      if (!n.is_investigated) {
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
      }
    }
    for (const n of nodes) {
      if (n.is_investigated) continue;
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x = Math.max(40, Math.min(W - 40, n.x + n.vx));
      n.y = Math.max(40, Math.min(H - 40, n.y + n.vy));
    }
  }
}

function nodeAt(nodes: GraphNode[], mx: number, my: number, r = 18): GraphNode | null {
  for (const n of nodes) {
    if ((n.x - mx) ** 2 + (n.y - my) ** 2 < r * r) return n;
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FlowGraph({ address }: { address: string }) {
  const [mode, setMode]           = useState<GraphMode>('minimal');
  const [sortBy, setSortBy]       = useState<SortBy>('tx_count');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltip, setTooltip]     = useState<{ x: number; y: number; node: GraphNode } | null>(null);

  const limit = MODE_LIMITS[mode];
  const { data: graphData, loading, error } = useGraph(address, 1, limit, sortBy);
  const { data: funderData } = useFirstFunder(address);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const nodesRef     = useRef<GraphNode[]>([]);

  // ── Computed volume per node (from links) ─────────────────────────────────
  const volumePerNode = useMemo(() => {
    const links = (graphData as { links?: GraphLink[] } | null)?.links ?? [];
    const map = new Map<string, bigint>();
    for (const l of links) {
      try {
        const v = BigInt(l.value || '0');
        map.set(l.source, (map.get(l.source) ?? 0n) + v);
        map.set(l.target, (map.get(l.target) ?? 0n) + v);
      } catch { /* skip */ }
    }
    return map;
  }, [graphData]);

  // ── Build initial layout positions ────────────────────────────────────────
  const layoutNodes: GraphNode[] = useMemo(() => {
    const gd = graphData as { nodes: GraphNode[]; links: GraphLink[] } | null;
    if (!gd?.nodes?.length) return [];
    const W = canvasWrapRef.current?.clientWidth || 560;
    const H = 420;
    const funderAddr = (funderData as { funder_address?: string } | null)?.funder_address?.toLowerCase();
    const nonCenter = gd.nodes.filter(n => !n.is_investigated);
    return gd.nodes.map(n => {
      const idx = nonCenter.findIndex(nc => nc.id === n.id);
      const angle = (2 * Math.PI * idx) / nonCenter.length;
      const spread = Math.min(W, H) * 0.38;
      return {
        ...n,
        is_first_funder: n.is_first_funder || (funderAddr ? n.id === funderAddr : false),
        x: n.is_investigated ? W / 2 : W / 2 + Math.cos(angle) * spread,
        y: n.is_investigated ? H / 2 : H / 2 + Math.sin(angle) * spread,
        vx: 0, vy: 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, funderData]);

  // ── Draw canvas ───────────────────────────────────────────────────────────
  const draw = useCallback((highlightId?: string | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const nodes = nodesRef.current;
    const links = (graphData as { links?: GraphLink[] } | null)?.links ?? [];
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const maxTx = Math.max(...links.map(l => l.tx_count), 1);

    // Edges
    for (const link of links) {
      const src = nodes.find(n => n.id === link.source);
      const tgt = nodes.find(n => n.id === link.target);
      if (!src || !tgt) continue;
      const isFunder = src.is_first_funder || tgt.is_first_funder;
      const isHighlighted = highlightId && (src.id === highlightId || tgt.id === highlightId);
      ctx.save();
      ctx.globalAlpha = isHighlighted ? 1 : 0.5;
      ctx.strokeStyle = isFunder ? COLOR_EDGE_FUNDER : COLOR_EDGE;
      ctx.lineWidth   = 1 + (link.tx_count / maxTx) * 3;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
      // Arrow
      const dx = tgt.x - src.x, dy = tgt.y - src.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const tgtR = tgt.is_investigated ? 14 : tgt.is_first_funder ? 11 : 7;
      const ax = tgt.x - ux * (tgtR + 2), ay = tgt.y - uy * (tgtR + 2);
      const as = 7;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - ux * as + uy * as * 0.5, ay - uy * as - ux * as * 0.5);
      ctx.lineTo(ax - ux * as - uy * as * 0.5, ay - uy * as + ux * as * 0.5);
      ctx.closePath();
      ctx.fillStyle = isFunder ? COLOR_EDGE_FUNDER : COLOR_EDGE;
      ctx.fill();
      ctx.restore();
    }

    // Nodes
    for (const node of nodes) {
      const r = node.is_investigated ? 14 : node.is_first_funder ? 11 : 7;
      const col = nodeColor(node);
      const isHighlighted = highlightId === node.id;

      ctx.save();
      ctx.globalAlpha = !highlightId || isHighlighted ? 1 : 0.4;
      if (node.is_investigated || node.is_first_funder || isHighlighted) {
        ctx.shadowColor = col;
        ctx.shadowBlur  = isHighlighted ? 22 : 14;
      }
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();

      if (node.is_first_funder || isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + (isHighlighted ? 5 : 3), 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      // Label
      ctx.save();
      ctx.globalAlpha = !highlightId || isHighlighted ? 1 : 0.35;
      const lbl = node.label || shortAddr(node.id);
      ctx.font = `${node.is_investigated ? 11 : 10}px monospace`;
      ctx.fillStyle = node.is_investigated ? '#e0e0ff' : node.is_first_funder ? '#fcd34d' : '#a0c8d0';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, node.x, node.y + r + 14);
      ctx.restore();
    }
  }, [graphData]);

  // ── Run force + draw ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!layoutNodes.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gd = graphData as { links?: GraphLink[] } | null;
    const W = canvasWrapRef.current?.clientWidth || 560;
    const H = 420;
    canvas.width = W; canvas.height = H;
    const mutableNodes = layoutNodes.map(n => ({ ...n }));
    nodesRef.current = mutableNodes;
    runForce(mutableNodes, gd?.links ?? [], W, H);
    draw(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutNodes, draw]);

  // Redraw when selectedId changes without re-running force
  useEffect(() => {
    draw(selectedId);
  }, [selectedId, draw]);

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const hit = nodeAt(nodesRef.current, e.clientX - rect.left, e.clientY - rect.top);
    setTooltip(hit ? { x: e.clientX, y: e.clientY, node: hit } : null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const hit = nodeAt(nodesRef.current, e.clientX - rect.left, e.clientY - rect.top);
    setSelectedId(prev => (hit ? (prev === hit.id ? null : hit.id) : null));
  }, []);

  // ── Derived data for table ────────────────────────────────────────────────
  const tableNodes: GraphNode[] = useMemo(() => {
    const gd = graphData as { nodes?: GraphNode[] } | null;
    if (!gd?.nodes) return [];
    const funderAddr = (funderData as { funder_address?: string } | null)?.funder_address?.toLowerCase();
    return [...gd.nodes]
      .map(n => ({ ...n, is_first_funder: n.is_first_funder || (funderAddr ? n.id === funderAddr : false) }))
      .sort((a, b) => {
        if (a.is_investigated) return -1;
        if (b.is_investigated) return 1;
        if (a.is_first_funder && !b.is_first_funder) return -1;
        if (b.is_first_funder && !a.is_first_funder) return 1;
        const va = volumePerNode.get(a.id) ?? 0n;
        const vb = volumePerNode.get(b.id) ?? 0n;
        return vb > va ? 1 : vb < va ? -1 : 0;
      });
  }, [graphData, funderData, volumePerNode]);

  // ── Render ────────────────────────────────────────────────────────────────
  const btn = (active: boolean, teal = false) => ({
    padding: '0.3rem 0.7rem',
    borderRadius: 6,
    border: active ? 'none' : '1px solid rgba(100,120,255,0.3)',
    background: active ? (teal ? '#0e7490' : '#6c63ff') : 'rgba(30,30,60,0.7)',
    color: active ? '#fff' : '#9090c0',
    cursor: 'pointer' as const,
    fontSize: '0.78rem',
    fontWeight: active ? 700 : 400,
  });

  const nodeCount = tableNodes.length;
  const linkCount = (graphData as { links?: unknown[] } | null)?.links?.length ?? 0;

  return (
    <div style={{ background: 'rgba(10,10,30,0.6)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: '0.4rem', padding: '0.65rem 1rem', borderBottom: '1px solid rgba(100,120,255,0.15)' }}>
        <span style={{ fontSize: '0.75rem', color: '#6060a0' }}>View:</span>
        {(Object.keys(MODE_LABELS) as GraphMode[]).map(m => (
          <button key={m} style={btn(mode === m)} onClick={() => setMode(m)}>{MODE_LABELS[m]}</button>
        ))}

        {mode !== 'minimal' && (
          <>
            <span style={{ fontSize: '0.75rem', color: '#6060a0', marginLeft: '0.5rem' }}>Sort:</span>
            {(Object.keys(SORT_LABELS) as SortBy[]).map(sv => (
              <button key={sv} style={btn(sortBy === sv, true)} onClick={() => setSortBy(sv)}>{SORT_LABELS[sv]}</button>
            ))}
          </>
        )}

        {!loading && nodeCount > 0 && (
          <span style={{ fontSize: '0.72rem', color: '#5050a0', marginLeft: '0.4rem' }}>
            {nodeCount} nodes · {linkCount} edges
          </span>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto', alignItems: 'center' }}>
          {[['Target', COLOR_INVESTIGATED], ['First Funder', COLOR_FUNDER], ['Counterparty', COLOR_PEER]].map(([lbl, col]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#8080a0' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: col, flexShrink: 0 }} />
              {lbl}
            </div>
          ))}
        </div>
      </div>

      {/* ── Body: canvas + table side by side ── */}
      {loading ? (
        <div style={{ padding: '3rem', color: '#6060a0', textAlign: 'center' as const, fontSize: '0.9rem' }}>Loading graph…</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#f44336', fontSize: '0.85rem' }}>Error: {error}</div>
      ) : !graphData || nodeCount === 0 ? (
        <div style={{ padding: '3rem', color: '#6060a0', textAlign: 'center' as const, fontSize: '0.85rem' }}>No transaction data to graph yet</div>
      ) : (
        <div style={{ display: 'flex' }}>

          {/* Canvas */}
          <div ref={canvasWrapRef} style={{ flex: '1 1 0', minWidth: 0 }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: 420, display: 'block', cursor: 'crosshair' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip(null)}
              onClick={handleCanvasClick}
            />
          </div>

          {/* Nodes table */}
          <div style={{
            width: 270,
            flexShrink: 0,
            borderLeft: '1px solid rgba(100,120,255,0.15)',
            overflowY: 'auto' as const,
            maxHeight: 420,
          }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: '0.3rem 0.6rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(100,120,255,0.15)', position: 'sticky' as const, top: 0, background: 'rgba(12,12,32,0.98)', zIndex: 1 }}>
              <div />
              <div style={{ fontSize: '0.65rem', color: '#5050a0', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Address</div>
              <div style={{ fontSize: '0.65rem', color: '#5050a0', textTransform: 'uppercase' as const, letterSpacing: '0.06em', textAlign: 'right' as const }}>Volume</div>
            </div>

            {/* Table rows */}
            {tableNodes.map(node => {
              const isSelected = selectedId === node.id;
              const col = nodeColor(node);
              const volBig = volumePerNode.get(node.id) ?? 0n;
              const volStr = volBig.toString();
              const typeLabel = node.is_investigated ? 'Target' : node.is_first_funder ? 'Funder' : `${node.tx_count ?? '?'} txns`;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedId(prev => prev === node.id ? null : node.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '12px 1fr auto',
                    gap: '0.3rem 0.6rem',
                    alignItems: 'start',
                    padding: '0.55rem 0.75rem',
                    borderBottom: '1px solid rgba(100,120,255,0.08)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(108,99,255,0.15)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = isSelected ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'rgba(108,99,255,0.15)' : 'transparent')}
                >
                  {/* Color dot */}
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: col, marginTop: 3, flexShrink: 0,
                    boxShadow: isSelected ? `0 0 6px ${col}` : 'none' }} />

                  {/* Address + meta */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: isSelected ? '#e0e0ff' : '#c0c0ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {node.label || shortAddr(node.id)}
                    </div>
                    {node.label && (
                      <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#5050a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {shortAddr(node.id)}
                      </div>
                    )}
                    <div style={{ fontSize: '0.65rem', marginTop: 2 }}>
                      <span style={{
                        padding: '1px 5px', borderRadius: 3,
                        background: node.is_investigated ? 'rgba(124,111,255,0.2)' : node.is_first_funder ? 'rgba(245,158,11,0.2)' : 'rgba(34,211,238,0.1)',
                        color: col,
                        fontSize: '0.62rem', fontWeight: 600,
                      }}>
                        {typeLabel}
                      </span>
                      <a
                        href={`https://etherscan.io/address/${node.id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ marginLeft: 6, fontSize: '0.62rem', color: '#5050a0', textDecoration: 'none' }}
                      >
                        ↗
                      </a>
                    </div>
                  </div>

                  {/* Volume */}
                  <div style={{ textAlign: 'right' as const, fontSize: '0.7rem', color: volBig > 0n ? '#a0e0a0' : '#5050a0', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' as const }}>
                    {fmtEth(volStr)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 10,
          background: 'rgba(12,12,35,0.96)', border: '1px solid rgba(100,120,255,0.4)',
          borderRadius: 8, padding: '0.5rem 0.75rem', pointerEvents: 'none', zIndex: 9999, maxWidth: 280,
        }}>
          {tooltip.node.label && <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>{tooltip.node.label}</div>}
          <div style={{ fontFamily: 'monospace', fontSize: '0.73rem', color: '#c0c0ff', wordBreak: 'break-all' }}>{tooltip.node.id}</div>
          <div style={{ fontSize: '0.7rem', color: '#9090c0', marginTop: 3 }}>
            {tooltip.node.is_investigated ? '🔍 Target address'
              : tooltip.node.is_first_funder ? '🟡 First funder'
              : `↔ ${tooltip.node.tx_count ?? '?'} txns`}
          </div>
          {(volumePerNode.get(tooltip.node.id) ?? 0n) > 0n && (
            <div style={{ fontSize: '0.7rem', color: '#a0e0a0', marginTop: 2 }}>
              Vol: {fmtEth((volumePerNode.get(tooltip.node.id) ?? 0n).toString())}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
