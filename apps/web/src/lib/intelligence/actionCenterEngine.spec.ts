import { deriveOperationalTasks } from './actionCenterEngine'

describe('Action Center Engine — deriveOperationalTasks', () => {
  describe('Subscription Checks', () => {
    it('should generate a direct transporter pass upgrade task when hasSubscription is false', () => {
      const result = deriveOperationalTasks({
        userRole: 'admin',
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
        userRole: 'admin',
        hasSubscription: true,
      })

      const subUpgradeTask = result.find((task) => task.id === 'sub-upgrade')
      expect(subUpgradeTask).toBeUndefined()
    })

    it('should NOT generate subscription upgrade task when hasSubscription is undefined', () => {
      const result = deriveOperationalTasks({
        userRole: 'admin',
      })

      const subUpgradeTask = result.find((task) => task.id === 'sub-upgrade')
      expect(subUpgradeTask).toBeUndefined()
    })
  })

  describe('Truck Owner Compliance Tasks', () => {
    const mockTrucks = [
      { id: 'truck-1', registrationNumber: 'KA-01-MJ-1234', verificationStatus: 'Pending' },
      { id: 'truck-2', registrationNumber: 'DL-01-AB-5678', verificationStatus: 'Verified' },
      { id: 'truck-3', registrationNumber: 'MH-02-CD-9012', verificationStatus: 'Rejected' },
    ]

    it('should generate KYC compliance tasks only for Pending trucks of a truck_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_owner',
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
        actionUrl: '/dashboard/truck-owner',
        actionLabel: 'Upload Documents',
      })
    })

    it('should NOT generate KYC compliance tasks if userRole is NOT truck_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'load_owner',
        trucks: mockTrucks,
      })

      const kycTasks = result.filter((task) => task.id.startsWith('kyc-pending-'))
      expect(kycTasks).toHaveLength(0)
    })

    it('should handle undefined trucks array gracefully', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_owner',
        trucks: undefined,
      })

      const kycTasks = result.filter((task) => task.id.startsWith('kyc-pending-'))
      expect(kycTasks).toHaveLength(0)
    })
  })

  describe('Load Owner Booking & Dispatch Tasks', () => {
    const mockBookings = [
      { id: 'booking-1', status: 'Quoted', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 24000 },
      { id: 'booking-2', status: 'Cancelled', advanceConfirmed: false, balanceConfirmed: false, agreedPrice: 15000 },
      { id: 'booking-3', status: 'In_Transit', advanceConfirmed: true, balanceConfirmed: false, agreedPrice: 30000 },
    ]

    it('should generate advance pending payment tasks only for non-cancelled and non-confirmed bookings of a load_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'load_owner',
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

    it('should NOT generate advance payment tasks if userRole is NOT load_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_owner',
        bookings: mockBookings,
      })

      const paymentTasks = result.filter((task) => task.id.startsWith('advance-pending-'))
      expect(paymentTasks).toHaveLength(0)
    })

    it('should handle undefined bookings array gracefully', () => {
      const result = deriveOperationalTasks({
        userRole: 'load_owner',
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

    it('should generate a search reminder task when open loads exist for a load_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'load_owner',
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
        userRole: 'load_owner',
        loads: [
          { id: 'load-2', status: 'Booked', tonnageRequired: 20, loadingAddress: 'Delhi' },
        ],
      })

      const reminderTask = result.find((task) => task.id === 'open-loads-match')
      expect(reminderTask).toBeUndefined()
    })

    it('should NOT generate reminder task if userRole is NOT load_owner', () => {
      const result = deriveOperationalTasks({
        userRole: 'truck_owner',
        loads: mockLoads,
      })

      const reminderTask = result.find((task) => task.id === 'open-loads-match')
      expect(reminderTask).toBeUndefined()
    })

    it('should handle undefined loads array gracefully', () => {
      const result = deriveOperationalTasks({
        userRole: 'load_owner',
        loads: undefined,
      })

      const reminderTask = result.find((task) => task.id === 'open-loads-match')
      expect(reminderTask).toBeUndefined()
    })
  })

  describe('Multiple / Combined Scenarios', () => {
    it('should generate all relevant tasks simultaneously when multiple conditions match', () => {
      const result = deriveOperationalTasks({
        userRole: 'load_owner',
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
})
