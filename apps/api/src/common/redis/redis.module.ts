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
        const client = redisUrl
          ? new Redis(redisUrl, {
              tls: redisUrl.startsWith('rediss://') ? {} : undefined,
              lazyConnect: true,
              enableOfflineQueue: false,
              retryStrategy: () => null,
            })
          : new Redis({
              host: config.get<string>('REDIS_HOST', 'localhost'),
              port: Number(config.get<number | string>('REDIS_PORT', 6379)),
              password: config.get<string>('REDIS_PASSWORD') || undefined,
              tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
              lazyConnect: true,
              enableOfflineQueue: false,
              retryStrategy: () => null,
            })

        let hasLogged = false
        client.on('error', (err) => {
          if (!hasLogged) {
            hasLogged = true
            console.warn('[Redis] Offline/fallback mode active:', err.message || 'connection failed')
          }
        })

        client.connect().catch(() => {
          // Handled via error listener
        })

        return client
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
