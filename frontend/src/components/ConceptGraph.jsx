import { useMemo, useState } from 'react'
import useExplorationStore from '../store/explorationStore'

const DEPTH_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626']
const NODE_W = 130
const NODE_H = 40
const H_GAP = 50
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
  const { graphNodes, rootQuery, understoodTerms, exploredTerms, exploreConcept, isLoadingConcept } = useExplorationStore()
  const { tree, width, height } = useMemo(() => buildTree(graphNodes), [graphNodes])
  
  const [hoveredNode, setHoveredNode] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  if (!graphNodes.length) return (
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-dim)' }}>
      Ask a question first to see the concept graph
    </div>
  )

  const getNodeById = (id) => tree.find((n) => n.id === id)

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleNodeClick = (node) => {
    if (isLoadingConcept || !node.isUnexplored) return
    const parent = getNodeById(node.parentId)
    const parentAnswer = parent ? parent.explanation : ''
    exploreConcept(node.id, parentAnswer)
    onClose() // Close graph modal to show main UI exploring the concept
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onMouseMove={handleMouseMove}>
      <div className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--divider)', background: 'var(--bg)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Interactive Concept Graph</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{rootQuery}</p>
          </div>
          <div className="flex items-center gap-5">
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-dim)' }}>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block"/>Root</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"/>Explored</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/>Understood</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-500 inline-block"/>Unexplored</span>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
              style={{ color: 'var(--text-dim)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Graph SVG */}
        <div className="overflow-auto flex-1 p-8 graph-container" style={{ cursor: isLoadingConcept ? 'wait' : 'grab' }}>
          <svg width={Math.max(width, 600)} height={Math.max(height, 400)} className="overflow-visible">
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
              const isUnexploredEdge = node.isUnexplored
              return (
                <path key={`edge-${node.id}`}
                  d={`M${x1},${y1} C${x1},${mx} ${x2},${mx} ${x2},${y2}`}
                  fill="none" 
                  stroke={isUnexploredEdge ? "rgba(100,116,139,0.3)" : "rgba(139,92,246,0.4)"} 
                  strokeWidth={isUnexploredEdge ? "1" : "2"}
                  strokeDasharray={isUnexploredEdge ? '4 4' : 'none'} 
                  style={{ transition: 'all 0.3s ease' }}
                />
              )
            })}

            {/* Nodes */}
            {tree.map((node) => {
              const isUnderstood = understoodTerms.has(node.id)
              const isExplored   = !node.isUnexplored
              const color = isUnderstood ? '#059669' : isExplored ? DEPTH_COLORS[Math.min(node.depth, 4)] : '#64748b'
              const label = node.label?.length > 18 ? node.label.slice(0, 16) + '…' : node.label

              return (
                <g key={node.id} transform={`translate(${node.x},${node.y})`}
                   onClick={() => handleNodeClick(node)}
                   onMouseEnter={() => setHoveredNode(node)}
                   onMouseLeave={() => setHoveredNode(null)}
                   style={{ cursor: node.isUnexplored ? 'pointer' : 'default', transition: 'all 0.2s ease' }}>
                  
                  {/* Outer glow effect on hover if unexplored */}
                  {hoveredNode?.id === node.id && node.isUnexplored && (
                    <rect width={NODE_W + 8} height={NODE_H + 8} x="-4" y="-4" rx="12"
                      fill="none" stroke={color} strokeWidth="2" opacity="0.3" className="animate-pulse" />
                  )}

                  <rect width={NODE_W} height={NODE_H} rx="8"
                    fill={node.isUnexplored ? 'var(--bg)' : `${color}15`} 
                    stroke={color} 
                    strokeWidth={hoveredNode?.id === node.id ? "2" : "1.5"}
                    strokeDasharray={node.isUnexplored ? '4 3' : 'none'}
                    style={{ transition: 'all 0.2s ease', boxShadow: hoveredNode?.id === node.id ? `0 0 10px ${color}55` : 'none' }} />
                  
                  {isUnderstood && (
                    <text x={NODE_W - 12} y={NODE_H / 2 + 4} fontSize="11" fill="#059669" textAnchor="middle">✓</text>
                  )}
                  
                  <text x={NODE_W / 2} y={NODE_H / 2 + 4} fontSize="12" fill={color}
                    textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="500"
                    style={{ transition: 'fill 0.2s ease' }}>
                    {label}
                  </text>
                  
                  {node.depth > 0 && (
                    <text x={8} y={12} fontSize="9" fill={color} opacity={node.isUnexplored ? "0.4" : "0.7"}>
                      D{node.depth}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Footer stats */}
        <div className="px-6 py-3 flex items-center gap-6 text-xs"
          style={{ borderTop: '1px solid var(--divider)', color: 'var(--text-dim)', background: 'var(--bg)' }}>
          <span>{graphNodes.length} nodes mapped</span>
          <span>{exploredTerms.size} deeply explored</span>
          <span>{understoodTerms.size} mastered</span>
          <span className="ml-auto flex items-center gap-2">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            Hover for details • Click dashed nodes to explore
          </span>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredNode && (
        <div className="fixed z-[60] max-w-xs pointer-events-none p-4 rounded-xl shadow-2xl animate-fade-up"
             style={{ 
               left: Math.min(mousePos.x + 15, window.innerWidth - 320), 
               top: Math.min(mousePos.y + 15, window.innerHeight - 150),
               background: 'var(--card-bg)',
               border: '1px solid var(--card-border)',
               backdropFilter: 'blur(12px)'
             }}>
          <div className="flex justify-between items-start gap-3 mb-2">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{hoveredNode.label}</h3>
            {hoveredNode.isUnexplored && (
              <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(139,92,246,0.1)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.2)' }}>
                Unexplored
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {hoveredNode.explanation || "No brief available. Click to deeply explore this concept!"}
          </p>
          {hoveredNode.isUnexplored && (
            <div className="mt-3 text-[10px] font-semibold flex items-center gap-1 text-violet-500">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Click to deep search
            </div>
          )}
        </div>
      )}
    </div>
  )
}
