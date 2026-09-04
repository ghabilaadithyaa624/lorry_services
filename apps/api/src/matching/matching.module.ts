import { Module } from '@nestjs/common'
import { MatchingService } from './matching.service'
import { ReturnLoadsService } from './return-loads.service'
import { MatchingController } from './matching.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [MatchingController],
  providers: [MatchingService, ReturnLoadsService],
  exports: [MatchingService, ReturnLoadsService],
})
export class MatchingModule {}
