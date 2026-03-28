import { useState, useRef } from 'react'
import useExplorationStore from '../store/explorationStore'
import TermBadge from './TermBadge'
import api from '../api'

// Renders answer text with difficulty-aware TermBadges
function AnswerWithTerms({ text, concepts }) {
  if (!concepts || concepts.length === 0)
    return <p className="leading-relaxed text-[15px]" style={{ color: 'var(--text)' }}>{text}</p>

  const conceptMap = Object.fromEntries(concepts.map((c) => [c.term.toLowerCase(), c]))
  const escaped = concepts.map((c) => c.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <p className="leading-relaxed text-[15px]" style={{ color: 'var(--text)' }}>
      {parts.map((part, i) => {
        const c = conceptMap[part.toLowerCase()]
        return c
          ? <TermBadge key={i} term={c.term} parentAnswer={text} difficulty={c.difficulty} />
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
        {[100, 90, 75].map((w, i) => <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />)}
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
    u.rate = 0.95; u.onend = u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u); setSpeaking(true)
  }
  return (
    <button onClick={toggle}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-200"
      style={speaking
        ? { background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.4)', color: '#7c3aed' }
        : { background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
      {speaking
        ? <><svg className="w-3.5 h-3.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Stop</>
        : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>Read aloud</>
      }
    </button>
  )
}

export default function AnswerPanel() {
  const { rootAnswer, stack, isLoadingAnswer, error, markUnderstood, followUpsMap, addFollowUp, rootQuery } = useExplorationStore()
  const [simplifying, setSimplifying] = useState(false)
  const [simplifiedData, setSimplifiedData] = useState(null) // { explanation, concepts }
  const [exploreFeedback, setExploreFeedback] = useState(false)
  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [showFloatCheck, setShowFloatCheck] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)
  const fileRef = useRef(null)
  const recognitionRef = useRef(null)

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
  const base = current
    ? { text: current.explanation, concepts: current.concepts, label: current.term, depth: current.depth }
    : { text: rootAnswer.answer, concepts: rootAnswer.concepts, label: 'Answer', depth: 0 }

  // If user clicked "Explain Simpler", show simplified version
  const display = simplifiedData
    ? { ...base, text: simplifiedData.explanation, concepts: simplifiedData.concepts }
    : base

  const handleSimplify = async () => {
    if (simplifying) return
    setSimplifying(true)
    try {
      const path = stack.map((n) => n.term)
      const { data } = await api.post('/api/simplify', {
        term: current?.term || base.label,
        current_explanation: base.text,
        exploration_path: path,
      })
      setSimplifiedData(data)
    } catch { /* silently fail */ }
    finally { setSimplifying(false) }
  }

  const handleGotIt = () => {
    setSimplifiedData(null)
    setShowFloatCheck(true)
    setTimeout(() => setShowFloatCheck(false), 950)
    if (current) markUnderstood(current.term)
  }

  const handleExploreFurther = () => {
    setSimplifiedData(null)
    setExploreFeedback(true)
    setTimeout(() => setExploreFeedback(false), 2000)
  }

  const contextKey = current ? current.term : (rootQuery || 'root')
  const followUps = followUpsMap[contextKey] || []

  const handleFollowUp = async (e) => {
    e.preventDefault()
    const q = followUpInput.trim()
    if ((!q && !attachedFile) || followUpLoading) return
    setFollowUpLoading(true)
    setFollowUpInput('')
    const displayQ = attachedFile ? `📄 ${attachedFile.name}${q ? ': ' + q : ''}` : q
    const fileToSend = attachedFile
    setAttachedFile(null)
    addFollowUp(contextKey, { question: displayQ, answer: null, concepts: [] })
    try {
      let data
      if (fileToSend) {
        const form = new FormData()
        form.append('file', fileToSend.file)
        form.append('question', q || 'Summarize this document.')
        const res = await api.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        data = res.data
      } else {
        const res = await api.post('/api/followup', { question: q, context: base.text, root_query: rootQuery })
        data = res.data
      }
      addFollowUp(contextKey, { question: null, answer: data.answer, concepts: data.concepts })
    } catch {
      addFollowUp(contextKey, { question: null, answer: '⚠️ Could not get a response. Please try again.', concepts: [], isError: true })
    } finally {
      setFollowUpLoading(false)
    }
  }

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const r = new SR()
    r.lang = 'en-US'; r.interimResults = false
    r.onresult = (e) => { setFollowUpInput(e.results[0][0].transcript); setIsListening(false) }
    r.onerror = r.onend = () => setIsListening(false)
    recognitionRef.current = r; r.start(); setIsListening(true)
  }

  const attachFile = (file) => {
    if (!file) return
    setAttachedFile({ file, name: file.name, type: file.type })
  }

  return (
    <div className="animate-fade-up">
      <div key={base.text?.slice(0, 30)} className="glass rounded-2xl overflow-hidden answer-glow">

        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-center relative"
          style={{ borderBottom: '1px solid var(--divider)', background: 'rgba(139,92,246,0.05)' }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse-glow" />
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-500">
              {current ? `Exploring: ${display.label}` : 'Answer'}
            </span>
            {simplifiedData && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                simplified
              </span>
            )}
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

        {/* Difficulty legend */}
        <div className="px-8 pb-3 flex justify-center gap-4 text-[10px]" style={{ color: 'var(--text-dim)' }}>
          {[['B', '#059669', 'Beginner'], ['I', '#7c3aed', 'Intermediate'], ['A', '#dc2626', 'Advanced']].map(([l, c, label]) => (
            <span key={l} className="flex items-center gap-1">
              <span className="font-bold" style={{ color: c }}>{l}</span> = {label}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 flex flex-col items-center gap-4"
          style={{ borderTop: '1px solid var(--divider)' }}>

          {/* Utility buttons row */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <SpeakButton text={display.text} />

            {/* Explain Simpler */}
            <button onClick={handleSimplify} disabled={simplifying}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-200"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
              {simplifying
                ? <><div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />Simplifying…</>
                : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Explain Simpler</>
              }
            </button>

            {simplifiedData && (
              <button onClick={() => setSimplifiedData(null)}
                className="text-xs px-2.5 py-1.5 rounded-lg border transition-all duration-200"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-dim)' }}>
                Show Original
              </button>
            )}
          </div>

          {/* Concept chips */}
          {display.concepts?.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                Click a concept to explore
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {display.concepts.map((c) => (
                  <TermBadge key={c.term} term={c.term} parentAnswer={display.text} difficulty={c.difficulty} />
                ))}
              </div>
            </>
          )}

          {/* ── "Got it" / "Explore Further" checkpoint ── */}
          {exploreFeedback && (
            <div className="text-xs px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 animate-fade-up">
              Keep exploring — click any concept above to dig deeper!
            </div>
          )}
          <div className="flex items-center gap-3 pt-2 w-full justify-center relative"
            style={{ borderTop: '1px solid var(--divider)', paddingTop: '16px' }}>
            {showFloatCheck && (
              <span className="float-check" style={{ left: '50%', transform: 'translateX(-50%)', bottom: '10px' }}>✓</span>
            )}
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              Do you understand this{current ? ` concept` : ` answer`}?
            </p>
            <button onClick={handleGotIt}
              className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold
                bg-emerald-500/10 border border-emerald-500/30 text-emerald-500
                hover:bg-emerald-500/20 transition-all duration-200
                ${showFloatCheck ? 'badge-bounce' : ''}`}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Got it!
            </button>
            <button onClick={handleExploreFurther}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold
                border transition-all duration-200"
              style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.3)', color: '#7c3aed' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Explore Further
            </button>
          </div>

        </div>
      </div>

      {/* ── Follow-up chat thread ── */}
      {followUps.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          {followUps.map((fu, i) => (
            <div key={i} className="animate-fade-up">
              {fu.question && (
                <div className="flex justify-end mb-2">
                  <div className="max-w-[85%] text-sm px-4 py-2.5 rounded-2xl rounded-br-sm"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: 'var(--text)' }}>
                    {fu.question}
                  </div>
                </div>
              )}
              {fu.answer === null && (
                <div className="glass rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}
              {fu.answer !== null && (
                <div className={`glass rounded-2xl rounded-tl-sm px-5 py-4 ${fu.isError ? 'opacity-60' : ''}`}>
                  <AnswerWithTerms text={fu.answer} concepts={fu.concepts} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Follow-up input ── */}
      <div className="mt-3 rounded-2xl overflow-hidden"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>

        {/* File attachment bar */}
        {attachedFile && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs"
            style={{ borderBottom: '1px solid var(--input-border)' }}>
            <span>{attachedFile.type?.startsWith('image/') ? '🖼️' : '📄'}</span>
            <span className="flex-1 truncate font-medium" style={{ color: 'var(--text)' }}>{attachedFile.name}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px]"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}>
              attached
            </span>
            <button type="button" onClick={() => setAttachedFile(null)}
              className="hover:text-red-400 transition-colors" style={{ color: 'var(--text-dim)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={handleFollowUp} className="flex gap-1 items-center px-2 py-1.5">
          <input
            type="text"
            value={followUpInput}
            onChange={e => setFollowUpInput(e.target.value)}
            placeholder={attachedFile ? `Ask about ${attachedFile.name}…` : isListening ? 'Listening…' : 'Ask a follow-up question…'}
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
            style={{ color: 'var(--text)', caretColor: '#7c3aed' }}
          />

          {/* Mic button */}
          <button type="button" onClick={toggleMic}
            className={`p-2 rounded-xl transition-all duration-200 ${isListening ? 'text-red-400 bg-red-500/15 animate-pulse' : 'hover:bg-violet-500/10 hover:text-violet-400'}`}
            style={{ color: isListening ? undefined : 'var(--text-dim)' }}
            title={isListening ? 'Stop listening' : 'Voice input'}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>

          {/* File attach button */}
          <button type="button" onClick={() => fileRef.current?.click()}
            className="p-2 rounded-xl hover:bg-violet-500/10 transition-all duration-200"
            style={{ color: attachedFile ? '#7c3aed' : 'var(--text-dim)' }}
            title="Attach file or image">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,image/*" className="hidden"
            onChange={e => { attachFile(e.target.files?.[0]); e.target.value = '' }} />

          {/* Send button */}
          <button type="submit" disabled={(!followUpInput.trim() && !attachedFile) || followUpLoading}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl
              bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-all">
            {followUpLoading
              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
            }
          </button>
        </form>
      </div>
    </div>
  )
}
