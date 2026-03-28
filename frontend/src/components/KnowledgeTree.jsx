import useExplorationStore from '../store/explorationStore'

export default function KnowledgeTree() {
  const { rootQuery, rootAnswer, stack, popToDepth } = useExplorationStore()
  if (!rootAnswer) return null

  const nodes = [
    { label: rootQuery.length > 24 ? rootQuery.slice(0, 24) + '…' : rootQuery, depth: 0, isRoot: true },
    ...stack.map((n, i) => ({ label: n.term, depth: i + 1, isRoot: false })),
  ]

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2"
        style={{ color: 'var(--text-dim)' }}>Exploration Tree</p>

      {nodes.map((node, i) => {
        const isActive = i === nodes.length - 1
        return (
          <button key={i} onClick={() => popToDepth(node.depth)}
            style={{ paddingLeft: `${8 + node.depth * 14}px` }}
            className="flex items-center gap-2 text-left text-xs py-2 pr-3 rounded-xl w-full transition-all duration-150"
            style={{
              paddingLeft: `${8 + node.depth * 14}px`,
              background: isActive ? 'rgba(139,92,246,0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent',
              color: isActive ? '#7c3aed' : 'var(--text-muted)',
            }}>
            {node.isRoot
              ? <span className="text-violet-500 text-[10px]">◈</span>
              : <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>└</span>
            }
            {!node.isRoot && (
              <span className="text-[9px] font-mono px-1 py-0.5 rounded"
                style={{ background: isActive ? 'rgba(139,92,246,0.15)' : 'var(--card-bg)', color: isActive ? '#7c3aed' : 'var(--text-dim)' }}>
                D{node.depth}
              </span>
            )}
            <span className="truncate">{node.label}</span>
          </button>
        )
      })}

      {stack.length === 0 && (
        <p className="text-[11px] px-3 mt-1 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          Click highlighted terms to explore
        </p>
      )}
      {stack.length > 0 && (
        <div className="mt-3 px-2">
          <div className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
            {stack.length} level{stack.length > 1 ? 's' : ''} explored
          </div>
        </div>
      )}
    </div>
  )
}
