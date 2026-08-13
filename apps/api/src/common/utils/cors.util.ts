import { ConfigService } from '@nestjs/config'

/**
 * Retrieves and parses safe CORS origins dynamically.
 * In a production environment (NODE_ENV === 'production'), hardcoded localhost origins
 * are strictly excluded, permitting only explicitly configured domain origins from
 * environment variables (e.g. CLIENT_URL, ADMIN_URL, CORS_ORIGIN) to prevent
 * unauthorized cross-origin requests.
 */
export function getAllowedOrigins(configService: ConfigService): string[] {
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development'
  const isProd = nodeEnv === 'production'

  const origins = new Set<string>()

  // Always retrieve configured origins from env variables
  const clientUrl = configService.get<string>('CLIENT_URL')
  if (clientUrl) {
    origins.add(clientUrl.trim())
  }

  const adminUrl = configService.get<string>('ADMIN_URL')
  if (adminUrl) {
    origins.add(adminUrl.trim())
  }

  const corsOriginEnv = configService.get<string>('CORS_ORIGIN')
  if (corsOriginEnv) {
    corsOriginEnv
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => origins.add(o))
  }

  // Only include hardcoded localhost origins in non-production environments
  if (!isProd) {
    const devOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3010',
      'http://localhost:3011',
    ]
    devOrigins.forEach((o) => origins.add(o))
  }

  return Array.from(origins)
}
