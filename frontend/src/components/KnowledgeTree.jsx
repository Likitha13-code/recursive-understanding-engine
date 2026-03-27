import useExplorationStore from '../store/explorationStore'

export default function KnowledgeTree() {
  const { rootQuery, rootAnswer, stack, popToDepth } = useExplorationStore()
  if (!rootAnswer) return null

  const nodes = [
    { label: rootQuery.length > 26 ? rootQuery.slice(0, 26) + '…' : rootQuery, depth: 0, isRoot: true },
    ...stack.map((n, i) => ({ label: n.term, depth: i + 1, isRoot: false })),
  ]

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-2 mb-2">
        Exploration Tree
      </p>
      {nodes.map((node, i) => {
        const isActive = i === nodes.length - 1
        return (
          <button
            key={i}
            onClick={() => popToDepth(node.depth)}
            style={{ paddingLeft: `${8 + node.depth * 14}px` }}
            className={`flex items-center gap-2 text-left text-xs py-2 pr-3 rounded-xl w-full
              transition-all duration-150
              ${isActive
                ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
          >
            {node.isRoot
              ? <span className="text-violet-500 text-[10px]">◈</span>
              : <span className="text-slate-700 text-[10px]">└</span>
            }
            {!node.isRoot && (
              <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                isActive ? 'bg-violet-900/50 text-violet-400' : 'bg-white/5 text-slate-600'
              }`}>
                D{node.depth}
              </span>
            )}
            <span className="truncate">{node.label}</span>
          </button>
        )
      })}

      {stack.length === 0 && (
        <p className="text-[11px] text-slate-700 px-3 mt-1 leading-relaxed">
          Click any highlighted term to go deeper
        </p>
      )}

      {stack.length > 0 && (
        <div className="mt-3 px-2">
          <div className="text-[10px] text-slate-600 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
            {stack.length} level{stack.length > 1 ? 's' : ''} explored
          </div>
        </div>
      )}
    </div>
  )
}
