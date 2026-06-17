'use client'
import React, { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'

// ─── Types ───────────────────────────────────────────────
interface Template { id: string; name: string; subject: string; body: string; updatedAt: string; attachmentName?: string; attachmentUrl?: string }
interface Campaign { id: string; name: string; status: string; template: { name: string; subject: string }; total: number; sent: number; opened: number; errors: number; createdAt: string; scheduledAt?: string; templateId?: string; attachmentName?: string; attachmentUrl?: string }
interface Recipient { id: string; email: string; data: any; status: string; sentAt?: string; openedAt?: string; error?: string }

type Tab = 'home' | 'campaigns' | 'compose' | 'dashboard'

export default function App() {
  const [tab, setTab]               = useState<Tab>('home')
  const [templates, setTemplates]   = useState<Template[]>([])
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [toast, setToast]           = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showWelcome, setShowWelcome] = useState(true)

  // Load data immediately — even before welcome is dismissed so it's ready instantly
  useEffect(() => { loadTemplates(); loadCampaigns() }, [])

  async function loadTemplates() {
    const r = await fetch('/api/templates'); setTemplates(await r.json())
  }
  async function loadCampaigns() {
    const r = await fetch('/api/campaigns'); setCampaigns(await r.json())
  }

  function showToast(msg: string, type: 'success'|'error'|'info' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className={styles.app}>
      {/* Welcome Screen */}
      {showWelcome && (
        <div className={styles.welcome}>
          <div className={styles.welcomeCard}>
            {/* Logo */}
            <div className={styles.welcomeLogo}>
              <div className={styles.welcomeLogoIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="white" strokeWidth="1.8"/>
                  <path d="M2 8l10 6 10-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div className={styles.welcomeLogoText}>Mail Merge</div>
              <div className={styles.welcomeLogoPro}>PRO</div>
            </div>

            {/* Headline */}
            <h1 className={styles.welcomeTitle}>Send smarter.<br/>Track what matters.</h1>
            <p className={styles.welcomeSub}>Personalised email campaigns with open tracking, scheduled sending, and CSV exports — all in one place.</p>

            {/* Features */}
            <div className={styles.welcomeFeatures}>
              {[
                ['📄', 'Templates with placeholders'],
                ['📊', 'Open tracking & analytics'],
                ['📎', 'File attachments per template'],
                ['⏰', 'Scheduled sending'],
              ].map(([icon, label]) => (
                <div key={label as string} className={styles.welcomeFeature}>
                  <span className={styles.welcomeFeatureIcon}>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button className={styles.welcomeBtn} onClick={() => setShowWelcome(false)}>
              Get Started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <p className={styles.welcomeNote}>No login required</p>
          </div>
        </div>
      )}

      {/* Main App */}
      {!showWelcome && (<>
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarCollapsed}`}
      >
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon} onClick={() => window.location.reload()} style={{cursor:'pointer'}} title="Go to home">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="white" strokeWidth="1.8"/>
              <path d="M2 8l10 6 10-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          {sidebarOpen && (
            <div className={styles.logoText}>
              <div className={styles.logoTitle}>Mail Merge</div>
              <div className={styles.logoPro}>PRO</div>
            </div>
          )}
          <button
            className={styles.sidebarToggleBtn}
            onClick={() => setSidebarOpen(p => !p)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            )}
          </button>
        </div>

        <nav className={styles.nav}>
          {([
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
          ] as [Tab, React.ReactNode, string][]).map(([key, icon, label]) => (
            <button
              key={key}
              className={`${styles.navItem} ${tab === key ? styles.navActive : ''}`}
              onClick={() => setTab(key)}
              title={!sidebarOpen ? label : undefined}
            >
              <span className={styles.navIcon}>{icon}</span>
              {sidebarOpen && <span className={styles.navLabel}>{label}</span>}
            </button>
          ))}
        </nav>

        <div className={`${styles.sidebarStats} ${sidebarOpen ? '' : styles.sidebarStatsCollapsed}`}>
          <div className={styles.statPill}>
            <span className={styles.statDot} style={{background:'var(--accent)'}}></span>
            {sidebarOpen && <span>{campaigns.length} campaigns</span>}
          </div>
          <div className={styles.statPill}>
            <span className={styles.statDot} style={{background:'var(--green)'}}></span>
            {sidebarOpen && <span>{templates.length} templates</span>}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className={`${styles.main} ${!sidebarOpen ? styles.mainCollapsed : ''}`}>
        {tab === 'home' && (
          <HomeTab campaigns={campaigns} setTab={setTab} onRefresh={() => { loadCampaigns(); loadTemplates(); showToast('Refreshed!', 'info') }} />
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
      </main>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${styles['toast_' + toast.type]}`}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'i'} {toast.msg}
        </div>
      )}
      </>)}
    </div>
  )
}

// ─── Home Tab ─────────────────────────────────────────────
function HomeTab({ campaigns, setTab, onRefresh }: any) {
  const totalSent    = campaigns.reduce((sum: number, c: Campaign) => sum + (c.sent || 0), 0)
  const totalOpened  = campaigns.reduce((sum: number, c: Campaign) => sum + (c.opened || 0), 0)
  const openRate     = totalSent ? Math.round((totalOpened / totalSent) * 100) : 0
  const totalCampaigns = campaigns.length
  const recentCampaigns = [...campaigns].sort((a: Campaign, b: Campaign) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5)
  const statusColor: any = { draft: 'var(--text3)', sending: 'var(--orange)', done: 'var(--green)', scheduled: 'var(--purple)' }

  return (
    <div className={styles.tabContent}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Home</h1>
          <p className={styles.pageSubtitle}>Overview of your outreach activity</p>
        </div>
        <button className={styles.refreshBtn} onClick={onRefresh}>
          <span className={styles.refreshIcon}>↻</span> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className={styles.statCards} style={{marginBottom:20}}>
        {[
          { label: 'Total Campaigns', value: totalCampaigns, accent: '#111112' },
          { label: 'Total Sent',      value: totalSent,      accent: '#3b82f6' },
          { label: 'Total Opened',    value: totalOpened,    accent: '#16a34a' },
          { label: 'Avg Open Rate',   value: openRate + '%', accent: '#7c3aed' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statAccent} style={{background: s.accent}}></div>
            <div className={styles.statNum}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{display:'flex', gap:10, marginBottom:20}}>
        <button className={styles.btnPrimary} onClick={() => setTab('campaigns')}>+ New Campaign</button>
        <button className={styles.btnGhost} onClick={() => setTab('compose')}>+ New Template</button>
        <button className={styles.btnGhost} onClick={() => setTab('dashboard')}>View Analytics</button>
      </div>

      {/* Recent campaigns */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Recent Campaigns</div>
          <button className={styles.btnGhost} style={{fontSize:11,padding:'3px 8px'}} onClick={() => setTab('campaigns')}>View all</button>
        </div>
        {!recentCampaigns.length ? (
          <div className={styles.empty} style={{padding:'30px 20px'}}>
            <div className={styles.emptyIcon}>◈</div>
            <div className={styles.emptyTitle}>No campaigns yet</div>
            <div className={styles.emptyText}>Create your first campaign to get started</div>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Template</th>
                <th>Sent</th>
                <th>Opened</th>
                <th>Open Rate</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentCampaigns.map((c: Campaign) => {
                const rate = c.sent ? Math.round((c.opened / c.sent) * 100) : 0
                return (
                  <tr key={c.id} style={{cursor:'pointer'}} onClick={() => setTab('campaigns')}>
                    <td className={styles.emailCell}>{c.name}</td>
                    <td>{c.template?.name}</td>
                    <td>{c.sent}</td>
                    <td>{c.opened}</td>
                    <td>{c.sent ? `${rate}%` : '—'}</td>
                    <td><span className={styles.badge} style={{background: statusColor[c.status] + '22', color: statusColor[c.status]}}>{c.status}</span></td>
                    <td className={styles.dateCell}>{new Date(c.createdAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
  const recipientsCache = useRef<Record<string, any[]>>({})

  useEffect(() => { setLocalCampaigns(initialCampaigns || []) }, [initialCampaigns])

  // Prefetch recipients on hover so click is instant
  function prefetchRecipients(campaignId: string) {
    if (recipientsCache.current[campaignId]) return
    fetch(`/api/recipients?campaignId=${campaignId}`)
      .then(r => r.json())
      .then(data => { recipientsCache.current[campaignId] = data })
  }

  async function createCampaign() {
    if (!newName || !newTemplateId) return showToast('Enter name and select template', 'error')
    const r = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, templateId: newTemplateId })
    })
    const c = await r.json()
    setLocalCampaigns(prev => [c, ...prev])
    setCreating(false); setNewName(''); setNewTemplate('')
    setSelected(c)
    showToast('Campaign created!')
  }

  function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return
    setLocalCampaigns(prev => prev.filter(c => c.id !== id)) // instant remove
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
      ? { ...c, status: 'done', recipients: (c as any).recipients?.map((r: any) => r.status === 'pending' ? { ...r, status: 'cancelled' } : r) || [] }
      : c
    ))
    showToast(`Cancelled ${d.cancelledCount} pending emails`)
  }

  const statusColor: any = { draft: 'var(--text3)', sending: 'var(--orange)', done: 'var(--green)', scheduled: 'var(--purple)' }

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
    <div className={styles.tabContent}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Campaigns</h1>
          <p className={styles.pageSubtitle}>Manage and send your mail merge campaigns</p>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className={styles.refreshBtn} onClick={() => { onRefresh(); showToast('Refreshed!', 'info') }}>
            <span className={styles.refreshIcon}>↻</span> Refresh
          </button>
          <button className={styles.btnPrimary} onClick={() => setCreating(true)}>+ New Campaign</button>
        </div>
      </div>

      {creating && (
        <div className={styles.card} style={{marginBottom:16, maxWidth:480}}>
          <div className={styles.cardTitle}>New Campaign</div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Campaign Name</label>
            <input className={styles.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Prof Outreach Jan 2025" autoFocus />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Template</label>
            <select className={styles.input} value={newTemplateId} onChange={e => setNewTemplate(e.target.value)}>
              <option value="">Select template…</option>
              {templates.map((t: Template) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className={styles.formActions}>
            <button className={styles.btnGhost} onClick={() => setCreating(false)}>Cancel</button>
            <button className={styles.btnPrimary} onClick={createCampaign}>Create Campaign</button>
          </div>
        </div>
      )}

      {!localCampaigns.length ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◈</div>
          <div className={styles.emptyTitle}>No campaigns yet</div>
          <div className={styles.emptyText} style={{marginBottom:16}}>Create your first campaign to get started</div>
          <button className={styles.btnPrimary} onClick={() => setCreating(true)}>+ New Campaign</button>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {localCampaigns.map((c: Campaign) => {
            const isScheduled = c.status === 'scheduled'
            const accentColor: any = { draft: 'var(--border2)', sending: 'var(--orange)', done: 'var(--text)', scheduled: 'var(--orange)' }
            return (
              <div key={c.id} className={styles.gridCard} onClick={() => { setSelected(c); setCreating(false) }} onMouseEnter={() => prefetchRecipients(c.id)}>
                <div className={styles.gridCardAccent} style={{background: accentColor[c.status]}}></div>
                <div className={styles.gridCardName}>{isScheduled && <span style={{marginRight:4}}>⏰</span>}{c.name}</div>
                <div className={styles.gridCardSub}>{c.template?.name}</div>
                <div className={styles.gridCardMeta}>
                  <span className={styles.badge} style={{background: statusColor[c.status] + '22', color: statusColor[c.status]}}>{c.status}</span>
                  {!isScheduled && <span className={styles.gridCardStat}><b>{c.sent}</b> sent · <b>{c.opened}</b> opened</span>}
                  {isScheduled && c.scheduledAt && <span className={styles.gridCardStat} style={{color:'var(--orange)'}}>{new Date(c.scheduledAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})} {new Date(c.scheduledAt).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',hour12:true})}</span>}
                  <span className={styles.gridCardDate}>{new Date(c.createdAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})}</span>
                </div>
                <div className={styles.gridCardActions}>
                  {c.status === 'sending' && c.recipients?.some((r: any) => r.status === 'pending') && (
                    <button onClick={e => { e.stopPropagation(); cancelPending(c.id) }} className={styles.dangerBtn} title="Cancel Pending">
                      Cancel Pending
                    </button>
                  )}
                  <button className={styles.gridActionBtn} onClick={e => { e.stopPropagation(); duplicateCampaign(c) }} title="Duplicate">⧉</button>
                  <button className={styles.gridActionBtn} onClick={e => { e.stopPropagation(); deleteCampaign(c.id) }} title="Delete" style={{color:'var(--red)'}}>✕</button>
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
  const fileRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!initialRecipients) loadRecipients()
    else if (initialRecipients.length) setColumns(Object.keys(initialRecipients[0].data || {}))
    loadTemplates()
  }, [])

  async function loadTemplates() {
    const r = await fetch('/api/templates')
    const d = await r.json()
    setAllTemplates(d)
  }

  async function loadRecipients() {
    const r = await fetch(`/api/recipients?campaignId=${campaign.id}`)
    const data = await r.json()
    setRecipients(data)
    if (data.length) setColumns(Object.keys(data[0].data || {}))
    setLoading(false)
  }

  async function uploadCSV(file: File) {
    const form = new FormData(); form.append('file', file)
    const r = await fetch(`/api/recipients?campaignId=${campaign.id}`, { method: 'POST', body: form })
    const d = await r.json()
    if (d.error) return showToast(d.error, 'error')
    showToast(`Imported ${d.count} recipients!`); loadRecipients()
  }

  async function importSheet() {
    if (!sheetUrl) return showToast('Enter a Google Sheet URL', 'error')
    showToast('Importing from Google Sheet…', 'info')
    const r = await fetch('/api/import-sheet', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ url: sheetUrl }) })
    const d = await r.json()
    if (d.error) return showToast(d.error, 'error')

    const r2 = await fetch(`/api/recipients?campaignId=${campaign.id}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ recipients: d.records, columns: d.columns })
    })
    const d2 = await r2.json()
    if (d2.error) return showToast(d2.error, 'error')
    showToast(`Imported ${d2.count} recipients from Sheet!`); loadRecipients()
  }

  async function importManual() {
    if (!manualText.trim()) return showToast('Paste some data first', 'error')
    try {
      const records = parse(manualText, { columns: true, skip_empty_lines: true, trim: true })
      const r = await fetch(`/api/recipients?campaignId=${campaign.id}`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ recipients: records, columns: Object.keys(records[0] || {}) })
      })
      const d = await r.json()
      if (d.error) return showToast(d.error, 'error')
      showToast(`Added ${d.count} recipients!`); loadRecipients()
    } catch {
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
    showToast(`Sent ${d.sentCount} emails!`)
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
        followUpType: isSelected ? 'not_opened' : showFollowUp, // type doesn't matter for selected
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
    await fetch('/api/campaigns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaign.id, name: editName, templateId: editTemplateId })
    })
    campaign.name = editName
    setEditing(false)
    showToast('Campaign updated!')
  }

  const pending    = recipients.filter(r => r.status === 'pending').length
  const sent       = recipients.filter(r => r.status === 'sent').length
  const opened     = recipients.filter(r => r.openedAt).length
  const notOpened  = recipients.filter(r => r.status === 'sent' && !r.openedAt).length

  // Group by followUpCount for each category
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
    <div className={styles.tabContent}>
      <div className={styles.pageHeader}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className={styles.backBtn} onClick={onBack}>←</button>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <h1 className={styles.pageTitle}>{campaign.name}</h1>
              <button className={styles.btnGhost} style={{padding:'3px 8px', fontSize:11}} onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <p className={styles.pageSubtitle}>{campaign.template?.name} · {campaign.template?.subject}</p>
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={() => { loadRecipients(); showToast('Refreshed!', 'info') }}>
          <span className={styles.refreshIcon}>↻</span> Refresh
        </button>
      </div>

      {/* Scheduled banner removed — status shows in table */}

      <div className={styles.detailGrid}>
        {/* Left — Recipients */}
        <div className={styles.detailLeft}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Recipients</div>
              <div style={{display:'flex',gap:8}}>
                {recipients.length > 0 && <button className={styles.btnGhost} onClick={clearRecipients}>Clear all</button>}
              </div>
            </div>

            {/* Import tabs */}
            <div className={styles.importTabs}>
              {(['csv','sheet','manual'] as const).map(t => (
                <button key={t} className={`${styles.importTab} ${importTab===t?styles.importTabActive:''}`} onClick={() => setImportTab(t)}>
                  {t === 'csv' ? '📄 CSV' : t === 'sheet' ? '📊 Google Sheet' : '✏️ Paste'}
                </button>
              ))}
            </div>

            {importTab === 'csv' && (
              <div className={styles.dropzone} onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) uploadCSV(f) }}>
                <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={e => { if(e.target.files?.[0]) uploadCSV(e.target.files[0]) }} />
                <div className={styles.dropzoneIcon}>⬆</div>
                <div className={styles.dropzoneText}>Drop CSV file here or click to upload</div>
                <div className={styles.dropzoneHint}>First row must be column headers</div>
              </div>
            )}

            {importTab === 'sheet' && (
              <div className={styles.importPanel}>
                <label className={styles.label}>Google Sheet URL</label>
                <input className={styles.input} value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                <div className={styles.hint}>Sheet must be set to "Anyone with the link can view"</div>
                <button className={styles.btnPrimary} style={{marginTop:10}} onClick={importSheet}>Import</button>
              </div>
            )}

            {importTab === 'manual' && (
              <div className={styles.importPanel}>
                <label className={styles.label}>Paste tab-separated data (copy from Excel/Sheets)</label>
                <textarea className={styles.textarea} rows={6} value={manualText} onChange={e => setManualText(e.target.value)} placeholder={'Name\tEmail\tUniversity\nProf. Smith\tsmith@uni.edu\tMIT'}/>
                <button className={styles.btnPrimary} style={{marginTop:10}} onClick={importManual}>Add Recipients</button>
              </div>
            )}

            {/* Stats bar */}
            {recipients.length > 0 && (
              <div className={styles.recipientStats}>
                <span>{recipients.length} total</span>
                <span style={{color:'var(--text3)'}}>·</span>
                <span style={{color:'var(--orange)'}}>{pending} pending</span>
                <span style={{color:'var(--text3)'}}>·</span>
                <span style={{color:'var(--accent)'}}>{sent} sent</span>
                <span style={{color:'var(--text3)'}}>·</span>
                <span style={{color:'var(--green)'}}>{opened} opened</span>
              </div>
            )}

            {/* Recipients table */}
            {recipients.length > 0 && (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{width:32}}>
                        <input type="checkbox"
                          checked={selectedRecipients.size === recipients.filter(r => r.status === 'sent').length && recipients.filter(r => r.status === 'sent').length > 0}
                          onChange={e => {
                            if (e.target.checked) setSelectedRecipients(new Set(recipients.filter(r => r.status === 'sent').map(r => r.id)))
                            else setSelectedRecipients(new Set())
                          }}
                        />
                      </th>
                      <th>Email</th>
                      {columns.slice(0,3).filter(c => !c.toLowerCase().includes('email')).map(c => <th key={c}>{c}</th>)}
                      <th>Status</th>
                      <th>Opened</th>
                      <th>Follow-ups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map(r => (
                      <React.Fragment key={r.id}>
                      <tr
                        key={r.id}
                        style={{background: selectedRecipients.has(r.id) ? 'var(--bg3)' : '', cursor:'pointer'}}
                        onClick={() => setExpandedRecipient(expandedRecipient === r.id ? null : r.id)}
                      >
                        <td onClick={e => e.stopPropagation()}>
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
                        <td className={styles.emailCell}>
                          <span style={{display:'flex', alignItems:'center', gap:6}}>
                            {(r as any).followUps?.length > 0 && (
                              <span style={{fontSize:10, color:'var(--text3)'}}>{expandedRecipient === r.id ? '▾' : '▸'}</span>
                            )}
                            {r.email}
                          </span>
                        </td>
                        {columns.slice(0,3).filter(c => !c.toLowerCase().includes('email')).map(c => (
                          <td key={c}>{(r.data as any)[c] || '—'}</td>
                        ))}
                        <td>
                          <span className={styles.statusBadge} data-status={r.openedAt ? 'opened' : r.status === 'pending' && campaign.status === 'scheduled' ? 'pending' : r.status}>
                            {r.openedAt ? '✓ Opened' : r.status === 'sent' ? '✓ Sent' : r.status === 'error' ? '✗ Error' : campaign.status === 'scheduled' ? '⏰ Scheduled' : '· Pending'}
                          </span>
                        </td>
                        <td>{r.openedAt ? <span style={{color:'var(--green)',fontSize:11}}>{new Date(r.openedAt).toLocaleString('en-PK',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true})}</span> : <span style={{color:'var(--text3)'}}>—</span>}</td>
                        <td>
                          {(r as any).followUps?.length > 0 ? (
                            <div style={{display:'flex', flexDirection:'column', gap:2}}>
                              {(r as any).followUps.map((f: any) => (
                                <span key={f.id} style={{fontSize:10, whiteSpace:'nowrap'}}>
                                  <span style={{fontWeight:600, color:'var(--text2)'}}>#{f.number}</span>
                                  {' '}
                                  {f.status === 'scheduled'
                                    ? <span style={{color:'var(--orange)'}}>⏰ {new Date(f.scheduledAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})} {new Date(f.scheduledAt).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',hour12:true})}</span>
                                    : f.status === 'sent' && f.openedAt
                                      ? <span style={{color:'var(--green)'}}>✓ Opened</span>
                                      : f.status === 'sent'
                                        ? <span style={{color:'var(--text3)'}}>✓ Sent</span>
                                        : <span style={{color:'var(--red)'}}>✗ Error</span>}
                                </span>
                              ))}
                            </div>
                          ) : <span style={{color:'var(--text3)', fontSize:11}}>—</span>}
                        </td>
                      </tr>
                      {/* Expanded timeline */}
                      {expandedRecipient === r.id && (r as any).followUps?.length > 0 && (
                        <tr key={r.id + '_timeline'}>
                          <td colSpan={6 + columns.slice(0,3).filter(c => !c.toLowerCase().includes('email')).length} style={{padding:0, background:'var(--bg3)', borderBottom:'1px solid var(--border)'}}>
                            <div style={{padding:'10px 16px 10px 48px'}}>
                              {/* Original email */}
                              <div style={{display:'flex', alignItems:'center', gap:12, padding:'6px 0', borderBottom:'1px dashed var(--border)', fontSize:12}}>
                                <span style={{width:20, height:20, borderRadius:'50%', background:'var(--text)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0}}>0</span>
                                <span style={{color:'var(--text2)', flex:1}}>Original email</span>
                                <span style={{color:'var(--text3)'}}>{r.sentAt ? new Date(r.sentAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'}) : '—'}</span>
                                <span className={styles.statusBadge} data-status={r.openedAt ? 'opened' : 'sent'}>{r.openedAt ? '✓ Opened' : '✓ Sent'}</span>
                              </div>
                              {/* Follow-ups */}
                              {(r as any).followUps.map((f: any) => (
                                <div key={f.id} style={{display:'flex', alignItems:'center', gap:12, padding:'6px 0', borderBottom:'1px dashed var(--border)', fontSize:12}}>
                                  <span style={{width:20, height:20, borderRadius:'50%', background: f.openedAt ? 'var(--green)' : f.status === 'scheduled' ? 'var(--orange)' : f.status === 'error' ? 'var(--red)' : 'var(--border2)', color: f.openedAt || f.status === 'scheduled' || f.status === 'error' ? 'white' : 'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0}}>#{f.number}</span>
                                  <span style={{color:'var(--text2)', flex:1}}>{f.template?.name || 'Follow-up'}</span>
                                  <span style={{color:'var(--text3)'}}>
                                    {f.status === 'scheduled'
                                      ? `⏰ ${new Date(f.scheduledAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})} ${new Date(f.scheduledAt).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit',hour12:true})}`
                                      : f.sentAt ? new Date(f.sentAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'}) : '—'}
                                  </span>
                                  <span className={styles.statusBadge} data-status={f.openedAt ? 'opened' : f.status === 'scheduled' ? 'pending' : f.status}>
                                    {f.openedAt ? '✓ Opened' : f.status === 'scheduled' ? '⏰ Scheduled' : f.status === 'sent' ? '✓ Sent' : f.status === 'error' ? '✗ Error' : '· Pending'}
                                  </span>
                                  {f.status === 'scheduled' && (
                                    <button
                                      onClick={e => { e.stopPropagation(); cancelFollowUp(f.id, r.id) }}
                                      style={{background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:11, padding:'0 4px', flexShrink:0}}
                                      title="Cancel scheduled follow-up"
                                    >✕</button>
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
        <div className={styles.detailRight}>
          {editing ? (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Edit Campaign</div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Campaign Name</label>
                <input className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Campaign name" autoFocus />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Template</label>
                <select className={styles.input} value={editTemplateId} onChange={e => setEditTemplateId(e.target.value)}>
                  {templates.map((t: Template) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className={styles.formActions}>
                <button className={styles.btnGhost} onClick={() => setEditing(false)}>Cancel</button>
                <button className={styles.btnPrimary} onClick={saveCampaignEdit}>Update</button>
              </div>
            </div>
          ) : (<>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Send Settings</div>

            <div className={styles.formGroup}>
              <label className={styles.label}>From Name</label>
              <input className={styles.input} value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your Name" />
            </div>
            
            <div className={styles.divider}></div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Delay Between Emails</label>
              <div className={styles.rangeRow}>
                <input className={styles.input} type="number" value={delayMin} onChange={e => setDelayMin(+e.target.value)} min={5} />
                <span className={styles.rangeSep}>to</span>
                <input className={styles.input} type="number" value={delayMax} onChange={e => setDelayMax(+e.target.value)} min={5} />
                <span className={styles.rangeUnit}>sec</span>
              </div>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.toggleRow}>
              <label className={styles.label}>Schedule for Later</label>
              <button className={`${styles.toggle} ${useSchedule ? styles.toggleOn : ''}`} onClick={() => setUseSchedule(!useSchedule)}>
                <span className={styles.toggleThumb}></span>
              </button>
            </div>

            {useSchedule && (
              <div className={styles.formGroup} style={{marginTop:10}}>
                <label className={styles.label}>Send At</label>
                <input className={styles.input} type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} />
              </div>
            )}

            <div className={styles.divider}></div>

            <button
              className={styles.sendBtn}
              onClick={startSend}
              disabled={sending || pending === 0}
            >
              {sending ? (
                <span className={styles.sendingDots}>Sending<span>...</span></span>
              ) : useSchedule ? '📅 Schedule' : `🚀 Send to ${pending} recipients`}
            </button>

            {campaign.status === 'done' && pending > 0 && (
              <div className={styles.hint} style={{textAlign:'center',marginTop:8}}>
                {pending} pending recipients — will send to them
              </div>
            )}
          </div>

          {/* Follow-up Card */}
          {sent > 0 && (
            <div className={styles.card} style={{marginTop:12}}>
              <div className={styles.cardTitle}>Follow-up</div>

              {/* Single dropdown for group selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Target Group</label>
                <select
                  className={styles.input}
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
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Follow-up Template</label>
                    <select className={styles.input} value={followUpTemplateId} onChange={e => setFollowUpTemplateId(e.target.value)}>
                      <option value="">Select template…</option>
                      {allTemplates.map((t: Template) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {/* Schedule toggle */}
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                    <label className={styles.label} style={{marginBottom:0}}>Schedule</label>
                    <button
                      className={`${styles.toggle} ${followUpScheduled ? styles.toggleOn : ''}`}
                      onClick={() => setFollowUpScheduled(p => !p)}
                    >
                      <span className={styles.toggleThumb}/>
                    </button>
                  </div>
                  {followUpScheduled && (
                    <div className={styles.formGroup}>
                      <input
                        className={styles.input}
                        type="datetime-local"
                        value={followUpScheduleAt}
                        onChange={e => setFollowUpScheduleAt(e.target.value)}
                      />
                    </div>
                  )}

                  <div className={styles.hint} style={{marginBottom:10}}>
                    {showFollowUp === 'selected'
                      ? `Sends to ${selectedRecipients.size} selected recipients in same thread`
                      : `Sends as reply in same thread · Follow-up #${followUpLevel + 1}`}
                  </div>
                  <button
                    className={styles.sendBtn}
                    onClick={startFollowUp}
                    disabled={sendingFollowUp || !followUpTemplateId || (followUpScheduled && !followUpScheduleAt)}
                  >
                    {sendingFollowUp
                      ? <span className={styles.sendingDots}>Sending<span>...</span></span>
                      : followUpScheduled
                        ? `⏰ Schedule Follow-up`
                        : showFollowUp === 'selected'
                          ? `🔁 Send to ${selectedRecipients.size} selected`
                          : `🔁 Send Follow-up #${followUpLevel + 1}`}
                  </button>
                  <button className={styles.btnGhost} style={{width:'100%', marginTop:6}} onClick={() => { setShowFollowUp(null); setFollowUpTemplateId(''); setFollowUpScheduled(false); setFollowUpScheduleAt('') }}>
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
  const [attachmentName, setAttachmentName] = useState('')
  const [uploading, setUploading]       = useState(false)
  const attachRef   = useRef<HTMLInputElement>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedRef = useRef<Template | null>(null)

  // Keep ref in sync so debounce closure can access latest selected
  useEffect(() => { selectedRef.current = selected }, [selected])

  // Sync when parent refreshes templates
  useEffect(() => { setLocalTemplates(initialTemplates || []) }, [initialTemplates])

  // Auto-save 2s after user stops typing
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
    setName(''); setSubject(''); setBody(''); setAttachmentName('')
    editor?.commands.setContent('')
  }

  function newTemplate() {
    const tempId = 'temp_' + Date.now()
    const tempTemplate: Template = { id: tempId, name: 'Untitled', subject: '', body: '', updatedAt: new Date().toISOString() }
    setLocalTemplates(prev => [tempTemplate, ...prev])
    setSelected(tempTemplate)
    setName(''); setSubject(''); setBody(''); setAttachmentName('')
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
    setLocalTemplates(prev => prev.filter(t => t.id !== id)) // instant remove
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
    const newTemplate = await r.json()
    setLocalTemplates(prev => [newTemplate, ...prev])
    editTemplate(newTemplate)
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
    setAttachmentName((t as any).attachmentName || '')
    editor?.commands.setContent(t.body)
  }

  async function uploadAttachment(file: File) {
    if (!selected?.id || selected.id.startsWith('temp_')) return showToast('Please wait a moment then try again', 'error')
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('templateId', selected.id)
    const r = await fetch('/api/upload', { method: 'POST', body: form })
    const d = await r.json()
    setUploading(false)
    if (d.error) return showToast(d.error, 'error')
    setAttachmentName(d.attachmentName)
    showToast(`Attached: ${d.attachmentName}`)
  }

  async function removeAttachment() {
    if (!selected) return
    await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: selected.id })
    })
    setAttachmentName('')
    showToast('Attachment removed')
  }

  const placeholders = detectPlaceholders()

  return (
    <div className={styles.tabContent}>
      {/* Editor view — full page when template selected */}
      {selected ? (
        <>
        <div className={styles.pageHeader}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <button className={styles.backBtn} onClick={cancelTemplate}>←</button>
            <div>
              <h1 className={styles.pageTitle}>{name || 'Untitled Template'}</h1>
              <p className={styles.pageSubtitle}>{subject || 'No subject'}</p>
            </div>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            {autoSaving && <span style={{fontSize:11, color:'var(--text3)'}}>saving…</span>}
            <button className={styles.btnPrimary} onClick={saveTemplate} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start'}}>
          <div className={styles.card}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Template Name</label>
              <input className={styles.input} value={name} onChange={e => { setName(e.target.value); scheduleAutoSave(e.target.value, subject, body) }} placeholder="e.g. Masters Admission Inquiry" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Subject Line</label>
              <input className={styles.input} value={subject} onChange={e => { setSubject(e.target.value); scheduleAutoSave(name, e.target.value, body) }} placeholder="e.g. Inquiry Regarding PhD Supervision — {{Name}}" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Body</label>
              <div style={{display:'flex',gap:4,padding:'6px 8px',background:'var(--bg3)',border:'1.5px solid var(--border)',borderBottom:'none',borderRadius:'var(--radius) var(--radius) 0 0'}}>
                {[
                  { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold'), style: {fontWeight:'bold'} },
                  { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic'), style: {fontStyle:'italic'} },
                  { label: 'U', action: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive('strike'), style: {textDecoration:'underline'} },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} style={{padding:'3px 8px',border:'1px solid var(--border)',borderRadius:4,background: btn.active ? 'var(--accent)' : 'var(--bg2)',color: btn.active ? 'white' : 'var(--text)',cursor:'pointer',fontSize:13,...btn.style}}>{btn.label}</button>
                ))}
              </div>
              <div style={{border:'1.5px solid var(--border)',borderRadius:'0 0 var(--radius) var(--radius)',background:'var(--bg3)',minHeight:280,padding:'10px 12px',fontSize:13,color:'var(--text)',lineHeight:1.6,cursor:'text'}} onClick={() => editor?.commands.focus()}>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            {/* Placeholders */}
            {placeholders.length > 0 && (
              <div className={styles.card}>
                <div className={styles.phLabel}>Detected placeholders</div>
                <div className={styles.phChips}>
                  {placeholders.map((p: string) => <span key={p} className={styles.phChip}>{'{{'}{p}{'}}'}</span>)}
                </div>
                <div className={styles.hint}>Replaced with recipient data on send</div>
              </div>
            )}

            {/* Attachment */}
            <div className={styles.card}>
              <label className={styles.label}>Attachment</label>
              <input ref={attachRef} type="file" style={{display:'none'}} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e => { if(e.target.files?.[0]) uploadAttachment(e.target.files[0]) }} />
              {attachmentName ? (
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'var(--bg3)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
                  <span style={{fontSize:16}}>📎</span>
                  <span style={{fontSize:12,color:'var(--text)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{attachmentName}</span>
                  <button onClick={removeAttachment} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:14,padding:'0 4px'}}>✕</button>
                </div>
              ) : (
                <button className={styles.btnGhost} style={{width:'100%'}} onClick={() => attachRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : '📎 Attach File'}
                </button>
              )}
              <div className={styles.hint} style={{marginTop:6}}>PDF, Word, Excel, or image</div>
            </div>
          </div>
        </div>
        </>
      ) : (
        /* Card grid view */
        <>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Templates</h1>
            <p className={styles.pageSubtitle}>Write reusable email templates with {'{{'} placeholders {'}}'}</p>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className={styles.refreshBtn} onClick={() => { onSaved(); showToast('Refreshed!', 'info') }}>
              <span className={styles.refreshIcon}>↻</span> Refresh
            </button>
            <button className={styles.btnPrimary} onClick={newTemplate}>+ New Template</button>
          </div>
        </div>

        {!localTemplates.length ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>✦</div>
            <div className={styles.emptyTitle}>No templates yet</div>
            <div className={styles.emptyText} style={{marginBottom:16}}>Create your first template</div>
            <button className={styles.btnPrimary} onClick={newTemplate}>+ New Template</button>
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {localTemplates.map((t: Template) => (
              <div key={t.id} className={styles.gridCard} onClick={() => editTemplate(t)}>
                <div className={styles.gridCardAccent} style={{background:'var(--accent)'}}></div>
                <div className={styles.gridCardName}>{t.name || 'Untitled'}</div>
                <div className={styles.gridCardSub}>{t.subject || 'No subject'}</div>
                <div className={styles.gridCardMeta}>
                  {(t as any).attachmentName && <span className={styles.gridCardStat}>📎 {(t as any).attachmentName}</span>}
                  <span className={styles.gridCardDate}>{new Date(t.updatedAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})}</span>
                </div>
                <div className={styles.gridCardActions}>
                  <button className={styles.gridActionBtn} onClick={e => { e.stopPropagation(); duplicateTemplate(t) }} title="Duplicate">⧉</button>
                  <button className={styles.gridActionBtn} onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }} title="Delete" style={{color:'var(--red)'}}>✕</button>
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
    <div className={styles.tabContent}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Track opens, filter by date, export follow-up lists</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className={styles.refreshBtn} onClick={loadData}>
            <span className={styles.refreshIcon}>↻</span> Refresh
          </button>
          <button className={styles.btnGhost} onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Campaign selector */}
      <div className={styles.card} style={{marginBottom:16}}>
        <select className={styles.input} value={campaignId} onChange={e => setCampaignId(e.target.value)} style={{maxWidth:400}}>
          <option value="">Select a campaign…</option>
          {campaigns.map((c: Campaign) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {campaignId && (
        <>
          {/* Stat cards */}
          <div className={styles.statCards}>
            {[
              { label: 'Total Sent', value: campaign?.sent || 0, accent: '#111112' },
              { label: 'Opened',     value: opened,               accent: '#16a34a' },
              { label: 'Not Opened', value: notOpened,            accent: '#d97706' },
              { label: 'Open Rate',  value: openRate + '%',       accent: '#7c3aed' },
            ].map(s => (
              <div key={s.label} className={styles.statCard}>
                <div className={styles.statAccent} style={{background: s.accent}}></div>
                <div className={styles.statNum}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <select className={styles.input} style={{width:160}} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="opened">✓ Opened</option>
              <option value="not_opened">✗ Not Opened</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
            </select>
            <input className={styles.input} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{width:150}} />
            <input className={styles.input} type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{width:150}} />
            <input className={styles.input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email…" style={{width:200}} />
            <button className={styles.btnPrimary} onClick={loadData}>Apply</button>
            <button className={styles.btnGhost} onClick={() => { setStatus('all'); setDateFrom(''); setDateTo(''); setSearch(''); setTimeout(loadData, 50) }}>Reset</button>
          </div>

          {/* Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Results</div>
              <div className={styles.resultCount}>{recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</div>
            </div>
            {loading ? (
              <div className={styles.loadingRow}>Loading…</div>
            ) : !recipients.length ? (
              <div className={styles.loadingRow} style={{color:'var(--text3)'}}>No results match your filters</div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Sent At</th>
                      <th>Opened At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map(r => (
                      <tr key={r.id}>
                        <td className={styles.emailCell}>{r.email}</td>
                        <td>
                          <span className={styles.statusBadge} data-status={r.openedAt ? 'opened' : r.status}>
                            {r.openedAt ? '👁 Opened' : r.status === 'sent' ? '✓ Sent' : r.status === 'error' ? '✗ Error' : '· Pending'}
                          </span>
                        </td>
                        <td className={styles.dateCell}>{r.sentAt ? new Date(r.sentAt).toLocaleString('en-PK',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}) : '—'}</td>
                        <td className={styles.dateCell}>{r.openedAt ? <span style={{color:'var(--green)'}}>{new Date(r.openedAt).toLocaleString('en-PK',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true})}</span> : '—'}</td>
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
