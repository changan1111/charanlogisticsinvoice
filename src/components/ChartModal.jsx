import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { fmt } from '../utils/helpers'

Chart.register(...registerables)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getInvoiceDate(inv) {
  const d = inv.billingDate || inv.billing_date || inv.date || ''
  if (d.length < 7) return null
  const parts = d.split(/[-\/]/)
  const year = parts[0].length === 4 ? Number(parts[0]) : Number(parts[2])
  const month = Number(parts[1])
  if (!Number.isInteger(year) || month < 1 || month > 12) return null
  return { year, month: month - 1 }
}

function parseYear(inv) {
  return getInvoiceDate(inv)?.year ?? null
}
function parseMonth(inv) {
  return getInvoiceDate(inv)?.month ?? null
}

function invoiceAmount(inv) {
  return Number.parseFloat(inv.total_amount ?? inv.total ?? inv.amount ?? 0) || 0
}

function formatPeriod(period) {
  return `${MONTHS[period.month]} ${period.year}`
}

function periodKey(period) {
  return period.year * 12 + period.month
}

function previousPeriod(period) {
  return period.month === 0
    ? { year: period.year - 1, month: 11 }
    : { year: period.year, month: period.month - 1 }
}

export default function ChartModal({ invoices, cfg, onClose }) {
  const [view, setView]     = useState('bar')
  const [year, setYear]     = useState(new Date().getFullYear())
  const chartRef            = useRef(null)
  const chartInst           = useRef(null)

  const years = [...new Set(invoices.map(parseYear).filter(Boolean))].sort().reverse()

  const comparison = (() => {
    const dated = invoices.map(inv => ({ inv, period: getInvoiceDate(inv) })).filter(row => row.period)
    if (!dated.length) return null

    const current = dated.reduce((latest, row) => periodKey(row.period) > periodKey(latest) ? row.period : latest, dated[0].period)
    const previous = previousPeriod(current)
    const currentRows = dated.filter(row => periodKey(row.period) === periodKey(current)).map(row => row.inv)
    const previousRows = dated.filter(row => periodKey(row.period) === periodKey(previous)).map(row => row.inv)
    const currentTotal = currentRows.reduce((sum, inv) => sum + invoiceAmount(inv), 0)
    const previousTotal = previousRows.reduce((sum, inv) => sum + invoiceAmount(inv), 0)
    const difference = currentTotal - previousTotal
    const percentage = previousTotal ? (difference / previousTotal) * 100 : null

    const clients = new Map()
    ;[...currentRows, ...previousRows].forEach(inv => {
      const name = inv.client_name || inv.name || 'Unassigned client'
      if (!clients.has(name)) clients.set(name, { name, current: 0, previous: 0 })
      const client = clients.get(name)
      if (currentRows.includes(inv)) client.current += invoiceAmount(inv)
      else client.previous += invoiceAmount(inv)
    })
    const drivers = [...clients.values()]
      .map(client => ({ ...client, difference: client.current - client.previous }))
      .filter(client => client.difference !== 0)
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 3)

    return { current, previous, currentTotal, previousTotal, difference, percentage, currentCount: currentRows.length, previousCount: previousRows.length, drivers }
  })()

  const monthData = MONTHS.map((m, i) => {
    const mInvs = invoices.filter(inv => parseYear(inv) === year && parseMonth(inv) === i)
    const paid    = mInvs.filter(inv => inv.status === 'paid').reduce((s, inv) => s + parseFloat(inv.total_amount ?? inv.total ?? 0), 0)
    const pending = mInvs.filter(inv => inv.status !== 'paid').reduce((s, inv) => s + parseFloat(inv.total_amount ?? inv.total ?? 0), 0)
    return { month: m, paid, pending, count: mInvs.length }
  })

  const yearTotal = monthData.reduce((s, m) => s + m.paid + m.pending, 0)
  const yearPaid  = monthData.reduce((s, m) => s + m.paid, 0)

  useEffect(() => {
    if (view === 'table' || !chartRef.current) return
    if (chartInst.current) chartInst.current.destroy()
    chartInst.current = new Chart(chartRef.current, {
      type: view === 'line' ? 'line' : 'bar',
      data: {
        labels: MONTHS,
        datasets: [
          { label: 'Paid', data: monthData.map(m => m.paid), backgroundColor: 'rgba(10,122,75,.7)', borderColor: '#0a7a4b', borderWidth: 2, borderRadius: view === 'bar' ? 6 : 0, fill: view === 'line' },
          { label: 'Pending', data: monthData.map(m => m.pending), backgroundColor: 'rgba(184,106,0,.5)', borderColor: '#b86a00', borderWidth: 2, borderRadius: view === 'bar' ? 6 : 0, fill: view === 'line' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: S$ ${fmt(ctx.raw)}` } } },
        scales: { y: { ticks: { callback: v => 'S$' + fmt(v) }, beginAtZero: true } }
      }
    })
    return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null } }
  }, [view, year, invoices])

  return (
    <div className="chart-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="chart-modal">
        <div className="chart-bar">
          <div className="chart-bar-title">📊 Monthly Performance</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <select className="page-size-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{ minWidth: 80 }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="xbtn" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="chart-body">
          <div className="chart-tabs">
            {['bar','line','table'].map(v => (
              <button key={v} className={`chart-tab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
                {v === 'bar' ? 'Bar Chart' : v === 'line' ? 'Line Chart' : 'Table View'}
              </button>
            ))}
          </div>
          <div className="chart-summary">
            <div className="cs-card"><div className="cs-lbl">Year Total</div><div className="cs-val">S$ {fmt(yearTotal)}</div></div>
            <div className="cs-card"><div className="cs-lbl">Paid</div><div className="cs-val c-paid">S$ {fmt(yearPaid)}</div></div>
          </div>
          {comparison && (
            <section className="month-comparison" aria-label="Month-on-month comparison">
              <div className="month-comparison-head">
                <div>
                  <div className="month-comparison-title">Month-on-month summary</div>
                  <div className="month-comparison-sub">{formatPeriod(comparison.current)} compared with {formatPeriod(comparison.previous)}</div>
                </div>
                <span className={`month-change ${comparison.difference > 0 ? 'up' : comparison.difference < 0 ? 'down' : 'flat'}`}>
                  {comparison.difference > 0 ? '▲' : comparison.difference < 0 ? '▼' : '•'} S$ {fmt(Math.abs(comparison.difference))}
                  {comparison.percentage !== null && ` (${Math.abs(comparison.percentage).toFixed(1)}%)`}
                </span>
              </div>
              <div className="month-comparison-metrics">
                <div><span>Current month</span><strong>S$ {fmt(comparison.currentTotal)}</strong></div>
                <div><span>Previous month</span><strong>S$ {fmt(comparison.previousTotal)}</strong></div>
                <div><span>Invoices</span><strong>{comparison.currentCount} vs {comparison.previousCount}</strong></div>
              </div>
              <p className="month-comparison-text">
                {comparison.previousTotal === 0
                  ? `${formatPeriod(comparison.current)} has S$ ${fmt(comparison.currentTotal)} across ${comparison.currentCount} invoice${comparison.currentCount === 1 ? '' : 's'}; there were no invoices recorded in the prior month.`
                  : comparison.difference === 0
                    ? `Invoice value was unchanged month-on-month, with ${comparison.currentCount} invoice${comparison.currentCount === 1 ? '' : 's'} this month versus ${comparison.previousCount} last month.`
                    : `${comparison.difference > 0 ? 'Increase' : 'Decrease'} of S$ ${fmt(Math.abs(comparison.difference))} was recorded, alongside ${comparison.currentCount > comparison.previousCount ? 'more' : comparison.currentCount < comparison.previousCount ? 'fewer' : 'the same number of'} invoices (${comparison.currentCount} vs ${comparison.previousCount}).`}
              </p>
              {comparison.drivers.length > 0 && (
                <div className="month-drivers">
                  <span className="month-drivers-label">Main drivers</span>
                  {comparison.drivers.map(driver => (
                    <div className="month-driver" key={driver.name}>
                      <span>{driver.name}</span>
                      <strong className={driver.difference > 0 ? 'up' : 'down'}>{driver.difference > 0 ? '+' : '−'}S$ {fmt(Math.abs(driver.difference))}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {view !== 'table' ? (
            <div className="chart-wrap"><canvas ref={chartRef} /></div>
          ) : (
            <div className="chart-tbl-wrap">
              <table className="chart-tbl">
                <thead><tr><th>Month</th><th className="r">Total</th><th className="r">Invoices</th></tr></thead>
                <tbody>
                  {monthData.filter(m => m.count > 0 || m.paid + m.pending > 0).map((m, i) => (
                    <tr key={i}>
                      <td><b>{m.month}</b></td>
                      <td className="r">S$ {fmt(m.paid + m.pending)}</td>
                      <td className="r">{m.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
