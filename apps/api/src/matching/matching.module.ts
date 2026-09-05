import { Module } from '@nestjs/common'
import { MatchingService } from './matching.service'
import { ReturnLoadsService } from './return-loads.service'
import { ReturnLoadsController } from './return-loads.controller'
import { MatchingController } from './matching.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [ReturnLoadsController, MatchingController],
  providers: [MatchingService, ReturnLoadsService],
  exports: [MatchingService, ReturnLoadsService],
})
export class MatchingModule {}
