import {
  assessShipmentIntelligence,
  summarizeActiveShipmentsControlTower,
  BookingData,
} from './shipmentIntelligence'

describe('Web Shipment Intelligence Bridge & Rules', () => {
  const baseBooking: BookingData = {
    id: 'booking-web-1',
    loadId: 'load-web-1',
    truckId: 'truck-web-1',
    agreedPrice: 50000,
    advanceConfirmed: true,
    advanceConfirmedAt: '2026-09-04T06:00:00Z',
    balanceConfirmed: false,
    balanceConfirmedAt: null,
    ewayBillNumber: 'EWAY-123456789',
    liabilityAccepted: true,
    status: 'InTransit',
    createdAt: '2026-09-04T05:00:00Z',
    checkpoints: [],
  }

  const nowRef = new Date('2026-09-04T12:00:00Z')

  describe('All 6 Required Risk Conditions', () => {
    it('1. ACTION REQUIRED: advance pending after booking confirmed / in transit', () => {
      const booking: BookingData = {
        ...baseBooking,
        advanceConfirmed: false,
        status: 'InTransit',
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('ACTION REQUIRED')
      expect(assessment.badgeVariant).toBe('danger')
      expect(assessment.whyReason).toBe('50% advance confirmation pending')
      expect(assessment.riskSummary).toContain('50% loading advance confirmation pending')
    })

    it('2. ACTION REQUIRED: completed but balance not confirmed', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'Completed',
        balanceConfirmed: false,
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('ACTION REQUIRED')
      expect(assessment.badgeVariant).toBe('danger')
      expect(assessment.whyReason).toBe('Completed but balance not confirmed')
      expect(assessment.riskSummary).toContain('POD delivery balance not confirmed')
    })

    it('3. DELAYED: InTransit and latest checkpoint crossedAt older than 6 hours', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        advanceConfirmed: true,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Mumbai Toll', lat: 19.0, lng: 72.8, crossedAt: '2026-09-04T04:00:00Z' }, // 8 hours ago
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('DELAYED')
      expect(assessment.badgeVariant).toBe('danger')
      expect(assessment.whyReason).toBe('InTransit and latest checkpoint crossedAt older than 6 hours')
      expect(assessment.riskSummary).toContain('checkpoint update for over 6 hours')
    })

    it('4. DELAYED: expected delivery time passed and booking not completed', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        advanceConfirmed: true,
        expectedDeliveryAt: '2026-09-04T10:00:00Z', // 2 hours overdue relative to 12:00
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Toll 1', lat: 12, lng: 77, crossedAt: '2026-09-04T11:00:00Z' },
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('DELAYED')
      expect(assessment.badgeVariant).toBe('danger')
      expect(assessment.whyReason).toBe('Expected delivery time passed and booking not completed')
      expect(assessment.riskSummary).toContain('Expected delivery schedule has passed')
    })

    it('5. ATTENTION REQUIRED: WhatsApp trigger failed', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        advanceConfirmed: true,
        whatsappTriggerStatus: 'Failed',
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Toll 1', lat: 12, lng: 77, crossedAt: '2026-09-04T11:00:00Z' },
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
      expect(assessment.badgeVariant).toBe('warning')
      expect(assessment.whyReason).toBe('WhatsApp trigger failed')
      expect(assessment.riskSummary).toContain('WhatsApp trigger failed')
    })

    it('6. ATTENTION REQUIRED: E-Way Bill missing', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        advanceConfirmed: true,
        ewayBillNumber: null,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Toll 1', lat: 12, lng: 77, crossedAt: '2026-09-04T11:00:00Z' },
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
      expect(assessment.badgeVariant).toBe('warning')
      expect(assessment.whyReason).toBe('E-Way Bill missing')
      expect(assessment.riskSummary).toContain('E-Way Bill documentation missing')
    })

    it('7. COMPLETED: all milestones completed and balance confirmed', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'Completed',
        balanceConfirmed: true,
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('COMPLETED')
      expect(assessment.badgeVariant).toBe('success')
      expect(assessment.whyReason).toBe('All highway checkpoints crossed & POD verified')
    })

    it('8. ON TRACK: normal progression within time limit', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        advanceConfirmed: true,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Toll 1', lat: 12, lng: 77, crossedAt: '2026-09-04T11:00:00Z' }, // 1 hour ago
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('ON TRACK')
      expect(assessment.badgeVariant).toBe('success')
    })

    it('9. Boundary: exactly 6 hours since last checkpoint is NOT delayed', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Toll 1', lat: 12, lng: 77, crossedAt: '2026-09-04T06:00:00Z' }, // exactly 6h
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('ON TRACK')
      expect(assessment.lastCheckpointAgeHours).toBe(6)
    })

    it('10. ATTENTION REQUIRED: E-Way Bill expired (validity lapsed) via shared bridge', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        ewayBillValidUpto: '2026-09-04T08:00:00Z', // 4 hours before nowRef
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Toll 1', lat: 12, lng: 77, crossedAt: '2026-09-04T11:00:00Z' },
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
      expect(assessment.badgeVariant).toBe('warning')
      expect(assessment.whyReason).toBe('E-Way Bill expired')
      expect(assessment.riskSummary).toContain('E-Way Bill validity has expired')
      expect(assessment.isEwayBillExpired).toBe(true)
    })

    it('exposes delay magnitudes for the control-tower UI (stale hours / overdue hours)', () => {
      const staleBooking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Toll 1', lat: 12, lng: 77, crossedAt: '2026-09-04T03:30:00Z' }, // 8.5h ago
        ],
      }
      const stale = assessShipmentIntelligence(staleBooking, { now: nowRef })
      expect(stale.statusTier).toBe('DELAYED')
      expect(stale.lastCheckpointAgeHours).toBe(8.5)
      expect(stale.deliveryOverdueHours).toBeNull()

      const overdueBooking: BookingData = {
        ...baseBooking,
        status: 'InTransit',
        expectedDeliveryAt: '2026-09-04T09:00:00Z', // 3h overdue
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Toll 1', lat: 12, lng: 77, crossedAt: '2026-09-04T11:00:00Z' },
        ],
      }
      const overdue = assessShipmentIntelligence(overdueBooking, { now: nowRef })
      expect(overdue.statusTier).toBe('DELAYED')
      expect(overdue.deliveryOverdueHours).toBe(3)
    })
  })

  describe('summarizeActiveShipmentsControlTower', () => {
    it('aggregates all risk categories accurately', () => {
      const summary = summarizeActiveShipmentsControlTower([
        { ...baseBooking, id: 'b1', status: 'Completed', balanceConfirmed: true },
        { ...baseBooking, id: 'b2', status: 'InTransit', advanceConfirmed: false },
        { ...baseBooking, id: 'b3', status: 'InTransit', checkpoints: [{ id: 'c1', seq: 1, name: 'CP', lat: 0, lng: 0, crossedAt: '2026-09-04T02:00:00Z' }] },
        { ...baseBooking, id: 'b4', status: 'InTransit', ewayBillNumber: null, checkpoints: [{ id: 'c1', seq: 1, name: 'CP', lat: 0, lng: 0, crossedAt: '2026-09-04T11:00:00Z' }] },
        { ...baseBooking, id: 'b5', status: 'InTransit', checkpoints: [{ id: 'c1', seq: 1, name: 'CP', lat: 0, lng: 0, crossedAt: '2026-09-04T11:00:00Z' }] },
      ], { now: nowRef })

      expect(summary.totalActive).toBe(5)
      expect(summary.completedCount).toBe(1)
      expect(summary.actionRequiredCount).toBe(1)
      expect(summary.delayedCount).toBe(1)
      expect(summary.attentionRequiredCount).toBe(1)
      expect(summary.onTrackCount).toBe(1)
      expect(summary.highPriorityActions).toHaveLength(3)
    })
  })
})
