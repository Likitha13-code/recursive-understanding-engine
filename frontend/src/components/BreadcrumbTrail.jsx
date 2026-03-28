import useExplorationStore from '../store/explorationStore'

export default function BreadcrumbTrail() {
  const { rootQuery, stack, popToDepth } = useExplorationStore()
  if (!rootQuery) return null

  const crumbs = [
    { label: rootQuery.length > 28 ? rootQuery.slice(0, 28) + '…' : rootQuery, depth: 0 },
    ...stack.map((n, i) => ({ label: n.term, depth: i + 1 })),
  ]

  return (
    <div className="flex items-center flex-wrap gap-1 text-xs" style={{ color: 'var(--text-dim)' }}>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: 'var(--text-dim)' }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          )}
          <button
            onClick={() => i < crumbs.length - 1 && popToDepth(crumb.depth)}
            className="px-2 py-0.5 rounded-md transition-all duration-150"
            style={i === crumbs.length - 1
              ? { color: '#7c3aed', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', cursor: 'default', fontWeight: 500 }
              : { color: 'var(--text-muted)', cursor: 'pointer' }}>
            {crumb.label}
          </button>
        </span>
      ))}
    </div>
  )
}
