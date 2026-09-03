import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { LoadsModule } from './loads/loads.module'
import { TrucksModule } from './trucks/trucks.module'
import { SearchModule } from './search/search.module'
import { BookingsModule } from './bookings/bookings.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { PaymentsModule } from './payments/payments.module'
import { WebhooksModule } from './webhooks/webhooks.module'
import { AdminModule } from './admin/admin.module'
import { TrackingModule } from './tracking/tracking.module'
import { DocumentsModule } from './documents/documents.module'
import { NotificationsModule } from './notifications/notifications.module'
import { MatchingModule } from './matching/matching.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { CommonModule } from './common/common.module'
import { RedisModule } from './common/redis/redis.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 120,
    }]),
    RedisModule,
    CommonModule,
    AuthModule,
    UsersModule,
    LoadsModule,
    TrucksModule,
    SearchModule,
    BookingsModule,
    SubscriptionsModule,
    PaymentsModule,
    WebhooksModule,
    AdminModule,
    TrackingModule,
    DocumentsModule,
    NotificationsModule,
    MatchingModule,
  ],
  providers: [
    // Rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Apply JWT guard globally (all routes protected by default)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}