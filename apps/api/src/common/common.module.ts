import { Module } from '@nestjs/common'
import { MapmyIndiaService } from './services/mapmyindia.service'
import { S3Service } from './services/s3.service'

/**
 * CommonModule
 * Provides shared infrastructure services (geocoding, file storage)
 * to any feature module that imports it.
 *
 * Usage in a feature module:
 *   imports: [CommonModule]
 */
@Module({
  providers: [MapmyIndiaService, S3Service],
  exports: [MapmyIndiaService, S3Service],
})
export class CommonModule {}
