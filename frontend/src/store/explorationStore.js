import { create } from 'zustand'

// Load memory from localStorage
const loadMemory = () => {
  try {
    return JSON.parse(localStorage.getItem('rue_memory') || '[]')
  } catch {
    return []
  }
}

const saveMemory = (memory) => {
  localStorage.setItem('rue_memory', JSON.stringify(memory))
}

const useExplorationStore = create((set, get) => ({
  rootQuery: '',
  rootAnswer: null,
  stack: [],
  exploredTerms: new Set(),
  isLoadingAnswer: false,
  isLoadingConcept: false,
  error: null,
  suggestedQuery: '',

  // Memory — persisted in localStorage
  memory: loadMemory(),

  setSuggestedQuery: (q) => set({ suggestedQuery: q }),
  setRootQuery: (query) => set({ rootQuery: query }),
  setRootAnswer: (answer) => set({ rootAnswer: answer }),
  setLoadingAnswer: (val) => set({ isLoadingAnswer: val }),
  setLoadingConcept: (val) => set({ isLoadingConcept: val }),
  setError: (msg) => set({ error: msg }),
  clearError: () => set({ error: null }),

  // Save query to memory
  saveToMemory: (query) => {
    const prev = loadMemory().filter((q) => q !== query)
    const updated = [query, ...prev].slice(0, 8)
    saveMemory(updated)
    set({ memory: updated })
  },

  clearMemory: () => {
    saveMemory([])
    set({ memory: [] })
  },

  pushNode: (node) =>
    set((state) => ({
      stack: [...state.stack, node],
      exploredTerms: new Set([...state.exploredTerms, node.term]),
    })),

  popToDepth: (depth) =>
    set((state) => ({
      stack: state.stack.slice(0, depth),
    })),

  reset: () =>
    set({
      rootQuery: '',
      rootAnswer: null,
      stack: [],
      exploredTerms: new Set(),
      isLoadingAnswer: false,
      isLoadingConcept: false,
      error: null,
    }),

  getExplorationPath: () => {
    const state = get()
    const path = []
    if (state.rootQuery) path.push(state.rootQuery.slice(0, 30))
    state.stack.forEach((node) => path.push(node.term))
    return path
  },

  getCurrentNode: () => {
    const { stack, rootAnswer } = get()
    if (stack.length === 0) return rootAnswer
    return stack[stack.length - 1]
  },
}))

export default useExplorationStore
