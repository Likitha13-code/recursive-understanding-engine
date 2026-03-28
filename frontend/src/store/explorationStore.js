import { create } from 'zustand'

const loadMemory = () => {
  try { return JSON.parse(localStorage.getItem('rue_memory') || '[]') } catch { return [] }
}
const saveMemory = (m) => localStorage.setItem('rue_memory', JSON.stringify(m))

const loadTheme = () => localStorage.getItem('rue_theme') || 'dark'

const useExplorationStore = create((set, get) => ({
  rootQuery: '',
  rootAnswer: null,
  stack: [],
  exploredTerms: new Set(),
  allConceptTerms: new Set(),   // every concept ever seen — for progress tracker
  isLoadingAnswer: false,
  isLoadingConcept: false,
  error: null,
  suggestedQuery: '',
  memory: loadMemory(),
  theme: loadTheme(),

  setSuggestedQuery: (q) => set({ suggestedQuery: q }),
  setRootQuery: (query) => set({ rootQuery: query }),
  setLoadingAnswer: (val) => set({ isLoadingAnswer: val }),
  setLoadingConcept: (val) => set({ isLoadingConcept: val }),
  setError: (msg) => set({ error: msg }),
  clearError: () => set({ error: null }),

  setRootAnswer: (answer) => {
    const terms = new Set(answer.concepts?.map((c) => c.term) || [])
    set({ rootAnswer: answer, allConceptTerms: terms })
  },

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

  pushNode: (node) =>
    set((state) => {
      const newAll = new Set([...state.allConceptTerms, ...node.concepts.map((c) => c.term)])
      return {
        stack: [...state.stack, node],
        exploredTerms: new Set([...state.exploredTerms, node.term]),
        allConceptTerms: newAll,
      }
    }),

  popToDepth: (depth) => set((state) => ({ stack: state.stack.slice(0, depth) })),

  reset: () => set({
    rootQuery: '', rootAnswer: null, stack: [],
    exploredTerms: new Set(), allConceptTerms: new Set(),
    isLoadingAnswer: false, isLoadingConcept: false, error: null,
  }),

  getProgress: () => {
    const { exploredTerms, allConceptTerms } = get()
    const total = allConceptTerms.size
    const explored = exploredTerms.size
    const pct = total === 0 ? 0 : Math.round((explored / total) * 100)
    return { explored, total, pct }
  },

  getExportText: () => {
    const { rootQuery, rootAnswer, stack } = get()
    if (!rootAnswer) return ''
    const lines = [
      '# Recursive Understanding Engine — Session Export',
      `Date: ${new Date().toLocaleString()}`,
      '',
      `## Question`,
      rootQuery,
      '',
      `## Answer`,
      rootAnswer.answer,
      '',
      `## Key Concepts`,
      ...(rootAnswer.concepts?.map((c) => `- **${c.term}**: ${c.reason}`) || []),
    ]
    if (stack.length > 0) {
      lines.push('', '## Exploration Path')
      stack.forEach((node) => {
        lines.push(``, `### ${node.term} (Depth ${node.depth})`, node.explanation)
        if (node.concepts?.length) {
          lines.push('**Sub-concepts:**', ...node.concepts.map((c) => `- ${c.term}`))
        }
      })
    }
    return lines.join('\n')
  },
}))

export default useExplorationStore
