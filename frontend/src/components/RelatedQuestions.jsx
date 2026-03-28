import { useState, useEffect } from 'react'
import api from '../api'
import useExplorationStore from '../store/explorationStore'

export default function RelatedQuestions() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const { rootQuery, rootAnswer, setSuggestedQuery, reset, clearError, setLoadingAnswer, setRootQuery, setRootAnswer, saveToMemory } = useExplorationStore()

  useEffect(() => {
    if (!rootAnswer) { setQuestions([]); return }
    setLoading(true)
    api.post('/api/related', { question: rootQuery, answer: rootAnswer.answer })
      .then(({ data }) => setQuestions(data.questions || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [rootAnswer, rootQuery])

  const handleClick = async (q) => {
    reset(); clearError()
    setLoadingAnswer(true)
    setRootQuery(q)
    saveToMemory(q)
    try {
      const { data } = await api.post('/api/answer', { question: q })
      setRootAnswer(data)
    } catch {
      useExplorationStore.getState().setError('Failed to get answer.')
    } finally {
      setLoadingAnswer(false)
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-slate-600 animate-fade-up">
      <div className="w-3 h-3 border border-slate-600 border-t-transparent rounded-full animate-spin" />
      Finding related questions…
    </div>
  )

  if (!questions.length) return null

  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-3 animate-fade-up">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        You might also explore
      </p>
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => (
          <button key={i} onClick={() => handleClick(q)}
            className="flex items-center gap-2.5 text-left text-sm text-slate-300
              bg-white/[0.02] border border-white/6 rounded-xl px-4 py-2.5
              hover:bg-violet-900/20 hover:border-violet-500/30 hover:text-violet-300
              transition-all duration-200 group">
            <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-violet-400 shrink-0 transition-colors"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
