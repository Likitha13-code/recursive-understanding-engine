import { useState } from 'react'
import useAuthStore from '../store/authStore'
import api from '../api'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot' | 'forgot-sent'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')
  const { login, register, isLoading, error, clearError } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const ok = mode === 'login'
      ? await login(email, password)
      : await register(email, password)
    if (ok) onClose()
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setMode('forgot-sent')
    } catch {
      setForgotMsg('Something went wrong. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  const switchMode = (m) => { clearError(); setForgotMsg(''); setMode(m) }

  const titles = {
    login: 'Sign in',
    register: 'Create account',
    forgot: 'Reset password',
    'forgot-sent': 'Check your email',
  }
  const subtitles = {
    login: 'Access your saved sessions',
    register: 'Save and sync your sessions',
    forgot: 'Enter your email to get a reset link',
    'forgot-sent': 'A reset link has been sent if that email exists',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{titles[mode]}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{subtitles[mode]}</p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all"
            style={{ color: 'var(--text-dim)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Login / Register form */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className="rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('forgot')}
                    className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
                    Forgot password?
                  </button>
                )}
              </div>
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
              <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </form>
        )}

        {/* Forgot password form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="px-6 py-5 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className="rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }} />
            </div>

            {forgotMsg && (
              <p className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">{forgotMsg}</p>
            )}

            <button type="submit" disabled={forgotLoading}
              className="mt-1 w-full py-2.5 rounded-xl text-sm font-semibold text-white
                bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all">
              {forgotLoading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    Sending…
                  </span>
                : 'Send reset link'
              }
            </button>

            <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
              Remember your password?{' '}
              <button type="button" onClick={() => switchMode('login')}
                className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* Forgot sent confirmation */}
        {mode === 'forgot-sent' && (
          <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Reset link sent!</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                Check your inbox and click the link to reset your password. It expires in 1 hour.
              </p>
            </div>
            <button onClick={() => switchMode('login')}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
