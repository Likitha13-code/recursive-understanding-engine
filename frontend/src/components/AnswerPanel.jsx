import useExplorationStore from '../store/explorationStore'
import TermBadge from './TermBadge'

function AnswerWithTerms({ text, concepts }) {
  if (!concepts || concepts.length === 0)
    return <p className="text-slate-300 leading-relaxed text-[15px]">{text}</p>

  const termList = concepts.map((c) => c.term)
  const escaped = termList.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <p className="text-slate-300 leading-relaxed text-[15px]">
      {parts.map((part, i) => {
        const matched = termList.find((t) => t.toLowerCase() === part.toLowerCase())
        return matched
          ? <TermBadge key={i} term={matched} parentAnswer={text} />
          : <span key={i}>{part}</span>
      })}
    </p>
  )
}

function SkeletonLoader() {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 animate-fade-up">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="flex flex-col gap-2.5">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-[90%] rounded" />
        <div className="skeleton h-3 w-[75%] rounded" />
      </div>
      <div className="border-t border-white/5 pt-4 flex gap-2">
        {[80, 110, 90, 130].map((w, i) => (
          <div key={i} className="skeleton h-6 rounded-lg" style={{ width: w }} />
        ))}
      </div>
    </div>
  )
}

export default function AnswerPanel() {
  const { rootAnswer, stack, isLoadingAnswer, error } = useExplorationStore()

  if (isLoadingAnswer) return <SkeletonLoader />

  if (error) return (
    <div className="animate-fade-up glass rounded-2xl p-5 border-red-500/20 bg-red-950/20 text-red-400 text-sm flex items-center gap-3">
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {error}
    </div>
  )

  if (!rootAnswer) return null

  const current = stack.length > 0 ? stack[stack.length - 1] : null
  const display = current
    ? { text: current.explanation, concepts: current.concepts, label: current.term, depth: current.depth }
    : { text: rootAnswer.answer, concepts: rootAnswer.concepts, label: 'Answer', depth: 0 }

  return (
    <div className="animate-fade-up flex flex-col gap-3">
      <div className="glass rounded-2xl overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-center relative
          bg-gradient-to-r from-violet-950/40 via-violet-950/20 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-glow" />
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              {current ? `Exploring: ${display.label}` : 'Answer'}
            </span>
          </div>
          {current && (
            <span className="absolute right-4 text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
              depth {display.depth}
            </span>
          )}
        </div>

        {/* Answer text */}
        <div className="px-8 py-6 text-center">
          <AnswerWithTerms text={display.text} concepts={display.concepts} />
        </div>

        {/* Concept chips */}
        {display.concepts?.length > 0 && (
          <div className="px-8 py-4 border-t border-white/5 bg-white/[0.01] flex flex-col items-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-3">
              Click to explore
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {display.concepts.map((c) => (
                <TermBadge key={c.term} term={c.term} parentAnswer={display.text} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
