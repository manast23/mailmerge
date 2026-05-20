'use client'
import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'

// ─── Types ───────────────────────────────────────────────
interface Template { id: string; name: string; subject: string; body: string; updatedAt: string; attachmentName?: string; attachmentUrl?: string }
interface Campaign { id: string; name: string; status: string; template: { name: string; subject: string }; total: number; sent: number; opened: number; errors: number; createdAt: string; scheduled?: string; attachmentName?: string; attachmentUrl?: string }
interface Recipient { id: string; email: string; data: any; status: string; sentAt?: string; openedAt?: string; error?: string }

type Tab = 'campaigns' | 'compose' | 'dashboard'

export default function App() {
  const [tab, setTab]               = useState<Tab>('campaigns')
  const [templates, setTemplates]   = useState<Template[]>([])
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [toast, setToast]           = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const sidebarExpanded = sidebarPinned || sidebarHovered

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
        className={`${styles.sidebar} ${sidebarExpanded ? styles.sidebarExpanded : styles.sidebarCollapsed}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="white" strokeWidth="1.8"/>
              <path d="M2 8l10 6 10-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          {sidebarExpanded && (
            <div className={styles.logoText}>
              <div className={styles.logoTitle}>Mail Merge</div>
              <div className={styles.logoPro}>PRO</div>
            </div>
          )}
          {sidebarExpanded && (
            <button
              className={`${styles.pinBtn} ${sidebarPinned ? styles.pinBtnActive : ''}`}
              onClick={() => setSidebarPinned(p => !p)}
              title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {sidebarPinned ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v6m0 4v10M8 8h8M6 12h12"/></svg>
              )}
            </button>
          )}
        </div>

        <nav className={styles.nav}>
          {([
            ['campaigns', (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            ), 'Campaigns'],
            ['compose', (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            ), 'Compose'],
            ['dashboard', (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            ), 'Dashboard'],
          ] as [Tab, React.ReactNode, string][]).map(([key, icon, label]) => (
            <button
              key={key}
              className={`${styles.navItem} ${tab === key ? styles.navActive : ''}`}
              onClick={() => setTab(key)}
              title={!sidebarExpanded ? label : undefined}
            >
              <span className={styles.navIcon}>{icon}</span>
              {sidebarExpanded && <span className={styles.navLabel}>{label}</span>}
            </button>
          ))}
        </nav>

        <div className={`${styles.sidebarStats} ${sidebarExpanded ? '' : styles.sidebarStatsCollapsed}`}>
          <div className={styles.statPill}>
            <span className={styles.statDot} style={{background:'var(--accent)'}}></span>
            {sidebarExpanded && <span>{campaigns.length} campaigns</span>}
          </div>
          <div className={styles.statPill}>
            <span className={styles.statDot} style={{background:'var(--green)'}}></span>
            {sidebarExpanded && <span>{templates.length} templates</span>}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
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

// ─── Campaigns Tab ────────────────────────────────────────
function CampaignsTab({ campaigns, templates, onRefresh, showToast }: any) {
  const [creating, setCreating]         = useState(false)
  const [newName, setNewName]           = useState('')
  const [newTemplateId, setNewTemplate] = useState('')
  const [selected, setSelected]         = useState<Campaign | null>(null)
  const [sending, setSending]           = useState(false)

  async function createCampaign() {
    if (!newName || !newTemplateId) return showToast('Enter name and select template', 'error')
    const r = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, templateId: newTemplateId })
    })
    const c = await r.json()
    setCreating(false); setNewName(''); setNewTemplate('')
    onRefresh(); setSelected(c)
    showToast('Campaign created!')
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return
    await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' })
    if (selected?.id === id) setSelected(null)
    onRefresh(); showToast('Campaign deleted')
  }

  const statusColor: any = { draft: 'var(--text3)', sending: 'var(--orange)', done: 'var(--green)', scheduled: 'var(--purple)' }

  if (selected) return (
    <CampaignDetail
      campaign={selected}
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
        <div style={{display:'flex',gap:8}}>
          <button className={styles.refreshBtn} onClick={() => { onRefresh(); showToast('Refreshed!', 'info') }}>
            <span className={styles.refreshIcon}>↻</span> Refresh
          </button>
          <button className={styles.btnPrimary} onClick={() => setCreating(true)}>+ New Campaign</button>
        </div>
      </div>

      {creating && (
        <div className={styles.card} style={{marginBottom: 20}}>
          <div className={styles.cardTitle}>New Campaign</div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Campaign Name</label>
              <input className={styles.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Prof Outreach Jan 2025" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Template</label>
              <select className={styles.input} value={newTemplateId} onChange={e => setNewTemplate(e.target.value)}>
                <option value="">Select template…</option>
                {templates.map((t: Template) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.btnGhost} onClick={() => setCreating(false)}>Cancel</button>
            <button className={styles.btnPrimary} onClick={createCampaign}>Create</button>
          </div>
        </div>
      )}

      {!campaigns.length ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◈</div>
          <div className={styles.emptyTitle}>No campaigns yet</div>
          <div className={styles.emptyText}>Create your first campaign to get started</div>
        </div>
      ) : (
        <div className={styles.campaignGrid}>
          {campaigns.map((c: Campaign) => (
            <div key={c.id} className={styles.campaignCard} onClick={() => setSelected(c)}>
              <div className={styles.campaignCardHeader}>
                <div className={styles.campaignName}>{c.name}</div>
                <span className={styles.badge} style={{background: statusColor[c.status] + '22', color: statusColor[c.status]}}>
                  {c.status}
                </span>
              </div>
              <div className={styles.campaignTemplate}>{c.template?.name}</div>
              <div className={styles.campaignStats}>
                <div className={styles.cStat}><span>{c.total}</span> recipients</div>
                <div className={styles.cStat}><span style={{color:'var(--accent)'}}>{c.sent}</span> sent</div>
                <div className={styles.cStat}><span style={{color:'var(--green)'}}>{c.opened}</span> opened</div>
              </div>
              <div className={styles.campaignDate}>{new Date(c.createdAt).toLocaleDateString('en-PK', {day:'2-digit',month:'short',year:'numeric'})}</div>
              <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteCampaign(c.id) }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Campaign Detail ──────────────────────────────────────
function CampaignDetail({ campaign, onBack, showToast }: any) {
  const [recipients, setRecipients]   = useState<Recipient[]>([])
  const [loading, setLoading]         = useState(false)
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
  const fileRef  = useRef<HTMLInputElement>(null)

  useEffect(() => { loadRecipients() }, [])

  async function loadRecipients() {
    setLoading(true)
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

  const pending = recipients.filter(r => r.status === 'pending').length
  const sent    = recipients.filter(r => r.status === 'sent').length
  const opened  = recipients.filter(r => r.openedAt).length

  return (
    <div className={styles.tabContent}>
      <div className={styles.pageHeader}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className={styles.backBtn} onClick={onBack}>←</button>
          <div>
            <h1 className={styles.pageTitle}>{campaign.name}</h1>
            <p className={styles.pageSubtitle}>{campaign.template?.name} · {campaign.template?.subject}</p>
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={() => { loadRecipients(); showToast('Refreshed!', 'info') }}>
          <span className={styles.refreshIcon}>↻</span> Refresh
        </button>
      </div>

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
                      <th>Email</th>
                      {columns.slice(0,3).filter(c => !c.toLowerCase().includes('email')).map(c => <th key={c}>{c}</th>)}
                      <th>Status</th>
                      <th>Opened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map(r => (
                      <tr key={r.id}>
                        <td className={styles.emailCell}>{r.email}</td>
                        {columns.slice(0,3).filter(c => !c.toLowerCase().includes('email')).map(c => (
                          <td key={c}>{(r.data as any)[c] || '—'}</td>
                        ))}
                        <td>
                          <span className={styles.statusBadge} data-status={r.status}>
                            {r.status === 'sent' ? '✓ Sent' : r.status === 'error' ? '✗ Error' : '· Pending'}
                          </span>
                        </td>
                        <td>{r.openedAt ? <span style={{color:'var(--green)',fontSize:11}}>{new Date(r.openedAt).toLocaleString('en-PK',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true})}</span> : <span style={{color:'var(--text3)'}}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right — Send options */}
        <div className={styles.detailRight}>
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
        </div>
      </div>
    </div>
  )
}

// ─── Compose Tab ──────────────────────────────────────────
function ComposeTab({ templates, onSaved, showToast }: any) {
  const { useEditor, EditorContent } = require('@tiptap/react')
  const StarterKit = require('@tiptap/starter-kit').default

  const [selected, setSelected]         = useState<Template | null>(null)
  const [name, setName]                 = useState('')
  const [subject, setSubject]           = useState('')
  const [body, setBody]                 = useState('')
  const [saving, setSaving]             = useState(false)
  const [attachmentName, setAttachmentName] = useState('')
  const [uploading, setUploading]       = useState(false)
  const attachRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: body,
    onUpdate: ({ editor }: any) => {
      setBody(editor.getHTML())
    },
  })

  async function newTemplate() {
    const r = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled', subject: '', body: '' })
    })
    const created = await r.json()
    setSelected(created)
    setName(''); setSubject(''); setBody(''); setAttachmentName('')
    editor?.commands.setContent('')
    onSaved()
  }

  function editTemplate(t: Template) {
    setSelected(t); setName(t.name === 'Untitled' ? '' : t.name); setSubject(t.subject); setBody(t.body)
    setAttachmentName((t as any).attachmentName || '')
    editor?.commands.setContent(t.body)
  }

  async function uploadAttachment(file: File) {
    // Template always exists now — created on "New Template" click
    if (!selected?.id) return showToast('Something went wrong, please refresh', 'error')
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

  function detectPlaceholders() {
    const all = subject + ' ' + body
    const matches = all.match(/\{\{([^}]+)\}\}/g) || []
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))]
  }

  async function saveTemplate() {
    if (!selected?.id) return showToast('No template selected', 'error')
    if (!name || !subject || !body) return showToast('Fill in name, subject and body', 'error')
    setSaving(true)
    const r = await fetch('/api/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, name, subject, body })
    })
    setSaving(false)
    if (!r.ok) return showToast('Failed to save', 'error')
    onSaved()
    showToast('Template saved!')
    // Reset to empty state so user sees the "new template" box again
    setSelected(null)
    setName(''); setSubject(''); setBody(''); setAttachmentName('')
    editor?.commands.setContent('')
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
    if (selected?.id === id) newTemplate()
    onSaved()
    showToast('Template deleted')
  }

  const placeholders = detectPlaceholders()

  return (
    <div className={styles.tabContent}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Templates</h1>
          <p className={styles.pageSubtitle}>Write reusable email templates with {'{{'} placeholders {'}'}</p>
        </div>
      </div>

      <div className={styles.composeGrid}>
        {/* Template list */}
        <div className={styles.templateList}>
          {!templates.length && (
            <div className={styles.empty} style={{padding:'30px 20px'}}>
              <div className={styles.emptyIcon} style={{fontSize:24}}>✦</div>
              <div className={styles.emptyText}>No templates yet</div>
            </div>
          )}
          {templates.map((t: Template) => (
            <div key={t.id} className={`${styles.templateItem} ${selected?.id === t.id ? styles.templateItemActive : ''}`} onClick={() => editTemplate(t)}>
              <div className={styles.templateItemName}>
                {selected?.id === t.id ? (name || 'Untitled') : (t.name || 'Untitled')}
              </div>
              <div className={styles.templateItemSubject}>
                {selected?.id === t.id ? (subject || 'No subject') : (t.subject || 'No subject')}
              </div>
              <div className={styles.templateItemDate}>{new Date(t.updatedAt).toLocaleDateString('en-PK',{day:'2-digit',month:'short'})}</div>
              <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }}>✕</button>
            </div>
          ))}
        </div>

        {/* Editor */}
        {selected ? (
        <div className={styles.card} style={{flex:1}}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Template Name</label>
            <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Masters Admission Inquiry" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Subject Line</label>
            <input className={styles.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Inquiry Regarding PhD Supervision — {{Name}}" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Body</label>
            {/* Toolbar */}
            <div style={{display:'flex',gap:4,padding:'6px 8px',background:'var(--bg3)',border:'1.5px solid var(--border)',borderBottom:'none',borderRadius:'var(--radius) var(--radius) 0 0'}}>
              {[
                { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold'), style: {fontWeight:'bold'} },
                { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic'), style: {fontStyle:'italic'} },
                { label: 'U', action: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive('strike'), style: {textDecoration:'underline'} },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  style={{
                    padding:'3px 8px',
                    border:'1px solid var(--border)',
                    borderRadius:4,
                    background: btn.active ? 'var(--accent)' : 'var(--bg2)',
                    color: btn.active ? 'white' : 'var(--text)',
                    cursor:'pointer',
                    fontSize:13,
                    ...btn.style
                  }}
                >{btn.label}</button>
              ))}
            </div>
            {/* Editor */}
            <div style={{border:'1.5px solid var(--border)',borderRadius:'0 0 var(--radius) var(--radius)',background:'var(--bg3)',minHeight:280,padding:'10px 12px',fontSize:13,color:'var(--text)',lineHeight:1.6,cursor:'text'}} onClick={() => editor?.commands.focus()}>
              <EditorContent editor={editor} />
            </div>
          </div>

          {placeholders.length > 0 && (
            <div className={styles.phPanel}>
              <div className={styles.phLabel}>Detected placeholders</div>
              <div className={styles.phChips}>
                {placeholders.map(p => (
                  <span key={p} className={styles.phChip}>{'{{'}{p}{'}}'}</span>
                ))}
              </div>
              <div className={styles.hint}>These will be replaced with data from your recipient list</div>
            </div>
          )}

          {/* Attachment */}
          <div className={styles.formGroup} style={{marginTop:12}}>
            <label className={styles.label}>Attachment (CV, Documents)</label>
            <input ref={attachRef} type="file" style={{display:'none'}} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e => { if(e.target.files?.[0]) uploadAttachment(e.target.files[0]) }} />
            {attachmentName ? (
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'var(--bg3)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
                <span style={{fontSize:16}}>📎</span>
                <span style={{fontSize:12,color:'var(--text)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{attachmentName}</span>
                <button onClick={removeAttachment} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:14,padding:'0 4px'}}>✕</button>
              </div>
            ) : (
              <div>
                <button className={styles.btnGhost} style={{width:'100%'}} onClick={() => attachRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : '📎 Attach File'}
                </button>
                <div className={styles.hint}>PDF, Word, Excel, or image — sent with every email using this template</div>
              </div>
            )}
          </div>

          <div className={styles.formActions} style={{marginTop:16}}>
            <button className={styles.btnGhost} onClick={newTemplate}>New Template</button>
            <button className={styles.btnPrimary} onClick={saveTemplate} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>
        ) : (
          <div className={styles.card} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:320}}>
            <div className={styles.emptyIcon}>✦</div>
            <div className={styles.emptyTitle}>No template selected</div>
            <div className={styles.emptyText} style={{marginBottom:20}}>Pick one from the list or create a new one</div>
            <button className={styles.btnPrimary} onClick={newTemplate}>+ New Template</button>
          </div>
        )}
      </div>
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
