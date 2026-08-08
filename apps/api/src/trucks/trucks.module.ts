import { Module } from '@nestjs/common'
import { TrucksController } from './trucks.controller'
import { TrucksService } from './trucks.service'
import { MapmyIndiaService } from '../common/services/mapmyindia.service'
import { S3Service } from '../common/services/s3.service'

@Module({
  controllers: [TrucksController],
  providers: [TrucksService, MapmyIndiaService, S3Service],
  exports: [TrucksService],
})
export class TrucksModule {}