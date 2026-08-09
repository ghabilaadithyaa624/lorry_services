import { Module, Global } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

export const REDIS_CLIENT = 'REDIS_CLIENT'

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL')
        if (redisUrl) {
          return new Redis(redisUrl, {
            tls: redisUrl.startsWith('rediss://') ? {} : undefined,
          })
        }

        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<number | string>('REDIS_PORT', 6379)),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
        })
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
