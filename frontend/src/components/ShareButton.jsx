import { useState } from 'react'
import useExplorationStore from '../store/explorationStore'

export default function ShareButton() {
  const [copied, setCopied] = useState(false)
  const { rootQuery, rootAnswer } = useExplorationStore()

  if (!rootAnswer) return null

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(rootQuery)}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={handleShare}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border
        bg-white/5 border-white/8 text-slate-400 hover:text-violet-400
        hover:border-violet-500/40 transition-all duration-200">
      {copied ? (
        <><svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12"/></svg>Link copied!</>
      ) : (
        <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>Share</>
      )}
    </button>
  )
}
