import { useState } from 'react'
import useExplorationStore from '../store/explorationStore'
import TermBadge from './TermBadge'

function AnswerWithTerms({ text, concepts }) {
  if (!concepts || concepts.length === 0)
    return <p className="leading-relaxed text-[15px]" style={{ color: 'var(--text)' }}>{text}</p>

  const termList = concepts.map((c) => c.term)
  const escaped = termList.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <p className="leading-relaxed text-[15px]" style={{ color: 'var(--text)' }}>
      {parts.map((part, i) => {
        const matched = termList.find((t) => t.toLowerCase() === part.toLowerCase())
        return matched ? <TermBadge key={i} term={matched} parentAnswer={text} /> : <span key={i}>{part}</span>
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
      <div className="border-t pt-4 flex gap-2" style={{ borderColor: 'var(--divider)' }}>
        {[80, 110, 90, 130].map((w, i) => <div key={i} className="skeleton h-6 rounded-lg" style={{ width: w }} />)}
      </div>
    </div>
  )
}

function SpeakButton({ text }) {
  const [speaking, setSpeaking] = useState(false)
  const toggle = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.onend = u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u); setSpeaking(true)
  }
  return (
    <button onClick={toggle} title={speaking ? 'Stop' : 'Read aloud'}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-200"
      style={speaking
        ? { background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.4)', color: '#7c3aed' }
        : { background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
      {speaking ? (
        <><svg className="w-3.5 h-3.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Stop</>
      ) : (
        <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>Read aloud</>
      )}
    </button>
  )
}

export default function AnswerPanel() {
  const { rootAnswer, stack, isLoadingAnswer, error } = useExplorationStore()

  if (isLoadingAnswer) return <SkeletonLoader />

  if (error) return (
    <div className="animate-fade-up rounded-2xl p-5 text-sm flex items-center gap-3"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
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
    <div className="animate-fade-up">
      <div className="glass rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-center relative"
          style={{ borderBottom: '1px solid var(--divider)', background: 'rgba(139,92,246,0.05)' }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse-glow" />
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">
              {current ? `Exploring: ${display.label}` : 'Answer'}
            </span>
          </div>
          {current && (
            <span className="absolute right-4 text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-dim)' }}>
              depth {display.depth}
            </span>
          )}
        </div>

        {/* Answer text */}
        <div className="px-8 py-6 text-center">
          <AnswerWithTerms text={display.text} concepts={display.concepts} />
        </div>

        {/* Footer */}
        <div className="px-8 py-4 flex flex-col items-center gap-3"
          style={{ borderTop: '1px solid var(--divider)' }}>
          <SpeakButton text={display.text} />
          {display.concepts?.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                Click to explore
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {display.concepts.map((c) => <TermBadge key={c.term} term={c.term} parentAnswer={display.text} />)}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
