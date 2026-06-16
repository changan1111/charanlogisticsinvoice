import { useState, useEffect, useRef } from 'react'
import { sb } from './supabase'
import Nav from './components/Nav'
import Sidebar from './components/Sidebar'
import SettingsBar from './components/SettingsBar'
import InvoicesPanel from './pages/InvoicesPanel'
import PayrollPanel from './pages/PayrollPanel'
import QuotationPanel from './pages/QuotationPanel'
import WhatsAppPanel from './pages/WhatsAppPanel'
import AddInvoicePanel from './pages/AddInvoicePanel'
import InvoiceModal from './components/InvoiceModal'
import EditInvoiceModal from './components/EditInvoiceModal'
import ChartModal from './components/ChartModal'
import QuickInvoiceFAB from './components/QuickInvoiceFAB'

const DEFAULT_CFG = {
  name: 'My Business',
  addr: '123 Business St, Chennai, India',
  cur: 'SGD',
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState('invoices')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const mainRef = useRef(null)
  const changePanel = (p) => {
    setPanel(p)
    setSidebarOpen(false)
    setTimeout(() => { if (mainRef.current) mainRef.current.scrollTop = 0 }, 50)
  }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cfg, setCfg] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cl_cfg')) || DEFAULT_CFG } catch { return DEFAULT_CFG }
  })

  // Invoice data shared across panels
  const [invoices, setInvoices] = useState([])
  const [lineItemCache, setLineItemCache] = useState({})
  const [invLoading, setInvLoading] = useState(false)

  // Modals
  const [viewInv, setViewInv] = useState(null)  // invoice to view
  const [editInv, setEditInv] = useState(null)  // invoice to edit
  const [chartOpen, setChartOpen] = useState(false)

  // Auth
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.replace('./login.html')
        return
      }
      setUser(session.user)
      setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') window.location.replace('./login.html')
    })
    return () => subscription.unsubscribe()
  }, [])

  const saveCfg = (newCfg) => {
    setCfg(newCfg)
    localStorage.setItem('cl_cfg', JSON.stringify(newCfg))
    setSettingsOpen(false)
    loadInvoices()
  }

  const loadInvoices = async () => {
    setInvLoading(true)
    try {
      let all = []
      let from = 0
      while (true) {
        const { data, error } = await sb.from('clients').select('*').order('updated_at', { ascending: false }).range(from, from + 999)
        if (error) throw error
        all = all.concat(data || [])
        if ((data || []).length < 1000) break
        from += 1000
      }
      setInvoices(all)
    } catch (e) {
      console.error('Load invoices error', e)
    }
    setInvLoading(false)
  }

  const fetchLineItems = async (numbers) => {
    if (!numbers.length) return
    const missing = numbers.filter(n => !lineItemCache[n])
    if (!missing.length) return
    try {
      const { data, error } = await sb.from('line_items').select('*').in('invoice_number', missing).limit(5000)
      if (error) throw error
      const byNum = {}
        ; (data || []).forEach(li => {
          if (!byNum[li.invoice_number]) byNum[li.invoice_number] = []
          byNum[li.invoice_number].push(li)
        })
      setLineItemCache(prev => ({ ...prev, ...byNum }))
    } catch (e) {
      console.error('Line items fetch error', e)
    }
  }

  useEffect(() => {
    if (user) loadInvoices()
  }, [user])

  const signOut = async () => {
    await sb.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spin" />
        <div style={{ fontSize: '.9rem', color: 'var(--muted)' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div className="app-root">
      <div className="header-banner">
        <img src={`${import.meta.env.BASE_URL}header.png`} alt="Header" onError={e => e.target.style.display = 'none'} />
      </div>

      <Nav
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onToggleSettings={() => setSettingsOpen(o => !o)}
        onRefresh={loadInvoices}
      />

      <SettingsBar
        open={settingsOpen}
        cfg={cfg}
        onSave={saveCfg}
      />

      {sidebarOpen && <div className="sb-overlay show" onClick={() => setSidebarOpen(false)} />}

      <div className="app-body">
        <Sidebar
          active={panel}
          onSelect={(p) => changePanel(p)}
          onSignOut={signOut}
          open={sidebarOpen}
        />

        <div className="content-area" ref={mainRef}>
          {panel === 'invoices' && (
            <InvoicesPanel
              invoices={invoices}
              lineItemCache={lineItemCache}
              loading={invLoading}
              cfg={cfg}
              onFetchLineItems={fetchLineItems}
              onViewInv={setViewInv}
              onChartOpen={() => setChartOpen(true)}
              onReload={loadInvoices}
            />
          )}
          {panel === 'payroll' && <PayrollPanel cfg={cfg} />}
          {panel === 'quotation' && <QuotationPanel cfg={cfg} />}
          {panel === 'whatsapp' && <WhatsAppPanel />}
          {panel === 'addinvoice' && (
            <AddInvoicePanel
              cfg={cfg}
              onSaved={() => { loadInvoices(); changePanel('invoices') }}
              invoices={invoices}
            />
          )}
        </div>
      </div>

      {viewInv && (
        <InvoiceModal
          inv={viewInv}
          cfg={cfg}
          lineItemCache={lineItemCache}
          onClose={() => setViewInv(null)}
          onEdit={(inv) => { setEditInv(inv); setViewInv(null) }}
          onMarkPaid={async (inv) => {
            await sb.from('clients').update({ status: 'paid' }).eq('invoice_number', inv.number ?? inv.invoice_number)
            await loadInvoices()
            setViewInv(null)
          }}
        />
      )}

      {editInv && (
        <EditInvoiceModal
          inv={editInv}
          lineItemCache={lineItemCache}
          cfg={cfg}
          onClose={() => setEditInv(null)}
          onSaved={async () => {
            const invNum = editInv.number ?? editInv.invoice_number
            setLineItemCache(prev => { const n = { ...prev }; delete n[invNum]; return n })
            await loadInvoices()
            setEditInv(null)
          }}
        />
      )}

      {chartOpen && (
        <ChartModal
          invoices={invoices}
          cfg={cfg}
          onClose={() => setChartOpen(false)}
        />
      )}

      <QuickInvoiceFAB
        invoices={invoices}
        cfg={cfg}
        onSaved={loadInvoices}
      />
    </div>
  )
}
