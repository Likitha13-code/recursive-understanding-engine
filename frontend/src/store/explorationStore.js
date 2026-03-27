import { create } from 'zustand'

const useExplorationStore = create((set, get) => ({
  // The root query and answer
  rootQuery: '',
  rootAnswer: null,

  // Stack of exploration nodes
  // Each node: { term, explanation, concepts, depth }
  stack: [],

  // Set of explored term strings
  exploredTerms: new Set(),

  // Loading states
  isLoadingAnswer: false,
  isLoadingConcept: false,

  // Error state
  error: null,

  // For example suggestion buttons
  suggestedQuery: '',
  setSuggestedQuery: (q) => set({ suggestedQuery: q }),

  // Suggested query from example buttons
  suggestedQuery: '',

  setRootQuery: (query) => set({ rootQuery: query }),

  setRootAnswer: (answer) => set({ rootAnswer: answer }),

  setLoadingAnswer: (val) => set({ isLoadingAnswer: val }),

  setLoadingConcept: (val) => set({ isLoadingConcept: val }),

  setError: (msg) => set({ error: msg }),

  clearError: () => set({ error: null }),

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
