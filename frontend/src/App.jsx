import { useEffect } from 'react'
import QueryInput from './components/QueryInput'
import AnswerPanel from './components/AnswerPanel'
import BreadcrumbTrail from './components/BreadcrumbTrail'
import KnowledgeTree from './components/KnowledgeTree'
import useExplorationStore from './store/explorationStore'
import { wakeBackend } from './api'
import './index.css'

const EXAMPLES = [
  'What is LIME in AI?',
  'How does HTTPS work?',
  'What is quantum entanglement?',
  'What is gradient descent?',
]

export default function App() {
  const { rootAnswer, isLoadingAnswer, isLoadingConcept, stack, setSuggestedQuery, memory, clearMemory } = useExplorationStore()
  const hasContent = rootAnswer || isLoadingAnswer

  // Wake Render backend on page load to reduce cold start delay
  useEffect(() => { wakeBackend() }, [])

  return (
    <div className="min-h-screen bg-mesh text-slate-100 flex flex-col">

      {/* ── Header ── */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between
        backdrop-blur-sm sticky top-0 z-20 bg-[#07070f]/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-700
            flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-none tracking-tight">
              Recursive Understanding Engine
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Deep knowledge, layer by layer</p>
          </div>
        </div>
        {stack.length > 0 && (
          <div className="flex items-center gap-2 text-xs bg-violet-950/50 text-violet-300
            border border-violet-500/25 px-3 py-1.5 rounded-full animate-fade-up">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            {stack.length} level{stack.length > 1 ? 's' : ''} deep
          </div>
        )}
      </header>

      {/* ── Body: sidebar | center | balancer ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        {hasContent ? (
          <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-white/5
            bg-[#0a0a12] overflow-y-auto p-4">
            <KnowledgeTree />
          </aside>
        ) : (
          <div className="hidden lg:block w-56 shrink-0" />
        )}

        {/* ── Center content ── */}
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

            {/* ── Landing state ── */}
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
                  <h2 className="text-2xl font-semibold text-slate-100 mb-2 tracking-tight">Start Exploring</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Ask any question. RUE breaks down the answer into clickable concepts
                    you can explore recursively — until you{' '}
                    <span className="text-slate-400 font-medium">truly</span> understand.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((q) => (
                    <button key={q} onClick={() => setSuggestedQuery(q)}
                      className="text-xs text-slate-400 border border-white/8 rounded-full px-4 py-2
                        bg-white/[0.02] hover:bg-white/[0.06] hover:text-slate-200
                        hover:border-violet-500/40 transition-all duration-200">
                      {q}
                    </button>
                  ))}
                </div>

                {/* Memory — recent searches */}
                {memory.length > 0 && (
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                        Recent searches
                      </p>
                      <button onClick={clearMemory}
                        className="text-[10px] text-slate-700 hover:text-red-400 transition-colors">
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {memory.map((q, i) => (
                        <button key={i} onClick={() => setSuggestedQuery(q)}
                          className="flex items-center gap-2.5 text-left text-xs text-slate-400
                            bg-white/[0.02] border border-white/6 rounded-xl px-3 py-2
                            hover:bg-white/[0.06] hover:text-slate-200 hover:border-violet-500/30
                            transition-all duration-200">
                          <svg className="w-3 h-3 text-slate-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                          </svg>
                          <span className="truncate">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 mt-2 w-full max-w-md">
                  {[
                    { icon: '❓', title: 'Ask',      desc: 'Type any question' },
                    { icon: '🔍', title: 'Identify', desc: 'Key concepts highlighted' },
                    { icon: '∞',  title: 'Recurse',  desc: 'Explore until you understand' },
                  ].map((step) => (
                    <div key={step.title} className="glass rounded-xl p-3 flex flex-col items-center gap-1.5 text-center">
                      <span className="text-lg">{step.icon}</span>
                      <p className="text-xs font-semibold text-slate-300">{step.title}</p>
                      <p className="text-[11px] text-slate-600 leading-snug">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* Right balancer — mirrors sidebar width so mx-auto stays truly centered */}
        {hasContent ? (
          <div className="hidden lg:block w-56 shrink-0 border-l border-white/5 bg-[#0a0a12]" />
        ) : (
          <div className="hidden lg:block w-56 shrink-0" />
        )}

      </div>
    </div>
  )
}
