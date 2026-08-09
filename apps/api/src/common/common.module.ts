import { Module } from '@nestjs/common'
import { MapmyIndiaService } from './services/mapmyindia.service'
import { S3Service } from './services/s3.service'
import { RedisModule } from './redis/redis.module'
import { HealthController } from './controllers/health.controller'

/**
 * CommonModule
 * Provides shared infrastructure services (geocoding, file storage, Redis)
 * and system health / readiness endpoints.
 */
@Module({
  imports: [RedisModule],
  controllers: [HealthController],
  providers: [MapmyIndiaService, S3Service],
  exports: [MapmyIndiaService, S3Service, RedisModule],
})
export class CommonModule {}
