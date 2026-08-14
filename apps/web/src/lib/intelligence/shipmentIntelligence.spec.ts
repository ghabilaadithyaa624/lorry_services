import {
  assessShipmentIntelligence,
  summarizeActiveShipmentsControlTower,
  BookingData,
} from './shipmentIntelligence'

describe('Shipment & Transit Intelligence Unit Tests', () => {
  const baseBooking: BookingData = {
    id: 'booking-123',
    loadId: 'load-abc',
    truckId: 'truck-xyz',
    agreedPrice: 60000,
    advanceConfirmed: true,
    advanceConfirmedAt: '2025-02-19T10:00:00Z',
    balanceConfirmed: false,
    balanceConfirmedAt: null,
    ewayBillNumber: 'EWAY-999888777',
    liabilityAccepted: true,
    status: 'InTransit',
    createdAt: '2025-02-19T08:00:00Z',
    checkpoints: [],
  }

  describe('assessShipmentIntelligence', () => {
    it('should respect minimum of 5 totalCheckpoints when checkpoints list is empty or small', () => {
      const booking: BookingData = {
        ...baseBooking,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Delhi Gate', lat: 28.6, lng: 77.2, crossedAt: null },
        ],
      }
      const assessment = assessShipmentIntelligence(booking)
      expect(assessment.totalCheckpoints).toBe(5)
    })

    it('should use checkpoints length if there are more than 5 checkpoints', () => {
      const booking: BookingData = {
        ...baseBooking,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: 'crossed' },
          { id: 'cp-2', seq: 2, name: 'CP 2', lat: 11, lng: 11, crossedAt: null },
          { id: 'cp-3', seq: 3, name: 'CP 3', lat: 12, lng: 12, crossedAt: null },
          { id: 'cp-4', seq: 4, name: 'CP 4', lat: 13, lng: 13, crossedAt: null },
          { id: 'cp-5', seq: 5, name: 'CP 5', lat: 14, lng: 14, crossedAt: null },
          { id: 'cp-6', seq: 6, name: 'CP 6', lat: 15, lng: 15, crossedAt: null },
        ],
      }
      const assessment = assessShipmentIntelligence(booking)
      expect(assessment.totalCheckpoints).toBe(6)
    })

    it('should force progressPercent to 100% when booking status is Completed', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'Completed',
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: null },
        ],
      }
      const assessment = assessShipmentIntelligence(booking)
      expect(assessment.progressPercent).toBe(100)
    })

    it('should calculate progressPercent correctly for non-completed bookings', () => {
      const booking: BookingData = {
        ...baseBooking,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2025-02-19T11:00:00Z' },
          { id: 'cp-2', seq: 2, name: 'CP 2', lat: 11, lng: 11, crossedAt: null },
          { id: 'cp-3', seq: 3, name: 'CP 3', lat: 12, lng: 12, crossedAt: null },
          { id: 'cp-4', seq: 4, name: 'CP 4', lat: 13, lng: 13, crossedAt: null },
          { id: 'cp-5', seq: 5, name: 'CP 5', lat: 14, lng: 14, crossedAt: null },
        ],
      }
      const assessment = assessShipmentIntelligence(booking) // 1/5 crossed
      expect(assessment.progressPercent).toBe(20)
    })

    it('should calculate 50% advanceAmount and balanceAmount properly from agreedPrice', () => {
      const booking: BookingData = {
        ...baseBooking,
        agreedPrice: 75000,
      }
      const assessment = assessShipmentIntelligence(booking)
      expect(assessment.commercialState.advanceAmount).toBe(37500)
      expect(assessment.commercialState.balanceAmount).toBe(37500)
    })

    describe('Required Actions Rules', () => {
      it('should add CONFIRM_ADVANCE action when booking.advanceConfirmed is false and status is not Cancelled', () => {
        const booking: BookingData = {
          ...baseBooking,
          advanceConfirmed: false,
          status: 'InTransit',
        }
        const assessment = assessShipmentIntelligence(booking)
        const advanceAction = assessment.requiredActions.find(a => a.actionType === 'CONFIRM_ADVANCE')
        expect(advanceAction).toBeDefined()
        expect(advanceAction?.urgency).toBe('HIGH')
        expect(advanceAction?.title).toContain('50% Loading Advance Confirmation Pending')
      })

      it('should NOT add CONFIRM_ADVANCE action when booking is Cancelled', () => {
        const booking: BookingData = {
          ...baseBooking,
          advanceConfirmed: false,
          status: 'Cancelled',
        }
        const assessment = assessShipmentIntelligence(booking)
        const advanceAction = assessment.requiredActions.find(a => a.actionType === 'CONFIRM_ADVANCE')
        expect(advanceAction).toBeUndefined()
      })

      it('should add EWAY_BILL action when ewayBillNumber is missing and status is not Cancelled or Completed', () => {
        const booking: BookingData = {
          ...baseBooking,
          ewayBillNumber: null,
          status: 'InTransit',
        }
        const assessment = assessShipmentIntelligence(booking)
        const ewayAction = assessment.requiredActions.find(a => a.actionType === 'EWAY_BILL')
        expect(ewayAction).toBeDefined()
        expect(ewayAction?.urgency).toBe('MEDIUM')
      })

      it('should NOT add EWAY_BILL action when status is Cancelled or Completed', () => {
        const bookingCompleted: BookingData = {
          ...baseBooking,
          ewayBillNumber: null,
          status: 'Completed',
        }
        const assessmentCompleted = assessShipmentIntelligence(bookingCompleted)
        expect(assessmentCompleted.requiredActions.find(a => a.actionType === 'EWAY_BILL')).toBeUndefined()

        const bookingCancelled: BookingData = {
          ...baseBooking,
          ewayBillNumber: null,
          status: 'Cancelled',
        }
        const assessmentCancelled = assessShipmentIntelligence(bookingCancelled)
        expect(assessmentCancelled.requiredActions.find(a => a.actionType === 'EWAY_BILL')).toBeUndefined()
      })

      it('should add CONFIRM_BALANCE action when status is Completed and balanceConfirmed is false', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Completed',
          balanceConfirmed: false,
        }
        const assessment = assessShipmentIntelligence(booking)
        const balanceAction = assessment.requiredActions.find(a => a.actionType === 'CONFIRM_BALANCE')
        expect(balanceAction).toBeDefined()
        expect(balanceAction?.urgency).toBe('HIGH')
      })

      it('should NOT add CONFIRM_BALANCE action when status is Completed but balanceConfirmed is true', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Completed',
          balanceConfirmed: true,
        }
        const assessment = assessShipmentIntelligence(booking)
        expect(assessment.requiredActions.find(a => a.actionType === 'CONFIRM_BALANCE')).toBeUndefined()
      })
    })

    describe('Milestone Tracking', () => {
      it('should default to Origin Loading Point and first checkpoint name when no checkpoints crossed', () => {
        const booking: BookingData = {
          ...baseBooking,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'Ambala Toll Plaza', lat: 30, lng: 76, crossedAt: null },
          ],
        }
        const assessment = assessShipmentIntelligence(booking)
        expect(assessment.currentLocationName).toBe('Origin Loading Point')
        expect(assessment.nextMilestoneName).toBe('Ambala Toll Plaza')
      })

      it('should show last crossed checkpoint and next milestone name when checkpoints are partially crossed', () => {
        const booking: BookingData = {
          ...baseBooking,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'Ambala Toll Plaza', lat: 30, lng: 76, crossedAt: 'crossed-timestamp' },
            { id: 'cp-2', seq: 2, name: 'Ludhiana Bypass', lat: 31, lng: 75, crossedAt: null },
          ],
        }
        const assessment = assessShipmentIntelligence(booking)
        expect(assessment.currentLocationName).toBe('Ambala Toll Plaza')
        expect(assessment.nextMilestoneName).toBe('Ludhiana Bypass')
      })

      it('should show last crossed checkpoint and Destination Terminal when all checkpoints crossed', () => {
        const booking: BookingData = {
          ...baseBooking,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'Ambala Toll Plaza', lat: 30, lng: 76, crossedAt: 'crossed-timestamp' },
            { id: 'cp-2', seq: 2, name: 'Ludhiana Bypass', lat: 31, lng: 75, crossedAt: 'crossed-timestamp' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking)
        expect(assessment.currentLocationName).toBe('Ludhiana Bypass')
        expect(assessment.nextMilestoneName).toBe('Destination Terminal')
      })
    })

    describe('Risk Status Tiers & Badge Variants', () => {
      it('should classify as COMPLETED when status is Completed', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Completed',
        }
        const assessment = assessShipmentIntelligence(booking)
        expect(assessment.statusTier).toBe('COMPLETED')
        expect(assessment.badgeVariant).toBe('success')
        expect(assessment.whyReason).toBe('All highway checkpoints crossed & POD verified')
      })

      it('should classify as ACTION REQUIRED when advance is not confirmed and status is InTransit or Confirmed', () => {
        const bookingInTransit: BookingData = {
          ...baseBooking,
          advanceConfirmed: false,
          status: 'InTransit',
        }
        const assessmentInTransit = assessShipmentIntelligence(bookingInTransit)
        expect(assessmentInTransit.statusTier).toBe('ACTION REQUIRED')
        expect(assessmentInTransit.badgeVariant).toBe('danger')
        expect(assessmentInTransit.whyReason).toBe('50% advance confirmation pending')

        const bookingConfirmed: BookingData = {
          ...baseBooking,
          advanceConfirmed: false,
          status: 'Confirmed',
        }
        const assessmentConfirmed = assessShipmentIntelligence(bookingConfirmed)
        expect(assessmentConfirmed.statusTier).toBe('ACTION REQUIRED')
        expect(assessmentConfirmed.badgeVariant).toBe('danger')
        expect(assessmentConfirmed.whyReason).toBe('50% advance confirmation pending')
      })

      it('should classify as ATTENTION REQUIRED when ewayBillNumber is missing (and not advance pending/completed)', () => {
        const booking: BookingData = {
          ...baseBooking,
          ewayBillNumber: null,
          status: 'InTransit',
        }
        const assessment = assessShipmentIntelligence(booking)
        expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
        expect(assessment.badgeVariant).toBe('warning')
        expect(assessment.whyReason).toBe('E-Way Bill missing')
      })

      it('should classify as LOW RISK when booking status is Confirmed and crossedCount is 0', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Confirmed',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: null },
          ],
        }
        const assessment = assessShipmentIntelligence(booking)
        expect(assessment.statusTier).toBe('LOW RISK')
        expect(assessment.badgeVariant).toBe('info')
        expect(assessment.whyReason).toBe('Booking confirmed, awaiting initial checkpoint check-in')
      })

      it('should default to ON TRACK when booking is on schedule', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: 'crossed-timestamp' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking)
        expect(assessment.statusTier).toBe('ON TRACK')
        expect(assessment.badgeVariant).toBe('success')
        expect(assessment.whyReason).toBe('Vehicle progressing through checkpoints')
      })
    })
  })

  describe('summarizeActiveShipmentsControlTower', () => {
    it('performance benchmark of summarizeActiveShipmentsControlTower', () => {
      // Create many mock bookings to run repeatedly
      const bookings: BookingData[] = []
      for (let i = 0; i < 2000; i++) {
        bookings.push({
          ...baseBooking,
          id: `bk-${i}`,
          status: i % 4 === 0 ? 'Completed' : 'InTransit',
          advanceConfirmed: i % 3 !== 0,
          ewayBillNumber: i % 5 === 0 ? null : 'EWAY-12345',
          checkpoints: [
            { id: `cp-${i}-1`, seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: i % 2 === 0 ? 'crossed' : null },
            { id: `cp-${i}-2`, seq: 2, name: 'CP 2', lat: 11, lng: 11, crossedAt: null },
            { id: `cp-${i}-3`, seq: 3, name: 'CP 3', lat: 12, lng: 12, crossedAt: null },
          ],
        })
      }

      const start = performance.now()
      // Call summarizeActiveShipmentsControlTower 20 times (or more)
      for (let run = 0; run < 20; run++) {
        summarizeActiveShipmentsControlTower(bookings)
      }
      const end = performance.now()
      console.log(`[BENCHMARK] Elapsed time: ${(end - start).toFixed(2)} ms`)
    })

    it('should correctly sum and classify bookings into status tier buckets', () => {
      const bookingCompleted: BookingData = {
        ...baseBooking,
        id: 'bk-completed',
        status: 'Completed',
      }
      const bookingActionRequired: BookingData = {
        ...baseBooking,
        id: 'bk-action',
        advanceConfirmed: false,
        status: 'InTransit',
        load: {
          loadingAddress: 'Mumbai Hub',
          unloadingAddress: 'Delhi Depot',
        },
      }
      const bookingAttentionRequired: BookingData = {
        ...baseBooking,
        id: 'bk-attention',
        ewayBillNumber: null,
        status: 'InTransit',
      }
      const bookingOnTrack: BookingData = {
        ...baseBooking,
        id: 'bk-ontrack',
        status: 'InTransit',
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: 'crossed' },
        ],
      }
      const bookingLowRisk: BookingData = {
        ...baseBooking,
        id: 'bk-lowrisk',
        status: 'Confirmed',
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: null },
        ],
      }

      const summary = summarizeActiveShipmentsControlTower([
        bookingCompleted,
        bookingActionRequired,
        bookingAttentionRequired,
        bookingOnTrack,
        bookingLowRisk,
      ])

      expect(summary.totalActive).toBe(5)
      expect(summary.completedCount).toBe(1)
      expect(summary.actionRequiredCount).toBe(1)
      expect(summary.attentionRequiredCount).toBe(1)
      expect(summary.onTrackCount).toBe(1)
      expect(summary.lowRiskCount).toBe(1)
      expect(summary.delayedCount).toBe(0)

      // Test high priority actions listing
      expect(summary.highPriorityActions).toHaveLength(2)

      // Check action-required detail
      const actionItem = summary.highPriorityActions.find(item => item.bookingId === 'bk-action')
      expect(actionItem).toBeDefined()
      expect(actionItem?.loadRoute).toBe('Mumbai Hub ➔ Delhi Depot')
      expect(actionItem?.statusTier).toBe('ACTION REQUIRED')
      expect(actionItem?.whyReason).toBe('50% advance confirmation pending')

      // Check attention-required detail with fallback loadRoute
      const attentionItem = summary.highPriorityActions.find(item => item.bookingId === 'bk-attention')
      expect(attentionItem).toBeDefined()
      expect(attentionItem?.loadRoute).toBe('Origin ➔ Destination')
      expect(attentionItem?.statusTier).toBe('ATTENTION REQUIRED')
      expect(attentionItem?.whyReason).toBe('E-Way Bill missing')
    })

    it('should handle an empty list of bookings gracefully', () => {
      const summary = summarizeActiveShipmentsControlTower([])
      expect(summary).toEqual({
        totalActive: 0,
        actionRequiredCount: 0,
        attentionRequiredCount: 0,
        onTrackCount: 0,
        completedCount: 0,
        delayedCount: 0,
        lowRiskCount: 0,
        highPriorityActions: [],
      })
    })
  })
})
