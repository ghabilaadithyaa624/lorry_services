import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { prisma } from '@lorrycarry/database'

export interface CreateRatingDto {
  bookingId: string
  rating: number // 1-5
  review?: string
  ratedUserId: string
  category: 'driver_service' | 'factory_payment' | 'overall'
}

export interface GetRatingSummaryDto {
  userId: string
}

@Injectable()
export class RatingsService {
  /**
   * Submit a rating for a completed trip
   */
  async createRating(raterId: string, dto: CreateRatingDto) {
    const { bookingId, rating, review, ratedUserId, category } = dto

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5')
    }

    // Verify booking exists and is completed
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        status: 'Completed',
        OR: [
          { loadOwnerId: raterId }, // Factory owner rating driver
          { truckOwnerId: raterId }, // Driver rating factory owner
        ],
      },
    })

    if (!booking) {
      throw new NotFoundException('Completed booking not found or access denied')
    }

    // Verify the rated user is part of this booking
    const isValidRatedUser = 
      (ratedUserId === booking.loadOwnerId || ratedUserId === booking.truckOwnerId) &&
      ratedUserId !== raterId

    if (!isValidRatedUser) {
      throw new BadRequestException('Invalid rated user for this booking')
    }

    // Check if rating already exists
    const existingRating = await prisma.rating.findFirst({
      where: {
        bookingId,
        raterId,
        ratedUserId,
      },
    })

    if (existingRating) {
      // Update existing rating
      return prisma.rating.update({
        where: { id: existingRating.id },
        data: {
          rating,
          review,
          category,
        },
      })
    }

    // Create new rating
    return prisma.rating.create({
      data: {
        bookingId,
        raterId,
        ratedUserId,
        rating,
        review,
        category,
      },
    })
  }

  /**
   * Get rating summary for a user
   */
  async getRatingSummary(userId: string) {
    const ratings = await prisma.rating.findMany({
      where: { ratedUserId: userId },
    })

    if (ratings.length === 0) {
      return {
        userId,
        averageRating: 0,
        totalRatings: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = totalRating / ratings.length

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratings.forEach(r => {
      ratingBreakdown[r.rating as keyof typeof ratingBreakdown]++
    })

    return {
      userId,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
      ratingBreakdown,
    }
  }

  /**
   * Get all ratings for a user (paginated)
   */
  async getUserRatings(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit

    const [ratings, total] = await Promise.all([
      prisma.rating.findMany({
        where: { ratedUserId: userId },
        include: {
          rater: {
            select: { id: true, name: true, phone: true },
          },
          booking: {
            select: {
              id: true,
              load: {
                select: { loadingAddress: true, unloadingAddress: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rating.count({ where: { ratedUserId: userId } }),
    ])

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Check if user needs to submit rating for a completed booking
   */
  async getPendingRatings(userId: string) {
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: 'Completed',
        OR: [
          { loadOwnerId: userId },
          { truckOwnerId: userId },
        ],
      },
      include: {
        load: { include: { user: true } },
        truck: { include: { user: true } },
      },
    })

    const pendingRatings = []

    for (const booking of completedBookings) {
      const isLoadOwner = booking.loadOwnerId === userId
      const otherPartyId = isLoadOwner ? booking.truckOwnerId : booking.loadOwnerId
      const otherPartyName = isLoadOwner 
        ? booking.truck.user?.name 
        : booking.load.user?.name

      // Check if rating already submitted
      const existingRating = await prisma.rating.findFirst({
        where: {
          bookingId: booking.id,
          raterId: userId,
        },
      })

      if (!existingRating) {
        pendingRatings.push({
          bookingId: booking.id,
          otherPartyId,
          otherPartyName: otherPartyName || 'Unknown',
          isLoadOwner,
          category: isLoadOwner ? 'driver_service' : 'factory_payment',
        })
      }
    }

    return pendingRatings
  }
}
