import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { prisma, UserRole, SubscriptionStatus } from '@lorrycarry/database'
import { S3Service } from '../common/services/s3.service'
import { UpdateUserDto } from './dto/update-user.dto'

export interface ActivityItem {
  id: string
  category: 'ACCOUNT' | 'LOAD' | 'TRUCK' | 'DOCUMENT' | 'BOOKING' | 'PAYMENT' | 'SECURITY'
  title: string
  description: string
  timestamp: Date
  status?: string
  actionUrl?: string
  metadata?: Record<string, any>
}

export interface UserNotificationItem {
  id: string
  category: 'BOOKING' | 'LOAD' | 'TRUCK' | 'PAYMENT' | 'KYC' | 'TRACKING' | 'SYSTEM'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Fetch current user's profile with completion & verification statistics
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trucks: {
          include: {
            documents: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            loads: true,
            trucks: true,
            loadOwnerBookings: true,
            truckOwnerBookings: true,
            payments: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException('User profile not found')
    }

    // Active subscription status
    const latestSub = user.subscriptions[0]
    const hasActiveSubscription =
      latestSub?.status === SubscriptionStatus.active &&
      new Date(latestSub.expiresAt) > new Date()

    // Calculate Profile Completion Index (0 - 100%)
    let completionScore = 40 // Base: Phone verified + Role selected
    const missingSteps: string[] = []

    if (user.name && user.name.trim().length > 1) {
      completionScore += 20
    } else {
      missingSteps.push('Add your full name or company trading name')
    }

    if (user.role === UserRole.truck_owner) {
      if (user.trucks.length > 0) {
        completionScore += 20
        const hasVerifiedDocs = user.trucks.some((t) =>
          t.documents.some((d) => d.verificationStatus === 'Verified')
        )
        const hasUploadedDocs = user.trucks.some((t) => t.documents.length > 0)

        if (hasVerifiedDocs) {
          completionScore += 20
        } else if (hasUploadedDocs) {
          completionScore += 10
          missingSteps.push('Awaiting admin verification for uploaded RC/Insurance')
        } else {
          missingSteps.push('Upload RC & Insurance documents for vehicle verification')
        }
      } else {
        missingSteps.push('Register your first truck or fleet vehicle')
      }
    } else if (user.role === UserRole.load_owner) {
      if (user._count.loads > 0) {
        completionScore += 20
      } else {
        missingSteps.push('Post your first freight requirement')
      }

      if (hasActiveSubscription) {
        completionScore += 20
      } else {
        missingSteps.push('Activate Transporter Contact Pass for direct calls')
      }
    } else {
      completionScore = 100
    }

    completionScore = Math.min(100, completionScore)

    // Fleet verification state for truck owners
    let fleetVerificationStatus: 'Not Registered' | 'Pending' | 'Verified' | 'Partially Verified' = 'Not Registered'
    if (user.role === UserRole.truck_owner) {
      if (user.trucks.length === 0) {
        fleetVerificationStatus = 'Not Registered'
      } else {
        const verifiedCount = user.trucks.filter((t) => t.verificationStatus === 'Verified').length
        if (verifiedCount === user.trucks.length) {
          fleetVerificationStatus = 'Verified'
        } else if (verifiedCount > 0) {
          fleetVerificationStatus = 'Partially Verified'
        } else {
          fleetVerificationStatus = 'Pending'
        }
      }
    }

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profileCompletion: {
        score: completionScore,
        missingSteps,
      },
      verification: {
        phoneVerified: true, // Logged in via OTP
        fleetStatus: user.role === UserRole.truck_owner ? fleetVerificationStatus : undefined,
        isVerifiedTransporter: fleetVerificationStatus === 'Verified',
      },
      subscription: latestSub
        ? {
            id: latestSub.id,
            plan: latestSub.plan,
            status: latestSub.status,
            startedAt: latestSub.startedAt,
            expiresAt: latestSub.expiresAt,
            isActive: hasActiveSubscription,
          }
        : null,
      stats: {
        totalLoads: user._count.loads,
        totalTrucks: user._count.trucks,
        totalBookings:
          user.role === UserRole.truck_owner
            ? user._count.truckOwnerBookings
            : user._count.loadOwnerBookings,
        totalPayments: user._count.payments,
      },
      trucks: user.trucks.map((t) => ({
        id: t.id,
        registrationNumber: t.registrationNumber,
        bodyType: t.bodyType,
        tonnageCapacity: t.tonnageCapacity,
        verificationStatus: t.verificationStatus,
        documentsCount: t.documents.length,
      })),
    }
  }

  /**
   * Update basic profile details
   */
  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
      },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    })

    return {
      success: true,
      message: 'Profile updated successfully',
      user,
    }
  }

  /**
   * Get all KYC and vehicle documents for user's fleet with signed S3 URLs
   */
  async getDocuments(userId: string) {
    const documents = await prisma.document.findMany({
      where: {
        truck: {
          userId,
        },
      },
      include: {
        truck: {
          select: {
            id: true,
            registrationNumber: true,
            bodyType: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        let signedUrl = doc.s3Url
        if (doc.s3Key) {
          try {
            signedUrl = await this.s3Service.getSignedUrl(doc.s3Key, 3600)
          } catch (err: any) {
            this.logger.warn(`Could not generate signed URL for document ${doc.id}: ${err.message}`)
          }
        }

        return {
          id: doc.id,
          truckId: doc.truckId,
          truckRegistration: doc.truck.registrationNumber,
          truckBodyType: doc.truck.bodyType,
          type: doc.type,
          docNumber: doc.docNumber,
          s3Url: signedUrl,
          originalFilename: doc.originalFilename,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          verificationStatus: doc.verificationStatus,
          verificationNotes: doc.verificationNotes,
          verifiedAt: doc.verifiedAt,
          createdAt: doc.createdAt,
        }
      })
    )

    return {
      documents: documentsWithUrls,
      totalCount: documentsWithUrls.length,
      verifiedCount: documentsWithUrls.filter((d) => d.verificationStatus === 'Verified').length,
      pendingCount: documentsWithUrls.filter((d) => d.verificationStatus === 'Pending').length,
      rejectedCount: documentsWithUrls.filter((d) => d.verificationStatus === 'Rejected').length,
    }
  }

  /**
   * Get full chronological user activity history from actual database events
   */
  async getActivity(userId: string): Promise<ActivityItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const activities: ActivityItem[] = []

    // 1. Account Creation
    activities.push({
      id: `acc-create-${user.id}`,
      category: 'ACCOUNT',
      title: 'Account Registered',
      description: `Registered with mobile ${user.phone} as ${user.role === 'truck_owner' ? 'Lorry Owner' : 'Load Owner'}.`,
      timestamp: user.createdAt,
      status: 'Completed',
    })

    // 2. Loads
    if (user.role === UserRole.load_owner || user.role === UserRole.admin) {
      const loads = await prisma.load.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      loads.forEach((load) => {
        activities.push({
          id: `load-${load.id}`,
          category: 'LOAD',
          title: `Freight Posted: ${load.tonnageRequired}T ${load.truckType}`,
          description: `Route: ${load.loadingAddress} → ${load.unloadingAddress}`,
          timestamp: load.createdAt,
          status: load.status,
          actionUrl: `/my-loads`,
          metadata: {
            tonnage: Number(load.tonnageRequired),
            status: load.status,
            maxPrice: load.maxPrice ? Number(load.maxPrice) : null,
          },
        })
      })
    }

    // 3. Trucks & Documents
    if (user.role === UserRole.truck_owner || user.role === UserRole.admin) {
      const trucks = await prisma.truck.findMany({
        where: { userId },
        include: { documents: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      const truckActivities = trucks.flatMap((truck) => {
        const truckActivity: ActivityItem = {
          id: `truck-${truck.id}`,
          category: 'TRUCK',
          title: `Vehicle Registered: ${truck.registrationNumber}`,
          description: `${truck.tonnageCapacity}T capacity, ${truck.bodyType} body. Status: ${truck.verificationStatus}`,
          timestamp: truck.createdAt,
          status: truck.verificationStatus,
          actionUrl: `/dashboard/truck-owner`,
          metadata: {
            registrationNumber: truck.registrationNumber,
            verificationStatus: truck.verificationStatus,
          },
        }

        const docActivities = truck.documents.map((doc) => ({
          id: `doc-${doc.id}`,
          category: 'DOCUMENT' as const,
          title: `KYC Document Uploaded: ${doc.type}`,
          description: `${doc.type} for ${truck.registrationNumber} (Status: ${doc.verificationStatus})`,
          timestamp: doc.createdAt,
          status: doc.verificationStatus,
          actionUrl: `/documents`,
          metadata: {
            docNumber: doc.docNumber,
            truckNumber: truck.registrationNumber,
          },
        }))

        return [truckActivity, ...docActivities]
      })

      activities.push(...truckActivities)
    }

    // 4. Bookings
    const isTruckOwner = user.role === UserRole.truck_owner
    const bookings = await prisma.booking.findMany({
      where: isTruckOwner ? { truckOwnerId: userId } : { loadOwnerId: userId },
      include: {
        load: { select: { loadingAddress: true, unloadingAddress: true, tonnageRequired: true } },
        truck: { select: { registrationNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    bookings.forEach((booking) => {
      activities.push({
        id: `booking-${booking.id}`,
        category: 'BOOKING',
        title: `Consignment Booking: ₹${Number(booking.agreedPrice).toLocaleString('en-IN')}`,
        description: `Vehicle: ${booking.truck?.registrationNumber || 'Assigned'} | Status: ${booking.status}`,
        timestamp: booking.createdAt,
        status: booking.status,
        actionUrl: `/booking/${booking.id}`,
        metadata: {
          agreedPrice: Number(booking.agreedPrice),
          advanceConfirmed: booking.advanceConfirmed,
          balanceConfirmed: booking.balanceConfirmed,
        },
      })
    })

    // 5. Payments & Subscriptions
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    payments.forEach((payment) => {
      activities.push({
        id: `payment-${payment.id}`,
        category: 'PAYMENT',
        title: `Payment ${payment.status}: ₹${Number(payment.amount).toLocaleString('en-IN')}`,
        description: `Purpose: ${payment.purpose.replace('_', ' ').toUpperCase()} (${payment.paymentMethod || 'Online'})`,
        timestamp: payment.paidAt || payment.createdAt,
        status: payment.status,
        actionUrl: `/subscribe`,
        metadata: {
          amount: Number(payment.amount),
          purpose: payment.purpose,
          providerTxnId: payment.providerTxnId,
        },
      })
    })

    // Sort all activities chronologically descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return activities
  }

  /**
   * Get user notifications (persisted DB notifications + derived operational alerts)
   */
  async getNotifications(userId: string): Promise<{
    notifications: UserNotificationItem[]
    unreadCount: number
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trucks: { include: { documents: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const items: UserNotificationItem[] = []

    // 1. Fetch any stored notifications from DB
    const dbNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    dbNotifications.forEach((n) => {
      let category: UserNotificationItem['category'] = 'SYSTEM'
      if (n.template?.includes('checkpoint')) category = 'TRACKING'
      else if (n.template?.includes('payment') || n.template?.includes('sub')) category = 'PAYMENT'
      else if (n.template?.includes('kyc') || n.template?.includes('doc')) category = 'KYC'
      else if (n.template?.includes('booking')) category = 'BOOKING'

      items.push({
        id: n.id,
        category,
        title: n.template?.replace(/_/g, ' ').toUpperCase() || 'System Notification',
        message: n.content || 'You have an account update.',
        timestamp: n.createdAt,
        read: n.status === 'Delivered' || n.status === 'Sent',
      })
    })

    // 2. Derive real operational notifications from active domain entities
    // Check pending KYC
    if (user.role === UserRole.truck_owner) {
      user.trucks.forEach((truck) => {
        if (truck.verificationStatus === 'Pending') {
          items.push({
            id: `notif-kyc-pending-${truck.id}`,
            category: 'KYC',
            title: 'Vehicle Verification in Review',
            message: `Documents for truck ${truck.registrationNumber} are currently under review by compliance team.`,
            timestamp: truck.createdAt,
            read: false,
            actionUrl: '/documents',
          })
        } else if (truck.verificationStatus === 'Verified') {
          items.push({
            id: `notif-kyc-verified-${truck.id}`,
            category: 'KYC',
            title: 'Vehicle Verified Successfully',
            message: `Truck ${truck.registrationNumber} is verified and visible in marketplace searches.`,
            timestamp: truck.verifiedAt || truck.updatedAt,
            read: true,
            actionUrl: '/dashboard/truck-owner',
          })
        }
      })
    }

    // Check active bookings
    const isTruckOwner = user.role === UserRole.truck_owner
    const activeBookings = await prisma.booking.findMany({
      where: {
        ...(isTruckOwner ? { truckOwnerId: userId } : { loadOwnerId: userId }),
        status: { in: ['Pending', 'Confirmed', 'InTransit'] },
      },
      include: {
        load: { select: { loadingAddress: true, unloadingAddress: true } },
        truck: { select: { registrationNumber: true } },
        checkpoints: { where: { crossedAt: { not: null } }, orderBy: { seq: 'desc' }, take: 1 },
      },
      take: 10,
    })

    activeBookings.forEach((b) => {
      if (!b.advanceConfirmed) {
        items.push({
          id: `notif-adv-${b.id}`,
          category: 'PAYMENT',
          title: 'Loading Advance Pending',
          message: `Booking ${b.id.slice(0, 8)} requires 50% advance release confirmation.`,
          timestamp: b.createdAt,
          read: false,
          actionUrl: `/booking/${b.id}`,
        })
      }

      if (b.checkpoints.length > 0) {
        const lastCp = b.checkpoints[0]
        items.push({
          id: `notif-cp-${b.id}-${lastCp.seq}`,
          category: 'TRACKING',
          title: `Milestone ${lastCp.seq}/5: ${lastCp.name} Crossed`,
          message: `Consignment on vehicle ${b.truck?.registrationNumber} crossed ${lastCp.name}.`,
          timestamp: lastCp.crossedAt || new Date(),
          read: false,
          actionUrl: `/booking/${b.id}`,
        })
      }
    })

    // Sort by timestamp desc
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const unreadCount = items.filter((i) => !i.read).length

    return {
      notifications: items,
      unreadCount,
    }
  }
}
