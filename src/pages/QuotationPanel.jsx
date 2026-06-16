import { useState } from 'react'
import { todayStr, fmt } from '../utils/helpers'
import { makeQuotationPDF } from '../utils/pdfGen'

const DEF_ITEMS = [
  { desc: 'Van with driver',                              price: 5750,  qty: 1 },
  { desc: 'Van with driver with Assistant',               price: 7750,  qty: 1 },
  { desc: '14ft box lorry w/o Tailgate with assistant',   price: 9750,  qty: 1 },
  { desc: '14ft box lorry with tailgate with assistant',  price: 10250, qty: 1 },
  { desc: '24ft box lorry with assistant',                price: 11750, qty: 1 },
  { desc: '24ft box lorry with tailgate with assistant',  price: 12750, qty: 1 },
  { desc: 'EV Van with driver',                           price: 5000,  qty: 1 },
]

const mkItem = (desc = '', price = 0, qty = 1) => ({ id: Date.now() + Math.random(), desc, price, qty })

export default function QuotationPanel() {
  const [qNum,    setQNum]    = useState('')
  const [qDate,   setQDate]   = useState(todayStr())
  const [qClient, setQClient] = useState('')
  const [qAddr,   setQAddr]   = useState('')
  const [qNotes,  setQNotes]  = useState('')
  const [items,   setItems]   = useState(() => DEF_ITEMS.map(d => mkItem(d.desc, d.price, d.qty)))
  const [gstOn,   setGstOn]   = useState(false)

  const update = (id, k, v) => setItems(rs => rs.map(r => r.id === id ? { ...r, [k]: v } : r))
  const addItem = () => setItems(rs => [...rs, mkItem()])
  const delItem = (id) => setItems(rs => rs.filter(r => r.id !== id))

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 1) * (parseFloat(it.price) || 0), 0)
  const gst   = gstOn ? subtotal * 0.09 : 0
  const grand = subtotal + gst

  const genPDF = async () => {
    const blob = await makeQuotationPDF({ qNum, qDate, qClient, qAddr, qNotes, items, gstOn })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `Quotation_${qNum || 'draft'}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <div className="pr-info-note">💡 Fill quotation details and line items — export as PDF.</div>

      <div className="pr-card">
        <div className="pr-card-title">Quotation Info</div>
        <div className="pr-form-grid">
          <div className="pr-field"><label>Quotation No.</label><input type="text" value={qNum} onChange={e => setQNum(e.target.value)} placeholder="e.g. QT-2025-001" /></div>
          <div className="pr-field"><label>Date</label><input type="date" value={qDate} onChange={e => setQDate(e.target.value)} /></div>
          <div className="pr-field span2"><label>Client Name / Company</label><input type="text" value={qClient} onChange={e => setQClient(e.target.value)} placeholder="e.g. Mr. Dean / ABC Pte Ltd" /></div>
          <div className="pr-field span2"><label>Client Address</label><textarea value={qAddr} onChange={e => setQAddr(e.target.value)} rows={2} placeholder="Full address…" /></div>
          <div className="pr-field span2"><label>Notes / Working Hours / Terms</label><textarea value={qNotes} onChange={e => setQNotes(e.target.value)} rows={2} placeholder="e.g. Working hours: Mon–Fri 8am–6pm" /></div>
        </div>
      </div>

      <div className="pr-card">
        <div className="pr-card-title">Line Items</div>
        <div className="qt-items-table-wrap">
          <table className="qt-items-table" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>No.</th>
                <th>Description</th>
                <th style={{ width: 130, textAlign: 'right' }}>Unit Price (S$)</th>
                <th style={{ width: 70,  textAlign: 'right' }}>Qty</th>
                <th style={{ width: 130, textAlign: 'right' }}>Total (S$)</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id}>
                  <td style={{ textAlign: 'center', color: '#7a6e58', fontWeight: 600 }}>{i + 1}</td>
                  <td><input type="text" value={it.desc} onChange={e => update(it.id, 'desc', e.target.value)} placeholder="Description" /></td>
                  <td><input type="number" value={it.price} min="0" step="0.01"
                    onChange={e => update(it.id, 'price', parseFloat(e.target.value) || 0)}
                    style={{ textAlign: 'right' }} /></td>
                  <td><input type="number" value={it.qty} min="1" step="1"
                    onChange={e => update(it.id, 'qty', parseFloat(e.target.value) || 1)}
                    style={{ textAlign: 'right' }} /></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    S$ {fmt((parseFloat(it.qty) || 1) * (parseFloat(it.price) || 0))}
                  </td>
                  <td><button className="qt-del-btn" onClick={() => delItem(it.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="qt-add-row-btn" onClick={addItem}>+ Add Item</button>

        <div className="qt-totals-row" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="qt-total-item">
            <div className="qt-total-label">Subtotal</div>
            <div className="qt-total-value">S$ {fmt(subtotal)}</div>
          </div>
          <div className="qt-total-item">
            <div className="qt-total-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              GST 9% <input type="checkbox" checked={gstOn} onChange={e => setGstOn(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--gold)', flexShrink: 0 }} />
            </div>
            <div className="qt-total-value">S$ {fmt(gst)}</div>
          </div>
          <div className="qt-total-item">
            <div className="qt-total-label">Grand Total</div>
            <div className="qt-total-value grand">S$ {fmt(grand)}</div>
          </div>
        </div>
      </div>

      <div className="pr-actions">
        <button className="btn btn-dark" onClick={genPDF}>⬇ Download PDF</button>
      </div>
    </div>
  )
}
