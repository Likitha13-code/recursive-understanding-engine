import { useState } from 'react'
import api from '../api'

export default function ResetPasswordModal({ token, onClose }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, new_password: password })
      setDone(true)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Something went wrong. The link may have expired.')
    } finally {
      setLoading(false)
    }
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
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {done ? 'Password updated!' : 'Set new password'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
              {done ? 'You can now sign in with your new password' : 'Choose a strong password'}
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

        {done ? (
          <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Your password has been reset successfully.
            </p>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
                bg-violet-600 hover:bg-violet-500 transition-all">
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" minLength={6}
                className="rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required placeholder="••••••••" minLength={6}
                className="rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/50"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)' }} />
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="mt-1 w-full py-2.5 rounded-xl text-sm font-semibold text-white
                bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all">
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    Updating…
                  </span>
                : 'Reset password'
              }
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
