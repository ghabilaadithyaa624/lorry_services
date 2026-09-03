import { Module } from '@nestjs/common'
import { BookingsController } from './bookings.controller'
import { BookingsService } from './bookings.service'
import { AuthModule } from '../auth/auth.module'
import { MatchingModule } from '../matching/matching.module'

@Module({
  imports: [AuthModule, MatchingModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
