import axios from 'axios'

let mockResponseInterceptorReject: any

const mockApiInstance = jest.fn() as any
mockApiInstance.interceptors = {
  request: {
    use: jest.fn(),
    eject: jest.fn(),
  },
  response: {
    use: jest.fn((_resolve, reject) => {
      mockResponseInterceptorReject = reject
    }),
    eject: jest.fn(),
  },
}
mockApiInstance.defaults = {
  headers: {
    common: {},
  },
}

jest.mock('axios', () => {
  const mockAxiosPost = jest.fn()
  const mockAxiosCreate = jest.fn(() => mockApiInstance)
  return {
    __esModule: true,
    create: mockAxiosCreate,
    post: mockAxiosPost,
    default: {
      create: mockAxiosCreate,
      post: mockAxiosPost,
    },
  }
})

// Setup global mock variables BEFORE importing ./api to ensure any immediate client-side checks don't fail.
let mockLocalStorage: Record<string, string> = {}
let mockCookies: Record<string, string> = {}

const localGlobal = global as any

localGlobal.window = {
  location: {
    href: '',
  },
}

localGlobal.localStorage = {
  getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
  setItem: jest.fn((key: string, val: string) => {
    mockLocalStorage[key] = val
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage[key]
  }),
  clear: jest.fn(() => {
    mockLocalStorage = {}
  }),
}

localGlobal.document = {
  get cookie() {
    return Object.entries(mockCookies)
      .map(([key, val]) => `${key}=${val}`)
      .join('; ')
  },
  set cookie(val: string) {
    const parts = val.split(';')
    const mainPart = parts[0].trim()
    const eqIdx = mainPart.indexOf('=')
    if (eqIdx !== -1) {
      const key = mainPart.substring(0, eqIdx).trim()
      const value = mainPart.substring(eqIdx + 1).trim()
      if (val.includes('max-age=0')) {
        delete mockCookies[key]
      } else {
        mockCookies[key] = value
      }
    }
  },
}

// Use require instead of ES import to prevent hoisting above mock variables initialization
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./api')

describe('api Response Interceptor — Refresh Token Retry & Error Paths', () => {
  const mockPost = axios.post as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage = {}
    mockCookies = {}
    localGlobal.window.location.href = ''
  })

  it('should trigger refresh token flow and clear credentials/redirect on refresh failure', async () => {
    // 1. Arrange
    mockLocalStorage['refreshToken'] = 'existing-refresh-token'
    mockLocalStorage['accessToken'] = 'expired-access-token'
    mockLocalStorage['user'] = JSON.stringify({ role: 'factory_owner' })
    mockCookies['accessToken'] = 'expired-access-token'
    mockCookies['userRole'] = 'factory_owner'

    const refreshError = new Error('Invalid refresh token')
    mockPost.mockRejectedValueOnce(refreshError)

    const originalRequest: any = {
      url: '/users/me',
      headers: {},
    }
    const error401: any = {
      config: originalRequest,
      response: {
        status: 401,
      },
    }

    // 2. Act & Assert
    await expect(mockResponseInterceptorReject(error401)).rejects.toThrow('Invalid refresh token')

    // 3. Verify clean up of localStorage
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken')
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken')
    expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    expect(mockLocalStorage['accessToken']).toBeUndefined()
    expect(mockLocalStorage['refreshToken']).toBeUndefined()
    expect(mockLocalStorage['user']).toBeUndefined()

    // 4. Verify cookies cleared
    expect(mockCookies['accessToken']).toBeUndefined()
    expect(mockCookies['userRole']).toBeUndefined()

    // 5. Verify redirect to /login
    expect(localGlobal.window.location.href).toBe('/login')
  })

  it('should fail immediately when no refresh token is present in localStorage', async () => {
    // 1. Arrange
    mockCookies['accessToken'] = 'expired-access-token'
    mockCookies['userRole'] = 'factory_owner'

    const originalRequest: any = {
      url: '/users/me',
      headers: {},
    }
    const error401: any = {
      config: originalRequest,
      response: {
        status: 401,
      },
    }

    // 2. Act & Assert
    await expect(mockResponseInterceptorReject(error401)).rejects.toThrow('No refresh token available')

    // 3. Verify clean up of localStorage
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken')
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken')
    expect(localStorage.removeItem).toHaveBeenCalledWith('user')

    // 4. Verify cookies cleared
    expect(mockCookies['accessToken']).toBeUndefined()
    expect(mockCookies['userRole']).toBeUndefined()

    // 5. Verify redirect to /login
    expect(localGlobal.window.location.href).toBe('/login')
  })

  it('should successfully refresh the token, update storage/cookies and retry the original request', async () => {
    // 1. Arrange
    mockLocalStorage['refreshToken'] = 'valid-refresh-token'
    mockLocalStorage['accessToken'] = 'expired-access-token'
    mockLocalStorage['user'] = JSON.stringify({ role: 'factory_owner' })

    const newAccessToken = 'newly-acquired-access-token'
    const newRefreshToken = 'newly-acquired-refresh-token'

    mockPost.mockResolvedValueOnce({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    })

    const originalRequest: any = {
      url: '/users/me',
      headers: {
        Authorization: 'Bearer expired-access-token',
      },
    }
    const error401: any = {
      config: originalRequest,
      response: {
        status: 401,
      },
    }

    mockApiInstance.mockResolvedValueOnce({ data: 'success-data' })

    // 2. Act
    const result = await mockResponseInterceptorReject(error401)

    // 3. Assert
    expect(result).toEqual({ data: 'success-data' })
    expect(mockPost).toHaveBeenCalledWith(expect.any(String), {
      refreshToken: 'valid-refresh-token',
    })

    expect(mockLocalStorage['accessToken']).toBe(newAccessToken)
    expect(mockLocalStorage['refreshToken']).toBe(newRefreshToken)

    expect(mockCookies['accessToken']).toBe(newAccessToken)
    expect(mockCookies['userRole']).toBe('factory_owner')

    expect(originalRequest._retry).toBe(true)
    expect(originalRequest.headers.Authorization).toBe(`Bearer ${newAccessToken}`)
    expect(mockApiInstance).toHaveBeenCalledWith(originalRequest)
  })

  it('should handle invalid user JSON gracefully during refresh token flow', async () => {
    mockLocalStorage['refreshToken'] = 'valid-refresh-token'
    mockLocalStorage['accessToken'] = 'expired-access-token'
    mockLocalStorage['user'] = 'invalid-json'

    mockPost.mockResolvedValueOnce({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    })

    const originalRequest: any = { url: '/users/me', headers: {} }
    const error401: any = { config: originalRequest, response: { status: 401 } }
    mockApiInstance.mockResolvedValueOnce({ data: 'success-data' })

    const result = await mockResponseInterceptorReject(error401)
    expect(result).toEqual({ data: 'success-data' })
    expect(mockCookies['userRole']).toBeUndefined()
  })

  it('should set userRole cookie when user JSON contains a role during refresh', async () => {
    mockLocalStorage['refreshToken'] = 'valid-refresh-token'
    mockLocalStorage['accessToken'] = 'expired-access-token'
    mockLocalStorage['user'] = JSON.stringify({ role: 'truck_driver' })

    mockPost.mockResolvedValueOnce({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    })

    const originalRequest: any = { url: '/users/me', headers: {} }
    const error401: any = { config: originalRequest, response: { status: 401 } }
    mockApiInstance.mockResolvedValueOnce({ data: 'success-data' })

    await mockResponseInterceptorReject(error401)
    expect(mockCookies['userRole']).toBe('truck_driver')
  })
})
