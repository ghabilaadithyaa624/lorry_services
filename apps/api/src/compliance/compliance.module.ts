import { Module } from '@nestjs/common'
import { ComplianceController } from './compliance.controller'
import { ComplianceService } from './compliance.service'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [CommonModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
