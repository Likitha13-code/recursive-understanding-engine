import { useEffect, useState, useRef } from 'react'
import QueryInput from './components/QueryInput'
import AnswerPanel from './components/AnswerPanel'
import BreadcrumbTrail from './components/BreadcrumbTrail'
import KnowledgeTree from './components/KnowledgeTree'
import ProgressTracker from './components/ProgressTracker'
import RelatedQuestions from './components/RelatedQuestions'
import ExportButton from './components/ExportButton'
import ShareButton from './components/ShareButton'
import ConceptGraph from './components/ConceptGraph'
import AuthModal from './components/AuthModal'
import ResetPasswordModal from './components/ResetPasswordModal'
import useExplorationStore from './store/explorationStore'
import useAuthStore from './store/authStore'
import api from './api'
import { wakeBackend } from './api'
import './index.css'

// ── Typewriter hook ────────────────────────────────────
function useTypewriter(text, speed = 55) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed(''); setDone(false)
    let i = 0
    const t = setInterval(() => {
      setDisplayed(text.slice(0, ++i))
      if (i >= text.length) { clearInterval(t); setTimeout(() => setDone(true), 1200) }
    }, speed)
    return () => clearInterval(t)
  }, [text, speed])
  return { displayed, done }
}

// ── Floating particles ─────────────────────────────────
const PARTICLES = [
  { size: 4,  left: '10%', delay: '0s',   duration: '7s',  color: 'rgba(139,92,246,0.8)'  },
  { size: 3,  left: '30%', delay: '1.5s', duration: '9s',  color: 'rgba(59,130,246,0.7)'  },
  { size: 5,  left: '50%', delay: '0.8s', duration: '6s',  color: 'rgba(236,72,153,0.7)'  },
  { size: 3,  left: '68%', delay: '2.5s', duration: '8s',  color: 'rgba(6,182,212,0.7)'   },
  { size: 4,  left: '82%', delay: '1s',   duration: '7.5s',color: 'rgba(139,92,246,0.8)'  },
  { size: 3,  left: '22%', delay: '3.2s', duration: '8.5s',color: 'rgba(167,139,250,0.7)' },
  { size: 4,  left: '60%', delay: '0.3s', duration: '9.5s',color: 'rgba(244,114,182,0.7)' },
  { size: 2,  left: '88%', delay: '2s',   duration: '6.5s',color: 'rgba(96,165,250,0.8)'  },
]

const EXAMPLES = [
  'What is LIME in AI?',
  'How does HTTPS work?',
  'What is quantum entanglement?',
  'What is gradient descent?',
]

export default function App() {
  const { displayed: typed, done: typingDone } = useTypewriter('Ask any question.')
  const {
    rootAnswer, isLoadingAnswer, isLoadingConcept, stack,
    setSuggestedQuery, memory, clearMemory, theme, toggleTheme,
    reset, restoreSession, loadSessionByQuery,
  } = useExplorationStore()
  const depthLevel = stack.length
  const { user, logout, initAuth } = useAuthStore()
  const hasContent = rootAnswer || isLoadingAnswer
  const [showGraph, setShowGraph] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [resetToken, setResetToken] = useState(null)
  const [cloudHistory, setCloudHistory] = useState([]) // sessions from DB

  // Wake backend on load + restore auth token in axios
  useEffect(() => { wakeBackend(); initAuth() }, [])

  // Load cloud session history when user is logged in
  useEffect(() => {
    if (!user) { setCloudHistory([]); return }
    api.get('/api/sessions/list')
      .then(({ data }) => setCloudHistory(data))
      .catch(() => {})
  }, [user])

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Handle URL params: ?share=<id> (DB share), #session=<base64> (hash share), ?q=<query>, ?token=<reset>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Password reset token
    const token = params.get('token')
    if (token) {
      setResetToken(token)
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    const shareId = params.get('share')
    if (shareId) {
      api.get(`/api/sessions/${shareId}`)
        .then(({ data }) => {
          restoreSession(data.session_data)
          window.history.replaceState(null, '', window.location.pathname)
        })
        .catch(() => {})
      return
    }

    const hash = window.location.hash
    if (hash.startsWith('#session=')) {
      try {
        const encoded = hash.slice('#session='.length)
        const session = JSON.parse(decodeURIComponent(escape(atob(encoded))))
        restoreSession(session)
        window.history.replaceState(null, '', window.location.pathname)
        return
      } catch {}
    }

    const q = params.get('q')
    if (q) setSuggestedQuery(decodeURIComponent(q))
  }, [setSuggestedQuery, restoreSession])

  const isDark = theme === 'dark'

  return (
    <>
      {/* ── Fixed animated background (fills full screen behind everything) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="dot-grid absolute inset-0" />
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        {PARTICLES.map((p, i) => (
          <div key={i} className="particle" style={{
            width: p.size, height: p.size, left: p.left, bottom: '5%',
            color: p.color, background: p.color,
            animationDelay: p.delay, animationDuration: p.duration,
          }} />
        ))}
      </div>

      {/* ── Depth overlay ── */}
      <div className="fixed inset-0 z-[1] pointer-events-none transition-all duration-1000"
        style={{ background: `rgba(0,0,0,${Math.min(depthLevel * 0.045, 0.22)})` }} />

      {/* ── App grid ── */}
      <div className="app-grid" style={{ color: 'var(--text)' }}>

        {/* ── HEADER ── */}
        <header className="app-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-700 flex items-center justify-center"
              style={{ boxShadow: '0 0 20px rgba(139,92,246,0.5)' }}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none tracking-tight" style={{ color: 'var(--text)' }}>
                Recursive Understanding Engine
              </h1>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Deep knowledge, layer by layer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasContent && (
              <button onClick={reset} title="Home"
                className="p-1.5 rounded-lg border transition-all hover:border-violet-500/40 hover:text-violet-400"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </button>
            )}
            {rootAnswer && (
              <>
                <ExportButton />
                <ShareButton />
                <button onClick={() => setShowGraph(true)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all hover:border-violet-500/40 hover:text-violet-400"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
                    <path d="M7 12h6m2-5-4 4m4 4-4-4"/>
                  </svg>
                  Graph
                </button>
              </>
            )}
            {stack.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                {stack.length} deep
              </div>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] hidden sm:block" style={{ color: 'var(--text-dim)' }}>{user.email}</span>
                <button onClick={logout}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all hover:border-red-500/40 hover:text-red-400"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all hover:border-violet-500/40 hover:text-violet-400"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Sign in
              </button>
            )}
            <button onClick={toggleTheme}
              className="p-1.5 rounded-lg border transition-all hover:border-violet-500/40 hover:text-violet-400"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
              {isDark
                ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
          </div>
        </header>

        {/* ── LEFT SIDEBAR ── */}
        <aside className="app-left">
          {hasContent ? (
            <>
              <div className="sidebar-label">Knowledge Tree</div>
              <div className="sidebar-scroll px-3 pb-3 flex flex-col gap-3">
                <KnowledgeTree />
                <ProgressTracker />
              </div>
            </>
          ) : (
            <>
              <div className="sidebar-label">{user ? 'Your History' : 'Recent Searches'}</div>
              <div className="sidebar-scroll px-3 pb-3 flex flex-col gap-1.5">
                {user && cloudHistory.length > 0 && cloudHistory.slice(0, 12).map((s) => (
                  <button key={s.id}
                    onClick={async () => { const { data } = await api.get(`/api/sessions/${s.id}`); restoreSession(data.session_data) }}
                    className="flex items-center gap-2 text-left text-[11px] border rounded-xl px-3 py-2
                      hover:border-violet-500/40 transition-all duration-200"
                    style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                    <svg className="w-3 h-3 shrink-0 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                    </svg>
                    <span className="flex-1 truncate">{s.query}</span>
                    {s.bookmarked && <span className="text-yellow-400 text-[10px]">★</span>}
                  </button>
                ))}
                {!user && memory.length > 0 && (
                  <>
                    <div className="flex justify-end px-1 mb-1">
                      <button onClick={clearMemory} className="text-[10px] hover:text-red-400 transition-colors" style={{ color: 'var(--text-dim)' }}>Clear</button>
                    </div>
                    {memory.map((q, i) => (
                      <button key={i} onClick={() => { if (!loadSessionByQuery(q)) setSuggestedQuery(q) }}
                        className="flex items-center gap-2 text-left text-[11px] border rounded-xl px-3 py-2
                          hover:border-violet-500/40 transition-all duration-200"
                        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                        <svg className="w-3 h-3 shrink-0 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                        </svg>
                        <span className="truncate">{q}</span>
                      </button>
                    ))}
                  </>
                )}
                {!user && (
                  <button onClick={() => setShowAuth(true)}
                    className="flex items-center gap-2 text-[11px] border rounded-xl px-3 py-2 mt-2
                      hover:border-violet-500/40 hover:text-violet-300 transition-all duration-200"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    Sign in to sync history
                  </button>
                )}
              </div>
            </>
          )}
        </aside>

        {/* ── CENTER ── */}
        <main className="app-center">
          <div className="app-center-scroll">
            {hasContent ? (
              <div className="flex flex-col gap-5">
                {rootAnswer && <BreadcrumbTrail />}
                {isLoadingConcept && (
                  <div className="flex items-center justify-center py-4 animate-fade-up">
                    <div className="flex items-center gap-2 px-5 py-3 rounded-2xl"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                )}
                <AnswerPanel />
              </div>
            ) : (
              /* Landing hero */
              <div className="flex flex-col items-center justify-center text-center gap-6 h-full py-8 animate-fade-up">
                {/* Glowing icon */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.2))',
                      border: '1px solid rgba(139,92,246,0.4)',
                      boxShadow: '0 0 60px rgba(139,92,246,0.35), inset 0 0 30px rgba(139,92,246,0.1)',
                      animation: 'pulse-glow 3s ease infinite',
                    }}>
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="url(#iconGrad2)" strokeWidth="1.4">
                      <defs>
                        <linearGradient id="iconGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#60a5fa"/>
                        </linearGradient>
                      </defs>
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.25)', border: '2px solid rgba(139,92,246,0.4)', animation: 'pulse-glow 2s ease infinite' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  </div>
                </div>

                {/* Typewriter title */}
                <div className="max-w-lg">
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3 text-violet-400 opacity-80">
                    Recursive Understanding Engine
                  </div>
                  <h1 className="gradient-text text-4xl font-bold tracking-tight leading-tight mb-4 min-h-[1.2em]">
                    {typed}
                    {!typingDone && <span style={{ WebkitTextFillColor: '#c4b5fd', animation: 'none' }} className="animate-pulse">|</span>}
                  </h1>
                  {typingDone && (
                    <p className="subtitle-reveal text-base font-medium mb-3" style={{ color: '#c4b5fd' }}>
                      Understand every layer of it.
                    </p>
                  )}
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    RUE breaks every answer into clickable concepts you explore recursively — going as deep as you need.
                  </p>
                </div>

                {/* Example chips */}
                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((q) => (
                    <button key={q} onClick={() => setSuggestedQuery(q)}
                      className="text-[11px] border rounded-full px-4 py-1.5 transition-all duration-200
                        hover:border-violet-500/60 hover:text-violet-300 hover:-translate-y-0.5
                        hover:shadow-[0_4px_20px_rgba(139,92,246,0.2)]"
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pinned input bar */}
          <div className="app-center-input">
            <QueryInput />
          </div>
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="app-right">
          {hasContent ? (
            <>
              <div className="sidebar-label">Related Questions</div>
              <div className="sidebar-scroll px-3 pb-3">
                <RelatedQuestions />
              </div>
            </>
          ) : (
            <>
              <div className="sidebar-label">How it works</div>
              <div className="sidebar-scroll px-3 pb-3 flex flex-col gap-3">
                {[
                  { icon: '❓', title: 'Ask anything', desc: 'Type any question — science, tech, history, concepts', color: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
                  { icon: '🔍', title: 'Concepts highlighted', desc: 'Key terms are extracted with difficulty badges (B/I/A)', color: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)'  },
                  { icon: '∞',  title: 'Explore recursively', desc: 'Click any term to go deeper — unlimited levels', color: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.25)'  },
                  { icon: '💬', title: 'Follow-up chat', desc: 'Ask follow-up questions on any answer with voice & files', color: 'rgba(6,182,212,0.10)', border: 'rgba(6,182,212,0.25)' },
                  { icon: '✓',  title: 'Track progress', desc: 'Mark concepts understood — watch your comprehension grow', color: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
                  { icon: '☁️', title: 'Cloud sync', desc: 'Sign in to save and restore sessions across devices', color: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
                ].map((f) => (
                  <div key={f.title} className="rounded-xl p-3 flex gap-3"
                    style={{ background: f.color, border: `1px solid ${f.border}` }}>
                    <span className="text-base shrink-0 mt-0.5">{f.icon}</span>
                    <div>
                      <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{f.title}</p>
                      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

      </div>{/* end app-grid */}

      {/* ── Modals ── */}
      {showGraph && <ConceptGraph onClose={() => setShowGraph(false)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {resetToken && <ResetPasswordModal token={resetToken} onClose={() => { setResetToken(null); setShowAuth(true) }} />}
    </>
  )
}
