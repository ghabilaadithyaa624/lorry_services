import { Module } from '@nestjs/common'
import { MapmyIndiaService } from './services/mapmyindia.service'
import { VahanService } from './services/vahan.service'
import { S3Service } from './services/s3.service'
import { RedisModule } from './redis/redis.module'
import { HealthController } from './controllers/health.controller'

/**
 * CommonModule
 * Provides shared infrastructure services (geocoding, Vahan RC validation,
 * file storage, Redis) and system health / readiness endpoints.
 */
@Module({
  imports: [RedisModule],
  controllers: [HealthController],
  providers: [MapmyIndiaService, VahanService, S3Service],
  exports: [MapmyIndiaService, VahanService, S3Service, RedisModule],
})
export class CommonModule {}
