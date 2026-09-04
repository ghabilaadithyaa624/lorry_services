'use client'

import { analyticsFilename, buildAnalyticsCsv, type AnalyticsPayload } from './analytics'

/**
 * Trigger a browser download for a Blob-encoded file.
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Export the dashboard analytics snapshot as a CSV file.
 * Kept dependency-free so it can run synchronously from a button handler.
 */
export function downloadAnalyticsCsv(data: AnalyticsPayload) {
  const csv = buildAnalyticsCsv(data)
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, analyticsFilename('dashboard-analytics', 'csv'))
}

/**
 * Export the dashboard analytics snapshot as a branded PDF report using
 * jsPDF + autoTable (client-side, nothing leaves the browser).
 */
export async function downloadAnalyticsPdf(data: AnalyticsPayload) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const contentWidth = pageWidth - margin * 2

  const navy: [number, number, number] = [7, 10, 17]
  const panel: [number, number, number] = [17, 24, 39]
  const orange: [number, number, number] = [249, 115, 22]
  const emerald: [number, number, number] = [34, 197, 94]
  const muted: [number, number, number] = [148, 163, 184]
  const light: [number, number, number] = [226, 232, 240]

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...navy)
  doc.rect(0, 0, pageWidth, 132, 'F')
  doc.setFillColor(...orange)
  doc.rect(0, 132, pageWidth, 4, 'F')

  doc.setTextColor(...orange)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.text('LorryCarry', margin, 52)
  doc.setTextColor(...light)
  doc.setFontSize(24)
  doc.text('Dashboard Analytics', margin, 84)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  doc.text(
    `Generated ${new Date(data.generatedAt).toLocaleString('en-IN')}  ·  Reporting window: last ${data.rangeDays} days`,
    margin,
    104,
  )

  let y = 160

  // ── KPI snapshot ─────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Trips Completed', value: String(data.trips.totalCompleted) },
    { label: 'Gross Booking Value', value: `₹${data.earnings.grossBookingValue.toLocaleString('en-IN')}` },
    { label: 'Active Bookings', value: String(data.bookings.active) },
    { label: 'Route Efficiency', value: `${data.routes.averageEfficiency}%` },
  ]
  const cardWidth = (contentWidth - 12 * 3) / 4
  kpis.forEach((kpi, index) => {
    const x = margin + index * (cardWidth + 12)
    doc.setFillColor(...panel)
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.6)
    doc.roundedRect(x, y, cardWidth, 64, 8, 8, 'FD')
    doc.setTextColor(...muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(kpi.label.toUpperCase(), x + 10, y + 20)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(kpi.value, x + 10, y + 44)
  })
  y += 94

  // ── Trips summary table ──────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Metric', 'Value']],
    body: [
      ['Total trips completed', String(data.trips.totalCompleted)],
      [`Completed in last ${data.rangeDays} days`, String(data.trips.periodCompleted)],
      ['Completed in previous period', String(data.trips.previousPeriodCompleted)],
      ['Change vs previous period', data.trips.changePercent === null ? 'N/A' : `${data.trips.changePercent}%`],
      ['Average trip duration', data.trips.averageDurationHours === null ? 'N/A' : `${data.trips.averageDurationHours} hours`],
      ['On-time delivery rate', data.trips.onTimeRate === null ? 'N/A' : `${data.trips.onTimeRate}%`],
    ],
    styles: { fontSize: 8, cellPadding: 6, textColor: light },
    headStyles: { fillColor: panel, textColor: orange, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [22, 30, 46] },
    theme: 'grid',
  })

  // ── Earnings summary table ───────────────────────────────────────────────
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 20
  doc.setTextColor(...orange)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Earnings Summary', margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Metric', 'Amount']],
    body: [
      ['Gross booking value (completed trips)', `₹${data.earnings.grossBookingValue.toLocaleString('en-IN')}`],
      [`Earnings in last ${data.rangeDays} days`, `₹${data.earnings.periodEarnings.toLocaleString('en-IN')}`],
      ['Average earnings per trip', `₹${data.earnings.averageTripEarnings.toLocaleString('en-IN')}`],
      ['Advance collected (50%)', `₹${data.earnings.advanceCollected.toLocaleString('en-IN')}`],
      ['Balance collected (50%)', `₹${data.earnings.balanceCollected.toLocaleString('en-IN')}`],
      ['Platform revenue (successful payments)', `₹${data.earnings.platformRevenue.toLocaleString('en-IN')}`],
      ['  ·  Subscription revenue', `₹${data.earnings.subscriptionRevenue.toLocaleString('en-IN')}`],
      ['  ·  Booking payments', `₹${data.earnings.bookingPaymentRevenue.toLocaleString('en-IN')}`],
    ],
    styles: { fontSize: 8, cellPadding: 6, textColor: light },
    headStyles: { fillColor: panel, textColor: emerald, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [22, 30, 46] },
    theme: 'grid',
  })

  // ── Active bookings table ────────────────────────────────────────────────
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 20
  doc.setTextColor(...orange)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Active Bookings Pipeline', margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Status', 'Count']],
    body: [
      ['Active (Pending + Confirmed + In transit)', String(data.bookings.active)],
      ['Pending', String(data.bookings.pending)],
      ['Confirmed', String(data.bookings.confirmed)],
      ['In transit', String(data.bookings.inTransit)],
      ['Completed', String(data.bookings.completed)],
      ['Cancelled', String(data.bookings.cancelled)],
      ['Completion rate', `${data.bookings.completionRate}%`],
    ],
    styles: { fontSize: 8, cellPadding: 6, textColor: light },
    headStyles: { fillColor: panel, textColor: orange, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [22, 30, 46] },
    theme: 'grid',
  })

  // ── Monthly trend table ──────────────────────────────────────────────────
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 20
  doc.setTextColor(...orange)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Monthly Trip Trend', margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Month', 'Completed trips', 'Earnings']],
    body: data.trips.completedByMonth.map(point => [
      point.label,
      String(point.trips),
      `₹${point.earnings.toLocaleString('en-IN')}`,
    ]),
    styles: { fontSize: 8, cellPadding: 6, textColor: light },
    headStyles: { fillColor: panel, textColor: orange, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [22, 30, 46] },
    theme: 'grid',
  })

  // ── Route efficiency heatmap table ───────────────────────────────────────
  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
  y += 20
  doc.setTextColor(...orange)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Route Efficiency Heatmap', margin, y)
  y += 8

  const monthLabels = data.routes.heatmap[0]?.months.map(month => month.label) ?? []
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Route', 'Trips', 'Efficiency', 'Avg (hrs)', 'On-time', ...monthLabels]],
    body: data.routes.heatmap.map(row => [
      row.route,
      String(row.trips),
      `${row.efficiencyScore}% (${row.efficiencyLabel})`,
      row.averageDurationHours === null ? '—' : String(row.averageDurationHours),
      row.onTimeRate === null ? '—' : `${row.onTimeRate}%`,
      ...row.months.map(month => String(month.trips)),
    ]),
    styles: { fontSize: 7.5, cellPadding: 5, textColor: light },
    headStyles: { fillColor: panel, textColor: orange, fontSize: 7.5, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [22, 30, 46] },
    theme: 'grid',
  })

  // ── Footer on every page ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...muted)
    doc.text(
      `LorryCarry Dashboard Analytics · ${new Date(data.generatedAt).toLocaleString('en-IN')} · Page ${page} of ${pageCount}`,
      margin,
      doc.internal.pageSize.getHeight() - 18,
    )
  }

  doc.save(analyticsFilename('dashboard-analytics', 'pdf'))
}
