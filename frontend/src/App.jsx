import { useEffect, useState } from 'react'
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

const EXAMPLES = [
  'What is LIME in AI?',
  'How does HTTPS work?',
  'What is quantum entanglement?',
  'What is gradient descent?',
]

export default function App() {
  const {
    rootAnswer, isLoadingAnswer, isLoadingConcept, stack,
    setSuggestedQuery, memory, clearMemory, theme, toggleTheme,
    reset, restoreSession, loadSessionByQuery,
  } = useExplorationStore()
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
    <div className="min-h-screen text-slate-100 flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header className="border-b px-6 py-4 flex items-center justify-between
        backdrop-blur-sm sticky top-0 z-20"
        style={{ borderColor: 'var(--border)', background: isDark ? 'rgba(7,7,15,0.85)' : 'rgba(248,247,255,0.85)' }}>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-700
            flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none tracking-tight" style={{ color: 'var(--text)' }}>
              Recursive Understanding Engine
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Deep knowledge, layer by layer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Home / Reset button */}
          {hasContent && (
            <button onClick={reset} title="Back to home"
              className="p-2 rounded-xl border transition-all duration-200
                hover:border-violet-500/40 hover:text-violet-400"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </button>
          )}

          {/* Export + Share + Graph (only when content exists) */}
          {rootAnswer && (
            <>
              <ExportButton />
              <ShareButton />
              {/* Concept Graph toggle */}
              <button onClick={() => setShowGraph(true)} title="View Concept Graph"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all duration-200
                  hover:border-violet-500/40 hover:text-violet-400"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>
                  <path d="M7 12h6m2-5-4 4m4 4-4-4"/>
                </svg>
                Graph
              </button>
            </>
          )}

          {/* Depth badge */}
          {stack.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-violet-950/50 text-violet-300
              border border-violet-500/25 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              {stack.length} level{stack.length > 1 ? 's' : ''} deep
            </div>
          )}

          {/* Login / User button */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs hidden sm:block" style={{ color: 'var(--text-dim)' }}>{user.email}</span>
              <button onClick={logout} title="Sign out"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all duration-200
                  hover:border-red-500/40 hover:text-red-400"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} title="Sign in"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all duration-200
                hover:border-violet-500/40 hover:text-violet-400"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Sign in
            </button>
          )}

          {/* Theme toggle */}
          <button onClick={toggleTheme} title="Toggle theme"
            className="p-2 rounded-xl border transition-all duration-200
              hover:border-violet-500/40 hover:text-violet-400"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
            {isDark ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        {hasContent ? (
          <aside className="hidden lg:flex flex-col w-56 shrink-0 overflow-y-auto p-4 gap-4"
            style={{ borderRight: `1px solid var(--border)`, background: 'var(--bg3)' }}>
            <KnowledgeTree />
            <ProgressTracker />
          </aside>
        ) : (
          <div className="hidden lg:block w-56 shrink-0" />
        )}

        {/* Center */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">

            <QueryInput />

            {rootAnswer && <BreadcrumbTrail />}

            {isLoadingConcept && (
              <div className="flex items-center justify-center gap-2.5 text-xs text-slate-500 animate-fade-up">
                <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
                Fetching explanation…
              </div>
            )}

            <AnswerPanel />

            {/* Related questions — shown below answer */}
            {rootAnswer && !isLoadingAnswer && <RelatedQuestions />}

            {/* Landing state */}
            {!hasContent && (
              <div className="flex flex-col items-center text-center gap-6 py-16 animate-fade-up">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/30 to-blue-700/30
                    border border-violet-500/20 flex items-center justify-center
                    shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                    <svg className="w-9 h-9 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-500/60 border border-violet-400/40" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-blue-500/60 border border-blue-400/40" />
                </div>

                <div className="max-w-sm">
                  <h2 className="text-2xl font-semibold mb-2 tracking-tight" style={{ color: 'var(--text)' }}>
                    Start Exploring
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Ask any question. RUE breaks down the answer into clickable concepts
                    you can explore recursively — until you{' '}
                    <span className="font-medium" style={{ color: 'var(--text)' }}>truly</span> understand.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((q) => (
                    <button key={q} onClick={() => setSuggestedQuery(q)}
                      className="text-xs border rounded-full px-4 py-2 transition-all duration-200
                        hover:border-violet-500/40 hover:text-violet-400"
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                      {q}
                    </button>
                  ))}
                </div>

                {/* Cloud history (logged in) */}
                {user && cloudHistory.length > 0 && (
                  <div className="w-full max-w-md">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <svg className="w-3 h-3 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                      </svg>
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                        Your history
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {cloudHistory.slice(0, 8).map((s) => (
                        <button key={s.id}
                          onClick={async () => {
                            const { data } = await api.get(`/api/sessions/${s.id}`)
                            restoreSession(data.session_data)
                          }}
                          className="flex items-center gap-2.5 text-left text-xs border rounded-xl px-3 py-2
                            hover:border-violet-500/30 transition-all duration-200"
                          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ color: 'var(--text-dim)' }}>
                            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                          </svg>
                          <span className="flex-1 truncate">{s.query}</span>
                          {s.bookmarked && <span className="text-yellow-400 text-[10px]">★</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Local recent searches (not logged in) */}
                {!user && memory.length > 0 && (
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                        Recent searches
                      </p>
                      <button onClick={clearMemory} className="text-[10px] hover:text-red-400 transition-colors"
                        style={{ color: 'var(--text-dim)' }}>Clear</button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {memory.map((q, i) => (
                        <button key={i} onClick={() => { if (!loadSessionByQuery(q)) setSuggestedQuery(q) }}
                          className="flex items-center gap-2.5 text-left text-xs border rounded-xl px-3 py-2
                            hover:border-violet-500/30 transition-all duration-200"
                          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ color: 'var(--text-dim)' }}>
                            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                          </svg>
                          <span className="truncate">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sign-in prompt when not logged in */}
                {!user && (
                  <button onClick={() => setShowAuth(true)}
                    className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border transition-all duration-200
                      hover:border-violet-500/40 hover:text-violet-400"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--card-bg)' }}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    Sign in to sync history across devices
                  </button>
                )}

                <div className="grid grid-cols-3 gap-3 mt-2 w-full max-w-md">
                  {[
                    { icon: '❓', title: 'Ask',      desc: 'Type any question' },
                    { icon: '🔍', title: 'Identify', desc: 'Key concepts highlighted' },
                    { icon: '∞',  title: 'Recurse',  desc: 'Explore until you understand' },
                  ].map((step) => (
                    <div key={step.title} className="glass rounded-xl p-3 flex flex-col items-center gap-1.5 text-center">
                      <span className="text-lg">{step.icon}</span>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{step.title}</p>
                      <p className="text-[11px] leading-snug" style={{ color: 'var(--text-dim)' }}>{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right balancer */}
        {hasContent ? (
          <div className="hidden lg:block w-56 shrink-0" style={{ borderLeft: `1px solid var(--border)`, background: 'var(--bg3)' }} />
        ) : (
          <div className="hidden lg:block w-56 shrink-0" />
        )}

      </div>

      {/* Concept Graph Modal */}
      {showGraph && <ConceptGraph onClose={() => setShowGraph(false)} />}

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Reset Password Modal */}
      {resetToken && <ResetPasswordModal token={resetToken} onClose={() => { setResetToken(null); setShowAuth(true) }} />}
    </div>
  )
}
