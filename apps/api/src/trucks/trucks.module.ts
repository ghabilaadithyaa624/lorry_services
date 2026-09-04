import { Module } from '@nestjs/common'
import { TrucksController } from './trucks.controller'
import { TrucksService } from './trucks.service'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { VahanService } from '../common/services/vahan.service'
import { S3Service } from '../common/services/s3.service'
import { MatchingModule } from '../matching/matching.module'

@Module({
  imports: [MatchingModule],
  controllers: [TrucksController],
  providers: [TrucksService, MapmyIndiaService, VahanService, S3Service],
  exports: [TrucksService],
})
export class TrucksModule {}