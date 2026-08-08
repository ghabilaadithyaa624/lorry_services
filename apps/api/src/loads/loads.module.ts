import { Module } from '@nestjs/common'
import { LoadsController } from './loads.controller'
import { LoadsService } from './loads.service'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [CommonModule],
  controllers: [LoadsController],
  providers: [LoadsService],
  exports: [LoadsService],
})
export class LoadsModule {}
