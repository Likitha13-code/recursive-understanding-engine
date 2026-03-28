import useExplorationStore from '../store/explorationStore'

export default function ProgressTracker() {
  const { getProgress, rootAnswer } = useExplorationStore()
  if (!rootAnswer) return null

  const { explored, total, pct } = getProgress()

  // Smooth color: spectrum gradient, position shifts with progress
  // Low % → see violet end, high % → see green end
  const barStyle = {
    width: `${pct}%`,
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #f59e0b, #34d399, #10b981)',
    backgroundSize: '500% 100%',
    backgroundPosition: `${100 - pct}% 0`,
    transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1), background-position 0.7s ease',
    boxShadow: pct >= 80
      ? '0 0 10px rgba(16,185,129,0.5)'
      : pct >= 40
      ? '0 0 10px rgba(245,158,11,0.4)'
      : '0 0 10px rgba(124,58,237,0.4)',
  }

  const labelColor = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#a78bfa'

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          Comprehension
        </p>
        <span className="text-xs font-bold transition-colors duration-700" style={{ color: labelColor }}>{pct}%</span>
      </div>

      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--divider)' }}>
        <div style={barStyle} />
      </div>

      <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
        {explored} of {total} concept{total !== 1 ? 's' : ''} explored
      </p>

      {pct === 100 && (
        <p className="text-[11px] font-medium text-emerald-400 animate-fade-up">
          ✓ Full understanding reached!
        </p>
      )}
    </div>
  )
}
