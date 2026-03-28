import { useState } from 'react'
import useExplorationStore from '../store/explorationStore'

export default function ShareButton() {
  const [copied, setCopied] = useState(false)
  const { rootQuery, rootAnswer, stack, exploredTerms, understoodTerms, allConceptTerms, graphNodes } = useExplorationStore()
  if (!rootAnswer) return null

  const handleShare = async () => {
    // Encode full session as base64 so recipient sees the exact same chat
    const session = {
      rootQuery,
      rootAnswer,
      stack,
      exploredTerms:   [...exploredTerms],
      understoodTerms: [...understoodTerms],
      allConceptTerms: [...allConceptTerms],
      graphNodes,
    }
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(session))))
    const link = `${window.location.origin}${window.location.pathname}#session=${encoded}`
    await navigator.clipboard.writeText(link)
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button onClick={handleShare}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:text-violet-500"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
      {copied
        ? <><svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
        : <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>Share</>
      }
    </button>
  )
}
