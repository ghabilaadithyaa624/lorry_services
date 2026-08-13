import { ConfigService } from '@nestjs/config'
import { getAllowedOrigins } from './cors.util'

describe('getAllowedOrigins', () => {
  let mockConfigService: jest.Mocked<ConfigService>

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>
  })

  it('should exclude hardcoded localhost origins in production', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production'
      if (key === 'CLIENT_URL') return 'https://lorrycarry.com'
      if (key === 'ADMIN_URL') return 'https://admin.lorrycarry.com'
      if (key === 'CORS_ORIGIN') return 'https://api.lorrycarry.com,https://other.domain.com'
      return null
    })

    const origins = getAllowedOrigins(mockConfigService)

    expect(origins).toEqual([
      'https://lorrycarry.com',
      'https://admin.lorrycarry.com',
      'https://api.lorrycarry.com',
      'https://other.domain.com',
    ])
    expect(origins).not.toContain('http://localhost:3000')
    expect(origins).not.toContain('http://localhost:3001')
    expect(origins).not.toContain('http://localhost:3010')
    expect(origins).not.toContain('http://localhost:3011')
  })

  it('should include hardcoded localhost origins and clean up environment variables in development', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development'
      if (key === 'CLIENT_URL') return ' https://lorrycarry-dev.com '
      if (key === 'ADMIN_URL') return ' https://admin-dev.lorrycarry.com '
      if (key === 'CORS_ORIGIN') return 'https://extra.domain.com ,  '
      return null
    })

    const origins = getAllowedOrigins(mockConfigService)

    // Expected origins should be cleaned, trimmed, and include localhost entries
    expect(origins).toContain('https://lorrycarry-dev.com')
    expect(origins).toContain('https://admin-dev.lorrycarry.com')
    expect(origins).toContain('https://extra.domain.com')
    expect(origins).toContain('http://localhost:3000')
    expect(origins).toContain('http://localhost:3001')
    expect(origins).toContain('http://localhost:3010')
    expect(origins).toContain('http://localhost:3011')

    // Expect no empty/null elements
    expect(origins).not.toContain('')
    expect(origins).not.toContain(null)
  })

  it('should default to development environment if NODE_ENV is not specified', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return undefined
      return null
    })

    const origins = getAllowedOrigins(mockConfigService)

    expect(origins).toContain('http://localhost:3000')
    expect(origins).toContain('http://localhost:3001')
    expect(origins).toContain('http://localhost:3010')
    expect(origins).toContain('http://localhost:3011')
  })
})
