import api from '../api'
import useExplorationStore from '../store/explorationStore'

const DIFFICULTY_STYLE = {
  beginner:     { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)',  text: '#059669', label: 'B', glow: '0 0 14px 3px rgba(16,185,129,0.35)'  },
  intermediate: { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.40)',  text: '#7c3aed', label: 'I', glow: '0 0 14px 3px rgba(139,92,246,0.40)'  },
  advanced:     { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.35)',   text: '#dc2626', label: 'A', glow: '0 0 14px 3px rgba(239,68,68,0.35)'   },
}

export default function TermBadge({ term, parentAnswer, difficulty = 'intermediate' }) {
  const { stack, exploredTerms, understoodTerms, pushNode, setLoadingConcept, setError, isLoadingConcept } = useExplorationStore()
  const isExplored  = exploredTerms.has(term)
  const isUnderstood = understoodTerms.has(term)
  const style = DIFFICULTY_STYLE[difficulty] || DIFFICULTY_STYLE.intermediate

  const handleClick = async () => {
    if (isLoadingConcept) return
    const path = stack.map((n) => n.term)
    setLoadingConcept(true); setError(null)
    try {
      const { data } = await api.post('/api/explore', { term, parent_answer: parentAnswer, exploration_path: path })
      pushNode({ term: data.term, explanation: data.explanation, concepts: data.concepts, depth: data.depth_level })
    } catch { setError(`Could not load explanation for "${term}".`) }
    finally { setLoadingConcept(false) }
  }

  return (
    <button onClick={handleClick} disabled={isLoadingConcept} title={`Explore: ${term} (${difficulty})`}
      className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md text-sm font-medium
        cursor-pointer transition-all duration-200 hover:-translate-y-1
        disabled:cursor-wait"
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = style.glow; e.currentTarget.style.borderColor = style.text; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = style.border; }}>
      {term}
      <span className="text-[9px] font-bold opacity-60 ml-0.5" title={difficulty}>{style.label}</span>
      {isUnderstood && <span className="text-[10px] ml-0.5">✓</span>}
    </button>
  )
}
