import { useMemo } from 'react'
import useExplorationStore from '../store/explorationStore'

const DEPTH_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626']
const NODE_W = 120
const NODE_H = 36
const H_GAP = 40
const V_GAP = 70

function buildTree(nodes) {
  if (!nodes.length) return { tree: [], width: 0, height: 0 }

  // Build adjacency
  const childMap = {}
  nodes.forEach((n) => {
    if (!childMap[n.parentId]) childMap[n.parentId] = []
    childMap[n.parentId].push(n)
  })

  const positioned = []
  let maxX = 0, maxY = 0

  function layout(nodeId, x, y) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return x
    const children = childMap[nodeId] || []
    let childX = x
    children.forEach((child) => { childX = layout(child.id, childX, y + V_GAP + NODE_H) })
    const selfX = children.length ? (x + childX - H_GAP) / 2 : x
    positioned.push({ ...node, x: selfX, y })
    maxX = Math.max(maxX, selfX + NODE_W)
    maxY = Math.max(maxY, y + NODE_H)
    return childX === x ? x + NODE_W + H_GAP : childX
  }

  layout('root', 20, 20)
  return { tree: positioned, width: maxX + 20, height: maxY + 20 }
}

export default function ConceptGraph({ onClose }) {
  const { graphNodes, rootQuery, understoodTerms, exploredTerms } = useExplorationStore()

  const { tree, width, height } = useMemo(() => buildTree(graphNodes), [graphNodes])

  if (!graphNodes.length) return (
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-dim)' }}>
      Ask a question first to see the concept graph
    </div>
  )

  const getNodeById = (id) => tree.find((n) => n.id === id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Concept Graph</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{rootQuery}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-dim)' }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block"/>Root</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>Explored</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>Understood</span>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
              style={{ color: 'var(--text-dim)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Graph SVG */}
        <div className="overflow-auto flex-1 p-4">
          <svg width={Math.max(width, 400)} height={Math.max(height, 200)} className="overflow-visible">
            {/* Edges */}
            {tree.map((node) => {
              if (!node.parentId) return null
              const parent = getNodeById(node.parentId)
              if (!parent) return null
              const x1 = parent.x + NODE_W / 2
              const y1 = parent.y + NODE_H
              const x2 = node.x + NODE_W / 2
              const y2 = node.y
              const mx = (x1 + x2) / 2
              return (
                <path key={`edge-${node.id}`}
                  d={`M${x1},${y1} C${x1},${mx} ${x2},${mx} ${x2},${y2}`}
                  fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5"
                  strokeDasharray={understoodTerms.has(node.id) ? 'none' : '4 3'} />
              )
            })}

            {/* Nodes */}
            {tree.map((node) => {
              const isUnderstood = understoodTerms.has(node.id)
              const isExplored   = exploredTerms.has(node.id) || node.id === 'root'
              const color = isUnderstood ? '#059669' : isExplored ? DEPTH_COLORS[Math.min(node.depth, 4)] : '#475569'
              const label = node.label?.length > 16 ? node.label.slice(0, 14) + '…' : node.label

              return (
                <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                  <rect width={NODE_W} height={NODE_H} rx="8"
                    fill={`${color}18`} stroke={color} strokeWidth="1.5" />
                  {isUnderstood && (
                    <text x={NODE_W - 10} y={NODE_H / 2 + 4} fontSize="10" fill="#059669" textAnchor="middle">✓</text>
                  )}
                  <text x={NODE_W / 2} y={NODE_H / 2 + 4} fontSize="11" fill={color}
                    textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="500">
                    {label}
                  </text>
                  {node.depth > 0 && (
                    <text x={6} y={12} fontSize="8" fill={color} opacity="0.6">D{node.depth}</text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Footer stats */}
        <div className="px-6 py-3 flex items-center gap-6 text-xs"
          style={{ borderTop: '1px solid var(--divider)', color: 'var(--text-dim)' }}>
          <span>{graphNodes.length} nodes</span>
          <span>{exploredTerms.size} explored</span>
          <span>{understoodTerms.size} understood</span>
        </div>
      </div>
    </div>
  )
}
