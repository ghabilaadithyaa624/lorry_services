import { Module, Global } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

export const REDIS_CLIENT = 'REDIS_CLIENT'

class InMemoryFallbackStore {
  private store = new Map<string, string>()
  private sets = new Map<string, Set<string>>()

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null
  }

  async set(key: string, value: any, ...args: any[]): Promise<'OK'> {
    this.store.set(key, String(value))
    return 'OK'
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0
    for (const k of keys) {
      if (this.store.delete(k) || this.sets.delete(k)) count++
    }
    return count
  }

  async incr(key: string): Promise<number> {
    const cur = parseInt(this.store.get(key) || '0', 10)
    const next = cur + 1
    this.store.set(key, String(next))
    return next
  }

  async pexpire(key: string, ms: number): Promise<number> {
    return 1
  }

  async expire(key: string, sec: number): Promise<number> {
    return 1
  }

  async ping(): Promise<string> {
    return 'PONG'
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set())
    const set = this.sets.get(key)!
    for (const m of members) set.add(m)
    return members.length
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key)
    if (!set) return 0
    let count = 0
    for (const m of members) {
      if (set.delete(m)) count++
    }
    return count
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key)
    return set ? Array.from(set) : []
  }

  async mget(...keys: any[]): Promise<(string | null)[]> {
    const flat = Array.isArray(keys[0]) ? keys[0] : keys
    return flat.map((k: string) => this.store.get(k) ?? null)
  }

  pipeline() {
    const operations: Array<() => Promise<any>> = []
    const pipe: any = {
      set: (key: string, val: any) => {
        operations.push(() => this.set(key, val))
        return pipe
      },
      del: (...keys: string[]) => {
        operations.push(() => this.del(...keys))
        return pipe
      },
      exec: async () => {
        const results: Array<[null, any]> = []
        for (const op of operations) {
          results.push([null, await op()])
        }
        return results
      },
    }
    return pipe
  }
}

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
          // Handled via fallback proxy
        })

        const fallback = new InMemoryFallbackStore()
        const proxy = new Proxy(client, {
          get(target: any, prop: string | symbol) {
            if (typeof prop === 'string' && typeof (fallback as any)[prop] === 'function') {
              return (...args: any[]) => {
                if (target.status === 'ready') {
                  try {
                    const result = target[prop](...args)
                    if (result && typeof result.catch === 'function') {
                      return result.catch(() => (fallback as any)[prop](...args))
                    }
                    return result
                  } catch {
                    return (fallback as any)[prop](...args)
                  }
                }
                return (fallback as any)[prop](...args)
              }
            }
            const orig = target[prop]
            return typeof orig === 'function' ? orig.bind(target) : orig
          },
        })

        return proxy
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
