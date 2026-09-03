/**
 * Dashboard analytics contracts shared by the admin analytics page and its
 * CSV / PDF export utilities. The shape mirrors `GET /admin/analytics` from
 * the NestJS admin module.
 */

export interface AnalyticsMonthPoint {
  key: string
  label: string
  trips: number
  earnings: number
}

export interface AnalyticsHeatmapMonth {
  key: string
  label: string
  trips: number
}

export interface AnalyticsRouteRow {
  route: string
  origin: string
  destination: string
  trips: number
  efficiencyScore: number
  efficiencyLabel: string
  averageDurationHours: number | null
  onTimeRate: number | null
  lastCompletedAt: string | null
}

export interface AnalyticsHeatmapRow extends AnalyticsRouteRow {
  months: AnalyticsHeatmapMonth[]
}

export interface AnalyticsPayload {
  generatedAt: string
  rangeDays: number
  trips: {
    totalCompleted: number
    periodCompleted: number
    previousPeriodCompleted: number
    changePercent: number | null
    averageDurationHours: number | null
    onTimeRate: number | null
    onTimeTrips: number
    trackedTrips: number
    completedByMonth: AnalyticsMonthPoint[]
  }
  earnings: {
    grossBookingValue: number
    periodEarnings: number
    averageTripEarnings: number
    advanceCollected: number
    balanceCollected: number
    platformRevenue: number
    subscriptionRevenue: number
    bookingPaymentRevenue: number
  }
  bookings: {
    active: number
    pending: number
    confirmed: number
    inTransit: number
    completed: number
    cancelled: number
    completionRate: number
    byStatus: Array<{ status: string; count: number }>
  }
  routes: {
    averageEfficiency: number
    totalRoutes: number
    topRoutes: AnalyticsRouteRow[]
    heatmap: AnalyticsHeatmapRow[]
  }
}

/** Tailwind-friendly tone classes for an efficiency score. */
export function efficiencyTone(score: number): {
  text: string
  bg: string
  border: string
  bar: string
  label: string
} {
  if (score >= 85) {
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', bar: 'bg-emerald-500', label: 'Excellent' }
  }
  if (score >= 70) {
    return { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/25', bar: 'bg-teal-500', label: 'Good' }
  }
  if (score >= 50) {
    return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', bar: 'bg-amber-500', label: 'Moderate' }
  }
  return { text: 'text-danger-400', bg: 'bg-danger-500/10', border: 'border-danger-500/25', bar: 'bg-danger-500', label: 'Poor' }
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function toRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(',')
}

/**
 * Build the dashboard analytics export as a CSV document.
 * Each logical section (trips, earnings, booking pipeline, monthly trend,
 * route efficiency) is written as its own block with a section header so the
 * file stays readable in Excel and never mixes column semantics.
 */
export function buildAnalyticsCsv(data: AnalyticsPayload): string {
  const lines: string[] = []

  lines.push(toRow(['LorryCarry — Dashboard Analytics']))
  lines.push(toRow(['Generated at', new Date(data.generatedAt).toLocaleString('en-IN')]))
  lines.push(toRow(['Range', `${data.rangeDays} days`]))
  lines.push('')

  lines.push('"TRIP SUMMARY"')
  lines.push(toRow(['Metric', 'Value']))
  lines.push(toRow(['Total trips completed', data.trips.totalCompleted]))
  lines.push(toRow(['Completed in period', data.trips.periodCompleted]))
  lines.push(toRow(['Completed previous period', data.trips.previousPeriodCompleted]))
  lines.push(toRow(['Change vs previous period (%)', data.trips.changePercent ?? 'N/A']))
  lines.push(toRow(['Average duration (hours)', data.trips.averageDurationHours ?? 'N/A']))
  lines.push(toRow(['On-time delivery rate (%)', data.trips.onTimeRate ?? 'N/A']))
  lines.push('')

  lines.push('"EARNINGS SUMMARY"')
  lines.push(toRow(['Metric', 'Value (INR)']))
  lines.push(toRow(['Gross booking value (completed trips)', data.earnings.grossBookingValue]))
  lines.push(toRow(['Earnings in period', data.earnings.periodEarnings]))
  lines.push(toRow(['Average earnings per trip', data.earnings.averageTripEarnings]))
  lines.push(toRow(['Advance collected (50%)', data.earnings.advanceCollected]))
  lines.push(toRow(['Balance collected (50%)', data.earnings.balanceCollected]))
  lines.push(toRow(['Platform revenue (successful payments)', data.earnings.platformRevenue]))
  lines.push(toRow(['Subscription revenue', data.earnings.subscriptionRevenue]))
  lines.push(toRow(['Booking payment revenue', data.earnings.bookingPaymentRevenue]))
  lines.push('')

  lines.push('"ACTIVE BOOKINGS"')
  lines.push(toRow(['Metric', 'Value']))
  lines.push(toRow(['Active bookings', data.bookings.active]))
  lines.push(toRow(['Pending', data.bookings.pending]))
  lines.push(toRow(['Confirmed', data.bookings.confirmed]))
  lines.push(toRow(['In transit', data.bookings.inTransit]))
  lines.push(toRow(['Completed', data.bookings.completed]))
  lines.push(toRow(['Cancelled', data.bookings.cancelled]))
  lines.push(toRow(['Completion rate (%)', data.bookings.completionRate]))
  lines.push('')

  lines.push('"MONTHLY TREND"')
  lines.push(toRow(['Month', 'Completed trips', 'Earnings (INR)']))
  for (const point of data.trips.completedByMonth) {
    lines.push(toRow([point.label, point.trips, point.earnings]))
  }
  lines.push('')

  lines.push('"ROUTE EFFICIENCY HEATMAP"')
  const monthHeaders = data.routes.heatmap[0]?.months.map(m => m.label) ?? []
  lines.push(toRow([
    'Route', 'Origin', 'Destination', 'Trips', 'Efficiency score',
    'Efficiency', 'Avg duration (hours)', 'On-time rate (%)', 'Last completed',
    ...monthHeaders,
  ]))
  for (const row of data.routes.heatmap) {
    lines.push(toRow([
      row.route,
      row.origin,
      row.destination,
      row.trips,
      row.efficiencyScore,
      row.efficiencyLabel,
      row.averageDurationHours ?? 'N/A',
      row.onTimeRate ?? 'N/A',
      row.lastCompletedAt ? new Date(row.lastCompletedAt).toISOString() : 'N/A',
      ...row.months.map(m => m.trips),
    ]))
  }

  lines.push('')
  lines.push('"ROUTE EFFICIENCY RANKING"')
  lines.push(toRow(['Rank', 'Route', 'Trips', 'Efficiency score', 'Efficiency']))
  data.routes.topRoutes.forEach((row, index) => {
    lines.push(toRow([index + 1, row.route, row.trips, row.efficiencyScore, row.efficiencyLabel]))
  })

  return lines.join('\r\n')
}

export function analyticsFilename(prefix: string, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `lorrycarry-${prefix}-${stamp}.${extension}`
}
