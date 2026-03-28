import { create } from 'zustand'

// ── Memory (recent searches) ──────────────────────────
const loadMemory = () => { try { return JSON.parse(localStorage.getItem('rue_memory') || '[]') } catch { return [] } }
const saveMemory = (m) => localStorage.setItem('rue_memory', JSON.stringify(m))

// ── Session persistence ───────────────────────────────
const saveSession = (state) => {
  try {
    localStorage.setItem('rue_session', JSON.stringify({
      rootQuery:       state.rootQuery,
      rootAnswer:      state.rootAnswer,
      stack:           state.stack,
      exploredTerms:   [...state.exploredTerms],
      allConceptTerms: [...state.allConceptTerms],
      understoodTerms: [...state.understoodTerms],
      graphNodes:      state.graphNodes,
    }))
  } catch {}
}

const loadSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem('rue_session') || 'null')
    if (!s || !s.rootAnswer) return {}
    return {
      rootQuery:       s.rootQuery || '',
      rootAnswer:      s.rootAnswer || null,
      stack:           s.stack || [],
      exploredTerms:   new Set(s.exploredTerms || []),
      allConceptTerms: new Set(s.allConceptTerms || []),
      understoodTerms: new Set(s.understoodTerms || []),
      graphNodes:      s.graphNodes || [],
    }
  } catch { return {} }
}

const loadTheme = () => localStorage.getItem('rue_theme') || 'dark'

const saved = loadSession()

const useExplorationStore = create((set, get) => ({
  rootQuery:       saved.rootQuery       || '',
  rootAnswer:      saved.rootAnswer      || null,
  stack:           saved.stack           || [],
  exploredTerms:   saved.exploredTerms   || new Set(),
  allConceptTerms: saved.allConceptTerms || new Set(),
  understoodTerms: saved.understoodTerms || new Set(),  // terms user marked "Got it"
  graphNodes:      saved.graphNodes      || [],         // all nodes ever visited for graph
  isLoadingAnswer:  false,
  isLoadingConcept: false,
  error:            null,
  suggestedQuery:   '',
  memory:           loadMemory(),
  theme:            loadTheme(),

  setSuggestedQuery: (q) => set({ suggestedQuery: q }),

  setRootQuery: (query) => set({ rootQuery: query }),

  setRootAnswer: (answer) => {
    const terms = new Set(answer.concepts?.map((c) => c.term) || [])
    const rootNode = { id: 'root', label: answer.answer?.slice(0, 40) + '…', depth: 0, parentId: null }
    const newState = { rootAnswer: answer, allConceptTerms: terms, graphNodes: [rootNode] }
    set(newState)
    saveSession({ ...get(), ...newState })
  },

  setLoadingAnswer:  (val) => set({ isLoadingAnswer: val }),
  setLoadingConcept: (val) => set({ isLoadingConcept: val }),
  setError:          (msg) => set({ error: msg }),
  clearError:        ()    => set({ error: null }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('rue_theme', next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },

  saveToMemory: (query) => {
    const prev = loadMemory().filter((q) => q !== query)
    const updated = [query, ...prev].slice(0, 8)
    saveMemory(updated)
    set({ memory: updated })
  },

  clearMemory: () => { saveMemory([]); set({ memory: [] }) },

  // Mark a term as "Got it" and go back one level
  markUnderstood: (term) => {
    const state = get()
    const newUnderstood = new Set([...state.understoodTerms, term])
    const newStack = state.stack.length > 0 ? state.stack.slice(0, -1) : state.stack
    const newState = { understoodTerms: newUnderstood, stack: newStack }
    set(newState)
    saveSession({ ...state, ...newState })
  },

  pushNode: (node) =>
    set((state) => {
      const newAll = new Set([...state.allConceptTerms, ...node.concepts.map((c) => c.term)])
      const parentId = state.stack.length > 0 ? state.stack[state.stack.length - 1].term : 'root'
      const graphNode = { id: node.term, label: node.term, depth: node.depth, parentId }
      const newGraphNodes = [...state.graphNodes.filter((n) => n.id !== node.term), graphNode]
      const newState = {
        stack: [...state.stack, node],
        exploredTerms: new Set([...state.exploredTerms, node.term]),
        allConceptTerms: newAll,
        graphNodes: newGraphNodes,
      }
      set(newState)
      saveSession({ ...state, ...newState })
      return newState
    }),

  popToDepth: (depth) =>
    set((state) => {
      const newState = { stack: state.stack.slice(0, depth) }
      set(newState)
      saveSession({ ...state, ...newState })
      return newState
    }),

  reset: () => {
    const newState = {
      rootQuery: '', rootAnswer: null, stack: [],
      exploredTerms: new Set(), allConceptTerms: new Set(),
      understoodTerms: new Set(), graphNodes: [],
      isLoadingAnswer: false, isLoadingConcept: false, error: null,
    }
    set(newState)
    localStorage.removeItem('rue_session')
  },

  getProgress: () => {
    const { exploredTerms, allConceptTerms } = get()
    const total = allConceptTerms.size
    const explored = exploredTerms.size
    return { explored, total, pct: total === 0 ? 0 : Math.round((explored / total) * 100) }
  },

  getExportText: () => {
    const { rootQuery, rootAnswer, stack } = get()
    if (!rootAnswer) return ''
    return [
      '# Recursive Understanding Engine — Session Export',
      `Date: ${new Date().toLocaleString()}`,
      '', '## Question', rootQuery,
      '', '## Answer', rootAnswer.answer,
      '', '## Key Concepts',
      ...(rootAnswer.concepts?.map((c) => `- **${c.term}** [${c.difficulty}]: ${c.reason}`) || []),
      ...(stack.length > 0 ? ['', '## Exploration Path',
        ...stack.flatMap((n) => [
          '', `### ${n.term} (Depth ${n.depth})`, n.explanation,
          ...(n.concepts?.length ? ['**Sub-concepts:**', ...n.concepts.map((c) => `- ${c.term} [${c.difficulty}]`)] : []),
        ])
      ] : []),
    ].join('\n')
  },
}))

export default useExplorationStore
