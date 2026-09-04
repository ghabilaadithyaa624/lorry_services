import { buildAnalyticsCsv, efficiencyTone, analyticsFilename, type AnalyticsPayload } from './analytics'

function samplePayload(overrides: Partial<AnalyticsPayload> = {}): AnalyticsPayload {
  return {
    generatedAt: '2026-09-03T10:00:00.000Z',
    rangeDays: 30,
    trips: {
      totalCompleted: 12,
      periodCompleted: 5,
      previousPeriodCompleted: 3,
      changePercent: 66.7,
      averageDurationHours: 25,
      onTimeRate: 80,
      onTimeTrips: 4,
      trackedTrips: 5,
      completedByMonth: [
        { key: '2026-04', label: 'Apr 26', trips: 1, earnings: 12000 },
        { key: '2026-05', label: 'May 26', trips: 2, earnings: 24000 },
        { key: '2026-06', label: 'Jun 26', trips: 0, earnings: 0 },
        { key: '2026-07', label: 'Jul 26', trips: 4, earnings: 48000 },
        { key: '2026-08', label: 'Aug 26', trips: 3, earnings: 36000 },
        { key: '2026-09', label: 'Sep 26', trips: 2, earnings: 20000 },
      ],
    },
    earnings: {
      grossBookingValue: 140000,
      periodEarnings: 50000,
      averageTripEarnings: 11666.7,
      advanceCollected: 70000,
      balanceCollected: 65000,
      platformRevenue: 25000,
      subscriptionRevenue: 20000,
      bookingPaymentRevenue: 5000,
    },
    bookings: {
      active: 9,
      pending: 4,
      confirmed: 3,
      inTransit: 2,
      completed: 12,
      cancelled: 1,
      completionRate: 92.3,
      byStatus: [
        { status: 'Completed', count: 12 },
        { status: 'Pending', count: 4 },
      ],
    },
    routes: {
      averageEfficiency: 88,
      totalRoutes: 2,
      topRoutes: [
        {
          route: 'Pune → Mumbai',
          origin: 'Pune',
          destination: 'Mumbai',
          trips: 4,
          efficiencyScore: 95,
          efficiencyLabel: 'Excellent',
          averageDurationHours: 12,
          onTimeRate: 100,
          lastCompletedAt: '2026-09-01T08:00:00.000Z',
        },
      ],
      heatmap: [
        {
          route: 'Pune → Mumbai',
          origin: 'Pune',
          destination: 'Mumbai',
          trips: 4,
          efficiencyScore: 95,
          efficiencyLabel: 'Excellent',
          averageDurationHours: 12,
          onTimeRate: 100,
          lastCompletedAt: '2026-09-01T08:00:00.000Z',
          months: [
            { key: '2026-04', label: 'Apr 26', trips: 0 },
            { key: '2026-05', label: 'May 26', trips: 1 },
            { key: '2026-06', label: 'Jun 26', trips: 1 },
            { key: '2026-07', label: 'Jul 26', trips: 0 },
            { key: '2026-08', label: 'Aug 26', trips: 1 },
            { key: '2026-09', label: 'Sep 26', trips: 1 },
          ],
        },
        {
          route: 'Delhi → Jaipur',
          origin: 'Delhi',
          destination: 'Jaipur',
          trips: 2,
          efficiencyScore: 71,
          efficiencyLabel: 'Good',
          averageDurationHours: 9,
          onTimeRate: 50,
          lastCompletedAt: '2026-08-21T08:00:00.000Z',
          months: [
            { key: '2026-04', label: 'Apr 26', trips: 0 },
            { key: '2026-05', label: 'May 26', trips: 0 },
            { key: '2026-06', label: 'Jun 26', trips: 0 },
            { key: '2026-07', label: 'Jul 26', trips: 0 },
            { key: '2026-08', label: 'Aug 26', trips: 2 },
            { key: '2026-09', label: 'Sep 26', trips: 0 },
          ],
        },
      ],
    },
    ...overrides,
  }
}

describe('buildAnalyticsCsv', () => {
  it('should include summary, trend and route sections', () => {
    const csv = buildAnalyticsCsv(samplePayload())

    expect(csv).toContain('"TRIP SUMMARY"')
    expect(csv).toContain('"EARNINGS SUMMARY"')
    expect(csv).toContain('"ACTIVE BOOKINGS"')
    expect(csv).toContain('"MONTHLY TREND"')
    expect(csv).toContain('"ROUTE EFFICIENCY HEATMAP"')
    expect(csv).toContain('"ROUTE EFFICIENCY RANKING"')
  })

  it('should quote cells and escape embedded quotes', () => {
    const csv = buildAnalyticsCsv(samplePayload({
      routes: {
        ...samplePayload().routes,
        heatmap: samplePayload().routes.heatmap.map(row => ({ ...row, route: 'Pune "city" → Mumbai' })),
      },
    }))

    expect(csv).toContain('"Pune ""city"" → Mumbai"')
  })

  it('should align route heatmap month columns with trip counts', () => {
    const csv = buildAnalyticsCsv(samplePayload())
    const lines = csv.split('\r\n')
    const headerLine = lines.find(line => line.startsWith('"Route","Origin"'))
    expect(headerLine).toContain('"Apr 26"')
    expect(headerLine).toContain('"Sep 26"')
  })

  it('should use CRLF line endings for spreadsheet compatibility', () => {
    const csv = buildAnalyticsCsv(samplePayload())
    expect(csv).toContain('\r\n')
    expect(csv).not.toMatch(/(^|[^\r])\n/)
  })
})

describe('efficiencyTone', () => {
  it('should map scores to the expected tone buckets', () => {
    expect(efficiencyTone(90).label).toBe('Excellent')
    expect(efficiencyTone(85).label).toBe('Excellent')
    expect(efficiencyTone(72).label).toBe('Good')
    expect(efficiencyTone(55).label).toBe('Moderate')
    expect(efficiencyTone(30).label).toBe('Poor')
  })
})

describe('analyticsFilename', () => {
  it('should produce a dated filename with the right extension', () => {
    expect(analyticsFilename('dashboard-analytics', 'csv')).toMatch(/^lorrycarry-dashboard-analytics-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(analyticsFilename('dashboard-analytics', 'pdf')).toMatch(/^lorrycarry-dashboard-analytics-\d{4}-\d{2}-\d{2}\.pdf$/)
  })
})
