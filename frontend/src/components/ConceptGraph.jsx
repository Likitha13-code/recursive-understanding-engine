import { useMemo, useState, useRef, useEffect } from 'react'
import useExplorationStore from '../store/explorationStore'
import api from '../api'
import TermBadge from './TermBadge'

const DEPTH_COLORS = ['#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f87171']
const NODE_W = 160
const NODE_H = 48
const H_GAP = 60
const V_GAP = 80

function buildTree(nodes) {
  if (!nodes.length) return { tree: [], width: 0, height: 0 }

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

  layout('root', 40, 40)
  return { tree: positioned, width: maxX + 80, height: maxY + 80 }
}

function GraphAnswerWithTerms({ text, concepts, className }) {
  if (!text) return null
  if (!concepts || concepts.length === 0)
    return <span className={className}>{text}</span>

  const conceptMap = Object.fromEntries(concepts.map((c) => [c.term.toLowerCase(), c]))
  const escaped = concepts.map((c) => c.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (escaped.length === 0) return <span className={className}>{text}</span>
  
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const c = conceptMap[part.toLowerCase()]
        return c
          ? <TermBadge key={i} term={c.term} parentAnswer={text} difficulty={c.difficulty} />
          : <span key={i}>{part}</span>
      })}
    </span>
  )
}

export default function ConceptGraph({ onClose }) {
  const { graphNodes, rootQuery, understoodTerms, exploredTerms, exploreConcept, isLoadingConcept, followUpsMap, addFollowUp } = useExplorationStore()
  const { tree, width, height } = useMemo(() => buildTree(graphNodes), [graphNodes])
  
  const [hoveredNode, setHoveredNode] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  
  const [isMaximized, setIsMaximized] = useState(false)
  const [zoom, setZoom] = useState(1)

  const messagesEndRef = useRef(null)

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [followUpsMap, selectedNode])

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
    setSelectedNode(node)
  }

  const triggerDeepSearch = () => {
    if (isLoadingConcept || !selectedNode || !selectedNode.isUnexplored) return
    const parent = getNodeById(selectedNode.parentId)
    const parentAnswer = parent ? parent.explanation : ''
    exploreConcept(selectedNode.id, parentAnswer)
  }

  const handleFollowUp = async (e) => {
    e.preventDefault()
    const q = followUpInput.trim()
    if (!q || followUpLoading || !selectedNode) return
    setFollowUpLoading(true)
    setFollowUpInput('')
    
    const contextKey = selectedNode.id
    addFollowUp(contextKey, { question: q, answer: null, concepts: [] })
    
    try {
      const res = await api.post('/api/followup', { question: q, context: selectedNode.explanation, root_query: rootQuery })
      addFollowUp(contextKey, { question: null, answer: res.data.answer, concepts: res.data.concepts })
    } catch {
      addFollowUp(contextKey, { question: null, answer: '⚠️ Could not get a response. Please try again.', concepts: [], isError: true })
    } finally {
      setFollowUpLoading(false)
    }
  }

  // Update selectedNode if it changes in graphNodes (e.g. after exploration completes)
  useEffect(() => {
    if (selectedNode) {
      const updated = graphNodes.find(n => n.id === selectedNode.id)
      if (updated && updated.isUnexplored !== selectedNode.isUnexplored) {
        setSelectedNode(updated)
      }
    }
  }, [graphNodes, selectedNode])

  const activeFollowUps = selectedNode ? (followUpsMap[selectedNode.id] || []) : []

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center animate-fade-up ${isMaximized ? 'p-0' : 'p-4 sm:p-8'}`}
      style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)' }}
      onMouseMove={handleMouseMove}>
      <div className={`relative w-full h-full overflow-hidden flex shadow-[0_0_80px_rgba(139,92,246,0.15)] border transition-all duration-300 ${isMaximized ? 'rounded-none max-w-none' : 'max-w-[1400px] rounded-3xl'}`}
        style={{ background: 'linear-gradient(145deg, var(--bg) 0%, var(--bg2) 100%)', borderColor: isMaximized ? 'transparent' : 'rgba(139,92,246,0.3)' }}>

        {/* ── LEFT: Graph Area ── */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${selectedNode ? 'w-2/3 max-w-[calc(100%-350px)]' : 'w-full'}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 backdrop-blur-md"
            style={{ borderBottom: '1px solid rgba(139,92,246,0.15)', background: 'rgba(0,0,0,0.2)' }}>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-700 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
                    <path d="M7 12h6m2-5-4 4m4 4-4-4"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400">
                    Concept Universe
                  </h2>
                  <p className="text-xs opacity-70" style={{ color: 'var(--text)' }}>{rootQuery}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Legend */}
              <div className="hidden md:flex items-center gap-4 text-xs font-medium px-4 py-2 rounded-2xl mr-2" 
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#c084fc] bg-[#c084fc]"/>Root</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#60a5fa] bg-[#60a5fa]"/>Explored</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#34d399] bg-[#34d399]"/>Understood</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400"/>Unexplored</span>
              </div>
              
              <button onClick={() => setIsMaximized(!isMaximized)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300"
                title={isMaximized ? "Restore window" : "Maximize window"}>
                {isMaximized ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>

              <button onClick={onClose}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
                title="Close graph">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Graph SVG */}
          <div className="overflow-auto flex-1 p-8 graph-container relative" style={{ cursor: 'grab' }}>
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            
            {/* Zoom Controls */}
            <div className="sticky top-4 left-full -translate-x-6 w-10 flex flex-col gap-2 z-10 opacity-70 hover:opacity-100 transition-opacity">
              <button onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white shadow-lg border border-white/10 flex justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button onClick={() => setZoom(1)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white shadow-lg border border-white/10 text-[10px] font-bold flex justify-center">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white shadow-lg border border-white/10 flex justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>

            <svg width={Math.max(width * zoom, 800)} height={Math.max(height * zoom, 600)} className="overflow-visible mx-auto mt-4 transition-all duration-300">
              <defs>
                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(139,92,246,0.6)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0.6)" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <g transform={`scale(${zoom})`} style={{ transformOrigin: '0 0', transition: 'transform 0.3s ease' }}>
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
                      stroke={isUnexploredEdge ? "rgba(100,116,139,0.4)" : "url(#edgeGrad)"} 
                      strokeWidth={isUnexploredEdge ? "1.5" : "2.5"}
                      strokeDasharray={isUnexploredEdge ? '6 6' : 'none'} 
                      style={{ transition: 'all 0.4s ease' }}
                    />
                  )
                })}

                {/* Nodes */}
                {tree.map((node) => {
                  const isUnderstood = understoodTerms.has(node.id)
                  const isExplored   = !node.isUnexplored
                  const isSelected   = selectedNode?.id === node.id
                  
                  const baseColor = isUnderstood ? '#34d399' : isExplored ? DEPTH_COLORS[Math.min(node.depth, 4)] : '#94a3b8'
                  const label = node.label?.length > 20 ? node.label.slice(0, 18) + '…' : node.label

                  return (
                    <g key={node.id} transform={`translate(${node.x},${node.y})`}
                       onClick={() => handleNodeClick(node)}
                       onMouseEnter={() => setHoveredNode(node)}
                       onMouseLeave={() => setHoveredNode(null)}
                       style={{ cursor: 'pointer', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                       className="hover:scale-105 origin-center">
                      
                      {/* Glow behind node */}
                      {(hoveredNode?.id === node.id || isSelected) && (
                        <rect width={NODE_W + 12} height={NODE_H + 12} x="-6" y="-6" rx="16"
                          fill="none" stroke={baseColor} strokeWidth="2" opacity="0.4" filter="url(#glow)" className="animate-pulse" />
                      )}

                      {/* Node Body */}
                      <rect width={NODE_W} height={NODE_H} rx="12"
                        fill={node.isUnexplored ? 'rgba(30,41,59,0.8)' : `rgba(30,41,59,0.95)`} 
                        stroke={isSelected ? '#ffffff' : baseColor} 
                        strokeWidth={isSelected ? "2.5" : "1.5"}
                        strokeDasharray={node.isUnexplored ? '5 4' : 'none'}
                        style={{ 
                          transition: 'all 0.3s ease', 
                          boxShadow: `0 8px 32px ${baseColor}33`,
                          backdropFilter: 'blur(8px)'
                        }} />
                      
                      {/* Understood checkmark */}
                      {isUnderstood && (
                        <circle cx={NODE_W - 14} cy={NODE_H / 2} r="8" fill="#059669" />
                      )}
                      {isUnderstood && (
                        <path d={`M${NODE_W - 17} ${NODE_H / 2} L${NODE_W - 15} ${NODE_H / 2 + 2} L${NODE_W - 11} ${NODE_H / 2 - 2}`} stroke="#fff" strokeWidth="1.5" fill="none" />
                      )}
                      
                      {/* Text */}
                      <text x={NODE_W / 2} y={NODE_H / 2 + 5} fontSize="13" fill={node.isUnexplored ? '#cbd5e1' : '#ffffff'}
                        textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600"
                        letterSpacing="0.3"
                        style={{ transition: 'all 0.3s ease' }}>
                        {label}
                      </text>
                      
                      {/* Depth Badge */}
                      {node.depth > 0 && (
                        <g transform={`translate(8, ${NODE_H / 2 - 8})`}>
                          <rect width="18" height="16" rx="4" fill={baseColor} opacity="0.2" />
                          <text x="9" y="11" fontSize="9" fill={baseColor} textAnchor="middle" fontWeight="bold">
                            D{node.depth}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* ── RIGHT: Side Panel for Follow-ups ── */}
        {selectedNode && (
          <div className="flex-1 max-w-[450px] min-w-[350px] flex flex-col animate-fade-left border-l"
            style={{ 
              background: 'rgba(15, 23, 42, 0.85)', 
              borderColor: 'rgba(255,255,255,0.1)',
              boxShadow: '-20px 0 50px rgba(0,0,0,0.3)' 
            }}>
            
            {/* Panel Header */}
            <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1">Concept Focus</div>
                <h3 className="text-lg font-bold text-white leading-tight">{selectedNode.label}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Panel Scroll Area (Explanation + Chat) */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
              
              {/* Concept Explanation Card */}
              <div className="p-5 rounded-2xl relative overflow-hidden"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <p className="text-[14px] leading-relaxed text-slate-200 relative z-10">
                  {!selectedNode.explanation ? (
                    selectedNode.isUnexplored ? "Explanation is not yet loaded for this concept." : "No explanation available."
                  ) : (
                    <GraphAnswerWithTerms 
                      text={selectedNode.explanation} 
                      concepts={graphNodes.filter(n => n.parentId === selectedNode.id).map(n => ({ term: n.label, difficulty: n.difficulty }))} 
                    />
                  )}
                </p>
                {isLoadingConcept && selectedNode.isUnexplored && (
                  <div className="mt-4 flex gap-1 relative z-10">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>

              {/* Deep Search Button for Unexplored Nodes */}
              {selectedNode.isUnexplored && (
                <div className="flex flex-col gap-3 items-center text-center mt-2">
                  <p className="text-xs text-slate-400">Deep search this concept to reveal its sub-concepts and dive deeper into the knowledge tree.</p>
                  <button 
                    onClick={triggerDeepSearch}
                    disabled={isLoadingConcept}
                    className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:opacity-50 rounded-xl font-bold text-white shadow-[0_4px_15px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2 transition-all">
                    {isLoadingConcept ? (
                      <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deep Searching...</>
                    ) : (
                      <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Deep Search Concept</>
                    )}
                  </button>
                </div>
              )}

              {/* Chat Thread */}
              {!selectedNode.isUnexplored && activeFollowUps.length > 0 && (
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-700/50" />
                    <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Follow-up Q&A</span>
                    <div className="h-px flex-1 bg-slate-700/50" />
                  </div>
                  {activeFollowUps.map((fu, i) => (
                    <div key={i} className="flex flex-col gap-2 animate-fade-up">
                      {fu.question && (
                        <div className="self-end max-w-[85%] text-sm px-4 py-2.5 rounded-2xl rounded-br-sm shadow-lg text-white"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                          {fu.question}
                        </div>
                      )}
                      {fu.answer === null ? (
                        <div className="self-start max-w-[85%] px-5 py-4 rounded-2xl rounded-tl-sm bg-slate-800/80 border border-slate-700">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      ) : (
                        <div className={`self-start max-w-[95%] text-[13.5px] leading-relaxed px-5 py-4 rounded-2xl rounded-tl-sm shadow-lg text-slate-200 border
                          ${fu.isError ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-slate-800/80 border-slate-700'}`}>
                          <GraphAnswerWithTerms text={fu.answer} concepts={fu.concepts} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Panel Input Area (Only for Explored Nodes) */}
            {!selectedNode.isUnexplored && (
              <div className="p-5 backdrop-blur-xl" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.9)' }}>
                <form onSubmit={handleFollowUp} 
                  className="flex gap-2 items-center p-1.5 rounded-2xl border bg-slate-900/50 focus-within:bg-slate-900 focus-within:border-violet-500/50 transition-all shadow-inner"
                  style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={e => setFollowUpInput(e.target.value)}
                    placeholder={`Ask about ${selectedNode.label}…`}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <button type="submit" disabled={!followUpInput.trim() || followUpLoading}
                    className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 transition-all shadow-[0_4px_15px_rgba(139,92,246,0.3)]">
                    {followUpLoading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    }
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
