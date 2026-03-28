import useExplorationStore from '../store/explorationStore'

export default function ProgressTracker() {
  const { getProgress, rootAnswer } = useExplorationStore()
  if (!rootAnswer) return null

  const { explored, total, pct } = getProgress()

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Comprehension
        </p>
        <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 40 ? 'text-yellow-400' : 'text-violet-400'}`}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-violet-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[11px] text-slate-600">
        {explored} of {total} concept{total !== 1 ? 's' : ''} explored
      </p>

      {pct === 100 && (
        <p className="text-[11px] text-emerald-400 font-medium animate-fade-up">
          ✓ Full understanding reached!
        </p>
      )}
    </div>
  )
}
