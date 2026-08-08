import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { prisma, VerificationStatus, UserRole } from '@lorrycarry/database'

@Injectable()
export class AdminService {
  private async assertAdmin(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user?.role !== UserRole.admin) throw new ForbiddenException('Admin access required')
  }

  // ── Dashboard Stats ──────────────────────────────────────────────────────

  async getDashboardStats(adminId: string) {
    await this.assertAdmin(adminId)

    const [
      totalUsers, totalLoads, totalTrucks, totalBookings,
      pendingDocuments, activeSubscriptions,
      recentPayments,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.load.count(),
      prisma.truck.count(),
      prisma.booking.count(),
      prisma.document.count({ where: { verificationStatus: VerificationStatus.Pending } }),
      prisma.subscription.count({ where: { status: 'active', expiresAt: { gt: new Date() } } }),
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
      totalRevenue: totalRevenue._sum.amount ?? 0,
      recentPayments,
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

    return { bookings, total, page, pages: Math.ceil(total / limit) }
  }
}
