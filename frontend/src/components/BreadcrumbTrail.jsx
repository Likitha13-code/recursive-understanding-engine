import useExplorationStore from '../store/explorationStore'

export default function BreadcrumbTrail() {
  const { rootQuery, stack, popToDepth } = useExplorationStore()
  if (!rootQuery) return null

  const crumbs = [
    { label: rootQuery.length > 28 ? rootQuery.slice(0, 28) + '…' : rootQuery, depth: 0 },
    ...stack.map((n, i) => ({ label: n.term, depth: i + 1 })),
  ]

  return (
    <div className="flex items-center flex-wrap gap-1 text-xs text-slate-500">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <svg className="w-3 h-3 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          )}
          <button
            onClick={() => i < crumbs.length - 1 && popToDepth(crumb.depth)}
            className={`px-2 py-0.5 rounded-md transition-all duration-150 ${
              i === crumbs.length - 1
                ? 'text-violet-400 bg-violet-950/40 border border-violet-500/25 cursor-default font-medium'
                : 'hover:text-slate-300 hover:bg-white/5 cursor-pointer'
            }`}
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </div>
  )
}
