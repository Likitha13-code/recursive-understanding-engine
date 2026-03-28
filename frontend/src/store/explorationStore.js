import { create } from 'zustand'
import api from '../api'

// ── Sync session to backend (only when logged in) ─────
const syncToBackend = async (query, sessionData) => {
  const token = localStorage.getItem('rue_token')
  if (!token) return
  try {
    await api.post('/api/sessions/save', { query, session_data: sessionData })
  } catch {}
}

// ── Memory (recent searches list) ─────────────────────
const loadMemory = () => { try { return JSON.parse(localStorage.getItem('rue_memory') || '[]') } catch { return [] } }
const saveMemory = (m) => localStorage.setItem('rue_memory', JSON.stringify(m))

// ── Per-query saved sessions ───────────────────────────
// Stored as { [query]: sessionData } — max 8 entries
const loadSavedSessions = () => { try { return JSON.parse(localStorage.getItem('rue_sessions') || '{}') } catch { return {} } }
const saveQuerySession = (query, state) => {
  try {
    const all = loadSavedSessions()
    all[query] = {
      rootQuery:       state.rootQuery,
      rootAnswer:      state.rootAnswer,
      stack:           state.stack,
      exploredTerms:   [...state.exploredTerms],
      allConceptTerms: [...state.allConceptTerms],
      understoodTerms: [...state.understoodTerms],
      graphNodes:      state.graphNodes,
    }
    // Keep only the 8 most recent queries (matching memory limit)
    const memory = loadMemory()
    const trimmed = {}
    memory.forEach((q) => { if (all[q]) trimmed[q] = all[q] })
    localStorage.setItem('rue_sessions', JSON.stringify(trimmed))
  } catch {}
}

const loadTheme = () => localStorage.getItem('rue_theme') || 'dark'

const emptyState = {
  rootQuery:       '',
  rootAnswer:      null,
  stack:           [],
  exploredTerms:   new Set(),
  allConceptTerms: new Set(),
  understoodTerms: new Set(),
  graphNodes:      [],
  followUpsMap:    {}, // { [contextKey]: [{question, answer, concepts}] }
}

const useExplorationStore = create((set, get) => ({
  // Always start fresh — no auto-restore of last session
  ...emptyState,
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
    const full = { ...get(), ...newState }
    saveQuerySession(full.rootQuery, full)
    syncToBackend(full.rootQuery, {
      rootQuery: full.rootQuery, rootAnswer: full.rootAnswer,
      stack: full.stack, exploredTerms: [...full.exploredTerms],
      allConceptTerms: [...full.allConceptTerms], understoodTerms: [...full.understoodTerms],
      graphNodes: full.graphNodes,
    })
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

  clearMemory: () => {
    saveMemory([])
    localStorage.removeItem('rue_sessions')
    set({ memory: [] })
  },

  // Load a previously saved session by query — used when clicking recent searches
  loadSessionByQuery: (query) => {
    try {
      const all = loadSavedSessions()
      const s = all[query]
      if (!s || !s.rootAnswer) return false
      set({
        rootQuery:       s.rootQuery || query,
        rootAnswer:      s.rootAnswer,
        stack:           s.stack || [],
        exploredTerms:   new Set(s.exploredTerms || []),
        allConceptTerms: new Set(s.allConceptTerms || []),
        understoodTerms: new Set(s.understoodTerms || []),
        graphNodes:      s.graphNodes || [],
        isLoadingAnswer: false, isLoadingConcept: false, error: null,
      })
      return true
    } catch { return false }
  },

  // Mark a term as "Got it" and go back one level
  markUnderstood: (term) => {
    const state = get()
    const newUnderstood = new Set([...state.understoodTerms, term])
    const newStack = state.stack.length > 0 ? state.stack.slice(0, -1) : state.stack
    const newState = { understoodTerms: newUnderstood, stack: newStack }
    set(newState)
    saveQuerySession(state.rootQuery, { ...state, ...newState })
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
      const full = { ...state, ...newState }
      saveQuerySession(state.rootQuery, full)
      return newState
    }),

  popToDepth: (depth) =>
    set((state) => {
      const newState = { stack: state.stack.slice(0, depth) }
      saveQuerySession(state.rootQuery, { ...state, ...newState })
      return newState
    }),

  reset: () => {
    set({ ...emptyState, isLoadingAnswer: false, isLoadingConcept: false, error: null })
  },

  // Restore a full session from a share link (URL hash)
  restoreSession: (s) => {
    try {
      set({
        rootQuery:       s.rootQuery || '',
        rootAnswer:      s.rootAnswer || null,
        stack:           s.stack || [],
        exploredTerms:   new Set(s.exploredTerms || []),
        allConceptTerms: new Set(s.allConceptTerms || []),
        understoodTerms: new Set(s.understoodTerms || []),
        graphNodes:      s.graphNodes || [],
        isLoadingAnswer: false, isLoadingConcept: false, error: null,
      })
    } catch {}
  },

  addFollowUp: (contextKey, entry) => {
    set((state) => ({
      followUpsMap: {
        ...state.followUpsMap,
        [contextKey]: [...(state.followUpsMap[contextKey] || []), entry],
      },
    }))
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
