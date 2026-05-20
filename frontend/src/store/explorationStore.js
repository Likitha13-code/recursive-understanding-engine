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
    const rootNode = { id: 'root', label: answer.answer?.slice(0, 40) + '…', depth: 0, parentId: null, explanation: answer.answer, isUnexplored: false }
    const childNodes = (answer.concepts || []).map(c => ({
      id: c.term, label: c.term, depth: 1, parentId: 'root', explanation: c.reason, difficulty: c.difficulty, isUnexplored: true
    }))
    const newState = { rootAnswer: answer, allConceptTerms: terms, graphNodes: [rootNode, ...childNodes] }
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
      const graphNode = { id: node.term, label: node.term, depth: node.depth, parentId, explanation: node.explanation, isUnexplored: false }
      const childNodes = (node.concepts || []).map(c => ({
        id: c.term, label: c.term, depth: node.depth + 1, parentId: node.term, explanation: c.reason, difficulty: c.difficulty, isUnexplored: true
      }))
      const existingIds = new Set(state.graphNodes.map(n => n.id))
      const newGraphNodes = [
        ...state.graphNodes.filter((n) => n.id !== node.term),
        graphNode,
        ...childNodes.filter(c => !existingIds.has(c.id) && c.id !== node.term)
      ]
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

  exploreConcept: async (term, parentAnswer) => {
    const state = get()
    if (state.isLoadingConcept) return
    const path = state.stack.map((n) => n.term)
    set({ isLoadingConcept: true, error: null })
    try {
      const { data } = await api.post('/api/explore', { term, parent_answer: parentAnswer, exploration_path: path })
      get().pushNode({ term: data.term, explanation: data.explanation, concepts: data.concepts, depth: data.depth_level })
    } catch {
      set({ error: `Could not load explanation for "${term}".` })
    } finally {
      set({ isLoadingConcept: false })
    }
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
    set((state) => {
      const existing = state.followUpsMap[contextKey] || []
      // If entry has no question (it's an answer), replace the last null-answer entry
      if (entry.question === null) {
        const idx = [...existing].reverse().findIndex(e => e.answer === null)
        if (idx !== -1) {
          const realIdx = existing.length - 1 - idx
          const updated = [...existing]
          updated[realIdx] = { ...updated[realIdx], answer: entry.answer, concepts: entry.concepts, isError: entry.isError }
          return { followUpsMap: { ...state.followUpsMap, [contextKey]: updated } }
        }
      }
      return {
        followUpsMap: {
          ...state.followUpsMap,
          [contextKey]: [...existing, entry],
        },
      }
    })
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
