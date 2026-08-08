import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
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
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { CommonModule } from './common/common.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  providers: [
    // Apply JWT guard globally (all routes protected by default)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}