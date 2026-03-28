import { useState, useEffect } from 'react'
import api from '../api'
import useExplorationStore from '../store/explorationStore'

export default function RelatedQuestions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const store = useExplorationStore()
  const { rootQuery, rootAnswer } = store

  useEffect(() => {
    if (!rootAnswer) { setQuestions([]); return }
    setLoading(true)
    api.post('/api/related', { question: rootQuery, answer: rootAnswer.answer })
      .then(({ data }) => setQuestions(data.questions || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [rootAnswer, rootQuery])

  const handleClick = async (q) => {
    const { reset, clearError, setLoadingAnswer, setRootQuery, setRootAnswer, saveToMemory, setError } = store
    reset(); clearError(); setLoadingAnswer(true); setRootQuery(q); saveToMemory(q)
    try {
      const { data } = await api.post('/api/answer', { question: q })
      setRootAnswer(data)
    } catch { setError('Failed to get answer.') }
    finally { setLoadingAnswer(false) }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-xs animate-fade-up" style={{ color: 'var(--text-dim)' }}>
      <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
      Finding related questions…
    </div>
  )

  if (!questions.length) return null

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3 animate-fade-up">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
        You might also explore
      </p>
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => (
          <button key={i} onClick={() => handleClick(q)}
            className="flex items-center gap-2.5 text-left text-sm rounded-xl px-4 py-2.5
              transition-all duration-200 group"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'
              e.currentTarget.style.color = '#7c3aed'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)'
              e.currentTarget.style.color = 'var(--text)'
            }}>
            <svg className="w-3.5 h-3.5 shrink-0 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
