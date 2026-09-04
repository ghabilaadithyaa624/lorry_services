import { deriveOperationalTasks, summarizeOperationalTasks } from './actionCenterEngine'

describe('Action Center Engine — deriveOperationalTasks', () => {
  describe('Subscription Checks', () => {
    it('should generate a direct transporter pass upgrade task when hasSubscription is false', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        hasSubscription: false,
      })

      const subUpgradeTask = result.find((task) => task.id === 'sub-upgrade')
      expect(subUpgradeTask).toBeDefined()
      expect(subUpgradeTask).toEqual({
        id: 'sub-upgrade',
        title: 'Direct Transporter Pass Required',
        description: 'Subscribe to unlock direct phone and WhatsApp contact with verified transporters across India.',
        category: 'COMMERCIAL',
        urgency: 'MEDIUM',
        actionUrl: '/subscribe',
        actionLabel: 'Unlock Direct Access',
      })
    })

    it('should NOT generate subscription upgrade task when hasSubscription is true', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        hasSubscription: true,
      })

      const subUpgradeTask = result.find((task) => task.id === 'sub-upgrade')
      expect(subUpgradeTask).toBeUndefined()
    })

    it('should NOT generate subscription upgrade task when hasSubscription is undefined', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
      })

      const subUpgradeTask = result.find((task) => task.id === 'sub-upgrade')
      expect(subUpgradeTask).toBeUndefined()
    })
  })

  describe('Truck Driver Compliance Tasks', () => {
    const mockTrucks = [
      { id: 'truck-1', registrationNumber: 'KA-01-MJ-1234', verificationStatus: 'Pending' },
      { id: 'truck-2', registrationNumber: 'DL-01-AB-5678', verificationStatus: 'Verified' },
      { id: 'truck-3', registrationNumber: 'MH-02-CD-9012', verificationStatus: 'Rejected' },
    ]

    it('should generate KYC compliance tasks only for Pending trucks of a truck_driver', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: mockTrucks,
      })

      const kycTasks = result.filter((task) => task.id.startsWith('kyc-pending-'))
      expect(kycTasks).toHaveLength(1)
      expect(kycTasks[0]).toEqual({
        id: 'kyc-pending-truck-1',
        title: 'RC Verification Pending: KA-01-MJ-1234',
        description: 'Upload your clear RC copy and Insurance certificate to activate direct marketplace matching.',
        category: 'COMPLIANCE',
        urgency: 'HIGH',
        actionUrl: '/dashboard/truck-driver',
        actionLabel: 'Upload Documents',
      })
    })

    it('should NOT generate KYC compliance tasks if userRole is NOT truck_driver', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        trucks: mockTrucks,
      })

      const kycTasks = result.filter((task) => task.id.startsWith('kyc-pending-'))
      expect(kycTasks).toHaveLength(0)
    })

    it('should handle undefined trucks array gracefully', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: undefined,
      })

      const kycTasks = result.filter((task) => task.id.startsWith('kyc-pending-'))
      expect(kycTasks).toHaveLength(0)
    })
  })

  describe('Factory Owner Booking & Dispatch Tasks', () => {
    const mockBookings = [
      { id: 'booking-1', status: 'Quoted', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 24000 },
      { id: 'booking-2', status: 'Cancelled', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 15000 },
      { id: 'booking-3', status: 'In_Transit', advanceConfirmed: true, balanceConfirmed: false, agreedPrice: 30000 },
    ]

    it('should generate advance pending payment tasks only for non-cancelled and non-confirmed bookings of a factory_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        bookings: mockBookings,
      })

      const paymentTasks = result.filter((task) => task.id.startsWith('advance-pending-'))
      expect(paymentTasks).toHaveLength(1)
      expect(paymentTasks[0]).toEqual({
        id: 'advance-pending-booking-1',
        title: 'Loading Advance Due: ₹12,000',
        description: 'Confirm standard 50% loading advance release to authorize transporter dispatch.',
        category: 'PAYMENT',
        urgency: 'HIGH',
        actionUrl: '/booking/booking-1',
        actionLabel: 'Confirm Advance',
      })
    })

    it('should NOT generate advance payment tasks if userRole is NOT factory_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        bookings: mockBookings,
      })

      const paymentTasks = result.filter((task) => task.id.startsWith('advance-pending-'))
      expect(paymentTasks).toHaveLength(0)
    })

    it('should handle undefined bookings array gracefully', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        bookings: undefined,
      })

      const paymentTasks = result.filter((task) => task.id.startsWith('advance-pending-'))
      expect(paymentTasks).toHaveLength(0)
    })
  })

  describe('Open Unmatched Loads Reminder', () => {
    const mockLoads = [
      { id: 'load-1', status: 'Open', tonnageRequired: 15, loadingAddress: 'Mumbai' },
      { id: 'load-2', status: 'Booked', tonnageRequired: 20, loadingAddress: 'Delhi' },
      { id: 'load-3', status: 'Open', tonnageRequired: 8, loadingAddress: 'Bangalore' },
    ]

    it('should generate a search reminder task when open loads exist for a factory_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        loads: mockLoads,
      })

      const reminderTask = result.find((task) => task.id === 'open-loads-match')
      expect(reminderTask).toBeDefined()
      expect(reminderTask).toEqual({
        id: 'open-loads-match',
        title: '2 Active Freight Requirements',
        description: 'Matching trucks are available within your loading corridor. Review quotes and contact drivers directly.',
        category: 'DISPATCH',
        urgency: 'LOW',
        actionUrl: '/search?type=truck',
        actionLabel: 'Search Available Lorries',
      })
    })

    it('should NOT generate reminder task if there are no open loads', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        loads: [
          { id: 'load-2', status: 'Booked', tonnageRequired: 20, loadingAddress: 'Delhi' },
        ],
      })

      const reminderTask = result.find((task) => task.id === 'open-loads-match')
      expect(reminderTask).toBeUndefined()
    })

    it('should NOT generate reminder task if userRole is NOT factory_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        loads: mockLoads,
      })

      const reminderTask = result.find((task) => task.id === 'open-loads-match')
      expect(reminderTask).toBeUndefined()
    })

    it('should handle undefined loads array gracefully', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        loads: undefined,
      })

      const reminderTask = result.find((task) => task.id === 'open-loads-match')
      expect(reminderTask).toBeUndefined()
    })
  })

  describe('Multiple / Combined Scenarios', () => {
    it('should generate all relevant tasks simultaneously when multiple conditions match', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        hasSubscription: false,
        loads: [
          { id: 'load-1', status: 'Open', tonnageRequired: 15, loadingAddress: 'Mumbai' },
        ],
        bookings: [
          { id: 'booking-1', status: 'Quoted', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 20000 },
        ],
      })

      expect(result).toHaveLength(3)
      expect(result.map((t) => t.id).sort()).toEqual([
        'advance-pending-booking-1',
        'open-loads-match',
        'sub-upgrade',
      ].sort())
    })
  })

  describe('Vehicle Document Compliance (RC / Insurance)', () => {
    const truck = {
      id: 'truck-1',
      registrationNumber: 'TN-38-AB-4411',
      verificationStatus: 'Verified',
    }

    it('should NOT invent missing-document tasks when no document source was supplied', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: [truck],
      })

      expect(result.filter((t) => t.id.startsWith('doc-'))).toHaveLength(0)
    })

    it('should flag missing RC and Insurance when the fleet document list is empty', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: [truck],
        documents: [],
      })

      expect(result.map((t) => t.id).sort()).toEqual([
        'doc-missing-insurance-truck-1',
        'doc-missing-rc-truck-1',
      ])
      expect(result.every((t) => t.urgency === 'HIGH')).toBe(true)
      expect(result[0].actionUrl).toBe('/documents')
    })

    it('should flag only the missing document type when one is verified', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: [truck],
        documents: [
          { id: 'doc-1', truckId: 'truck-1', type: 'RC', verificationStatus: 'Verified' },
        ],
      })

      const docTasks = result.filter((t) => t.id.startsWith('doc-'))
      expect(docTasks).toHaveLength(1)
      expect(docTasks[0].id).toBe('doc-missing-insurance-truck-1')
    })

    it('should raise a MEDIUM task while an uploaded document awaits verification', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: [truck],
        documents: [
          { id: 'doc-1', truckId: 'truck-1', type: 'RC', verificationStatus: 'Pending' },
          { id: 'doc-2', truckId: 'truck-1', type: 'Insurance', verificationStatus: 'Verified' },
        ],
      })

      const pendingTask = result.find((t) => t.id === 'doc-unverified-doc-1')
      expect(pendingTask).toBeDefined()
      expect(pendingTask?.urgency).toBe('MEDIUM')
      expect(pendingTask?.category).toBe('COMPLIANCE')
    })

    it('should raise a HIGH re-upload task for rejected documents', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: [truck],
        documents: [
          { id: 'doc-1', truckId: 'truck-1', type: 'RC', verificationStatus: 'Rejected' },
          { id: 'doc-2', truckId: 'truck-1', type: 'Insurance', verificationStatus: 'Verified' },
        ],
      })

      const rejected = result.find((t) => t.id === 'doc-rejected-doc-1')
      expect(rejected?.urgency).toBe('HIGH')
      expect(rejected?.actionLabel).toBe('Re-upload RC')
    })

    it('should read documents nested on the truck payload (GET /trucks/my-trucks)', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: [
          {
            ...truck,
            documents: [{ id: 'doc-9', type: 'RC', verificationStatus: 'Verified' }],
          },
        ],
      })

      expect(result.map((t) => t.id)).toEqual(['doc-missing-insurance-truck-1'])
    })

    it('should raise a re-upload task for a rejected vehicle verification', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: [{ ...truck, verificationStatus: 'Rejected' }],
      })

      const task = result.find((t) => t.id === 'kyc-rejected-truck-1')
      expect(task?.urgency).toBe('HIGH')
      expect(task?.actionUrl).toBe('/documents')
    })

    it('should prompt an operator with no registered lorry to add one', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        trucks: [],
      })

      expect(result.map((t) => t.id)).toEqual(['fleet-empty'])
      expect(result[0].actionUrl).toBe('/need-vehicle')
    })
  })

  describe('Booking Payment & E-Way Bill Milestones', () => {
    const completedBooking = {
      id: 'booking-77',
      status: 'Completed',
      advanceConfirmed: true,
      balanceConfirmed: false,
      agreedPrice: 40000,
      load: { loadingAddress: 'Hosur, TN', unloadingAddress: 'Chennai, TN' },
    }

    it('should ask the shipper to release the balance on a completed trip', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        bookings: [completedBooking],
      })

      const task = result.find((t) => t.id === 'balance-pending-booking-77')
      expect(task).toBeDefined()
      expect(task?.title).toBe('Delivery Balance Due: ₹20,000')
      expect(task?.description).toContain('Hosur → Chennai')
      expect(task?.urgency).toBe('HIGH')
      expect(task?.actionUrl).toBe('/booking/booking-77')
    })

    it('should ask the transporter to chase an unpaid balance on a completed trip', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        bookings: [completedBooking],
      })

      const task = result.find((t) => t.id === 'balance-awaiting-booking-77')
      expect(task?.actionLabel).toBe('Request Balance')
      expect(task?.category).toBe('PAYMENT')
    })

    it('should NOT raise balance tasks once the balance is confirmed', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        bookings: [{ ...completedBooking, balanceConfirmed: true }],
      })

      expect(result.filter((t) => t.id.startsWith('balance-'))).toHaveLength(0)
    })

    it('should flag a missing E-Way Bill on dispatched consignments only', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        bookings: [
          { id: 'b-transit', status: 'InTransit', advanceConfirmed: true, balanceConfirmed: false, agreedPrice: 30000 },
          { id: 'b-pending', status: 'Pending', advanceConfirmed: true, balanceConfirmed: false, agreedPrice: 30000 },
        ],
      })

      const ewayTasks = result.filter((t) => t.id.startsWith('eway-missing-'))
      expect(ewayTasks).toHaveLength(1)
      expect(ewayTasks[0].id).toBe('eway-missing-b-transit')
      expect(ewayTasks[0].category).toBe('COMPLIANCE')
    })

    it('should NOT flag an E-Way Bill that is already recorded', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        bookings: [
          {
            id: 'b-transit',
            status: 'InTransit',
            advanceConfirmed: true,
            balanceConfirmed: false,
            agreedPrice: 30000,
            ewayBillNumber: '123456789012',
          },
        ],
      })

      expect(result.filter((t) => t.id.startsWith('eway-missing-'))).toHaveLength(0)
    })

    it('should warn the transporter when the shipper has not released the advance', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        bookings: [
          {
            id: 'b-1',
            status: 'Confirmed',
            advanceConfirmed: false,
            balanceConfirmed: false,
            agreedPrice: 26000,
            load: { loadingAddress: 'Salem', unloadingAddress: 'Kochi' },
          },
        ],
      })

      const task = result.find((t) => t.id === 'advance-awaiting-b-1')
      expect(task?.title).toBe('Advance Not Released: Salem → Kochi')
      expect(task?.description).toContain('₹13,000')
    })

    it('should ignore cancelled bookings entirely', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        bookings: [
          { id: 'b-x', status: 'Cancelled', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 9000 },
        ],
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('Subscription Expiry Intelligence', () => {
    const now = new Date('2026-09-04T00:00:00.000Z')

    it('should raise a HIGH renewal task for an expired subscription', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        hasSubscription: false,
        subscription: { status: 'expired', expiresAt: '2026-08-20T00:00:00.000Z' },
        now,
      })

      const task = result.find((t) => t.id === 'sub-expired')
      expect(task?.urgency).toBe('HIGH')
      expect(task?.actionUrl).toBe('/subscribe')
      // The legacy upgrade nudge must not duplicate the expiry task.
      expect(result.find((t) => t.id === 'sub-upgrade')).toBeUndefined()
    })

    it('should raise a MEDIUM task when the pass expires inside the warning window', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        hasSubscription: true,
        subscription: { isActive: true, status: 'active', expiresAt: '2026-09-07T00:00:00.000Z' },
        now,
      })

      const task = result.find((t) => t.id === 'sub-expiring')
      expect(task?.title).toBe('Subscription Expires in 3 Days')
      expect(task?.urgency).toBe('MEDIUM')
    })

    it('should use trial wording when the entitlement is the free trial', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        subscription: { isActive: true, isTrial: true, status: 'trial', daysRemaining: 1 },
        now,
      })

      expect(result.find((t) => t.id === 'sub-expiring')?.title).toBe('Free Trial Ends in 1 Day')
    })

    it('should stay quiet for a healthy long-dated subscription', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        hasSubscription: true,
        subscription: { isActive: true, status: 'active', expiresAt: '2027-01-01T00:00:00.000Z' },
        now,
      })

      expect(result.filter((t) => t.category === 'COMMERCIAL')).toHaveLength(0)
    })
  })

  describe('Failed WhatsApp Triggers', () => {
    it('should aggregate failed WhatsApp notifications into a single task', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        notifications: [
          { id: 'n-1', channel: 'whatsapp', providerStatus: 'Failed' },
          { id: 'n-2', channel: 'whatsapp', providerStatus: 'undelivered' },
          { id: 'n-3', channel: 'whatsapp', providerStatus: 'Delivered' },
          { id: 'n-4', channel: 'sms', providerStatus: 'Failed' },
        ],
      })

      const task = result.find((t) => t.id === 'whatsapp-delivery-failed')
      expect(task?.title).toBe('2 WhatsApp Alerts Not Delivered')
      expect(task?.actionUrl).toBe('/notifications')
    })

    it('should surface a per-booking WhatsApp trigger failure when exposed', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_driver',
        bookings: [
          {
            id: 'booking-abc12345',
            status: 'Confirmed',
            advanceConfirmed: true,
            balanceConfirmed: false,
            agreedPrice: 18000,
            ewayBillNumber: '999988887777',
            whatsappTriggerStatus: 'Failed',
          },
        ],
      })

      const task = result.find((t) => t.id === 'whatsapp-failed-booking-abc12345')
      expect(task?.title).toBe('WhatsApp Alert Failed: TRIP-BOOKING-')
      expect(task?.category).toBe('DISPATCH')
    })

    it('should stay silent when no delivery failures exist', () => {
      const result = deriveOperationalTasks({
        userRole: 'factory_owner',
        notifications: [{ id: 'n-1', channel: 'whatsapp', providerStatus: 'Sent' }],
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('Admin Moderation Queues', () => {
    it('should derive review queues from real admin counters', () => {
      const result = deriveOperationalTasks({
        userRole: 'admin',
        adminQueue: {
          pendingDocuments: 4,
          openDisputes: 1,
          unmatchedLoads: 12,
          expiredTrials: 6,
        },
      })

      expect(result.map((t) => t.id)).toEqual([
        'admin-kyc-queue',
        'admin-disputes',
        'admin-unmatched-loads',
        'admin-expired-trials',
      ])
      expect(result[0].title).toBe('4 Vehicle Documents Awaiting Verification')
      expect(result[1].title).toBe('1 Open Dispute')
    })

    it('should return nothing when every admin queue is clear', () => {
      const result = deriveOperationalTasks({
        userRole: 'admin',
        adminQueue: { pendingDocuments: 0, openDisputes: 0, unmatchedLoads: 0, expiredTrials: 0 },
      })

      expect(result).toHaveLength(0)
    })

    it('should never raise subscription upsells for admins', () => {
      const result = deriveOperationalTasks({
        userRole: 'admin',
        hasSubscription: false,
        adminQueue: { pendingDocuments: 0 },
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('Ordering & Limits', () => {
    const params = {
      userRole: 'factory_owner' as const,
      hasSubscription: false,
      loads: [{ id: 'load-1', status: 'Open', tonnageRequired: 9, loadingAddress: 'Pune' }],
      bookings: [
        { id: 'b-1', status: 'Confirmed', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 10000 },
      ],
    }

    it('should sort tasks HIGH → MEDIUM → LOW', () => {
      const result = deriveOperationalTasks(params)
      expect(result.map((t) => t.urgency)).toEqual(['HIGH', 'HIGH', 'MEDIUM', 'LOW'])
    })

    it('should cap the list with maxTasks, keeping the most urgent work', () => {
      const result = deriveOperationalTasks({ ...params, maxTasks: 2 })
      expect(result).toHaveLength(2)
      expect(result.every((t) => t.urgency === 'HIGH')).toBe(true)
    })

    it('should be deterministic for the same input', () => {
      expect(deriveOperationalTasks(params)).toEqual(deriveOperationalTasks(params))
    })
  })

  describe('summarizeOperationalTasks', () => {
    it('should count tasks per urgency tier', () => {
      const tasks = deriveOperationalTasks({
        userRole: 'factory_owner',
        hasSubscription: false,
        loads: [{ id: 'load-1', status: 'Open', tonnageRequired: 9, loadingAddress: 'Pune' }],
        bookings: [
          { id: 'b-1', status: 'Confirmed', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 10000 },
        ],
      })

      expect(summarizeOperationalTasks(tasks)).toEqual({ total: 4, high: 2, medium: 1, low: 1 })
    })
  })
})
