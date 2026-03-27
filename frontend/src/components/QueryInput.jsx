import { useState, useEffect } from 'react'
import api from '../api'
import useExplorationStore from '../store/explorationStore'

export default function QueryInput() {
  const [input, setInput] = useState('')
  const {
    setRootQuery, setRootAnswer, setLoadingAnswer,
    setError, clearError, reset, isLoadingAnswer,
    suggestedQuery, setSuggestedQuery,
  } = useExplorationStore()

  useEffect(() => {
    if (suggestedQuery) {
      setInput(suggestedQuery)
      setSuggestedQuery('')
    }
  }, [suggestedQuery, setSuggestedQuery])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    reset()
    clearError()
    setLoadingAnswer(true)
    setRootQuery(input)
    try {
      const { data } = await api.post('/api/answer', { question: input })
      setRootAnswer(data)
    } catch {
      setError('Failed to get answer. Make sure the backend is running on port 8000.')
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center gap-3 rounded-2xl p-1.5 pl-4
        bg-[#0f0f1a] border border-white/8
        focus-within:border-violet-500/60 focus-within:shadow-[0_0_24px_rgba(139,92,246,0.15)]
        transition-all duration-300">
        {/* Search icon */}
        <svg className="w-4 h-4 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything — e.g. What is LIME in AI?"
          className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-600 text-sm py-2"
          disabled={isLoadingAnswer}
        />
        <button
          type="submit"
          disabled={isLoadingAnswer || !input.trim()}
          className="shrink-0 flex items-center gap-2 bg-violet-600 hover:bg-violet-500
            disabled:opacity-35 disabled:cursor-not-allowed
            text-white px-5 py-2.5 rounded-xl text-sm font-semibold
            transition-all duration-200 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
        >
          {isLoadingAnswer ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Thinking…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              Explore
            </>
          )}
        </button>
      </div>
    </form>
  )
}
