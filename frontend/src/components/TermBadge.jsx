import api from '../api'
import useExplorationStore from '../store/explorationStore'

export default function TermBadge({ term, parentAnswer }) {
  const { stack, exploredTerms, pushNode, setLoadingConcept, setError, isLoadingConcept } = useExplorationStore()
  const isExplored = exploredTerms.has(term)

  const handleClick = async () => {
    if (isLoadingConcept) return
    const path = stack.map((n) => n.term)
    setLoadingConcept(true)
    setError(null)
    try {
      const { data } = await api.post('/api/explore', {
        term,
        parent_answer: parentAnswer,
        exploration_path: path,
      })
      pushNode({ term: data.term, explanation: data.explanation, concepts: data.concepts, depth: data.depth_level })
    } catch {
      setError(`Could not load explanation for "${term}".`)
    } finally {
      setLoadingConcept(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoadingConcept}
      title={`Explore: ${term}`}
      className={`term-badge ${isExplored ? 'explored' : ''}`}
    >
      {term}
      {isExplored && <span className="ml-1 opacity-60 text-xs">✓</span>}
    </button>
  )
}
