import { Module } from '@nestjs/common'
import { MatchingService } from './matching.service'
import { MatchingController } from './matching.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
