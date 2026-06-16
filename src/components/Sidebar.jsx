export default function Sidebar({ active, onSelect, onSignOut, open }) {
  const items = [
    { section: 'Invoicing' },
    { id: 'invoices',    icon: '📋', label: 'Invoices' },
    { divider: true },
    { section: 'Payroll' },
    { id: 'payroll',     icon: '💰', label: 'Payroll' },
    { divider: true },
    { section: 'Tools' },
    { id: 'quotation',   icon: '📄', label: 'Quotation' },
    { id: 'whatsapp',    icon: '💬', label: 'WhatsApp' },
    { id: 'addinvoice',  icon: '➕', label: 'Add Invoice' },
  ]

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`}>
      {items.map((it, i) => {
        if (it.section) return <div key={i} className="sb-section">{it.section}</div>
        if (it.divider) return <div key={i} className="sb-divider" />
        return (
          <button
            key={it.id}
            className={`sb-btn${active === it.id ? ' active' : ''}`}
            onClick={() => onSelect(it.id)}
          >
            <span className="sb-ico">{it.icon}</span> {it.label}
          </button>
        )
      })}
      <div className="sb-divider" style={{ marginTop: 'auto' }} />
      <button className="sb-signout" onClick={onSignOut}>🚪 Sign Out</button>
    </nav>
  )
}
