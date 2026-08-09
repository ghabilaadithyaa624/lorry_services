import { Controller, Get, Inject, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { prisma } from '@lorrycarry/database'
import { REDIS_CLIENT } from '../redis/redis.module'
import Redis from 'ioredis'
import { Public } from '../decorators/public.decorator'

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name)

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @Get()
  @ApiOperation({ summary: 'Basic liveness health check' })
  getLiveness() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Deep readiness probe verifying Database and Redis connectivity' })
  async getReadiness() {
    let dbHealthy = false
    let redisHealthy = false

    // 1. Check PostgreSQL Database Connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      dbHealthy = true
    } catch (dbErr: any) {
      this.logger.warn(`Readiness check failed: Database unreachable - ${dbErr.message}`)
    }

    // 2. Check Redis Connectivity
    try {
      const pong = await this.redis.ping()
      redisHealthy = pong === 'PONG'
    } catch (redisErr: any) {
      this.logger.warn(`Readiness check failed: Redis unreachable - ${redisErr.message}`)
    }

    const checks = {
      database: dbHealthy ? 'HEALTHY' : 'UNHEALTHY',
      redis: redisHealthy ? 'HEALTHY' : 'UNHEALTHY',
    }

    if (!dbHealthy || !redisHealthy) {
      throw new ServiceUnavailableException({
        status: 'NOT_READY',
        checks,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      status: 'READY',
      checks,
      timestamp: new Date().toISOString(),
    }
  }
}
