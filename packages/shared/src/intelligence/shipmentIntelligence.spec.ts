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
    advanceConfirmedAt: '2026-09-04T06:00:00Z',
    balanceConfirmed: false,
    balanceConfirmedAt: null,
    ewayBillNumber: 'EWAY-999888777',
    liabilityAccepted: true,
    status: 'InTransit',
    createdAt: '2026-09-04T05:00:00Z',
    checkpoints: [],
  }

  const nowRef = new Date('2026-09-04T12:00:00Z')

  describe('assessShipmentIntelligence', () => {
    it('should respect minimum of 5 totalCheckpoints when checkpoints list is empty or small', () => {
      const booking: BookingData = {
        ...baseBooking,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'Delhi Gate', lat: 28.6, lng: 77.2, crossedAt: null },
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.totalCheckpoints).toBe(5)
    })

    it('should use checkpoints length if there are more than 5 checkpoints', () => {
      const booking: BookingData = {
        ...baseBooking,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          { id: 'cp-2', seq: 2, name: 'CP 2', lat: 11, lng: 11, crossedAt: null },
          { id: 'cp-3', seq: 3, name: 'CP 3', lat: 12, lng: 12, crossedAt: null },
          { id: 'cp-4', seq: 4, name: 'CP 4', lat: 13, lng: 13, crossedAt: null },
          { id: 'cp-5', seq: 5, name: 'CP 5', lat: 14, lng: 14, crossedAt: null },
          { id: 'cp-6', seq: 6, name: 'CP 6', lat: 15, lng: 15, crossedAt: null },
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.totalCheckpoints).toBe(6)
    })

    it('should force progressPercent to 100% when booking status is Completed', () => {
      const booking: BookingData = {
        ...baseBooking,
        status: 'Completed',
        balanceConfirmed: true,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: null },
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
      expect(assessment.progressPercent).toBe(100)
    })

    it('should calculate progressPercent correctly for non-completed bookings', () => {
      const booking: BookingData = {
        ...baseBooking,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          { id: 'cp-2', seq: 2, name: 'CP 2', lat: 11, lng: 11, crossedAt: null },
          { id: 'cp-3', seq: 3, name: 'CP 3', lat: 12, lng: 12, crossedAt: null },
          { id: 'cp-4', seq: 4, name: 'CP 4', lat: 13, lng: 13, crossedAt: null },
          { id: 'cp-5', seq: 5, name: 'CP 5', lat: 14, lng: 14, crossedAt: null },
        ],
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef }) // 1/5 crossed
      expect(assessment.progressPercent).toBe(20)
    })

    it('should calculate 50% advanceAmount and balanceAmount properly from agreedPrice', () => {
      const booking: BookingData = {
        ...baseBooking,
        agreedPrice: 75000,
      }
      const assessment = assessShipmentIntelligence(booking, { now: nowRef })
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
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
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
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        const advanceAction = assessment.requiredActions.find(a => a.actionType === 'CONFIRM_ADVANCE')
        expect(advanceAction).toBeUndefined()
      })

      it('should add EWAY_BILL action when ewayBillNumber is missing and status is not Cancelled or Completed', () => {
        const booking: BookingData = {
          ...baseBooking,
          ewayBillNumber: null,
          status: 'InTransit',
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        const ewayAction = assessment.requiredActions.find(a => a.actionType === 'EWAY_BILL')
        expect(ewayAction).toBeDefined()
        expect(ewayAction?.urgency).toBe('MEDIUM')
      })

      it('should NOT add EWAY_BILL action when status is Cancelled or Completed', () => {
        const bookingCompleted: BookingData = {
          ...baseBooking,
          ewayBillNumber: null,
          status: 'Completed',
          balanceConfirmed: true,
        }
        const assessmentCompleted = assessShipmentIntelligence(bookingCompleted, { now: nowRef })
        expect(assessmentCompleted.requiredActions.find(a => a.actionType === 'EWAY_BILL')).toBeUndefined()

        const bookingCancelled: BookingData = {
          ...baseBooking,
          ewayBillNumber: null,
          status: 'Cancelled',
        }
        const assessmentCancelled = assessShipmentIntelligence(bookingCancelled, { now: nowRef })
        expect(assessmentCancelled.requiredActions.find(a => a.actionType === 'EWAY_BILL')).toBeUndefined()
      })

      it('should add CONFIRM_BALANCE action when status is Completed and balanceConfirmed is false', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Completed',
          balanceConfirmed: false,
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
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
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.requiredActions.find(a => a.actionType === 'CONFIRM_BALANCE')).toBeUndefined()
      })

      it('should add OVERDUE_DELIVERY action when expectedDeliveryAt has passed', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          expectedDeliveryAt: '2026-09-04T10:00:00Z',
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        const overdueAction = assessment.requiredActions.find(a => a.actionType === 'OVERDUE_DELIVERY')
        expect(overdueAction).toBeDefined()
        expect(overdueAction?.urgency).toBe('HIGH')
      })

      it('should add DELAY_INVESTIGATION action when checkpoint is older than 6 hours', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'Origin', lat: 19, lng: 73, crossedAt: '2026-09-04T04:00:00Z' }, // 8 hours ago
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        const delayAction = assessment.requiredActions.find(a => a.actionType === 'DELAY_INVESTIGATION')
        expect(delayAction).toBeDefined()
        expect(delayAction?.urgency).toBe('HIGH')
      })

      it('should add WHATSAPP_RETRY action when whatsappTriggerStatus is Failed', () => {
        const booking: BookingData = {
          ...baseBooking,
          whatsappTriggerStatus: 'Failed',
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        const waAction = assessment.requiredActions.find(a => a.actionType === 'WHATSAPP_RETRY')
        expect(waAction).toBeDefined()
        expect(waAction?.urgency).toBe('MEDIUM')
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
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.currentLocationName).toBe('Origin Loading Point')
        expect(assessment.nextMilestoneName).toBe('Ambala Toll Plaza')
      })

      it('should show last crossed checkpoint and next milestone name when checkpoints are partially crossed', () => {
        const booking: BookingData = {
          ...baseBooking,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'Ambala Toll Plaza', lat: 30, lng: 76, crossedAt: '2026-09-04T10:00:00Z' },
            { id: 'cp-2', seq: 2, name: 'Ludhiana Bypass', lat: 31, lng: 75, crossedAt: null },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.currentLocationName).toBe('Ambala Toll Plaza')
        expect(assessment.nextMilestoneName).toBe('Ludhiana Bypass')
      })

      it('should show last crossed checkpoint and Destination Terminal when all checkpoints crossed', () => {
        const booking: BookingData = {
          ...baseBooking,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'Ambala Toll Plaza', lat: 30, lng: 76, crossedAt: '2026-09-04T10:00:00Z' },
            { id: 'cp-2', seq: 2, name: 'Ludhiana Bypass', lat: 31, lng: 75, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.currentLocationName).toBe('Ludhiana Bypass')
        expect(assessment.nextMilestoneName).toBe('Destination Terminal')
      })
    })

    describe('Risk Status Tiers & Explicit Explanations for All Risk Conditions', () => {
      it('1. ACTION REQUIRED: advance pending after booking confirmed', () => {
        const bookingConfirmed: BookingData = {
          ...baseBooking,
          advanceConfirmed: false,
          status: 'Confirmed',
        }
        const assessment = assessShipmentIntelligence(bookingConfirmed, { now: nowRef })
        expect(assessment.statusTier).toBe('ACTION REQUIRED')
        expect(assessment.badgeVariant).toBe('danger')
        expect(assessment.whyReason).toBe('50% advance confirmation pending')
        expect(assessment.riskSummary).toBe('Shipment action required: 50% loading advance confirmation pending.')
      })

      it('1b. ACTION REQUIRED: advance pending after booking in transit', () => {
        const bookingInTransit: BookingData = {
          ...baseBooking,
          advanceConfirmed: false,
          status: 'InTransit',
        }
        const assessment = assessShipmentIntelligence(bookingInTransit, { now: nowRef })
        expect(assessment.statusTier).toBe('ACTION REQUIRED')
        expect(assessment.badgeVariant).toBe('danger')
        expect(assessment.whyReason).toBe('50% advance confirmation pending')
        expect(assessment.riskSummary).toBe('Shipment action required: 50% loading advance confirmation pending.')
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
        expect(assessment.riskSummary).toBe('Shipment action required: Consignment completed but POD delivery balance not confirmed.')
      })

      it('2b. COMPLETED: completed and balance confirmed', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Completed',
          balanceConfirmed: true,
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('COMPLETED')
        expect(assessment.badgeVariant).toBe('success')
        expect(assessment.whyReason).toBe('All highway checkpoints crossed & POD verified')
        expect(assessment.riskSummary).toBe('Consignment successfully delivered at destination.')
      })

      it('3. DELAYED: expected delivery time passed and booking not completed', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          advanceConfirmed: true,
          expectedDeliveryAt: '2026-09-04T10:00:00Z', // 2 hours overdue relative to 12:00
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('DELAYED')
        expect(assessment.badgeVariant).toBe('danger')
        expect(assessment.whyReason).toBe('Expected delivery time passed and booking not completed')
        expect(assessment.riskSummary).toBe('Shipment delayed: Expected delivery schedule has passed but booking not completed.')
      })

      it('3b. DELAYED: load.expectedDeliveryAt passed and booking not completed', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          advanceConfirmed: true,
          load: {
            loadingAddress: 'Pune',
            unloadingAddress: 'Bangalore',
            expectedDeliveryAt: '2026-09-04T09:00:00Z',
          },
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:30:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('DELAYED')
        expect(assessment.whyReason).toBe('Expected delivery time passed and booking not completed')
      })

      it('4. DELAYED: InTransit and latest checkpoint crossedAt older than 6 hours', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          advanceConfirmed: true,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'Pune Toll', lat: 18.5, lng: 73.8, crossedAt: '2026-09-04T04:00:00Z' }, // 8 hours ago
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('DELAYED')
        expect(assessment.badgeVariant).toBe('danger')
        expect(assessment.whyReason).toBe('InTransit and latest checkpoint crossedAt older than 6 hours')
        expect(assessment.riskSummary).toBe('Shipment delayed: In-transit vehicle has not recorded a checkpoint update for over 6 hours.')
      })

      it('4b. DELAYED: InTransit with no checkpoint crossed and startedAt older than 6 hours', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          advanceConfirmed: true,
          startedAt: '2026-09-04T03:00:00Z', // 9 hours ago
          checkpoints: [],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('DELAYED')
        expect(assessment.whyReason).toBe('InTransit and latest checkpoint crossedAt older than 6 hours')
      })

      it('5. ATTENTION REQUIRED: WhatsApp trigger failed if field is available', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          advanceConfirmed: true,
          whatsappTriggerStatus: 'Failed',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
        expect(assessment.badgeVariant).toBe('warning')
        expect(assessment.whyReason).toBe('WhatsApp trigger failed')
        expect(assessment.riskSummary).toBe('Shipment attention required: Automated WhatsApp trigger failed.')
      })

      it('5b. ATTENTION REQUIRED: whatsappStatus === Failed alias', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          advanceConfirmed: true,
          whatsappStatus: 'Failed',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
        expect(assessment.whyReason).toBe('WhatsApp trigger failed')
      })

      it('6. ATTENTION REQUIRED: E-Way Bill missing', () => {
        const booking: BookingData = {
          ...baseBooking,
          ewayBillNumber: null,
          status: 'InTransit',
          advanceConfirmed: true,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
        expect(assessment.badgeVariant).toBe('warning')
        expect(assessment.whyReason).toBe('E-Way Bill missing')
        expect(assessment.riskSummary).toBe('Shipment attention required: E-Way Bill documentation missing.')
      })

      it('7. LOW RISK: Confirmed and 0 checkpoints crossed', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Confirmed',
          advanceConfirmed: true,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: null },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('LOW RISK')
        expect(assessment.badgeVariant).toBe('info')
        expect(assessment.whyReason).toBe('Booking confirmed, awaiting initial checkpoint check-in')
        expect(assessment.riskSummary).toBe('Booking confirmed. Awaiting vehicle departure from origin.')
      })

      it('8. ON TRACK: InTransit and checkpoints progressing within 6 hours', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          advanceConfirmed: true,
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T10:30:00Z' }, // 1.5h ago
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ON TRACK')
        expect(assessment.badgeVariant).toBe('success')
        expect(assessment.whyReason).toBe('Vehicle progressing through checkpoints')
        expect(assessment.riskSummary).toBe('Vehicle is moving on schedule along the national corridor.')
      })

      it('9. Cancelled booking should be classified as LOW RISK without pending actions', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Cancelled',
          advanceConfirmed: false,
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('LOW RISK')
        expect(assessment.whyReason).toBe('Booking cancelled')
        expect(assessment.requiredActions).toHaveLength(0)
      })

      it('10. ATTENTION REQUIRED: E-Way Bill expired (validity window lapsed)', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          ewayBillNumber: 'EWAY-999888777',
          ewayBillValidUpto: '2026-09-04T08:00:00Z', // 4 hours before nowRef
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
        expect(assessment.badgeVariant).toBe('warning')
        expect(assessment.whyReason).toBe('E-Way Bill expired')
        expect(assessment.riskSummary).toBe('Shipment attention required: E-Way Bill validity has expired.')
        expect(assessment.isEwayBillExpired).toBe(true)
        const ewayAction = assessment.requiredActions.find(a => a.actionType === 'EWAY_BILL')
        expect(ewayAction?.title).toBe('E-Way Bill Expired')
        expect(ewayAction?.urgency).toBe('MEDIUM')
      })

      it('10b. ATTENTION REQUIRED: ewayBillStatus reports Expired', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          ewayBillStatus: 'Expired',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ATTENTION REQUIRED')
        expect(assessment.whyReason).toBe('E-Way Bill expired')
        expect(assessment.isEwayBillExpired).toBe(true)
      })

      it('10c. should NOT flag expiry when ewayBillValidUpto is in the future', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          ewayBillValidUpto: '2026-09-05T08:00:00Z',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ON TRACK')
        expect(assessment.isEwayBillExpired).toBe(false)
        expect(assessment.requiredActions.find(a => a.actionType === 'EWAY_BILL')).toBeUndefined()
      })

      it('10d. should NOT flag E-Way Bill expiry on a completed booking', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Completed',
          balanceConfirmed: true,
          ewayBillValidUpto: '2026-09-04T08:00:00Z',
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('COMPLETED')
        expect(assessment.isEwayBillExpired).toBe(false)
      })

      it('11. LOW RISK: Pending booking awaiting confirmation (advance action still surfaced)', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Pending',
          advanceConfirmed: false,
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('LOW RISK')
        expect(assessment.badgeVariant).toBe('info')
        expect(assessment.whyReason).toBe('Booking pending confirmation')
        expect(assessment.riskSummary).toBe('Booking created. Awaiting counterparty confirmation before dispatch.')
        // Advance is only ACTION REQUIRED once the booking is Confirmed/InTransit,
        // but the operational task itself is still listed for the shipper.
        expect(assessment.requiredActions.find(a => a.actionType === 'CONFIRM_ADVANCE')).toBeDefined()
      })

      it('12. COMPLETED booking is never classified as DELAYED even with stale checkpoints and overdue delivery', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'Completed',
          balanceConfirmed: true,
          expectedDeliveryAt: '2026-09-04T10:00:00Z',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T04:00:00Z' }, // 8 hours stale
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('COMPLETED')
        expect(assessment.requiredActions.find(a => a.actionType === 'DELAY_INVESTIGATION')).toBeUndefined()
        expect(assessment.requiredActions.find(a => a.actionType === 'OVERDUE_DELIVERY')).toBeUndefined()
        expect(assessment.deliveryOverdueHours).toBeNull()
        expect(assessment.lastCheckpointAgeHours).toBeNull()
      })
    })

    describe('6-Hour Checkpoint Delay Boundaries', () => {
      it('should NOT flag delayed when the latest checkpoint is exactly 6 hours old', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T06:00:00Z' }, // exactly 6h
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ON TRACK')
        expect(assessment.lastCheckpointAgeHours).toBe(6)
        expect(assessment.requiredActions.find(a => a.actionType === 'DELAY_INVESTIGATION')).toBeUndefined()
      })

      it('should flag delayed one minute past the 6-hour threshold', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T05:59:00Z' }, // 6h 01m
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('DELAYED')
        expect(assessment.whyReason).toBe('InTransit and latest checkpoint crossedAt older than 6 hours')
        expect(assessment.lastCheckpointAgeHours).toBeGreaterThanOrEqual(6)
      })

      it('should use the most recent crossedAt even when checkpoint timestamps arrive out of chronological order', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          checkpoints: [
            { id: 'cp-2', seq: 2, name: 'CP 2', lat: 11, lng: 11, crossedAt: '2026-09-04T04:30:00Z' }, // 7.5h ago
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T04:00:00Z' }, // 8h ago
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('DELAYED')
        expect(assessment.lastCheckpointAgeHours).toBe(7.5)
      })

      it('should NOT flag delay when InTransit started less than 6 hours ago with no crossings yet', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          startedAt: '2026-09-04T09:00:00Z', // 3h ago
          checkpoints: [],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ON TRACK')
        expect(assessment.lastCheckpointAgeHours).toBe(3)
      })

      it('should NOT flag delay when InTransit has no checkpoints and no startedAt to anchor staleness', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          checkpoints: [],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('ON TRACK')
        expect(assessment.lastCheckpointAgeHours).toBeNull()
      })

      it('should derive milestone names from seq order even when the payload is unsorted', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          checkpoints: [
            { id: 'cp-3', seq: 3, name: 'Tumkur Toll', lat: 13.3, lng: 77.1, crossedAt: '2026-09-04T11:15:00Z' },
            { id: 'cp-1', seq: 1, name: 'Hosur Gate', lat: 12.7, lng: 77.8, crossedAt: '2026-09-04T11:00:00Z' },
            { id: 'cp-2', seq: 2, name: 'Chitradurga Bypass', lat: 14.2, lng: 76.4, crossedAt: null },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.crossedCount).toBe(2)
        expect(assessment.currentLocationName).toBe('Tumkur Toll')
        expect(assessment.nextMilestoneName).toBe('Chitradurga Bypass')
        expect(assessment.statusTier).toBe('ON TRACK')
      })
    })

    describe('Delay Magnitude Exposure', () => {
      it('should expose deliveryOverdueHours when the expected delivery window has passed', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          expectedDeliveryAt: '2026-09-04T09:30:00Z', // 2.5h overdue
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.statusTier).toBe('DELAYED')
        expect(assessment.deliveryOverdueHours).toBe(2.5)
      })

      it('should return null deliveryOverdueHours when the delivery window is still in the future', () => {
        const booking: BookingData = {
          ...baseBooking,
          status: 'InTransit',
          expectedDeliveryAt: '2026-09-04T18:00:00Z',
          checkpoints: [
            { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
          ],
        }
        const assessment = assessShipmentIntelligence(booking, { now: nowRef })
        expect(assessment.deliveryOverdueHours).toBeNull()
        expect(assessment.statusTier).toBe('ON TRACK')
      })
    })
  })

  describe('summarizeActiveShipmentsControlTower', () => {
    it('performance benchmark of summarizeActiveShipmentsControlTower', () => {
      const bookings: BookingData[] = []
      for (let i = 0; i < 2000; i++) {
        bookings.push({
          ...baseBooking,
          id: `bk-${i}`,
          status: i % 5 === 0 ? 'Completed' : 'InTransit',
          advanceConfirmed: i % 3 !== 0,
          balanceConfirmed: i % 2 === 0,
          ewayBillNumber: i % 5 === 0 ? null : 'EWAY-12345',
          checkpoints: [
            { id: `cp-${i}-1`, seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T10:00:00Z' },
            { id: `cp-${i}-2`, seq: 2, name: 'CP 2', lat: 11, lng: 11, crossedAt: null },
            { id: `cp-${i}-3`, seq: 3, name: 'CP 3', lat: 12, lng: 12, crossedAt: null },
          ],
        })
      }

      const start = performance.now()
      for (let run = 0; run < 20; run++) {
        summarizeActiveShipmentsControlTower(bookings, { now: nowRef })
      }
      const end = performance.now()
      console.log(`[BENCHMARK] Elapsed time: ${(end - start).toFixed(2)} ms`)
    })

    it('should correctly sum and classify bookings into status tier buckets', () => {
      const bookingCompleted: BookingData = {
        ...baseBooking,
        id: 'bk-completed',
        status: 'Completed',
        balanceConfirmed: true,
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
      const bookingDelayed: BookingData = {
        ...baseBooking,
        id: 'bk-delayed',
        status: 'InTransit',
        advanceConfirmed: true,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T02:00:00Z' }, // 10 hrs ago
        ],
        load: {
          loadingAddress: 'Chennai Hub',
          unloadingAddress: 'Hyderabad Depot',
        },
      }
      const bookingAttentionRequired: BookingData = {
        ...baseBooking,
        id: 'bk-attention',
        ewayBillNumber: null,
        status: 'InTransit',
        advanceConfirmed: true,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
        ],
      }
      const bookingOnTrack: BookingData = {
        ...baseBooking,
        id: 'bk-ontrack',
        status: 'InTransit',
        advanceConfirmed: true,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: '2026-09-04T11:00:00Z' },
        ],
      }
      const bookingLowRisk: BookingData = {
        ...baseBooking,
        id: 'bk-lowrisk',
        status: 'Confirmed',
        advanceConfirmed: true,
        checkpoints: [
          { id: 'cp-1', seq: 1, name: 'CP 1', lat: 10, lng: 10, crossedAt: null },
        ],
      }

      const summary = summarizeActiveShipmentsControlTower([
        bookingCompleted,
        bookingActionRequired,
        bookingDelayed,
        bookingAttentionRequired,
        bookingOnTrack,
        bookingLowRisk,
      ], { now: nowRef })

      expect(summary.totalActive).toBe(6)
      expect(summary.completedCount).toBe(1)
      expect(summary.actionRequiredCount).toBe(1)
      expect(summary.delayedCount).toBe(1)
      expect(summary.attentionRequiredCount).toBe(1)
      expect(summary.onTrackCount).toBe(1)
      expect(summary.lowRiskCount).toBe(1)

      // Test high priority actions listing
      expect(summary.highPriorityActions).toHaveLength(3)

      // Check action-required detail
      const actionItem = summary.highPriorityActions.find(item => item.bookingId === 'bk-action')
      expect(actionItem).toBeDefined()
      expect(actionItem?.loadRoute).toBe('Mumbai Hub ➔ Delhi Depot')
      expect(actionItem?.statusTier).toBe('ACTION REQUIRED')
      expect(actionItem?.whyReason).toBe('50% advance confirmation pending')

      // Check delayed detail
      const delayedItem = summary.highPriorityActions.find(item => item.bookingId === 'bk-delayed')
      expect(delayedItem).toBeDefined()
      expect(delayedItem?.loadRoute).toBe('Chennai Hub ➔ Hyderabad Depot')
      expect(delayedItem?.statusTier).toBe('DELAYED')
      expect(delayedItem?.whyReason).toBe('InTransit and latest checkpoint crossedAt older than 6 hours')

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
