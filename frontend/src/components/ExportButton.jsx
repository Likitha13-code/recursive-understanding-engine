import { useState } from 'react'
import useExplorationStore from '../store/explorationStore'

export default function ExportButton() {
  const [copied, setCopied] = useState(false)
  const { getExportText, rootAnswer, rootQuery } = useExplorationStore()

  if (!rootAnswer) return null

  const handleDownload = () => {
    const text = getExportText()
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rue-${rootQuery.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getExportText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-2">
      <button onClick={handleCopy}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border
          bg-white/5 border-white/8 text-slate-400 hover:text-violet-400
          hover:border-violet-500/40 transition-all duration-200">
        {copied ? (
          <><svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/></svg>Copied!</>
        ) : (
          <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
        )}
      </button>

      <button onClick={handleDownload}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border
          bg-white/5 border-white/8 text-slate-400 hover:text-violet-400
          hover:border-violet-500/40 transition-all duration-200">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </button>
    </div>
  )
}
