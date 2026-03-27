import { useState, useEffect, useRef } from 'react'
import api from '../api'
import useExplorationStore from '../store/explorationStore'

export default function QueryInput() {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef(null)
  const recognitionRef = useRef(null)

  const {
    setRootQuery, setRootAnswer, setLoadingAnswer,
    setError, clearError, reset, isLoadingAnswer,
    suggestedQuery, setSuggestedQuery, saveToMemory,
  } = useExplorationStore()

  // Pick up suggested query from landing page chips
  useEffect(() => {
    if (suggestedQuery) {
      setInput(suggestedQuery)
      setSuggestedQuery('')
    }
  }, [suggestedQuery, setSuggestedQuery])

  // ── Submit text question ──────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    reset(); clearError()
    setLoadingAnswer(true)
    setRootQuery(input)
    saveToMemory(input)
    try {
      const { data } = await api.post('/api/answer', { question: input })
      setRootAnswer(data)
    } catch {
      setError('Failed to get answer. Make sure the backend is running.')
    } finally {
      setLoadingAnswer(false)
    }
  }

  // ── Voice input ───────────────────────────────────────
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Try Chrome.')
      return
    }
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  // ── File upload ───────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return
    reset(); clearError()
    setLoadingAnswer(true)
    const q = input.trim() || 'Summarize this document.'
    setRootQuery(`📄 ${file.name}: ${q}`)
    saveToMemory(`📄 ${file.name}: ${q}`)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('question', q)
      const { data } = await api.post('/api/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setRootAnswer(data)
    } catch {
      setError('Failed to process file. Make sure the backend is running.')
    } finally {
      setLoadingAnswer(false)
    }
  }

  const onFileChange = (e) => handleFile(e.target.files?.[0])
  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${isDragging ? 'ring-2 ring-violet-500' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 items-center bg-[#0f0f1a] border border-white/8 rounded-2xl p-1.5 pl-4
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
            placeholder={isDragging ? 'Drop file here…' : 'Ask anything or drop a file…'}
            className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-600 text-sm py-2"
            disabled={isLoadingAnswer}
          />

          {/* Voice button */}
          <button type="button" onClick={toggleVoice} disabled={isLoadingAnswer}
            title="Voice input"
            className={`p-2 rounded-xl transition-all duration-200 ${
              isListening
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'text-slate-500 hover:text-violet-400 hover:bg-violet-900/30'
            }`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>

          {/* File upload button */}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={isLoadingAnswer}
            title="Upload PDF or image"
            className="p-2 rounded-xl text-slate-500 hover:text-violet-400 hover:bg-violet-900/30 transition-all duration-200">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,image/*" className="hidden" onChange={onFileChange} />

          {/* Submit button */}
          <button type="submit" disabled={isLoadingAnswer || !input.trim()}
            className="shrink-0 flex items-center gap-2 bg-violet-600 hover:bg-violet-500
              disabled:opacity-35 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl
              text-sm font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            {isLoadingAnswer ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Thinking…</>
            ) : (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/></svg>Explore</>
            )}
          </button>
        </div>
      </form>

      {/* Drag hint */}
      {isDragging && (
        <div className="mt-2 text-center text-xs text-violet-400 animate-fade-up">
          Drop your PDF or image to analyze it
        </div>
      )}
    </div>
  )
}
