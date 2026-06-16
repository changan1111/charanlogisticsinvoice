import jsPDF from 'jspdf'
import autoTablePkg from 'jspdf-autotable'
const autoTable = autoTablePkg.default || autoTablePkg
import { fmt, prMf, prFmtMonth, sortLineItems, getQty, getPrice, getDesc, getLineItemDate, loadImg } from './helpers'

const BASE = import.meta.env.BASE_URL || '/'
const FOOTER = {
  bankName:    'OCBC Bank Ltd.',
  bankAddr:    '65 Chulia Street, OCBC Singapore Centre, Singapore 049513',
  companyName: 'Charan Logistics Ptd Ltd.',
  accountNo:   '604233585001',
  payNowUEN:   '202502540D',
}

async function loadImages() {
  const [hdr, ftr, qr] = await Promise.all([
    loadImg(BASE + 'header.png'),
    loadImg(BASE + 'footer.png'),
    loadImg(BASE + 'QRCode.jpeg'),
  ])
  return { hdr, ftr, qr }
}

function drawHeaderFooterSync(doc, cfg, imgs, W = 210, HEADER_H = 35, FOOTER_H = 62) {
  const { hdr, ftr, qr } = imgs

  if (hdr) doc.addImage(hdr.d, hdr.ext, 0, 0, W, HEADER_H, '', 'NONE')
  else {
    doc.setFillColor(11, 29, 58); doc.rect(0, 0, W, HEADER_H, 'F')
    doc.setFillColor(59, 130, 196); doc.rect(0, HEADER_H, W, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255)
    doc.text(cfg.name, 8 + 28, 14)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 195, 230)
    doc.text(cfg.addr, 8 + 28, 20)
  }

  const fy = 297 - FOOTER_H
  const M = 8, valX = 52, col2x = 108
  doc.setFillColor(255, 255, 255); doc.rect(0, fy, W, FOOTER_H - 18, 'F')
  doc.setDrawColor(210, 225, 245); doc.setLineWidth(0.5); doc.line(0, fy, W, fy)
  let ty = fy + 7
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(11, 29, 58)
  doc.text('Account Details:', M, ty); ty += 5.5
  const accRows = [
    ['Bank Name',    FOOTER.bankName],
    ['Bank Address', FOOTER.bankAddr],
    ['Company Name', FOOTER.companyName],
    ['Account No.',  FOOTER.accountNo],
    ['PayNow UEN',   FOOTER.payNowUEN],
  ]
  doc.setFontSize(8.5)
  accRows.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(70, 95, 130); doc.text(lbl + ' :', M, ty)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(11, 29, 58)
    const maxW = col2x - valX - 6
    const lines = doc.splitTextToSize(val, maxW)
    doc.text(lines[0], valX, ty)
    if (lines[1]) { ty += 4.3; doc.text(lines[1], valX, ty) }
    ty += 5.0
  })

  const imgStripY = 297 - 22
  if (ftr) doc.addImage(ftr.d, ftr.ext, 0, imgStripY, W, 22, '', 'NONE')
  else {
    doc.setFillColor(19, 48, 94); doc.rect(0, imgStripY, W, 22, 'F')
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(180, 200, 240)
    doc.text('CHARAN LOGISTICS PTE. LTD  ·  101 Kitchener Road #03-14  ·  Singapore 208511  ·  Reg No: 202502540D', W / 2, imgStripY + 11 + 1.5, { align: 'center' })
  }

  if (qr) {
    const qsz = 28, qx = W - 8 - qsz, qy = 297 - FOOTER_H + 3
    doc.addImage(qr.d, qr.ext, qx, qy, qsz, qsz, '', 'NONE')
  }
}

async function drawHeaderFooter(doc, cfg, W = 210, HEADER_H = 35, FOOTER_H = 62) {
  const imgs = await loadImages()
  drawHeaderFooterSync(doc, cfg, imgs, W, HEADER_H, FOOTER_H)
}

export async function makeInvoicePDF(inv, cfg) {
  const cur = 'S$'
  const W = 210, M = 8, HEADER_H = 35, FOOTER_H = 62
  const CONTENT_TOP = HEADER_H + 4
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  // Calculate display total from line items, fallback to inv.total
  const itemsTotal = (inv.items || []).reduce((s, li) => s + (parseFloat(li.qty ?? li.quantity ?? 1) || 1) * (parseFloat(li.price ?? li.rate ?? 0) || 0), 0)
  const displayTotal = itemsTotal > 0 ? itemsTotal : (parseFloat(inv.total) || 0)

  // Preload images BEFORE rendering so didDrawPage can use sync draw
  const imgs = await loadImages()
  drawHeaderFooterSync(doc, cfg, imgs, W, HEADER_H, FOOTER_H)

  const metaY = CONTENT_TOP + 4
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  const numStr = '#' + inv.number
  const numW   = doc.getTextWidth(numStr)
  const labelW = doc.getTextWidth('INVOICE ')
  doc.setTextColor(130, 150, 180); doc.text('INVOICE', W - M - numW - labelW, metaY)
  doc.setTextColor(11, 29, 58);    doc.text(numStr, W - M, metaY, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(11, 29, 58)
  if (inv.billingDate) doc.text('Billing Date: ' + inv.billingDate, W - M, metaY + 8, { align: 'right' })
  if (inv.due)         doc.text('Due: '          + inv.due,         W - M, metaY + 14, { align: 'right' })

  const partyY = CONTENT_TOP + 4
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(59, 130, 196)
  doc.text('BILLED TO', M, partyY)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(11, 29, 58)
  doc.text(inv.name || '—', M, partyY + 6)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(11, 29, 58)
  const aLines = (inv.addr || '').split(/,|\n/).map(s => s.trim()).filter(Boolean)
  aLines.forEach((l, i) => doc.text(l, M, partyY + 12 + i * 5))

  const attnOffset = inv.attn ? 8 : 0
  if (inv.attn) {
    const attnY = partyY + 12 + aLines.length * 5 + 3
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(11, 29, 58)
    doc.text('ATTN: ' + inv.attn, M, attnY)
  }

  const hasLineItemDates = (inv.items || []).some(li => getLineItemDate(li))
  const tableY = partyY + 14 + aLines.length * 5.5 + 3 + attnOffset

  const tableHead = hasLineItemDates
    ? [['Date', 'Description', 'Qty', 'Rate', 'Amount']]
    : [['Description', 'Qty', 'Rate', 'Amount']]

  const allRows = sortLineItems(inv.items || []).map(li => {
    const q = getQty(li), p = getPrice(li), d = getDesc(li), liDate = getLineItemDate(li)
    if (hasLineItemDates) return [liDate || '—', d.toUpperCase(), String(q), cur + ' ' + fmt(p), cur + ' ' + fmt(q * p)]
    return [d.toUpperCase(), String(q), cur + ' ' + fmt(p), cur + ' ' + fmt(q * p)]
  })
  if (!allRows.length) {
    if (hasLineItemDates) allRows.push(['—', 'Invoice total (no line item breakdown)', '—', '—', cur + ' ' + fmt(inv.total)])
    else allRows.push(['Invoice total (no line item breakdown)', '—', '—', cur + ' ' + fmt(inv.total)])
  }

  const bx = W - M - 75, bw = 75, bh = 36  // total box dimensions

  const colStyles = hasLineItemDates
    ? { 0: { cellWidth: 30, halign: 'left', overflow: 'hidden' }, 1: { cellWidth: 'auto' }, 2: { halign: 'center', cellWidth: 18, overflow: 'hidden' }, 3: { halign: 'right', cellWidth: 30, overflow: 'hidden' }, 4: { halign: 'right', cellWidth: 30, fontStyle: 'bold', overflow: 'hidden' } }
    : { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 18, overflow: 'hidden' }, 2: { halign: 'right', cellWidth: 30, overflow: 'hidden' }, 3: { halign: 'right', cellWidth: 30, fontStyle: 'bold', overflow: 'hidden' } }

  autoTable(doc, {
    startY: tableY, head: tableHead, body: allRows,
    margin: { left: M, right: M, top: CONTENT_TOP, bottom: FOOTER_H + 4 },
    rowPageBreak: 'avoid',
    headStyles: { fillColor: [11, 29, 58], textColor: [175, 205, 240], fontSize: 9, fontStyle: 'bold', cellPadding: 4, overflow: 'hidden', minCellHeight: 12 },
    bodyStyles: { fontSize: 9, textColor: [25, 45, 80], cellPadding: 4 },
    alternateRowStyles: { fillColor: [245, 249, 255] },
    columnStyles: colStyles,
    styles: { lineColor: [220, 232, 248], lineWidth: 0.3 },
    didDrawPage: () => { drawHeaderFooterSync(doc, cfg, imgs, W, HEADER_H, FOOTER_H) },
    pageBreak: 'auto',
  })

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130, 150, 180)
    doc.text(`Page ${p} of ${pageCount}`, W / 2, 290, { align: 'center' })
  }

  const finalY = doc.lastAutoTable.finalY
  const maxY = 297 - FOOTER_H - bh - 6  // max Y before footer overlap
  let by = finalY + 8
  if (by > maxY) {
    doc.addPage()
    drawHeaderFooterSync(doc, cfg, imgs, W, HEADER_H, FOOTER_H)
    by = CONTENT_TOP + 8
  }
  doc.setFillColor(245, 249, 255); doc.roundedRect(bx, by, bw, bh, 3, 3, 'F')
  doc.setDrawColor(210, 225, 245); doc.setLineWidth(0.4); doc.roundedRect(bx, by, bw, bh, 3, 3, 'S')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 130, 160)
  doc.text('Subtotal', bx + 8, by + 10); doc.text('Tax (0%)', bx + 8, by + 19)
  doc.setTextColor(11, 29, 58)
  doc.text(cur + ' ' + fmt(displayTotal), bx + bw - 6, by + 10, { align: 'right' })
  doc.text(cur + ' 0.00', bx + bw - 6, by + 19, { align: 'right' })
  doc.setDrawColor(200, 218, 242); doc.line(bx + 5, by + 23, bx + bw - 5, by + 23)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(11, 29, 58)
  doc.text('TOTAL', bx + 8, by + 31)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(19, 48, 94)
  doc.text(cur + ' ' + fmt(displayTotal), bx + bw - 6, by + 31, { align: 'right' })

  const blob = doc.output('blob')
  return blob
}

export async function makePayrollPDF(r) {
  function words(n) {
    const O = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    const T = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    if (!n) return 'Zero Dollars Only'
    const iv = Math.floor(n), cv = Math.round((n - iv) * 100)
    let w = ''
    if (iv >= 1000) w += O[Math.floor(iv / 1000)] + ' Thousand '
    const h = Math.floor((iv % 1000) / 100); if (h) w += O[h] + ' Hundred '
    const rr = iv % 100
    if (rr >= 20) w += T[Math.floor(rr / 10)] + ' ' + (O[rr % 10] || ''); else if (rr) w += O[rr]
    w = w.trim() + ' Dollars'
    if (cv > 0) { const cc = cv > 19 ? T[Math.floor(cv / 10)] + ' ' + (O[cv % 10] || '') : O[cv]; w += ' and ' + cc.trim() + ' Cents' }
    return w.trim() + ' Only'
  }

  const earn = +r.earn, ded = +r.ded, net = +r.net
  const ml = prFmtMonth(r.month || '')
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  doc.setFillColor(250, 247, 240); doc.rect(0, 0, 210, 297, 'F')

  const [prHdr, prFtr, prQr] = await Promise.all([
    loadImg(BASE + 'header.png'), loadImg(BASE + 'footer.png'), loadImg(BASE + 'QRCode.jpeg'),
  ])

  const hH = 35
  if (prHdr) doc.addImage(prHdr.d, prHdr.ext, 0, 0, 210, hH, '', 'NONE')
  else {
    doc.setFillColor(26, 26, 46); doc.rect(0, 0, 210, 36, 'F')
    doc.setFillColor(201, 168, 76); doc.rect(0, 36, 210, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(255, 255, 255)
    doc.text('CHARAN LOGISTICS PTE LTD', 105, 13, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(200, 190, 160)
    doc.text('101 Kitchener Road #03-14, Singapore 208511  |  HP: 91858511  |  charanlogistics@gmail.com', 105, 20, { align: 'center' })
    doc.text('Reg No: 202502540D', 105, 27, { align: 'center' })
  }

  if (prFtr) doc.addImage(prFtr.d, prFtr.ext, 0, 297 - 22, 210, 22, '', 'NONE')
  else {
    doc.setFillColor(19, 48, 94); doc.rect(0, 297 - 22, 210, 22, 'F')
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(180, 200, 240)
    doc.text('CHARAN LOGISTICS PTE LTD  ·  101 Kitchener Road #03-14, Singapore 208511  ·  Reg No: 202502540D', 105, 297 - 11, { align: 'center' })
  }

  // Title
  const cY = hH + 8
  doc.setFillColor(11, 29, 58); doc.rect(8, cY, 194, 10, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(201, 168, 76)
  doc.text('PAYSLIP — ' + ml.toUpperCase(), 105, cY + 7, { align: 'center' })

  // Employee details
  let y = cY + 17
  const infoRows = [
    ['Employee Name', r.name || '—'],   ['NRIC / FIN', r.nric || '—'],
    ['Designation',   r.desig || '—'],  ['Reference No.', r.ref || '—'],
    ['Salary Month',  ml],              ['Payment Date', r.paydate ? new Date(r.paydate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
  ]
  doc.setFontSize(9)
  infoRows.forEach(([lbl, val], i) => {
    const col = i % 2; const row = Math.floor(i / 2)
    const x = col === 0 ? 8 : 110; const ry = y + row * 8
    doc.setFont('helvetica', 'bold'); doc.setTextColor(74, 103, 65)
    doc.text(lbl + ' :', x, ry)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(11, 29, 58)
    doc.text(String(val), x + 38, ry)
  })

  y += Math.ceil(infoRows.length / 2) * 8 + 6
  doc.setDrawColor(212, 201, 168); doc.setLineWidth(0.5); doc.line(8, y, 202, y); y += 6

  // Earnings / Deductions table
  const tRows = [
    ['Basic Pay',          prMf(r.basic || 0), 'CPF Deduction',   prMf(r.cpf || 0)],
    ['Overtime Pay',       prMf(r.ot || 0),    'SDL',              prMf(r.sdl || 0)],
    ['Commission',         prMf(r.comm || 0),  'Other Deductions', prMf(r.od || 0)],
    ['Allowance',          prMf(r.allow || 0), '', ''],
    ['Other Earnings',     prMf(r.oe || 0),    '', ''],
    ['Total Earnings',     prMf(earn),          'Total Deductions', prMf(ded)],
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: 8, right: 8 },
    head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
    body: tRows,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [11, 29, 58], textColor: [201, 168, 76], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 42, halign: 'right' }, 2: { cellWidth: 55 }, 3: { cellWidth: 42, halign: 'right' } },
    didParseCell: (d) => {
      if (d.row.index === tRows.length - 1) {
        d.cell.styles.fontStyle = 'bold'
        d.cell.styles.fillColor = [240, 245, 250]
      }
    },
  })

  const netY = doc.lastAutoTable.finalY + 8
  doc.setFillColor(11, 29, 58); doc.rect(8, netY, 194, 14, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(201, 168, 76)
  doc.text('NET PAY', 16, netY + 9)
  doc.setFontSize(14)
  doc.text(prMf(net), 202, netY + 9, { align: 'right' })

  const wordsY = netY + 21
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(100, 90, 70)
  doc.text(words(net), 105, wordsY, { align: 'center' })

  return doc.output('blob')
}

export async function makeQuotationPDF(qdata) {
  const { qNum, qDate, qClient, qAddr, qNotes, items, gstOn } = qdata
  const cur = 'S$'
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const W = 210, M = 8, HEADER_H = 35, FOOTER_H = 22

  // Preload images for sync use in didDrawPage
  const imgs = await loadImages()
  const { hdr, ftr } = imgs

  function drawQtHdrFtr() {
    if (hdr) doc.addImage(hdr.d, hdr.ext, 0, 0, W, HEADER_H, '', 'NONE')
    else {
      doc.setFillColor(11, 29, 58); doc.rect(0, 0, W, HEADER_H, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255)
      doc.text('CHARAN LOGISTICS PTE LTD', 105, 20, { align: 'center' })
    }
    if (ftr) doc.addImage(ftr.d, ftr.ext, 0, 297 - FOOTER_H, W, FOOTER_H, '', 'NONE')
    else {
      doc.setFillColor(19, 48, 94); doc.rect(0, 297 - FOOTER_H, W, FOOTER_H, 'F')
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(180, 200, 240)
      doc.text('CHARAN LOGISTICS PTE LTD  ·  101 Kitchener Road  ·  Singapore 208511', 105, 297 - 11, { align: 'center' })
    }
  }

  drawQtHdrFtr()

  let y = 42
  doc.setFillColor(11, 29, 58); doc.rect(M, y, W - M * 2, 10, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(201, 168, 76)
  doc.text('QUOTATION', 105, y + 7, { align: 'center' })
  y += 16

  doc.setFontSize(9); doc.setTextColor(11, 29, 58)
  doc.setFont('helvetica', 'bold'); doc.text('Quotation No.:', M, y)
  doc.setFont('helvetica', 'normal'); doc.text(qNum || '—', M + 36, y)
  doc.setFont('helvetica', 'bold'); doc.text('Date:', W - M - 60, y)
  doc.setFont('helvetica', 'normal'); doc.text(qDate || '—', W - M - 40, y)
  y += 7
  doc.setFont('helvetica', 'bold'); doc.text('To:', M, y)
  doc.setFont('helvetica', 'normal'); doc.text(qClient || '—', M + 10, y)
  y += 5
  const addrLines = (qAddr || '').split(/\n|,/).map(s => s.trim()).filter(Boolean)
  addrLines.forEach(l => { doc.text(l, M + 10, y); y += 5 })
  y += 3

  const tRows = items.map((it, i) => [
    String(i + 1), it.desc || '', String(it.qty || 1),
    cur + ' ' + fmt(it.price || 0),
    cur + ' ' + fmt((it.qty || 1) * (it.price || 0)),
  ])
  const subtotal = items.reduce((s, it) => s + (it.qty || 1) * (it.price || 0), 0)
  const gst = gstOn ? subtotal * 0.09 : 0
  const grand = subtotal + gst

  autoTable(doc, {
    startY: y, margin: { left: M, right: M, top: HEADER_H + 4, bottom: FOOTER_H + 6 },
    head: [['No.', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: tRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [11, 29, 58], textColor: [201, 168, 76], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 16, halign: 'center' }, 3: { cellWidth: 38, halign: 'right' }, 4: { cellWidth: 38, halign: 'right', fontStyle: 'bold' } },
    didDrawPage: () => { drawQtHdrFtr() },
  })

  const totY = doc.lastAutoTable.finalY + 4
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 130, 168)
  doc.text('Subtotal:', W - M - 50, totY + 5); doc.text(cur + ' ' + fmt(subtotal), W - M, totY + 5, { align: 'right' })
  if (gstOn) { doc.text('GST 9%:', W - M - 50, totY + 11); doc.text(cur + ' ' + fmt(gst), W - M, totY + 11, { align: 'right' }) }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 29, 58)
  const gt = gstOn ? totY + 17 : totY + 11
  doc.text('Grand Total:', W - M - 50, gt); doc.text(cur + ' ' + fmt(grand), W - M, gt, { align: 'right' })

  if (qNotes) {
    const nt = gt + 10
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(11, 29, 58)
    doc.text('Notes / Terms:', M, nt)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    const nlines = doc.splitTextToSize(qNotes, W - M * 2)
    doc.text(nlines, M, nt + 5)
  }

  return doc.output('blob')
}
