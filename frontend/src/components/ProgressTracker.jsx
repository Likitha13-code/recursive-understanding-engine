import useExplorationStore from '../store/explorationStore'

export default function ProgressTracker() {
  const { getProgress, rootAnswer } = useExplorationStore()
  if (!rootAnswer) return null

  const { explored, total, pct } = getProgress()
  const color = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#7c3aed'

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          Comprehension
        </p>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>

      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--divider)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>

      <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
        {explored} of {total} concept{total !== 1 ? 's' : ''} explored
      </p>

      {pct === 100 && (
        <p className="text-[11px] font-medium text-emerald-500 animate-fade-up">
          ✓ Full understanding reached!
        </p>
      )}
    </div>
  )
}
