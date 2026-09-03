import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { prisma, VerificationStatus, UserRole, BookingStatus, PaymentPurpose, PaymentStatus } from '@lorrycarry/database'

@Injectable()
export class AdminService {
  private async assertAdmin(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user?.role !== UserRole.admin) throw new ForbiddenException('Admin access required')
  }

  // ── Dashboard Stats ──────────────────────────────────────────────────────

  async getDashboardStats(adminId: string) {
    await this.assertAdmin(adminId)

    const now = new Date()

    const [
      totalUsers, totalLoads, totalTrucks, totalBookings,
      pendingDocuments, activeSubscriptions, activeTrials, expiredTrials,
      recentPayments,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.load.count(),
      prisma.truck.count(),
      prisma.booking.count(),
      prisma.document.count({ where: { verificationStatus: VerificationStatus.Pending } }),
      prisma.subscription.count({ where: { status: 'active', expiresAt: { gt: now } } }),
      prisma.user.count({
        where: {
          trialStartedAt: { not: null },
          trialConvertedAt: null,
          trialEndsAt: { gt: now },
        },
      }),
      prisma.user.count({
        where: {
          trialStartedAt: { not: null },
          trialConvertedAt: null,
          trialEndsAt: { lte: now },
        },
      }),
      prisma.payment.findMany({
        where: { status: 'Success' },
        orderBy: { paidAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true, phone: true } } },
      }),
    ])

    const totalRevenue = await prisma.payment.aggregate({
      where: { status: 'Success' },
      _sum: { amount: true },
    })

    return {
      totalUsers,
      totalLoads,
      totalTrucks,
      totalBookings,
      pendingDocuments,
      activeSubscriptions,
      activeTrials,
      expiredTrials,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      recentPayments,
    }
  }

  // ── Dashboard Analytics ──────────────────────────────────────────────────

  /**
   * Operational analytics for the admin dashboard:
   * trip completion, earnings summary, active booking pipeline and a
   * route-level efficiency heatmap (route × month traffic intensity).
   */
  async getAnalytics(adminId: string, requestedRangeDays = 30) {
    await this.assertAdmin(adminId)

    const rangeDays = [30, 90, 180, 365].includes(requestedRangeDays) ? requestedRangeDays : 30
    const now = new Date()
    const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000)
    const previousCutoff = new Date(cutoff.getTime() - rangeDays * 24 * 60 * 60 * 1000)

    const [
      totalCompleted,
      periodCompleted,
      previousPeriodCompleted,
      completedAggregate,
      advanceAggregate,
      balanceAggregate,
      platformRevenueAggregate,
      subscriptionRevenueAggregate,
      bookingPaymentAggregate,
      completedBookings,
    ] = await prisma.$transaction([
      prisma.booking.count({ where: { status: BookingStatus.Completed } }),
      prisma.booking.count({
        where: { status: BookingStatus.Completed, completedAt: { gte: cutoff } },
      }),
      prisma.booking.count({
        where: { status: BookingStatus.Completed, completedAt: { gte: previousCutoff, lt: cutoff } },
      }),
      prisma.booking.aggregate({
        where: { status: BookingStatus.Completed },
        _sum: { agreedPrice: true },
        _avg: { agreedPrice: true },
      }),
      prisma.booking.aggregate({
        where: { advanceConfirmed: true },
        _sum: { agreedPrice: true },
      }),
      prisma.booking.aggregate({
        where: { balanceConfirmed: true },
        _sum: { agreedPrice: true },
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.Success },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.Success, purpose: PaymentPurpose.subscription },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.Success,
          purpose: { in: [PaymentPurpose.booking_advance, PaymentPurpose.booking_balance] },
        },
        _sum: { amount: true },
      }),
      prisma.booking.findMany({
        where: { status: BookingStatus.Completed, completedAt: { gte: cutoff } },
        orderBy: { completedAt: 'desc' },
        take: 5000,
        select: {
          agreedPrice: true,
          startedAt: true,
          completedAt: true,
          load: {
            select: {
              loadingPin: true,
              unloadingPin: true,
              loadingAddress: true,
              unloadingAddress: true,
              expectedDeliveryAt: true,
            },
          },
          checkpoints: {
            select: { seq: true, crossedAt: true, etaMinutes: true },
          },
        },
      }),
    ])

    // Run separately from the $transaction tuple: combining groupBy with
    // aggregates in one transaction trips a TypeScript mapped-type
    // inference limit in Prisma 5 (TS2615 circular reference).
    const statusGroups = await prisma.booking.groupBy({ by: ['status'], _count: { _all: true } })

    // ── Last 6 calendar months for trends & heatmap columns ──────────────
    const monthKeys: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const monthIndex = new Map(monthKeys.map((key, index) => [key, index]))
    const monthLabels = monthKeys.map(key => {
      const [year, month] = key.split('-').map(Number)
      return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' })
    })

    // ── Roll up completed trips into monthly trends + route aggregates ───
    const monthlyTrips = new Array<number>(6).fill(0)
    const monthlyEarnings = new Array<number>(6).fill(0)
    const routeMap = new Map<string, RouteAggregate>()

    let periodEarnings = 0
    const durations: number[] = []
    let onTimeTrips = 0
    let trackedTrips = 0

    for (const booking of completedBookings) {
      const amount = Number(booking.agreedPrice) || 0
      periodEarnings += amount

      const completedAt = booking.completedAt
      const monthKey = completedAt
        ? `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, '0')}`
        : null
      if (monthKey && monthIndex.has(monthKey)) {
        const index = monthIndex.get(monthKey)!
        monthlyTrips[index] += 1
        monthlyEarnings[index] += amount
      }

      const origin = shortenPlace(booking.load?.loadingAddress, booking.load?.loadingPin)
      const destination = shortenPlace(booking.load?.unloadingAddress, booking.load?.unloadingPin)
      const routeKey = `${origin.toLowerCase()} → ${destination.toLowerCase()}`

      let durationHours: number | null = null
      if (booking.startedAt && completedAt) {
        durationHours = (completedAt.getTime() - booking.startedAt.getTime()) / 3_600_000
        durations.push(durationHours)
      }

      const checkpoints = booking.checkpoints ?? []
      const expected = checkpoints.length ? Math.max(checkpoints.length, 5) : 5
      const crossed = checkpoints.filter(checkpoint => checkpoint.crossedAt).length
      const checkpointScore = checkpoints.length ? (crossed / expected) * 100 : 70

      // 100 at ≤24h, decaying 2 points per extra hour; floor at 0.
      const transitScore = durationHours === null
        ? 70
        : Math.max(0, 100 - Math.max(0, durationHours - 24) * 2)

      const expectedDeliveryAt = booking.load?.expectedDeliveryAt
      const hasEta = Boolean(expectedDeliveryAt && completedAt)
      const isOnTime = hasEta ? (completedAt!.getTime() <= expectedDeliveryAt!.getTime()) : null
      const onTimeScore = isOnTime === null ? 75 : isOnTime ? 100 : 0
      if (hasEta) {
        trackedTrips += 1
        if (isOnTime) onTimeTrips += 1
      }

      // Route efficiency = 50% transit pace + 30% on-time delivery + 20% checkpoint progression.
      const efficiencyScore = Math.round(
        transitScore * 0.5 + onTimeScore * 0.3 + checkpointScore * 0.2,
      )

      const aggregate = routeMap.get(routeKey) ?? {
        key: routeKey,
        origin,
        destination,
        trips: 0,
        scoreSum: 0,
        durations: [] as number[],
        onTimeTrips: 0,
        trackedTrips: 0,
        monthlyTrips: new Array<number>(6).fill(0),
        lastCompletedAt: null as Date | null,
      }
      aggregate.trips += 1
      aggregate.scoreSum += efficiencyScore
      if (durationHours !== null) aggregate.durations.push(durationHours)
      if (isOnTime !== null) {
        aggregate.trackedTrips += 1
        if (isOnTime) aggregate.onTimeTrips += 1
      }
      if (monthKey && monthIndex.has(monthKey)) {
        aggregate.monthlyTrips[monthIndex.get(monthKey)!] += 1
      }
      if (completedAt && (!aggregate.lastCompletedAt || completedAt > aggregate.lastCompletedAt)) {
        aggregate.lastCompletedAt = completedAt
      }
      routeMap.set(routeKey, aggregate)
    }

    const statusCounts: Record<string, number> = {}
    for (const group of statusGroups) {
      statusCounts[group.status] = group._count._all
    }
    const pending = statusCounts[BookingStatus.Pending] ?? 0
    const confirmed = statusCounts[BookingStatus.Confirmed] ?? 0
    const inTransit = statusCounts[BookingStatus.InTransit] ?? 0
    const completedCount = statusCounts[BookingStatus.Completed] ?? 0
    const cancelled = statusCounts[BookingStatus.Cancelled] ?? 0
    const closedTrips = completedCount + cancelled

    const routes = Array.from(routeMap.values())
      .map(route => {
        const averageDurationHours = route.durations.length
          ? round(sum(route.durations) / route.durations.length, 1)
          : null
        const onTimeRate = route.trackedTrips > 0
          ? round((route.onTimeTrips / route.trackedTrips) * 100)
          : null
        return {
          route: `${route.origin} → ${route.destination}`,
          origin: route.origin,
          destination: route.destination,
          trips: route.trips,
          efficiencyScore: route.trips ? Math.round(route.scoreSum / route.trips) : 0,
          efficiencyLabel: efficiencyLabel(route.trips ? route.scoreSum / route.trips : 0),
          averageDurationHours,
          onTimeRate,
          lastCompletedAt: route.lastCompletedAt?.toISOString() ?? null,
          monthlyTrips: route.monthlyTrips,
        }
      })
      .sort((a, b) => b.trips - a.trips || b.efficiencyScore - a.efficiencyScore)

    const totalRouteTrips = routes.reduce((total, route) => total + route.trips, 0)
    const averageEfficiency = totalRouteTrips > 0
      ? Math.round(routes.reduce((total, route) => total + route.efficiencyScore * route.trips, 0) / totalRouteTrips)
      : 0
    const durationSample = durations.length ? sum(durations) / durations.length : 0

    return {
      generatedAt: now.toISOString(),
      rangeDays,
      trips: {
        totalCompleted,
        periodCompleted,
        previousPeriodCompleted,
        changePercent: previousPeriodCompleted > 0
          ? round(((periodCompleted - previousPeriodCompleted) / previousPeriodCompleted) * 100, 1)
          : null,
        averageDurationHours: durations.length ? round(durationSample, 1) : null,
        onTimeRate: trackedTrips > 0 ? round((onTimeTrips / trackedTrips) * 100) : null,
        onTimeTrips,
        trackedTrips,
        completedByMonth: monthKeys.map((key, index) => ({
          key,
          label: monthLabels[index],
          trips: monthlyTrips[index],
          earnings: round(monthlyEarnings[index]),
        })),
      },
      earnings: {
        grossBookingValue: round(Number(completedAggregate._sum.agreedPrice) || 0),
        periodEarnings: round(periodEarnings),
        averageTripEarnings: round(Number(completedAggregate._avg.agreedPrice) || 0),
        advanceCollected: round(Number(advanceAggregate._sum.agreedPrice) || 0),
        balanceCollected: round(Number(balanceAggregate._sum.agreedPrice) || 0),
        platformRevenue: round(Number(platformRevenueAggregate._sum.amount) || 0),
        subscriptionRevenue: round(Number(subscriptionRevenueAggregate._sum.amount) || 0),
        bookingPaymentRevenue: round(Number(bookingPaymentAggregate._sum.amount) || 0),
      },
      bookings: {
        active: pending + confirmed + inTransit,
        pending,
        confirmed,
        inTransit,
        completed: completedCount,
        cancelled,
        completionRate: closedTrips > 0 ? round((completedCount / closedTrips) * 100) : 0,
        byStatus: Object.entries(statusCounts)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
      },
      routes: {
        averageEfficiency,
        totalRoutes: routes.length,
        topRoutes: routes.slice(0, 10).map(route => ({
          route: route.route,
          origin: route.origin,
          destination: route.destination,
          trips: route.trips,
          efficiencyScore: route.efficiencyScore,
          efficiencyLabel: route.efficiencyLabel,
          averageDurationHours: route.averageDurationHours,
          onTimeRate: route.onTimeRate,
          lastCompletedAt: route.lastCompletedAt,
        })),
        heatmap: routes.slice(0, 12).map(route => ({
          route: route.route,
          origin: route.origin,
          destination: route.destination,
          trips: route.trips,
          efficiencyScore: route.efficiencyScore,
          efficiencyLabel: route.efficiencyLabel,
          averageDurationHours: route.averageDurationHours,
          onTimeRate: route.onTimeRate,
          months: monthKeys.map((key, index) => ({
            key,
            label: monthLabels[index],
            trips: route.monthlyTrips[index],
          })),
        })),
      },
    }
  }

  // ── Users ────────────────────────────────────────────────────────────────

  async listUsers(adminId: string, role?: UserRole, page = 1, limit = 20) {
    await this.assertAdmin(adminId)
    const skip = (page - 1) * limit
    const where = role ? { role } : {}

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { loads: true, trucks: true, subscriptions: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    return { users, total, page, pages: Math.ceil(total / limit) }
  }

  // ── Truck Document Verification ──────────────────────────────────────────

  async getPendingDocuments(adminId: string) {
    await this.assertAdmin(adminId)
    return prisma.document.findMany({
      where: { verificationStatus: VerificationStatus.Pending },
      orderBy: { createdAt: 'asc' },
      include: {
        truck: {
          select: {
            id: true, registrationNumber: true, bodyType: true,
            // Vahan RC cross-check snapshot for the KYC reviewer.
            vahanValidatedAt: true, vahanDetails: true, fastagStatus: true,
            user: { select: { name: true, phone: true } },
          },
        },
      },
    })
  }

  async verifyDocument(
    adminId: string,
    documentId: string,
    status: 'Verified' | 'Rejected',
    notes?: string,
  ) {
    await this.assertAdmin(adminId)

    const doc = await prisma.document.findUnique({ where: { id: documentId } })
    if (!doc) throw new NotFoundException('Document not found')

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        verificationStatus: status as VerificationStatus,
        verifiedBy: adminId,
        verificationNotes: notes,
        verifiedAt: new Date(),
      },
    })

    // If all docs for this truck are Verified → mark truck as Verified
    if (status === 'Verified') {
      const allDocs = await prisma.document.findMany({
        where: { truckId: doc.truckId },
      })
      const allVerified = allDocs.every(d => d.verificationStatus === VerificationStatus.Verified)
      if (allVerified) {
        await prisma.truck.update({
          where: { id: doc.truckId },
          data: { verificationStatus: VerificationStatus.Verified, verifiedAt: new Date() },
        })
      }
    } else {
      // If any doc rejected → mark truck as Rejected
      await prisma.truck.update({
        where: { id: doc.truckId },
        data: { verificationStatus: VerificationStatus.Rejected },
      })
    }

    return updated
  }

  async verifyTruck(
    adminId: string,
    truckId: string,
    status: 'Verified' | 'Rejected',
  ) {
    await this.assertAdmin(adminId)
    return prisma.truck.update({
      where: { id: truckId },
      data: {
        verificationStatus: status as VerificationStatus,
        verifiedAt: status === 'Verified' ? new Date() : null,
      },
    })
  }

  // ── Subscriptions ────────────────────────────────────────────────────────

  async listSubscriptions(adminId: string, page = 1, limit = 20) {
    await this.assertAdmin(adminId)
    const skip = (page - 1) * limit

    const [subscriptions, total] = await prisma.$transaction([
      prisma.subscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, phone: true, role: true } } },
      }),
      prisma.subscription.count(),
    ])

    return { subscriptions, total, page, pages: Math.ceil(total / limit) }
  }

  // ── Bookings Overview ────────────────────────────────────────────────────

  async listBookings(adminId: string, page = 1, limit = 20) {
    await this.assertAdmin(adminId)
    const skip = (page - 1) * limit

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          loadOwner: { select: { name: true, phone: true } },
          truckOwner: { select: { name: true, phone: true } },
          load: { select: { loadingAddress: true, unloadingAddress: true } },
          truck: { select: { registrationNumber: true } },
        },
      }),
      prisma.booking.count(),
    ])

    return {
      bookings: bookings.map((b: any) => ({
        ...b,
        factoryOwner: b.loadOwner,
        truckDriver: b.truckOwner,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    }
  }

  // ── Vahan / Parivahan verification ────────────────────────────────────────

  /**
   * Calls the configured Vahan/ULIP adapter without ever claiming verification
   * when the provider is unavailable or returns an ambiguous response. The
   * adapter is intentionally small because providers expose different payloads;
   * the common `valid`, `verified`, `status`, and registration fields are read.
   */
  async checkVahan(adminId: string, truckId: string) {
    await this.assertAdmin(adminId)

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      include: { documents: { where: { type: 'RC' }, take: 1 } },
    })
    if (!truck) throw new NotFoundException('Truck not found')

    const checkedAt = new Date()
    const registrationNumber = truck.registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const apiUrl = process.env.VAHAN_API_URL
    const apiKey = process.env.VAHAN_API_KEY

    if (!apiUrl || !apiKey) {
      const response = {
        code: 'VAHAN_PROVIDER_NOT_CONFIGURED',
        message: 'Vahan credentials are not configured. Manual RC review is still required.',
      }
      await prisma.truck.update({
        where: { id: truckId },
        data: {
          vahanStatus: VahanCheckStatus.Unavailable,
          vahanLastCheckedAt: checkedAt,
          vahanVerifiedAt: null,
          vahanResponse: response,
        },
      })
      return {
        success: false,
        status: VahanCheckStatus.Unavailable,
        providerConfigured: false,
        registrationNumber: truck.registrationNumber,
        checkedAt,
        message: response.message,
      }
    }

    await prisma.truck.update({
      where: { id: truckId },
      data: { vahanStatus: VahanCheckStatus.Pending, vahanLastCheckedAt: checkedAt },
    })

    try {
      const providerResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          registrationNumber: truck.registrationNumber,
          rcNumber: truck.documents[0]?.docNumber || undefined,
        }),
        signal: AbortSignal.timeout(10_000),
      })
      const payload = await providerResponse.json().catch(() => ({})) as Record<string, any>

      if (!providerResponse.ok) {
        throw new Error(`Vahan provider returned HTTP ${providerResponse.status}`)
      }

      const nested = (payload.result || payload.data || payload.vehicle || payload) as Record<string, any>
      const providerRegistration = String(
        nested.registrationNumber || nested.registration_number || nested.regNo || nested.regnNo || '',
      ).toUpperCase().replace(/[^A-Z0-9]/g, '')
      const explicitStatus = String(nested.status || nested.verificationStatus || '').toUpperCase()
      const isExplicitlyInvalid = nested.valid === false || nested.verified === false ||
        ['INVALID', 'MISMATCH', 'REJECTED', 'EXPIRED'].includes(explicitStatus)
      const isExplicitlyValid = nested.valid === true || nested.verified === true ||
        ['VALID', 'VERIFIED', 'ACTIVE'].includes(explicitStatus)
      const registrationMatches = !providerRegistration || providerRegistration === registrationNumber
      const status = isExplicitlyValid && registrationMatches
        ? VahanCheckStatus.Verified
        : (isExplicitlyInvalid || !registrationMatches ? VahanCheckStatus.Mismatch : VahanCheckStatus.Error)

      await prisma.truck.update({
        where: { id: truckId },
        data: {
          vahanStatus: status,
          vahanLastCheckedAt: checkedAt,
          vahanVerifiedAt: status === VahanCheckStatus.Verified ? checkedAt : null,
          vahanResponse: payload,
        },
      })

      return {
        success: status === VahanCheckStatus.Verified,
        status,
        providerConfigured: true,
        registrationNumber: truck.registrationNumber,
        checkedAt,
        message: status === VahanCheckStatus.Verified
          ? 'Registration matched the Vahan provider response.'
          : 'Provider response needs manual review before approval.',
      }
    } catch (error) {
      const response = {
        code: 'VAHAN_PROVIDER_ERROR',
        message: error instanceof Error ? error.message : 'Vahan provider request failed',
      }
      await prisma.truck.update({
        where: { id: truckId },
        data: {
          vahanStatus: VahanCheckStatus.Error,
          vahanLastCheckedAt: checkedAt,
          vahanVerifiedAt: null,
          vahanResponse: response,
        },
      })
      return {
        success: false,
        status: VahanCheckStatus.Error,
        providerConfigured: true,
        registrationNumber: truck.registrationNumber,
        checkedAt,
        message: 'Vahan provider could not be reached. Review the RC manually.',
      }
    }
  }

  // ── Booking dispute resolution ────────────────────────────────────────────

  async listDisputes(
    adminId: string,
    status?: DisputeStatus,
    page = 1,
    limit = 20,
  ) {
    await this.assertAdmin(adminId)
    const skip = (page - 1) * limit
    const where = status ? { status } : {}

    const [disputes, total, openCount, investigatingCount] = await prisma.$transaction([
      prisma.bookingDispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          booking: {
            select: {
              id: true,
              agreedPrice: true,
              status: true,
              load: { select: { loadingAddress: true, unloadingAddress: true } },
              truck: { select: { registrationNumber: true } },
              loadOwner: { select: { id: true, name: true, phone: true } },
              truckOwner: { select: { id: true, name: true, phone: true } },
            },
          },
          raisedBy: { select: { id: true, name: true, phone: true, role: true } },
          resolvedBy: { select: { name: true } },
        },
      }),
      prisma.bookingDispute.count({ where }),
      prisma.bookingDispute.count({ where: { status: DisputeStatus.Open } }),
      prisma.bookingDispute.count({ where: { status: DisputeStatus.Investigating } }),
    ])

    return {
      disputes,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      queue: { open: openCount, investigating: investigatingCount },
    }
  }

  async resolveDispute(
    adminId: string,
    disputeId: string,
    status: DisputeStatus,
    resolution?: string,
  ) {
    await this.assertAdmin(adminId)
    if ((status === DisputeStatus.Resolved || status === DisputeStatus.Rejected) && !resolution?.trim()) {
      throw new BadRequestException('A resolution note is required to close a dispute')
    }

    const dispute = await prisma.bookingDispute.findUnique({ where: { id: disputeId } })
    if (!dispute) throw new NotFoundException('Dispute not found')

    return prisma.bookingDispute.update({
      where: { id: disputeId },
      data: {
        status,
        resolution: resolution?.trim() || null,
        resolvedById: status === DisputeStatus.Resolved || status === DisputeStatus.Rejected ? adminId : null,
        resolvedAt: status === DisputeStatus.Resolved || status === DisputeStatus.Rejected ? new Date() : null,
      },
      include: { resolvedBy: { select: { name: true } } },
    })
  }

  // ── Trip / revenue / route analytics ──────────────────────────────────────

  async getAnalytics(adminId: string, range = '30') {
    await this.assertAdmin(adminId)
    const allowedRange = ['7', '30', '90', '365'].includes(range) ? Number(range) : 30
    const since = new Date(Date.now() - allowedRange * 24 * 60 * 60 * 1000)

    const [bookings, payments, openDisputes] = await prisma.$transaction([
      prisma.booking.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          status: true,
          agreedPrice: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          load: {
            select: {
              loadingAddress: true,
              unloadingAddress: true,
              loadingLat: true,
              loadingLng: true,
              unloadingLat: true,
              unloadingLng: true,
            },
          },
          checkpoints: { select: { crossedAt: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.payment.findMany({
        where: { status: 'Success', paidAt: { gte: since } },
        select: { amount: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      }),
      prisma.bookingDispute.count({ where: { status: { in: [DisputeStatus.Open, DisputeStatus.Investigating] } } }),
    ])

    const completedTrips = bookings.filter((b) => b.status === 'Completed').length
    const inTransitTrips = bookings.filter((b) => b.status === 'In-transit').length
    const cancelledTrips = bookings.filter((b) => b.status === 'Cancelled').length
    const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const bookingValue = bookings.reduce((sum, booking) => sum + Number(booking.agreedPrice), 0)

    let checkpointTotal = 0
    let checkpointCrossed = 0
    let transitHoursTotal = 0
    let transitSamples = 0
    for (const booking of bookings) {
      checkpointTotal += booking.checkpoints.length
      checkpointCrossed += booking.checkpoints.filter((checkpoint) => checkpoint.crossedAt).length
      if (booking.startedAt && booking.completedAt) {
        transitHoursTotal += (booking.completedAt.getTime() - booking.startedAt.getTime()) / 3_600_000
        transitSamples += 1
      }
    }

    const routeMap = new Map<string, {
      origin: string
      destination: string
      trips: number
      completed: number
      value: number
      checkpoints: number
      crossed: number
    }>()
    const city = (address: string) => address.split(',')[0]?.trim() || 'Unknown'
    for (const booking of bookings) {
      const origin = city(booking.load.loadingAddress)
      const destination = city(booking.load.unloadingAddress)
      const key = `${origin}→${destination}`
      const current = routeMap.get(key) || { origin, destination, trips: 0, completed: 0, value: 0, checkpoints: 0, crossed: 0 }
      current.trips += 1
      current.completed += booking.status === 'Completed' ? 1 : 0
      current.value += Number(booking.agreedPrice)
      current.checkpoints += booking.checkpoints.length
      current.crossed += booking.checkpoints.filter((checkpoint) => checkpoint.crossedAt).length
      routeMap.set(key, current)
    }

    const routeEfficiency = checkpointTotal > 0
      ? Math.round((checkpointCrossed / checkpointTotal) * 100)
      : (bookings.length ? Math.round((completedTrips / bookings.length) * 100) : 0)

    const bucketCount = allowedRange <= 30 ? 7 : 6
    const bucketIntervalDays = allowedRange / bucketCount
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const daysAgo = (bucketCount - 1 - index) * bucketIntervalDays
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      return { label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), trips: 0, revenue: 0 }
    })
    for (const booking of bookings) {
      const position = Math.min(buckets.length - 1, Math.max(0, Math.floor(((booking.createdAt.getTime() - since.getTime()) / Math.max(1, Date.now() - since.getTime())) * buckets.length)))
      buckets[position].trips += 1
      buckets[position].revenue += Number(booking.agreedPrice)
    }

    return {
      rangeDays: allowedRange,
      generatedAt: new Date(),
      summary: {
        totalTrips: bookings.length,
        completedTrips,
        inTransitTrips,
        cancelledTrips,
        revenue,
        bookingValue,
        averageRevenuePerTrip: bookings.length ? Math.round(bookingValue / bookings.length) : 0,
        routeEfficiencyPercent: routeEfficiency,
        routeEfficiencyBasis: checkpointTotal > 0 ? 'Crossed checkpoints / scheduled checkpoints' : 'Completed trips / trips in period',
        averageTransitHours: transitSamples ? Math.round((transitHoursTotal / transitSamples) * 10) / 10 : null,
        openDisputes,
      },
      trend: buckets,
      routes: Array.from(routeMap.values())
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 8)
        .map((route) => ({
          ...route,
          efficiencyPercent: route.checkpoints
            ? Math.round((route.crossed / route.checkpoints) * 100)
            : Math.round((route.completed / route.trips) * 100),
        })),
    }
  }
}

// ── Analytics helpers ───────────────────────────────────────────────────────

interface RouteAggregate {
  key: string
  origin: string
  destination: string
  trips: number
  scoreSum: number
  durations: number[]
  onTimeTrips: number
  trackedTrips: number
  monthlyTrips: number[]
  lastCompletedAt: Date | null
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Collapse a full Indian street address into a short place label.
 * Prefers the city segment before the pincode (e.g. "Plot 12, Baner, Pune,
 * Maharashtra 411001" → "Pune"); falls back to the first segment or pincode.
 */
function shortenPlace(address?: string | null, pin?: string | null): string {
  const raw = address?.trim()
  if (!raw) return pin || '—'
  const parts = raw.split(',').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0) return pin || '—'

  const pinIndex = parts.findIndex(part => /\d{6}/.test(part))
  let candidate = pinIndex > 0 ? parts[pinIndex - 1] : parts[0]
  candidate = candidate.replace(/\s+\d{6}\s*$/, '').replace(/^[\s\W]+|[\s\W]+$/g, '')

  const short = candidate.length > 32 ? `${candidate.slice(0, 29).trim()}...` : candidate
  return short || pin || '—'
}

function efficiencyLabel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Moderate'
  return 'Poor'
}
