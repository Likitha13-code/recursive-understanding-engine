import { useState } from 'react'
import useAuthStore from '../store/authStore'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, register, isLoading, error, clearError } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const ok = mode === 'login'
      ? await login(email, password)
      : await register(email, password)
    if (ok) onClose()
  }

  const switchMode = () => { clearError(); setMode(m => m === 'login' ? 'register' : 'login') }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
              {mode === 'login' ? 'Access your saved sessions' : 'Save and sync your sessions'}
            </p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all"
            style={{ color: 'var(--text-dim)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@example.com"
              className="rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••" minLength={6}
              className="rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }} />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">{error}</p>
          )}

          <button type="submit" disabled={isLoading}
            className="mt-1 w-full py-2.5 rounded-xl text-sm font-semibold text-white
              bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all">
            {isLoading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              : mode === 'login' ? 'Sign in' : 'Create account'
            }
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={switchMode}
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
