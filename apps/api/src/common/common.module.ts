import { Module } from '@nestjs/common'
import { MapmyIndiaService } from './services/mapmyindia.service'
import { S3Service } from './services/s3.service'
import { RedisModule } from './redis/redis.module'

/**
 * CommonModule
 * Provides shared infrastructure services (geocoding, file storage, Redis)
 * to any feature module that imports it.
 */
@Module({
  imports: [RedisModule],
  providers: [MapmyIndiaService, S3Service],
  exports: [MapmyIndiaService, S3Service, RedisModule],
})
export class CommonModule {}
