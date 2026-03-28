import { useState, useEffect, useRef } from 'react'
import api from '../api'
import useExplorationStore from '../store/explorationStore'

export default function QueryInput() {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null) // { file, name, type }
  const fileRef = useRef(null)
  const recognitionRef = useRef(null)

  const {
    setRootQuery, setRootAnswer, setLoadingAnswer,
    setError, clearError, reset, isLoadingAnswer,
    suggestedQuery, setSuggestedQuery, saveToMemory,
  } = useExplorationStore()

  useEffect(() => {
    if (suggestedQuery) { setInput(suggestedQuery); setSuggestedQuery('') }
  }, [suggestedQuery, setSuggestedQuery])

  const submitQuestion = async (question) => {
    reset(); clearError(); setLoadingAnswer(true)
    setRootQuery(question); saveToMemory(question)
    try {
      const { data } = await api.post('/api/answer', { question })
      setRootAnswer(data)
    } catch { setError('Failed to get answer. Make sure the backend is running.') }
    finally { setLoadingAnswer(false) }
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const q = input.trim()

    if (attachedFile) {
      const question = q || 'Summarize this document.'
      reset(); clearError(); setLoadingAnswer(true)
      setRootQuery(`📄 ${attachedFile.name}: ${question}`)
      saveToMemory(`📄 ${attachedFile.name}: ${question}`)
      try {
        const form = new FormData()
        form.append('file', attachedFile.file)
        form.append('question', question)
        const { data } = await api.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        setRootAnswer(data)
      } catch { setError('Failed to process file.') }
      finally { setLoadingAnswer(false); setAttachedFile(null); setInput('') }
      return
    }

    if (!q) return
    setInput('')
    await submitQuestion(q)
  }

  // Voice: captures question and auto-submits
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Voice input not supported. Use Chrome.'); return }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const r = new SR()
    r.lang = 'en-US'; r.interimResults = false
    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
      // Auto-submit voice question immediately
      submitQuestion(transcript)
    }
    r.onerror = r.onend = () => setIsListening(false)
    recognitionRef.current = r; r.start(); setIsListening(true)
  }

  // File: attach without submitting — let user add a question then click Explore
  const attachFile = (file) => {
    if (!file) return
    setAttachedFile({ file, name: file.name, type: file.type })
  }

  const removeAttachment = () => {
    setAttachedFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const isImage = attachedFile?.type?.startsWith('image/')
  const submitDisabled = isLoadingAnswer || (!input.trim() && !attachedFile)

  return (
    <div className={`glow-ring ${isDragging ? 'ring-2 ring-violet-500' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); attachFile(e.dataTransfer.files?.[0]) }}
    >
      {/* Attachment preview bar */}
      {attachedFile && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-t-2xl text-xs"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--input-border)', borderBottom: 'none' }}>
          <span className="text-lg">{isImage ? '🖼️' : '📄'}</span>
          <span className="flex-1 truncate font-medium" style={{ color: 'var(--text)' }}>{attachedFile.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
            {isImage ? 'Image' : 'Document'} attached
          </span>
          <button onClick={removeAttachment} title="Remove"
            className="p-0.5 rounded hover:text-red-400 transition-colors"
            style={{ color: 'var(--text-dim)' }}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={`flex gap-2 items-center p-1.5 pl-4
          focus-within:ring-2 focus-within:ring-violet-500/50 transition-all duration-300
          ${attachedFile ? 'rounded-b-2xl' : 'rounded-2xl'}`}
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>

          <svg className="w-4 h-4 text-violet-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>

          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={
              isDragging ? 'Drop file here…'
              : isListening ? 'Listening…'
              : attachedFile ? `Ask a question about ${attachedFile.name}…`
              : 'Ask anything or drop a file…'
            }
            className="flex-1 bg-transparent outline-none text-sm py-2"
            style={{ color: 'var(--text)', caretColor: '#7c3aed' }}
            disabled={isLoadingAnswer} />

          {/* Voice mic */}
          <button type="button" onClick={toggleVoice} disabled={isLoadingAnswer} title={isListening ? 'Stop listening' : 'Ask with voice'}
            className={`p-2 rounded-xl transition-all duration-200 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-violet-500/10 hover:text-violet-500'}`}
            style={{ color: isListening ? undefined : 'var(--text-dim)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>

          {/* File attach */}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={isLoadingAnswer}
            title={attachedFile ? 'Change attachment' : 'Attach PDF or image'}
            className="p-2 rounded-xl hover:bg-violet-500/10 transition-all duration-200"
            style={{ color: attachedFile ? '#7c3aed' : 'var(--text-dim)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,image/*" className="hidden"
            onChange={(e) => { attachFile(e.target.files?.[0]); e.target.value = '' }} />

          {/* Submit */}
          <button type="submit" disabled={submitDisabled}
            className="shrink-0 flex items-center gap-2 btn-shimmer
              disabled:opacity-35 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl
              text-sm font-semibold transition-all duration-200
              hover:scale-105 hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]">
            {isLoadingAnswer
              ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Thinking…</>
              : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Explore</>
            }
          </button>
        </div>
      </form>

      {isDragging && (
        <div className="mt-2 text-center text-xs text-violet-500 animate-fade-up">
          Drop your PDF or image to attach it, then type your question
        </div>
      )}
    </div>
  )
}
