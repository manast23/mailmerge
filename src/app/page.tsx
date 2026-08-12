'use client'
import React, { useState, useEffect, useRef } from 'react'
import { extractPlaceholders } from '@/lib/placeholders'

// ─── Types ───────────────────────────────────────────────
interface Attachment { url: string; name: string }
interface Template { id: string; name: string; subject: string; body: string; updatedAt: string; attachments?: Attachment[] }
interface Campaign { id: string; name: string; status: string; template: { name: string; subject: string }; total: number; sent: number; opened: number; errors: number; createdAt: string; scheduledAt?: string; templateId?: string }
interface Recipient { id: string; email: string; data: any; status: string; sentAt?: string; openedAt?: string; error?: string }

type Tab = 'home' | 'campaigns' | 'compose' | 'dashboard' | 'account'

// ─── Shared UI bits ──────────────────────────────────────
const cardCls = "bg-white border border-border rounded-xl p-6 shadow-ambient"
const inputCls = "w-full px-3 py-2 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/5 transition-all"
const labelCls = "block text-xs font-medium text-secondary mb-1.5"
const btnPrimaryCls = "px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
const btnGhostCls = "px-4 py-2 bg-white border border-border text-ink text-sm font-medium rounded-lg hover:bg-surface-low transition-all disabled:opacity-50"
const badgeCls = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"

function Avatar({ initial, src, className = 'h-8 w-8 text-sm' }: { initial: string, src?: string | null, className?: string }) {
  if (src) {
    return <img src={src} alt="Profile" className={`${className} rounded-full object-cover shrink-0 border border-border`} />
  }
  return (
    <div className={`${className} rounded-full bg-ink flex items-center justify-center text-white font-semibold shrink-0`}>
      {initial}
    </div>
  )
}

function StatCard({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-ambient">
      <p className="text-2xl font-black text-ink leading-none mb-2">{value}</p>
      <p className="text-xs uppercase tracking-wider text-secondary">{label}</p>
    </div>
  )
}

function EmptyState({ icon, title, text, action }: { icon: string, title: string, text: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="text-3xl mb-3 text-secondary">{icon}</div>
      <div className="text-base font-semibold text-ink mb-1">{title}</div>
      <div className="text-sm text-secondary mb-4">{text}</div>
      {action}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    opened:    "bg-green-50 text-green-700",
    sent:      "bg-surface-low text-ink",
    pending:   "bg-orange-50 text-orange-600",
    scheduled: "bg-blue-50 text-blue-600",
    error:     "bg-red-50 text-accentRed",
  }
  const label: Record<string, string> = {
    opened: '✓ Opened', sent: '✓ Sent', pending: '· Pending', scheduled: '⏰ Scheduled', error: '✗ Error'
  }
  return <span className={`${badgeCls} ${map[status] || map.pending}`}>{label[status] || status}</span>
}

function Spinner({ size = 14, className = '' }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function StatusDot({ status }: { status: string }) {
  const color: Record<string, string> = { draft: 'bg-outline', sending: 'bg-accentOrange', done: 'bg-green-500', scheduled: 'bg-accentOrange' }
  return <span className={`w-2 h-2 rounded-full ${color[status] || 'bg-outline'}`} />
}

function Toggle({ on, onToggle }: { on: boolean, onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-6 rounded-full transition-colors ${on ? 'bg-ink' : 'bg-border'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  )
}

export default function App() {
  const [tab, setTab]               = useState<Tab>('home')
  const [templates, setTemplates]   = useState<Template[]>([])
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [toast, setToast]           = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showWelcome, setShowWelcome] = useState(true)
  const [welcomeChecked, setWelcomeChecked] = useState(false)
  const [userInitial, setUserInitial] = useState('A')
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [campaignsLoaded, setCampaignsLoaded] = useState(false)

  useEffect(() => {
    loadTemplates(); loadCampaigns()
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d?.user?.name) { setUserInitial(d.user.name.trim()[0]?.toUpperCase() || 'A'); setUserName(d.user.name.trim().split(' ')[0]) }
      if (d?.user?.avatarUrl) setAvatarUrl(d.user.avatarUrl)
    }).catch(() => {})
    // Only show the "Get Started" screen the first time this browser ever sees the app —
    // after that, go straight to the dashboard instead of gating every single visit.
    if (localStorage.getItem('mmp_seen_welcome')) setShowWelcome(false)
    setWelcomeChecked(true)
  }, [])

  // Keep campaign statuses fresh without needing a manual page refresh.
  // Polls in the background every 12s, and immediately when the tab regains focus.
  useEffect(() => {
    const interval = setInterval(() => { loadCampaigns() }, 12000)
    function onVisible() { if (document.visibilityState === 'visible') loadCampaigns() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  async function loadTemplates() {
    const r = await fetch('/api/templates'); setTemplates(await r.json())
  }
  async function loadCampaigns() {
    const r = await fetch('/api/campaigns'); setCampaigns(await r.json())
    setCampaignsLoaded(true)
  }

  function showToast(msg: string, type: 'success'|'error'|'info' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const navItems: [Tab, React.ReactNode, string][] = [
    ['home', (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ), 'Home'],
    ['campaigns', (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
    ), 'Campaigns'],
    ['compose', (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    ), 'Templates'],
    ['dashboard', (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
    ), 'Dashboard'],
    ['account', (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
    ), 'Account'],
  ]

  const sidebarWidth = sidebarOpen ? 'w-[220px]' : 'w-[60px]'
  const mainMargin   = sidebarOpen ? 'ml-[220px]' : 'ml-[60px]'
  const tabLabel: Record<Tab,string> = { home: 'Home', campaigns: 'Campaigns', compose: 'Compose', dashboard: 'Dashboard', account: 'Account' }

  function enterApp() {
    localStorage.setItem('mmp_seen_welcome', '1')
    setShowWelcome(false)
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Welcome Screen — same split layout as /login, shown once per browser */}
      {showWelcome && welcomeChecked && (
        <div className="fixed inset-0 z-50 flex bg-bg">
          {/* Left brand panel — matches login page exactly, feature list added */}
          <div className="hidden lg:flex flex-col w-[55%] bg-ink relative overflow-hidden p-12"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            <div className="relative z-10">
              <h1 className="text-2xl font-semibold text-white tracking-tighter opacity-90">Mail Merge Pro</h1>
            </div>
            <div className="flex-1 flex flex-col justify-center relative z-10">
              <p className="text-white font-light text-3xl tracking-tight leading-tight mb-8">Outreach, refined.</p>
              <div className="grid grid-cols-2 gap-2.5 max-w-sm">
                {[
                  ['📄', 'Templates with placeholders'],
                  ['📊', 'Open tracking & analytics'],
                  ['📎', 'File attachments per template'],
                  ['⏰', 'Scheduled sending'],
                ].map(([icon, label]) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                    <span>{icon}</span><span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-full lg:w-[45%] bg-bg flex flex-col items-center justify-center p-12 lg:p-16">
            <div className="w-full max-w-[380px] space-y-8">
              <div className="lg:hidden mb-6 flex flex-col items-center">
                <h1 className="text-2xl font-semibold text-ink">Mail Merge Pro</h1>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-ink">Welcome back{userName ? `, ${userName}` : ''} 👋</h2>
                <p className="text-sm text-secondary mt-1">Your campaigns are ready when you are.</p>
              </div>

              <button
                className="w-full py-3 bg-ink text-white text-sm font-medium rounded-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                onClick={enterApp}
              >
                Get Started
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>

              <p className="text-xs text-outline text-center">Your campaigns, your data, your Gmail</p>
            </div>
          </div>
        </div>
      )}

      {!showWelcome && welcomeChecked && (<>
        {/* Sidebar */}
        <aside className={`fixed left-0 top-0 h-full ${sidebarWidth} border-r border-border bg-white flex flex-col py-6 z-40 transition-all duration-200`}>
          <div className={`flex items-center gap-2 mb-8 ${sidebarOpen ? 'px-4' : 'px-0 justify-center'}`}>
            <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center cursor-pointer shrink-0" onClick={() => window.location.reload()} title="Go to home">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="white" strokeWidth="1.8"/>
                <path d="M2 8l10 6 10-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            {sidebarOpen && (
              <div className="leading-tight">
                <div className="text-sm font-bold text-ink">Mail Merge</div>
                <div className="text-[10px] uppercase tracking-widest text-secondary">Pro</div>
              </div>
            )}
            {sidebarOpen && (
              <button className="ml-auto text-secondary hover:text-ink transition-colors" onClick={() => setSidebarOpen(p => !p)} title="Collapse sidebar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
          </div>
          {!sidebarOpen && (
            <button className="text-secondary hover:text-ink transition-colors mx-auto mb-6" onClick={() => setSidebarOpen(p => !p)} title="Expand sidebar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}

          <nav className="flex-1 space-y-1 px-2">
            {navItems.map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                title={!sidebarOpen ? label : undefined}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                  ${tab === key
                    ? 'bg-surface-low border-l-2 border-ink text-ink font-semibold'
                    : 'text-secondary hover:text-ink hover:bg-surface-low'}
                  ${sidebarOpen ? '' : 'justify-center'}`}
              >
                <span className="shrink-0">{icon}</span>
                {sidebarOpen && <span>{label}</span>}
              </button>
            ))}
          </nav>

          {sidebarOpen && (
            <div className="px-4 pt-4 mt-4 border-t border-border space-y-2 text-xs text-secondary">
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ink"/> {campaigns.length} campaigns</div>
              <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"/> {templates.length} templates</div>
            </div>
          )}
        </aside>

        {/* Main */}
        <div className={`${mainMargin} transition-all duration-200`}>
          {/* Top bar: minimal — page title + initials avatar only */}
          <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-bg sticky top-0 z-30">
            <span className="text-sm font-medium text-secondary">{tabLabel[tab]}</span>
            <Avatar initial={userInitial} src={avatarUrl} />
          </header>

          <main className="p-8 max-w-[1200px]">
            {tab === 'home' && (
              <HomeTab campaigns={campaigns} setTab={setTab} loading={!campaignsLoaded} onRefresh={() => { loadCampaigns(); loadTemplates(); showToast('Refreshed!', 'info') }} />
            )}
            {tab === 'campaigns' && (
              <CampaignsTab
                campaigns={campaigns}
                templates={templates}
                onRefresh={() => { loadCampaigns(); loadTemplates() }}
                showToast={showToast}
              />
            )}
            {tab === 'compose' && (
              <ComposeTab
                templates={templates}
                onSaved={() => { loadTemplates() }}
                showToast={showToast}
              />
            )}
            {tab === 'dashboard' && (
              <DashboardTab campaigns={campaigns} showToast={showToast} />
            )}
            {tab === 'account' && (
              <AccountTab showToast={showToast} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} userInitial={userInitial} />
            )}
          </main>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2
            ${toast.type === 'success' ? 'bg-ink text-white' : toast.type === 'error' ? 'bg-accentRed text-white' : 'bg-white border border-border text-ink'}`}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'i'} {toast.msg}
          </div>
        )}
      </>)}
    </div>
  )
}

// ─── Account Tab ──────────────────────────────────────────
function AccountTab({ showToast, avatarUrl, onAvatarChange, userInitial }: any) {
  const [user, setUser] = useState<any>(null)
  const [gmailAddress, setGmailAddress] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [connected, setConnected] = useState(false)
  const [savedEmail, setSavedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    fetch('/api/account').then(r => r.json()).then(d => {
      if (d.gmailAddress) { setGmailAddress(d.gmailAddress); setSavedEmail(d.gmailAddress) }
      setConnected(!!d.connected)
    })
  }, [])

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmailAddress, appPassword }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Could not connect Gmail', 'error'); setLoading(false); return }
      setConnected(true)
      setSavedEmail(gmailAddress)
      setAppPassword('')
      showToast('Gmail account connected!', 'success')
    } catch {
      showToast('Something went wrong', 'error')
    }
    setLoading(false)
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect this Gmail account? You will need to reconnect before sending again.')) return
    await fetch('/api/account', { method: 'DELETE' })
    setConnected(false)
    setSavedEmail('')
    setGmailAddress('')
    showToast('Gmail account disconnected', 'info')
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropFile(file)
    e.target.value = ''
  }

  async function uploadCroppedAvatar(blob: Blob) {
    setUploadingAvatar(true)
    const form = new FormData(); form.append('file', blob, 'avatar.jpg')
    const r = await fetch('/api/avatar', { method: 'POST', body: form })
    const d = await r.json()
    setUploadingAvatar(false)
    if (d.error) return showToast(d.error, 'error')
    onAvatarChange?.(d.avatarUrl)
    showToast('Profile photo updated!')
  }

  async function handleAvatarRemove() {
    setUploadingAvatar(true)
    await fetch('/api/avatar', { method: 'DELETE' })
    setUploadingAvatar(false)
    onAvatarChange?.(null)
    showToast('Profile photo removed', 'info')
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const r = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      const d = await r.json()
      if (!r.ok) { showToast(d.error || 'Import failed', 'error'); setImporting(false); return }
      showToast(`Imported ${d.templatesCreated} templates and ${d.campaignsCreated} campaigns (${d.recipientsCreated} recipients)!`)
    } catch {
      showToast('Could not read that file — make sure it\'s an exported .json file', 'error')
    }
    setImporting(false)
    e.target.value = ''
  }

  return (
    <div className="max-w-[500px]">
      <h1 className="text-2xl font-semibold text-ink mb-1">Account</h1>
      <p className="text-sm text-secondary mb-6">
        {user ? `${user.name} · ${user.email}` : 'Loading…'}
      </p>

      <div className={`${cardCls} mb-4 flex items-center gap-4`}>
        <Avatar initial={userInitial} src={avatarUrl} className="h-16 w-16 text-xl" />
        <div className="flex-1">
          <div className="text-sm font-medium text-ink mb-1">Profile photo</div>
          <div className="flex gap-2">
            <button className={btnGhostCls} onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar}>
              {uploadingAvatar ? 'Uploading…' : avatarUrl ? 'Change' : 'Upload'}
            </button>
            {avatarUrl && (
              <button className="text-sm text-accentRed hover:underline underline-offset-4" onClick={handleAvatarRemove} disabled={uploadingAvatar}>
                Remove
              </button>
            )}
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
      </div>

      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onSave={async (blob) => { setCropFile(null); await uploadCroppedAvatar(blob) }}
        />
      )}

      <div className={`${cardCls} mb-4`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-ink">Gmail Connection</h2>
          <span className={`${badgeCls} ${connected ? 'bg-green-50 text-green-700' : 'bg-surface-low text-secondary'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-outline'}`} />
            {connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {connected && (
          <div className="text-sm text-ink mb-4">
            Connected as <strong>{savedEmail}</strong>
          </div>
        )}

        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className={labelCls}>Gmail Address</label>
            <input className={inputCls} type="email" required value={gmailAddress} onChange={e => setGmailAddress(e.target.value)} placeholder="you@gmail.com" />
          </div>
          <div>
            <label className={labelCls}>App Password</label>
            <div className="relative">
              <input className={inputCls} type={showPw ? 'text' : 'password'} required value={appPassword} onChange={e => setAppPassword(e.target.value)} placeholder="16-character App Password" />
              <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink transition-colors text-sm">
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-xs text-outline mt-1.5">Use a 16-digit Google App Password for secure access.</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button className={btnPrimaryCls} type="submit" disabled={loading}>
              {loading ? 'Connecting…' : connected ? 'Update connection' : 'Verify & Connect'}
            </button>
            {connected && (
              <button type="button" className="text-sm text-accentRed hover:underline underline-offset-4" onClick={handleDisconnect}>
                Disconnect
              </button>
            )}
          </div>
        </form>

        <p className="mt-5 text-xs text-outline leading-relaxed">
          Don't have an App Password? Go to your Google Account → Security → 2-Step Verification →
          App Passwords, generate one for "Mail", and paste the 16-character code above.
          Your password is stored encrypted and is only used to send your own campaigns.
        </p>
      </div>

      <div className={`${cardCls} mb-4`}>
        <h2 className="text-lg font-semibold text-ink mb-1">Move Data Between Accounts</h2>
        <p className="text-sm text-secondary mb-4">
          Export all your templates and campaigns (recipients included, send history left
          behind) as a file, then import it into a different account — useful when you're
          switching which Gmail address actually sends the campaign.
        </p>
        <div className="flex gap-2">
          <button className={btnGhostCls} onClick={() => setShowExportModal(true)}>⬇ Export…</button>
          <button className={btnGhostCls} onClick={() => importRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : '⬆ Import from file'}
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>
      </div>

      <button className={btnGhostCls} onClick={handleLogout}>Log out</button>

      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} showToast={showToast} />}
    </div>
  )
}

function AvatarCropModal({ file, onCancel, onSave }: { file: File, onCancel: () => void, onSave: (blob: Blob) => void }) {
  const CONTAINER = 280   // on-screen crop circle diameter (px)
  const OUTPUT = 400      // exported image resolution (px, square)

  const [imgUrl, setImgUrl] = useState('')
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // top-left of the displayed image, in container-space px
  const [saving, setSaving] = useState(false)
  const dragRef = useRef<{ startX: number, startY: number, origX: number, origY: number } | null>(null)
  const imgElRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onImgLoad() {
    const el = imgElRef.current
    if (!el) return
    setNatural({ w: el.naturalWidth, h: el.naturalHeight })
  }

  // "Cover" scale — smallest zoom where the image still fully fills the circle, no gaps.
  const baseScale = natural.w && natural.h ? Math.max(CONTAINER / natural.w, CONTAINER / natural.h) : 1
  const dispW = natural.w * baseScale * zoom
  const dispH = natural.h * baseScale * zoom

  function clampPos(x: number, y: number) {
    const minX = Math.min(0, CONTAINER - dispW)
    const minY = Math.min(0, CONTAINER - dispH)
    return { x: Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) }
  }

  // Recenter/reclamp whenever zoom or the image itself changes size.
  useEffect(() => {
    setPos(p => clampPos((CONTAINER - dispW) / 2, (CONTAINER - dispH) / 2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural.w, natural.h])

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { startX: clientX, startY: clientY, origX: pos.x, origY: pos.y }
  }
  function moveDrag(clientX: number, clientY: number) {
    if (!dragRef.current) return
    const { startX, startY, origX, origY } = dragRef.current
    setPos(clampPos(origX + (clientX - startX), origY + (clientY - startY)))
  }
  function endDrag() { dragRef.current = null }

  useEffect(() => {
    function onMove(e: MouseEvent) { moveDrag(e.clientX, e.clientY) }
    function onUp() { endDrag() }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, dispW, dispH])

  async function handleSave() {
    const el = imgElRef.current
    if (!el) return
    setSaving(true)
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')!
    const ratio = OUTPUT / CONTAINER
    ctx.drawImage(el, pos.x * ratio, pos.y * ratio, dispW * ratio, dispH * ratio)
    canvas.toBlob(blob => {
      setSaving(false)
      if (blob) onSave(blob)
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl border border-border max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink mb-1">Adjust photo</h2>
        <p className="text-sm text-secondary mb-4">Drag to reposition, use the slider to zoom.</p>

        <div
          className="relative mx-auto rounded-full overflow-hidden bg-surface-low cursor-move select-none"
          style={{ width: CONTAINER, height: CONTAINER }}
          onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY) }}
          onTouchStart={e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY) }}
          onTouchMove={e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY) }}
          onTouchEnd={endDrag}
        >
          {imgUrl && (
            <img
              ref={imgElRef}
              src={imgUrl}
              onLoad={onImgLoad}
              alt="Crop preview"
              draggable={false}
              className="absolute select-none pointer-events-none"
              style={{ width: dispW, height: dispH, left: pos.x, top: pos.y }}
            />
          )}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-secondary">🔍</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1" />
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className={btnGhostCls} onClick={onCancel}>Cancel</button>
          <button className={`${btnPrimaryCls} flex items-center gap-2`} onClick={handleSave} disabled={saving || !natural.w}>
            {saving && <Spinner />}
            {saving ? 'Saving…' : 'Save photo'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ExportModal({ onClose, showToast }: any) {
  const [templates, setTemplates] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [manualTemplateIds, setManualTemplateIds] = useState<Set<string>>(new Set())
  const [campaignIds, setCampaignIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/templates').then(r => r.json()),
      fetch('/api/campaigns').then(r => r.json()),
    ]).then(([t, c]) => { setTemplates(t); setCampaigns(c); setLoading(false) })
  }, [])

  // Templates required because a selected campaign uses them — locked on, can't be
  // unticked independently of the campaign itself.
  const autoTemplateIds = new Set(
    campaigns.filter(c => campaignIds.has(c.id) && c.templateId).map(c => c.templateId)
  )
  const effectiveTemplateIds = new Set([...manualTemplateIds, ...autoTemplateIds])

  function toggleCampaign(id: string) {
    setCampaignIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleTemplate(id: string) {
    if (autoTemplateIds.has(id)) return // locked — untick the campaign instead
    setManualTemplateIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function runExport() {
    if (!effectiveTemplateIds.size && !campaignIds.size) return showToast('Select at least one template or campaign', 'error')
    setExporting(true)
    try {
      const r = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateIds: [...effectiveTemplateIds], campaignIds: [...campaignIds] })
      })
      const data = await r.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mailmerge-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Exported! Send that file to whoever will import it.')
      onClose()
    } catch {
      showToast('Export failed', 'error')
    }
    setExporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-border max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">Export data</h2>
          <p className="text-sm text-secondary mt-1">Pick what to include. Recipients are never exported — only campaign/template setup.</p>
        </div>

        <div className="overflow-y-auto p-5 space-y-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-secondary text-sm gap-2"><Spinner /> Loading…</div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-ink mb-2">Campaigns</h3>
                {!campaigns.length && <p className="text-xs text-secondary">No campaigns yet.</p>}
                <div className="space-y-1.5">
                  {campaigns.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                      <input type="checkbox" checked={campaignIds.has(c.id)} onChange={() => toggleCampaign(c.id)} />
                      {c.name}
                      <span className="text-xs text-secondary">({c.template?.name || 'no template'})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-ink mb-2">Templates</h3>
                {!templates.length && <p className="text-xs text-secondary">No templates yet.</p>}
                <div className="space-y-1.5">
                  {templates.map(t => (
                    <label key={t.id} className={`flex items-center gap-2 text-sm text-ink ${autoTemplateIds.has(t.id) ? 'opacity-70' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={effectiveTemplateIds.has(t.id)} disabled={autoTemplateIds.has(t.id)} onChange={() => toggleTemplate(t.id)} />
                      {t.name}
                      {autoTemplateIds.has(t.id) && (
                        <span className="text-xs bg-surface-low text-secondary rounded px-1.5 py-0.5">
                          Auto-included (used by {campaigns.find(c => c.templateId === t.id && campaignIds.has(c.id))?.name})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button className={btnGhostCls} onClick={onClose}>Cancel</button>
          <button className={`${btnPrimaryCls} flex items-center gap-2`} onClick={runExport} disabled={exporting || loading}>
            {exporting && <Spinner />}
            {exporting ? 'Exporting…' : `Export ${effectiveTemplateIds.size + campaignIds.size ? `(${campaignIds.size} campaign${campaignIds.size !== 1 ? 's' : ''}, ${effectiveTemplateIds.size} template${effectiveTemplateIds.size !== 1 ? 's' : ''})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Home Tab ─────────────────────────────────────────────
function HomeTab({ campaigns, setTab, onRefresh, loading }: any) {
  const totalSent    = campaigns.reduce((sum: number, c: Campaign) => sum + (c.sent || 0), 0)
  const totalOpened  = campaigns.reduce((sum: number, c: Campaign) => sum + (c.opened || 0), 0)
  const openRate     = totalSent ? Math.round((totalOpened / totalSent) * 100) : 0
  const totalCampaigns = campaigns.length
  const recentCampaigns = [...campaigns].sort((a: Campaign, b: Campaign) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5)

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-ink tracking-tight">Welcome back</h1>
          <p className="text-sm text-secondary mt-1">Here is a snapshot of your mail merge activities.</p>
        </div>
        <button className={btnGhostCls} onClick={onRefresh}>↻ Refresh</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[0,1,2,3].map(i => (
            <div key={i} className={`${cardCls} animate-pulse`}>
              <div className="h-3 w-20 bg-surface-low rounded mb-3" />
              <div className="h-7 w-14 bg-surface-low rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Campaigns" value={totalCampaigns} />
          <StatCard label="Emails Sent" value={totalSent} />
          <StatCard label="Total Opened" value={totalOpened} />
          <StatCard label="Open Rate %" value={openRate + '%'} />
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <button className={btnPrimaryCls} onClick={() => setTab('campaigns')}>+ New Campaign</button>
        <button className={btnGhostCls} onClick={() => setTab('compose')}>+ New Template</button>
        <button className={btnGhostCls} onClick={() => setTab('dashboard')}>View Analytics</button>
      </div>

      <div className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Recent Campaigns</h2>
          <button className="text-sm text-ink underline underline-offset-4 decoration-border hover:decoration-ink transition-all" onClick={() => setTab('campaigns')}>View all</button>
        </div>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[0,1,2].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 flex-1 bg-surface-low rounded" />
                <div className="h-4 w-16 bg-surface-low rounded" />
                <div className="h-4 w-12 bg-surface-low rounded" />
                <div className="h-4 w-12 bg-surface-low rounded" />
                <div className="h-4 w-16 bg-surface-low rounded" />
                <div className="h-4 w-20 bg-surface-low rounded" />
              </div>
            ))}
          </div>
        ) : !recentCampaigns.length ? (
          <EmptyState icon="◈" title="No campaigns yet" text="Create your first campaign to get started" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-secondary uppercase border-b border-border">
                  <th className="py-2 pr-4 font-semibold">Campaign</th>
                  <th className="py-2 pr-4 font-semibold">Template</th>
                  <th className="py-2 pr-4 font-semibold">Sent</th>
                  <th className="py-2 pr-4 font-semibold">Opened</th>
                  <th className="py-2 pr-4 font-semibold">Open Rate</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentCampaigns.map((c: Campaign) => {
                  const rate = c.sent ? Math.round((c.opened / c.sent) * 100) : 0
                  return (
                    <tr key={c.id} className="cursor-pointer hover:bg-surface-low transition-colors" onClick={() => setTab('campaigns')}>
                      <td className="py-3 pr-4 font-medium text-ink">{c.name}</td>
                      <td className="py-3 pr-4 text-secondary">{c.template?.name}</td>
                      <td className="py-3 pr-4">{c.sent}</td>
                      <td className="py-3 pr-4">{c.opened}</td>
                      <td className="py-3 pr-4">{c.sent ? `${rate}%` : '—'}</td>
                      <td className="py-3 pr-4"><span className="inline-flex items-center gap-1.5 text-xs"><StatusDot status={c.status}/>{c.status}</span></td>
                      <td className="py-3 text-secondary">{new Date(c.createdAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Campaigns Tab ────────────────────────────────────────
function CampaignsTab({ campaigns: initialCampaigns, templates, onRefresh, showToast }: any) {
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>(initialCampaigns || [])
  const [creating, setCreating]         = useState(false)
  const [newName, setNewName]           = useState('')
  const [newTemplateId, setNewTemplate] = useState('')
  const [selected, setSelected]         = useState<Campaign | null>(null)
  const [savingCreate, setSavingCreate] = useState(false)
  const recipientsCache = useRef<Record<string, any[]>>({})

  useEffect(() => { setLocalCampaigns(initialCampaigns || []) }, [initialCampaigns])

  // When the background poll refreshes the list, keep the open detail view's
  // status/sentCount in sync too (so it doesn't look stuck on "sending").
  useEffect(() => {
    if (!selected) return
    const updated = localCampaigns.find(c => c.id === selected.id)
    if (updated && (updated.status !== selected.status || (updated as any).sentCount !== (selected as any).sentCount || updated.scheduledAt !== selected.scheduledAt)) {
      setSelected(updated)
    }
  }, [localCampaigns])

  function prefetchRecipients(campaignId: string) {
    if (recipientsCache.current[campaignId]) return
    fetch(`/api/recipients?campaignId=${campaignId}`)
      .then(r => r.json())
      .then(data => { recipientsCache.current[campaignId] = data })
  }

  async function createCampaign() {
    if (!newName || !newTemplateId) return showToast('Enter name and select template', 'error')
    setSavingCreate(true)
    const r = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, templateId: newTemplateId })
    })
    const c = await r.json()
    setSavingCreate(false)
    setLocalCampaigns(prev => [c, ...prev])
    setCreating(false); setNewName(''); setNewTemplate('')
    setSelected(c)
    showToast('Campaign created!')
  }

  function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return
    setLocalCampaigns(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
    showToast('Campaign deleted')
    fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' })
  }

  async function duplicateCampaign(c: Campaign) {
    const r = await fetch('/api/campaigns/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: c.id })
    })
    const newCampaign = await r.json()
    setLocalCampaigns(prev => [newCampaign, ...prev])
    setSelected(newCampaign)
    showToast('Campaign duplicated!')
  }

  async function cancelPending(campaignId: string) {
    const res = await fetch(`/api/campaigns/${campaignId}/cancel`, { method: 'POST' })
    const d = await res.json()
    setLocalCampaigns(prev => prev.map(c => c.id === campaignId
      ? { ...c, status: 'done', hasPending: false, recipients: (c as any).recipients?.map((r: any) => r.status === 'pending' ? { ...r, status: 'cancelled' } : r) || [] }
      : c
    ))
    showToast(`Cancelled ${d.cancelledCount} pending emails`)
  }

  if (selected) return (
    <CampaignDetail
      campaign={selected}
      templates={templates}
      initialRecipients={recipientsCache.current[selected.id] || null}
      onBack={() => { setSelected(null); onRefresh() }}
      showToast={showToast}
    />
  )

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-ink tracking-tight">Campaigns</h1>
          <p className="text-sm text-secondary mt-1">Manage and send your mail merge campaigns</p>
        </div>
        <div className="flex gap-2">
          <button className={btnGhostCls} onClick={() => { onRefresh(); showToast('Refreshed!', 'info') }}>↻ Refresh</button>
          <button className={btnPrimaryCls} onClick={() => setCreating(true)}>+ New Campaign</button>
        </div>
      </div>

      {creating && (
        <div className={`${cardCls} mb-4 max-w-[480px]`}>
          <h2 className="text-lg font-semibold text-ink mb-4">New Campaign</h2>
          <div className="mb-4">
            <label className={labelCls}>Campaign Name</label>
            <input className={inputCls} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Prof Outreach Jan 2025" autoFocus />
          </div>
          <div className="mb-4">
            <label className={labelCls}>Template</label>
            <select className={inputCls} value={newTemplateId} onChange={e => setNewTemplate(e.target.value)}>
              <option value="">Select template…</option>
              {templates.map((t: Template) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className={btnGhostCls} onClick={() => setCreating(false)}>Cancel</button>
            <button className={`${btnPrimaryCls} flex items-center gap-2`} onClick={createCampaign} disabled={savingCreate}>
              {savingCreate && <Spinner />}
              {savingCreate ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </div>
      )}

      {!localCampaigns.length ? (
        <div className={cardCls}>
          <EmptyState icon="◈" title="No campaigns yet" text="Create your first campaign to get started"
            action={<button className={btnPrimaryCls} onClick={() => setCreating(true)}>+ New Campaign</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {localCampaigns.map((c: Campaign) => {
            const isScheduled = c.status === 'scheduled'
            return (
              <div key={c.id} className={`${cardCls} cursor-pointer hover:border-ink transition-all group relative`}
                onClick={() => { setSelected(c); setCreating(false) }} onMouseEnter={() => prefetchRecipients(c.id)}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-ink leading-tight">{isScheduled && '⏰ '}{c.name}</h3>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-surface-low text-secondary shrink-0">
                    <StatusDot status={c.status} />{c.status}
                  </span>
                </div>
                <p className="text-sm text-secondary mb-4">{c.template?.name}</p>
                <div className="flex items-center justify-between text-xs text-secondary pt-3 border-t border-border">
                  {!isScheduled
                    ? <span><b className="text-ink">{c.sent}</b> sent · <b className="text-ink">{c.opened}</b> opened</span>
                    : c.scheduledAt && <span className="text-accentOrange">{new Date(c.scheduledAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})} {new Date(c.scheduledAt).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',hour12:true})}</span>}
                  <span>{new Date(c.createdAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})}</span>
                </div>
                <div className="absolute top-4 right-4 hidden group-hover:flex gap-1 bg-white rounded-lg shadow-ambient border border-border p-1">
                  {(c.status === 'sending' || c.status === 'scheduled') && (c as any).hasPending && (
                    <button onClick={e => { e.stopPropagation(); cancelPending(c.id) }} className="p-1.5 text-accentRed hover:bg-surface-low rounded" title="Cancel Pending">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    </button>
                  )}
                  <button className="p-1.5 text-secondary hover:bg-surface-low rounded" onClick={e => { e.stopPropagation(); duplicateCampaign(c) }} title="Duplicate">⧉</button>
                  <button className="p-1.5 text-accentRed hover:bg-surface-low rounded" onClick={e => { e.stopPropagation(); deleteCampaign(c.id) }} title="Delete">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Campaign Detail ──────────────────────────────────────
function CampaignDetail({ campaign, templates, initialRecipients, onBack, showToast }: any) {
  const [recipients, setRecipients]   = useState<Recipient[]>(initialRecipients || [])
  const [loading, setLoading]         = useState(!initialRecipients)
  const [sending, setSending]         = useState(false)
  const [importTab, setImportTab]     = useState<'csv'|'sheet'|'manual'>('csv')
  const [importing, setImporting]     = useState(false)
  const [refreshing, setRefreshing]   = useState(false)
  const [sheetUrl, setSheetUrl]       = useState('')
  const [manualText, setManualText]   = useState('')
  const [delayMin, setDelayMin]       = useState(30)
  const [delayMax, setDelayMax]       = useState(90)
  const [fromName, setFromName]             = useState('')
  const [fromEmail, setFromEmail]           = useState('')
  const [scheduleAt, setScheduleAt]         = useState('')
  const [useSchedule, setUseSchedule]       = useState(false)
  const [columns, setColumns]               = useState<string[]>([])
  const [allTemplates, setAllTemplates]     = useState<Template[]>([])
  const [showFollowUp, setShowFollowUp]       = useState<'opened'|'not_opened'|'selected'|null>(null)
  const [followUpTemplateId, setFollowUpTemplateId] = useState('')
  const [followUpLevel, setFollowUpLevel]     = useState(0)
  const [sendingFollowUp, setSendingFollowUp] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())
  const [expandedRecipient, setExpandedRecipient]   = useState<string | null>(null)
  const [followUpScheduled, setFollowUpScheduled]   = useState(false)
  const [followUpScheduleAt, setFollowUpScheduleAt] = useState('')
  const [editing, setEditing]                 = useState(false)
  const [editName, setEditName]               = useState(campaign.name)
  const [editTemplateId, setEditTemplateId]   = useState(campaign.templateId || '')
  const [savingEdit, setSavingEdit]           = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!initialRecipients) loadRecipients()
    else if (initialRecipients.length) setColumns(Object.keys(initialRecipients[0].data || {}))
    loadTemplates()
  }, [])

  // Background-poll recipient statuses (sent/opened/error/follow-ups) while anything
  // is still pending or being sent — no more relying on a manual page refresh.
  useEffect(() => {
    const hasPending = recipients.some(r => r.status === 'pending' || r.status === 'sending')
      || recipients.some((r: any) => (r.followUps || []).some((f: any) => f.status === 'pending' || f.status === 'scheduled' || f.status === 'sending'))
      || campaign.status === 'sending' || campaign.status === 'scheduled'
    if (!hasPending) return
    const interval = setInterval(() => { loadRecipients(true) }, 8000)
    return () => clearInterval(interval)
  }, [recipients, campaign.status])

  async function loadTemplates() {
    const r = await fetch('/api/templates')
    const d = await r.json()
    setAllTemplates(d)
  }

  async function loadRecipients(silent = false) {
    if (!silent) setLoading(true)
    const r = await fetch(`/api/recipients?campaignId=${campaign.id}`)
    const data = await r.json()
    setRecipients(data)
    if (data.length) setColumns(Object.keys(data[0].data || {}))
    setLoading(false)
  }

  async function uploadCSV(file: File) {
    setImporting(true)
    const form = new FormData(); form.append('file', file)
    const r = await fetch(`/api/recipients?campaignId=${campaign.id}`, { method: 'POST', body: form })
    const d = await r.json()
    setImporting(false)
    if (d.error) return showToast(d.error, 'error')
    showToast(`Imported ${d.count} recipients!`); loadRecipients()
  }

  async function importSheet() {
    if (!sheetUrl) return showToast('Enter a Google Sheet URL', 'error')
    setImporting(true)
    showToast('Importing from Google Sheet…', 'info')
    const r = await fetch('/api/import-sheet', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ url: sheetUrl }) })
    const d = await r.json()
    if (d.error) { setImporting(false); return showToast(d.error, 'error') }

    const r2 = await fetch(`/api/recipients?campaignId=${campaign.id}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ recipients: d.records, columns: d.columns })
    })
    const d2 = await r2.json()
    setImporting(false)
    if (d2.error) return showToast(d2.error, 'error')
    showToast(`Imported ${d2.count} recipients from Sheet!`); loadRecipients()
  }

  async function importManual() {
    if (!manualText.trim()) return showToast('Paste some data first', 'error')
    setImporting(true)
    try {
      const records = parse(manualText, { columns: true, skip_empty_lines: true, trim: true })
      const r = await fetch(`/api/recipients?campaignId=${campaign.id}`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ recipients: records, columns: Object.keys(records[0] || {}) })
      })
      const d = await r.json()
      setImporting(false)
      if (d.error) return showToast(d.error, 'error')
      showToast(`Added ${d.count} recipients!`); loadRecipients()
    } catch {
      setImporting(false)
      showToast('Could not parse data. Make sure first row has column names.', 'error')
    }
  }

  function parse(text: string, opts: any) {
    const lines   = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return []
    const headers = lines[0].split('\t').map(h => h.trim())
    return lines.slice(1).map(line => {
      const vals = line.split('\t')
      const obj: any = {}
      headers.forEach((h, i) => obj[h] = vals[i] || '')
      return obj
    })
  }

  async function clearRecipients() {
    if (!confirm('Remove all recipients?')) return
    await fetch(`/api/recipients?campaignId=${campaign.id}`, { method: 'DELETE' })
    setRecipients([]); setColumns([])
    showToast('Recipients cleared')
  }

  async function startSend() {
    if (!recipients.length) return showToast('Add recipients first', 'error')
    if (unmatchedPlaceholders.length > 0) {
      const proceed = confirm(
        `Heads up: {{${unmatchedPlaceholders.join('}}, {{')}}} don't match any column in your recipients — they'll be sent as literal text instead of replaced.\n\nSend anyway?`
      )
      if (!proceed) return
    }
    setSending(true)
    const r = await fetch('/api/send', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        campaignId: campaign.id,
        delayMin, delayMax, fromName, fromEmail,
        scheduleAt: useSchedule && scheduleAt ? new Date(scheduleAt).toISOString() : undefined
      })
    })
    const d = await r.json()
    setSending(false)
    if (d.error) return showToast(d.error, 'error')
    if (d.scheduled) return showToast('Scheduled successfully!')
    showToast(d.message || `Queued ${d.queuedCount} recipients!`)
    loadRecipients()
  }

  async function cancelFollowUp(followUpId: string, recipientId: string) {
    await fetch(`/api/followup?id=${followUpId}`, { method: 'DELETE' })
    setRecipients(prev => prev.map(r => r.id !== recipientId ? r : {
      ...r,
      followUps: (r as any).followUps?.filter((f: any) => f.id !== followUpId) || []
    }))
    showToast('Scheduled follow-up cancelled')
  }

  async function startFollowUp() {
    if (!followUpTemplateId) return showToast('Select a template for the follow-up', 'error')
    if (!showFollowUp) return
    const isSelected = showFollowUp === 'selected'
    if (isSelected && selectedRecipients.size === 0) return showToast('No recipients selected', 'error')
    setSendingFollowUp(true)
    const r = await fetch('/api/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        templateId: followUpTemplateId,
        followUpType: isSelected ? 'not_opened' : showFollowUp,
        followUpLevel: isSelected ? 0 : followUpLevel,
        selectedIds: isSelected ? [...selectedRecipients] : null,
        scheduledAt: followUpScheduled && followUpScheduleAt ? new Date(followUpScheduleAt).toISOString() : null,
        delayMin, delayMax, fromName, fromEmail
      })
    })
    const d = await r.json()
    setSendingFollowUp(false)
    if (d.error) return showToast(d.error, 'error')
    showToast(followUpScheduled ? `Follow-up scheduled!` : `Follow-up sent to ${d.sentCount} recipients!`)
    setShowFollowUp(null)
    setFollowUpTemplateId('')
    setSelectedRecipients(new Set())
    setFollowUpScheduled(false)
    setFollowUpScheduleAt('')
    loadRecipients()
  }

  async function saveCampaignEdit() {
    setSavingEdit(true)
    await fetch('/api/campaigns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaign.id, name: editName, templateId: editTemplateId })
    })
    campaign.name = editName
    setSavingEdit(false)
    setEditing(false)
    showToast('Campaign updated!')
  }

  const pending    = recipients.filter(r => r.status === 'pending').length
  const sent       = recipients.filter(r => r.status === 'sent').length
  const opened     = recipients.filter(r => r.openedAt).length

  // Merge-tag typo detection: compare {{placeholders}} used in the selected template
  // against the actual column names imported for this campaign's recipients.
  const activeTemplate = allTemplates.find(t => t.id === (editTemplateId || campaign.templateId)) || null
  const templatePlaceholders = activeTemplate
    ? extractPlaceholders(activeTemplate.subject + ' ' + activeTemplate.body)
    : []
  const unmatchedPlaceholders = columns.length
    ? templatePlaceholders.filter(p => !columns.some(c => c.trim().toLowerCase() === p.trim().toLowerCase()))
    : []

  function getFollowUpGroups(filterFn: (r: Recipient) => boolean) {
    const filtered = recipients.filter(r => r.status === 'sent' && filterFn(r))
    const groups: Record<number, number> = {}
    filtered.forEach(r => {
      const count = (r as any).followUpCount ?? 0
      groups[count] = (groups[count] || 0) + 1
    })
    return Object.entries(groups).map(([level, count]) => ({ level: Number(level), count })).sort((a, b) => a.level - b.level)
  }

  const openedGroups    = getFollowUpGroups(r => !!r.openedAt)
  const notOpenedGroups = getFollowUpGroups(r => !r.openedAt)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-white hover:bg-surface-low transition-colors" onClick={onBack}>←</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink">{campaign.name}</h1>
              <button className="text-xs px-2 py-1 rounded-lg border border-border bg-white hover:bg-surface-low transition-colors" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <p className="text-sm text-secondary mt-0.5">{campaign.template?.name} · {campaign.template?.subject}</p>
          </div>
        </div>
        <button className={`${btnGhostCls} flex items-center gap-2`} onClick={async () => { setRefreshing(true); await loadRecipients(); setRefreshing(false); showToast('Refreshed!', 'info') }} disabled={refreshing}>
          {refreshing ? <Spinner size={12} /> : '↻'} Refresh
        </button>
      </div>

      {unmatchedPlaceholders.length > 0 && (
        <div className="mb-6 border border-accentOrange/40 bg-accentOrange/10 rounded-lg px-4 py-3 text-sm">
          <div className="font-semibold text-ink mb-1">⚠️ Merge tag{unmatchedPlaceholders.length > 1 ? 's' : ''} don't match any imported column — check for typos</div>
          <div className="text-secondary">
            Template uses {unmatchedPlaceholders.map(p => <span key={p} className="font-mono bg-white border border-border rounded px-1.5 py-0.5 mx-0.5">{'{{'}{p}{'}}'}</span>)}
            but your recipients only have: {columns.map(c => <span key={c} className="font-mono">{c}</span>).reduce((acc: any, el, i) => acc === null ? [el] : [acc, ', ', el], null)}.
            These will be sent as literal text (e.g. "{'{{'}{unmatchedPlaceholders[0]}{'}}'}") instead of being replaced.
          </div>
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* Left — Recipients */}
        <div className="w-[65%] space-y-4">
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink">Recipients</h2>
              {recipients.length > 0 && <button className={btnGhostCls} onClick={clearRecipients}>Clear all</button>}
            </div>

            <div className="flex gap-1 mb-4 border-b border-border">
              {(['csv','sheet','manual'] as const).map(t => (
                <button key={t}
                  className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${importTab===t ? 'border-ink text-ink font-medium' : 'border-transparent text-secondary hover:text-ink'}`}
                  onClick={() => setImportTab(t)}>
                  {t === 'csv' ? '📄 CSV' : t === 'sheet' ? '📊 Google Sheet' : '✏️ Paste'}
                </button>
              ))}
            </div>

            {importTab === 'csv' && (
              <div className={`border-2 border-dashed border-border rounded-xl p-8 text-center transition-all ${importing ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-ink hover:bg-surface-low'}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) uploadCSV(f) }}>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { if(e.target.files?.[0]) uploadCSV(e.target.files[0]) }} />
                {importing ? (
                  <div className="flex flex-col items-center gap-2 text-secondary">
                    <Spinner size={20} /> <div className="text-sm">Importing…</div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl text-secondary mb-2">⬆</div>
                    <div className="text-sm font-medium text-ink">Drop CSV file here or click to upload</div>
                    <div className="text-xs text-secondary mt-1">First row must be column headers</div>
                  </>
                )}
              </div>
            )}

            {importTab === 'sheet' && (
              <div>
                <label className={labelCls}>Google Sheet URL</label>
                <input className={inputCls} value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." disabled={importing} />
                <div className="text-xs text-secondary mt-1.5">Sheet must be set to "Anyone with the link can view"</div>
                <button className={`${btnPrimaryCls} mt-3 flex items-center gap-2`} onClick={importSheet} disabled={importing}>
                  {importing && <Spinner />}
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            )}

            {importTab === 'manual' && (
              <div>
                <label className={labelCls}>Paste tab-separated data (copy from Excel/Sheets)</label>
                <textarea
                  className={`${inputCls} font-mono`}
                  rows={6}
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const target = e.target as HTMLTextAreaElement
                      const start = target.selectionStart
                      const end = target.selectionEnd
                      const next = manualText.slice(0, start) + '\t' + manualText.slice(end)
                      setManualText(next)
                      requestAnimationFrame(() => {
                        target.selectionStart = target.selectionEnd = start + 1
                      })
                    }
                  }}
                  placeholder={'Name\tEmail\tUniversity\nProf. Smith\tsmith@uni.edu\tMIT'}
                />
                <button className={`${btnPrimaryCls} mt-3 flex items-center gap-2`} onClick={importManual} disabled={importing}>
                  {importing && <Spinner />}
                  {importing ? 'Adding...' : 'Add Recipients'}
                </button>
              </div>
            )}

            {loading && recipients.length === 0 && (
              <div className="my-4 border border-border rounded-lg p-8 flex items-center justify-center gap-2 text-secondary text-sm">
                <Spinner /> Loading recipients…
              </div>
            )}

            {recipients.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-secondary my-4">
                <span>{recipients.length} total</span>
                <span>·</span>
                <span className="text-accentOrange">{pending} pending</span>
                <span>·</span>
                <span className="text-ink">{sent} sent</span>
                <span>·</span>
                <span className="text-green-600">{opened} opened</span>
              </div>
            )}

            {recipients.length > 0 && (
              <div className="overflow-x-auto max-h-[295px] overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-xs text-secondary uppercase border-b border-border">
                      <th className="w-8 px-3 py-2">
                        <input type="checkbox"
                          checked={selectedRecipients.size === recipients.filter(r => r.status === 'sent').length && recipients.filter(r => r.status === 'sent').length > 0}
                          onChange={e => {
                            if (e.target.checked) setSelectedRecipients(new Set(recipients.filter(r => r.status === 'sent').map(r => r.id)))
                            else setSelectedRecipients(new Set())
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 font-semibold">Email</th>
                      {columns.slice(0,3).filter(c => !c.toLowerCase().includes('email')).map(c => <th key={c} className="px-3 py-2 font-semibold">{c}</th>)}
                      <th className="px-3 py-2 font-semibold text-center">Status</th>
                      <th className="px-3 py-2 font-semibold text-center">Opened</th>
                      <th className="px-3 py-2 font-semibold text-center">Follow-ups</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recipients.map(r => (
                      <React.Fragment key={r.id}>
                      <tr
                        className={`cursor-pointer hover:bg-surface-low transition-colors ${selectedRecipients.has(r.id) ? 'bg-surface-low' : ''}`}
                        onClick={() => setExpandedRecipient(expandedRecipient === r.id ? null : r.id)}
                      >
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          {r.status === 'sent' && (
                            <input type="checkbox"
                              checked={selectedRecipients.has(r.id)}
                              onChange={e => {
                                const next = new Set(selectedRecipients)
                                e.target.checked ? next.add(r.id) : next.delete(r.id)
                                setSelectedRecipients(next)
                              }}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-ink">
                          <span className="flex items-center gap-1.5">
                            {(r as any).followUps?.length > 0 && (
                              <span className="text-[10px] text-secondary">{expandedRecipient === r.id ? '▾' : '▸'}</span>
                            )}
                            {r.email}
                          </span>
                        </td>
                        {columns.slice(0,3).filter(c => !c.toLowerCase().includes('email')).map(c => (
                          <td key={c} className="px-3 py-2">{(r.data as any)[c] || '—'}</td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <StatusBadge status={r.openedAt ? 'opened' : r.status === 'pending' && campaign.status === 'scheduled' ? 'scheduled' : r.status} />
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {r.openedAt ? <span className="text-green-600">{new Date(r.openedAt).toLocaleString('en-PK',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true})}</span> : <span className="text-outline">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {(r as any).followUps?.length > 0 ? (
                            <div className="flex flex-col gap-0.5 items-center">
                              {(r as any).followUps.map((f: any) => (
                                <span key={f.id} className="text-[10px] whitespace-nowrap">
                                  <span className="font-semibold text-secondary">#{f.number}</span>{' '}
                                  {f.status === 'scheduled'
                                    ? <span className="text-accentOrange">⏰ {new Date(f.scheduledAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})} {new Date(f.scheduledAt).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',hour12:true})}</span>
                                    : f.status === 'sent' && f.openedAt
                                      ? <span className="text-green-600">✓ Opened</span>
                                      : f.status === 'sent'
                                        ? <span className="text-outline">✓ Sent</span>
                                        : <span className="text-accentRed">✗ Error</span>}
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-outline text-xs">—</span>}
                        </td>
                      </tr>
                      {expandedRecipient === r.id && (r as any).followUps?.length > 0 && (
                        <tr key={r.id + '_timeline'}>
                          <td colSpan={6 + columns.slice(0,3).filter(c => !c.toLowerCase().includes('email')).length} className="p-0 bg-surface-low border-b border-border">
                            <div className="py-3 pl-12 pr-4">
                              <div className="flex items-center gap-3 py-1.5 border-b border-dashed border-border text-xs">
                                <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[9px] font-bold shrink-0">0</span>
                                <span className="text-secondary flex-1">Original email</span>
                                <span className="text-outline">{r.sentAt ? new Date(r.sentAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'}) : '—'}</span>
                                <StatusBadge status={r.openedAt ? 'opened' : 'sent'} />
                              </div>
                              {(r as any).followUps.map((f: any) => (
                                <div key={f.id} className="flex items-center gap-3 py-1.5 border-b border-dashed border-border text-xs">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0
                                    ${f.openedAt ? 'bg-green-500 text-white' : f.status === 'scheduled' ? 'bg-accentOrange text-white' : f.status === 'error' ? 'bg-accentRed text-white' : 'bg-border text-secondary'}`}>
                                    #{f.number}
                                  </span>
                                  <span className="text-secondary flex-1">{f.template?.name || 'Follow-up'}</span>
                                  <span className="text-outline">
                                    {f.status === 'scheduled'
                                      ? `⏰ ${new Date(f.scheduledAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})} ${new Date(f.scheduledAt).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',hour12:true})}`
                                      : f.sentAt ? new Date(f.sentAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'}) : '—'}
                                  </span>
                                  <StatusBadge status={f.openedAt ? 'opened' : f.status} />
                                  {f.status === 'scheduled' && (
                                    <button onClick={e => { e.stopPropagation(); cancelFollowUp(f.id, r.id) }} className="text-accentRed text-xs px-1" title="Cancel scheduled follow-up">✕</button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right — Send options or Edit */}
        <div className="w-[35%] space-y-4">
          {editing ? (
            <div className={cardCls}>
              <h2 className="text-lg font-semibold text-ink mb-4">Edit Campaign</h2>
              <div className="mb-4">
                <label className={labelCls}>Campaign Name</label>
                <input className={inputCls} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Campaign name" autoFocus />
              </div>
              <div className="mb-4">
                <label className={labelCls}>Template</label>
                <select className={inputCls} value={editTemplateId} onChange={e => setEditTemplateId(e.target.value)}>
                  {templates.map((t: Template) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button className={btnGhostCls} onClick={() => setEditing(false)}>Cancel</button>
                <button className={`${btnPrimaryCls} flex items-center gap-2`} onClick={saveCampaignEdit} disabled={savingEdit}>
                  {savingEdit && <Spinner />}
                  {savingEdit ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          ) : (<>
          <div className={cardCls}>
            <h2 className="text-lg font-semibold text-ink mb-4">Send Settings</h2>

            <div className="mb-4">
              <label className={labelCls}>From Name</label>
              <input className={inputCls} value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your Name" />
            </div>

            <div className="border-t border-border my-4"></div>

            <div className="mb-4">
              <label className={labelCls}>Delay Between Emails</label>
              <div className="flex items-center gap-2">
                <input className={inputCls} type="number" value={delayMin} onChange={e => setDelayMin(+e.target.value)} min={5} />
                <span className="text-xs text-secondary shrink-0">to</span>
                <input className={inputCls} type="number" value={delayMax} onChange={e => setDelayMax(+e.target.value)} min={5} />
                <span className="text-xs text-secondary shrink-0">sec</span>
              </div>
            </div>

            <div className="border-t border-border my-4"></div>

            <div className="flex items-center justify-between mb-2">
              <label className={`${labelCls} mb-0`}>Schedule for Later</label>
              <Toggle on={useSchedule} onToggle={() => setUseSchedule(!useSchedule)} />
            </div>

            {useSchedule && (
              <div className="mt-3">
                <label className={labelCls}>Send At</label>
                <input className={inputCls} type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} />
              </div>
            )}

            <div className="border-t border-border my-4"></div>

            <button
              className={`${btnPrimaryCls} w-full py-3 flex items-center justify-center gap-2`}
              onClick={startSend}
              disabled={sending || pending === 0}
            >
              {sending && <Spinner />}
              {sending ? (useSchedule ? 'Scheduling...' : 'Sending...') : useSchedule ? '📅 Schedule' : `🚀 Send to ${pending} recipients`}
            </button>

            {campaign.status === 'done' && pending > 0 && (
              <div className="text-xs text-secondary text-center mt-2">
                {pending} pending recipients — will send to them
              </div>
            )}
          </div>

          {sent > 0 && (
            <div className={cardCls}>
              <h2 className="text-lg font-semibold text-ink mb-4">Follow-up</h2>

              <div className="mb-4">
                <label className={labelCls}>Target Group</label>
                <select
                  className={inputCls}
                  value={showFollowUp ? (selectedRecipients.size > 0 && showFollowUp === 'selected' ? 'selected' : `${showFollowUp}__${followUpLevel}`) : ''}
                  onChange={e => {
                    if (!e.target.value) { setShowFollowUp(null); setFollowUpTemplateId(''); return }
                    if (e.target.value === 'selected') { setShowFollowUp('selected'); setFollowUpTemplateId(''); return }
                    const [type, level] = e.target.value.split('__')
                    setShowFollowUp(type as 'opened'|'not_opened'|'selected')
                    setFollowUpLevel(Number(level))
                    setFollowUpTemplateId('')
                  }}
                >
                  <option value="">Select group…</option>
                  {selectedRecipients.size > 0 && (
                    <option value="selected">✓ Selected ({selectedRecipients.size} recipients)</option>
                  )}
                  {notOpenedGroups.length > 0 && (
                    <optgroup label="📭 Not Opened">
                      {notOpenedGroups.map(({level, count}) => (
                        <option key={`not_opened__${level}`} value={`not_opened__${level}`}>
                          {level === 0 ? 'No follow-up yet' : `Follow-up ${level} sent`} ({count})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {openedGroups.length > 0 && (
                    <optgroup label="📬 Opened">
                      {openedGroups.map(({level, count}) => (
                        <option key={`opened__${level}`} value={`opened__${level}`}>
                          {level === 0 ? 'No follow-up yet' : `Follow-up ${level} sent`} ({count})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {showFollowUp && (
                <>
                  <div className="mb-4">
                    <label className={labelCls}>Follow-up Template</label>
                    <select className={inputCls} value={followUpTemplateId} onChange={e => setFollowUpTemplateId(e.target.value)}>
                      <option value="">Select template…</option>
                      {allTemplates.map((t: Template) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <label className={`${labelCls} mb-0`}>Schedule</label>
                    <Toggle on={followUpScheduled} onToggle={() => setFollowUpScheduled(p => !p)} />
                  </div>
                  {followUpScheduled && (
                    <div className="mb-3">
                      <input className={inputCls} type="datetime-local" value={followUpScheduleAt} onChange={e => setFollowUpScheduleAt(e.target.value)} />
                    </div>
                  )}

                  <div className="text-xs text-secondary mb-3">
                    {showFollowUp === 'selected'
                      ? `Sends to ${selectedRecipients.size} selected recipients in same thread`
                      : `Sends as reply in same thread · Follow-up #${followUpLevel + 1}`}
                  </div>
                  <button
                    className={`${btnPrimaryCls} w-full py-3 flex items-center justify-center gap-2`}
                    onClick={startFollowUp}
                    disabled={sendingFollowUp || !followUpTemplateId || (followUpScheduled && !followUpScheduleAt)}
                  >
                    {sendingFollowUp && <Spinner />}
                    {sendingFollowUp
                      ? 'Sending...'
                      : followUpScheduled
                        ? `⏰ Schedule Follow-up`
                        : showFollowUp === 'selected'
                          ? `🔁 Send to ${selectedRecipients.size} selected`
                          : `🔁 Send Follow-up #${followUpLevel + 1}`}
                  </button>
                  <button className={`${btnGhostCls} w-full mt-2`} onClick={() => { setShowFollowUp(null); setFollowUpTemplateId(''); setFollowUpScheduled(false); setFollowUpScheduleAt('') }}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  )
}

// ─── Compose Tab ──────────────────────────────────────────
function ComposeTab({ templates: initialTemplates, onSaved, showToast }: any) {
  const { useEditor, EditorContent } = require('@tiptap/react')
  const StarterKit = require('@tiptap/starter-kit').default

  const [localTemplates, setLocalTemplates] = useState<Template[]>(initialTemplates || [])
  const [selected, setSelected]         = useState<Template | null>(null)
  const [name, setName]                 = useState('')
  const [subject, setSubject]           = useState('')
  const [body, setBody]                 = useState('')
  const [saving, setSaving]             = useState(false)
  const [autoSaving, setAutoSaving]     = useState(false)
  const [attachments, setAttachments]   = useState<Attachment[]>([])
  const [uploading, setUploading]       = useState(false)
  const [sendingTest, setSendingTest]   = useState(false)
  const attachRef   = useRef<HTMLInputElement>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedRef = useRef<Template | null>(null)

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { setLocalTemplates(initialTemplates || []) }, [initialTemplates])

  function scheduleAutoSave(newName: string, newSubject: string, newBody: string) {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      const s = selectedRef.current
      if (!s?.id || s.id.startsWith('temp_')) return
      setAutoSaving(true)
      await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, name: newName || 'Untitled', subject: newSubject, body: newBody })
      })
      setAutoSaving(false)
      setLocalTemplates(prev => prev.map(t => t.id === s.id ? { ...t, name: newName || 'Untitled', subject: newSubject, body: newBody } : t))
    }, 2000)
  }

  const editor = useEditor({
    extensions: [StarterKit],
    content: body,
    onUpdate: ({ editor }: any) => {
      const html = editor.getHTML()
      setBody(html)
      scheduleAutoSave(name, subject, html)
    },
  })

  function resetEditor() {
    setSelected(null)
    setName(''); setSubject(''); setBody(''); setAttachments([])
    editor?.commands.setContent('')
  }

  function newTemplate() {
    const tempId = 'temp_' + Date.now()
    const tempTemplate: Template = { id: tempId, name: 'Untitled', subject: '', body: '', updatedAt: new Date().toISOString() }
    setLocalTemplates(prev => [tempTemplate, ...prev])
    setSelected(tempTemplate)
    setName(''); setSubject(''); setBody(''); setAttachments([])
    editor?.commands.setContent('')
    fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled', subject: '', body: '' })
    }).then(r => r.json()).then(created => {
      setLocalTemplates(prev => prev.map(t => t.id === tempId ? created : t))
      setSelected(prev => prev?.id === tempId ? created : prev)
    })
  }

  function cancelTemplate() {
    const id = selected?.id
    if (id) setLocalTemplates(prev => prev.filter(t => t.id !== id))
    resetEditor()
    if (id) fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
  }

  async function saveTemplate() {
    if (!selected?.id) return showToast('No template selected', 'error')
    if (!name || !subject || !body) return showToast('Fill in name, subject and body', 'error')
    const id = selected.id
    setLocalTemplates(prev => prev.map(t => t.id === id ? { ...t, name, subject, body } : t))
    resetEditor()
    showToast('Template saved!')
    fetch('/api/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, subject, body })
    }).then(() => onSaved())
  }

  function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    setLocalTemplates(prev => prev.filter(t => t.id !== id))
    if (selected?.id === id) resetEditor()
    showToast('Template deleted')
    fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
  }

  async function duplicateTemplate(t: Template) {
    const r = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Copy of ${t.name}`, subject: t.subject, body: t.body })
    })
    const newTpl = await r.json()
    setLocalTemplates(prev => [newTpl, ...prev])
    editTemplate(newTpl)
    showToast('Template duplicated!')
  }

  function detectPlaceholders() {
    const all = subject + ' ' + body
    const matches = all.match(/\{\{([^}]+)\}\}/g) || []
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))]
  }

  function editTemplate(t: Template) {
    setSelected(t)
    setName(t.name === 'Untitled' ? '' : t.name)
    setSubject(t.subject)
    setBody(t.body)
    setAttachments(t.attachments || [])
    editor?.commands.setContent(t.body)
  }

  const MAX_ATTACHMENTS = 5

  async function uploadAttachments(files: FileList) {
    if (!selected?.id || selected.id.startsWith('temp_')) return showToast('Please wait a moment then try again', 'error')
    const incoming = Array.from(files)
    if (attachments.length + incoming.length > MAX_ATTACHMENTS) {
      return showToast(`You can attach at most ${MAX_ATTACHMENTS} files (${attachments.length} already attached)`, 'error')
    }
    setUploading(true)
    const form = new FormData()
    incoming.forEach(f => form.append('files', f))
    form.append('templateId', selected.id)
    const r = await fetch('/api/upload', { method: 'POST', body: form })
    const d = await r.json()
    setUploading(false)
    if (d.error) return showToast(d.error, 'error')
    setAttachments(d.attachments)
    showToast(incoming.length > 1 ? `Attached ${incoming.length} files` : `Attached: ${incoming[0].name}`)
  }

  async function removeAttachment(url: string) {
    if (!selected) return
    setAttachments(prev => prev.filter(a => a.url !== url))
    const r = await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: selected.id, url })
    })
    const d = await r.json()
    if (d.attachments) setAttachments(d.attachments)
    showToast('Attachment removed')
  }

  async function sendTestEmail() {
    if (!selected?.id || selected.id.startsWith('temp_')) return showToast('Save the template first, then try again', 'error')
    setSendingTest(true)
    const r = await fetch('/api/test-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: selected.id, subject, body })
    })
    const d = await r.json()
    setSendingTest(false)
    if (d.error) return showToast(d.error, 'error')
    showToast('Test email sent to your own inbox — check subject/body/attachment before the real send!')
  }

  const placeholders = detectPlaceholders()

  return (
    <div>
      {selected ? (
        <>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-white hover:bg-surface-low transition-colors" onClick={cancelTemplate}>←</button>
            <div>
              <h1 className="text-2xl font-semibold text-ink">{name || 'Untitled Template'}</h1>
              <p className="text-sm text-secondary mt-0.5">{subject || 'No subject'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {autoSaving && <span className="text-xs text-secondary italic">saving…</span>}
            <button className={btnPrimaryCls} onClick={saveTemplate} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_280px] gap-4 items-start">
          <div className={cardCls}>
            <div className="mb-4">
              <label className={labelCls}>Template Name</label>
              <input className={inputCls} value={name} onChange={e => { setName(e.target.value); scheduleAutoSave(e.target.value, subject, body) }} placeholder="e.g. Masters Admission Inquiry" />
            </div>
            <div className="mb-4">
              <label className={labelCls}>Subject Line</label>
              <input className={inputCls} value={subject} onChange={e => { setSubject(e.target.value); scheduleAutoSave(name, e.target.value, body) }} placeholder="e.g. Inquiry Regarding PhD Supervision — {{Name}}" />
            </div>
            <div>
              <label className={labelCls}>Email Body</label>
              <div className="flex gap-1 p-2 bg-surface-low border border-border border-b-0 rounded-t-lg">
                {[
                  { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold'), cls: 'font-bold' },
                  { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic'), cls: 'italic' },
                  { label: 'U', action: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive('strike'), cls: 'underline' },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action}
                    className={`px-2 py-1 border border-border rounded text-sm transition-colors ${btn.cls} ${btn.active ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-surface-low'}`}>
                    {btn.label}
                  </button>
                ))}
              </div>
              <div className="border border-border rounded-b-lg bg-surface-low min-h-[280px] p-3 text-sm text-ink leading-relaxed cursor-text" onClick={() => editor?.commands.focus()}>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              className={`${btnPrimaryCls} flex items-center justify-center gap-2`}
              onClick={sendTestEmail}
              disabled={sendingTest || !selected?.id || selected.id.startsWith('temp_')}
            >
              {sendingTest && <Spinner />}
              {sendingTest ? 'Sending test...' : '✉️ Send Test to Myself'}
            </button>

            {placeholders.length > 0 && (
              <div className={cardCls}>
                <div className="text-xs font-semibold text-secondary uppercase mb-2">Detected placeholders</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {placeholders.map((p: string) => (
                    <span key={p} className="text-xs bg-surface-low border border-border rounded px-2 py-0.5 font-mono">{'{{'}{p}{'}}'}</span>
                  ))}
                </div>
                <div className="text-xs text-outline">Replaced with recipient data on send</div>
              </div>
            )}

            <div className={cardCls}>
              <label className={labelCls}>Attachments ({attachments.length}/{MAX_ATTACHMENTS})</label>
              <input ref={attachRef} type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e => { if(e.target.files?.length) uploadAttachments(e.target.files); e.target.value = '' }} />
              {attachments.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
                  {attachments.map(a => (
                    <div key={a.url} className="flex items-center gap-2 px-3 py-2 bg-surface-low rounded-lg border border-border">
                      <span>📎</span>
                      <span className="text-xs text-ink flex-1 truncate">{a.name}</span>
                      <button onClick={() => removeAttachment(a.url)} className="text-accentRed text-sm px-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
              {attachments.length < MAX_ATTACHMENTS && (
                <button className={`${btnGhostCls} w-full`} onClick={() => attachRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : '📎 Attach File'}
                </button>
              )}
              <div className="text-xs text-outline mt-1.5">PDF, Word, Excel, or image files — up to {MAX_ATTACHMENTS}</div>
            </div>
          </div>
        </div>
        </>
      ) : (
        <>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-ink tracking-tight">Templates</h1>
            <p className="text-sm text-secondary mt-1">Write reusable email templates with {'{{'} placeholders {'}}'}</p>
          </div>
          <div className="flex gap-2">
            <button className={btnGhostCls} onClick={() => { onSaved(); showToast('Refreshed!', 'info') }}>↻ Refresh</button>
            <button className={btnPrimaryCls} onClick={newTemplate}>+ New Template</button>
          </div>
        </div>

        {!localTemplates.length ? (
          <div className={cardCls}>
            <EmptyState icon="✦" title="No templates yet" text="Create your first template"
              action={<button className={btnPrimaryCls} onClick={newTemplate}>+ New Template</button>} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localTemplates.map((t: Template) => (
              <div key={t.id} className={`${cardCls} cursor-pointer hover:border-ink transition-all group relative`} onClick={() => editTemplate(t)}>
                <h3 className="font-semibold text-ink mb-1">{t.name || 'Untitled'}</h3>
                <p className="text-sm text-secondary mb-4 truncate">{t.subject || 'No subject'}</p>
                <div className="flex items-center justify-between text-xs text-secondary pt-3 border-t border-border">
                  {t.attachments && t.attachments.length > 0 ? <span>📎 {t.attachments.length} file{t.attachments.length > 1 ? 's' : ''}</span> : <span />}
                  <span>{new Date(t.updatedAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})}</span>
                </div>
                <div className="absolute top-4 right-4 hidden group-hover:flex gap-1 bg-white rounded-lg shadow-ambient border border-border p-1">
                  <button className="p-1.5 text-secondary hover:bg-surface-low rounded" onClick={e => { e.stopPropagation(); duplicateTemplate(t) }} title="Duplicate">⧉</button>
                  <button className="p-1.5 text-accentRed hover:bg-surface-low rounded" onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }} title="Delete">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
        </>
      )}
    </div>
  )
}

// ─── Dashboard Tab ────────────────────────────────────────
function DashboardTab({ campaigns, showToast }: any) {
  const [campaignId, setCampaignId] = useState<string>('')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading]       = useState(false)
  const [status, setStatus]         = useState('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [search, setSearch]         = useState('')

  async function loadData() {
    if (!campaignId) return
    setLoading(true)
    const params = new URLSearchParams({ campaignId })
    if (status !== 'all') params.set('status', status)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo)   params.set('dateTo', dateTo)
    if (search)   params.set('search', search)
    const r = await fetch(`/api/recipients?${params}`)
    setRecipients(await r.json())
    setLoading(false)
  }

  useEffect(() => { loadData() }, [campaignId])

  const campaign  = campaigns.find((c: Campaign) => c.id === campaignId)
  const total     = recipients.length
  const opened    = recipients.filter(r => r.openedAt).length
  const notOpened = recipients.filter(r => r.status === 'sent' && !r.openedAt).length
  const openRate  = total ? Math.round((opened / total) * 100) : 0

  async function exportCSV() {
    if (!recipients.length) return showToast('No data to export', 'error')
    const rows = [
      ['Email', 'Status', 'Sent At', 'Opened At'],
      ...recipients.map(r => [r.email, r.status, r.sentAt ? new Date(r.sentAt).toLocaleString() : '', r.openedAt ? new Date(r.openedAt).toLocaleString() : ''])
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a    = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `campaign-${campaignId}-export.csv`; a.click()
    showToast('Exported!')
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-ink tracking-tight">Dashboard</h1>
          <p className="text-sm text-secondary mt-1">Track opens, filter by date, export follow-up lists</p>
        </div>
        <div className="flex gap-2">
          <button className={btnGhostCls} onClick={loadData}>↻ Refresh</button>
          <button className={btnGhostCls} onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      <div className={`${cardCls} mb-4`}>
        <select className={`${inputCls} max-w-[400px]`} value={campaignId} onChange={e => setCampaignId(e.target.value)}>
          <option value="">Select a campaign…</option>
          {campaigns.map((c: Campaign) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {campaignId && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Sent" value={campaign?.sent || 0} />
            <StatCard label="Opened" value={opened} />
            <StatCard label="Not Opened" value={notOpened} />
            <StatCard label="Open Rate" value={openRate + '%'} />
          </div>

          <div className={`${cardCls} mb-4 flex flex-wrap items-center gap-3`}>
            <select className={`${inputCls} w-40`} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="opened">✓ Opened</option>
              <option value="not_opened">✗ Not Opened</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
            </select>
            <input className={`${inputCls} w-36`} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input className={`${inputCls} w-36`} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <input className={`${inputCls} w-48`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email…" />
            <button className={btnPrimaryCls} onClick={loadData}>Apply</button>
            <button className={btnGhostCls} onClick={() => { setStatus('all'); setDateFrom(''); setDateTo(''); setSearch(''); setTimeout(loadData, 50) }}>Reset</button>
          </div>

          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink">Results</h2>
              <span className="text-xs text-secondary">{recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</span>
            </div>
            {loading ? (
              <div className="text-center py-10 text-sm text-secondary">Loading…</div>
            ) : !recipients.length ? (
              <div className="text-center py-10 text-sm text-outline">No results match your filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-secondary uppercase border-b border-border">
                      <th className="py-2 pr-4 font-semibold">Email</th>
                      <th className="py-2 pr-4 font-semibold">Status</th>
                      <th className="py-2 pr-4 font-semibold">Sent At</th>
                      <th className="py-2 font-semibold">Opened At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recipients.map(r => (
                      <tr key={r.id}>
                        <td className="py-3 pr-4 font-medium text-ink">{r.email}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={r.openedAt ? 'opened' : r.status} />
                        </td>
                        <td className="py-3 pr-4 text-secondary">{r.sentAt ? new Date(r.sentAt).toLocaleString('en-PK',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}) : '—'}</td>
                        <td className="py-3 text-secondary">{r.openedAt ? <span className="text-green-600">{new Date(r.openedAt).toLocaleString('en-PK',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true})}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
