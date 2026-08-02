'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col w-[55%] bg-ink relative overflow-hidden p-12"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold text-white tracking-tighter opacity-90">Mail Merge Pro</h1>
        </div>
        <div className="flex-1 flex items-center relative z-10">
          <p className="text-white font-light text-5xl tracking-tight leading-tight">Outreach, refined.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-[45%] bg-bg flex flex-col items-center justify-center p-12 lg:p-16">
        <div className="w-full max-w-[380px] space-y-8">
          <div className="lg:hidden mb-6 flex flex-col items-center">
            <h1 className="text-2xl font-semibold text-ink">Mail Merge Pro</h1>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-ink">Welcome back</h2>
            <p className="text-sm text-secondary mt-1">Log in to manage your campaigns.</p>
          </div>

          {error && (
            <div className="text-sm text-accentRed bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Email</label>
              <input
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm placeholder:text-outline/50 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all"
                type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-ink">Password</label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-sm placeholder:text-outline/50 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all"
                  type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink transition-colors">
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button
              className="w-full py-3 bg-ink text-white text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all mt-2 disabled:opacity-60"
              type="submit" disabled={loading}
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <div className="pt-2">
            <div className="border-t border-border w-full mb-6"></div>
            <div className="text-center">
              <p className="text-sm text-secondary">
                Don't have an account? <a href="/signup" className="text-ink font-semibold hover:underline underline-offset-4">Sign up</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
