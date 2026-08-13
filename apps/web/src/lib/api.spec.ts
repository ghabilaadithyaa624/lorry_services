// Define global window, localStorage, and document mock before importing api
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

const mockLocation = {
  href: '',
}

global.window = {
  location: mockLocation,
} as any

global.localStorage = mockLocalStorage as any

let cookies: string[] = []
global.document = {
  get cookie() {
    return cookies.join('; ')
  },
  set cookie(val: string) {
    cookies.push(val)
  },
} as any

import axios from 'axios'
import { api } from './api'

// Mock standard axios module
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios')
  return {
    ...actualAxios,
    post: jest.fn(),
    create: jest.fn((config) => {
      return actualAxios.create(config)
    }),
  }
})

// Helper to create AxiosError
const createAxiosError = (status: number, config: any) => {
  const error = new Error('Request failed') as any
  error.config = config
  error.response = {
    status,
    data: { message: 'Unauthorized' },
    headers: {},
    statusText: 'Unauthorized',
    config,
  }
  error.isAxiosError = true
  return error
}

describe('Auth API Interceptor', () => {
  let originalAdapter: any

  beforeAll(() => {
    originalAdapter = api.defaults.adapter
  })

  afterAll(() => {
    api.defaults.adapter = originalAdapter
  })

  beforeEach(() => {
    jest.clearAllMocks()
    cookies = []
    mockLocation.href = ''
  })

  it('Case 1: handles syntax error gracefully when user JSON in localStorage is invalid', async () => {
    // Mock token refresh endpoint to succeed
    ;(axios.post as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    })

    // Mock localStorage
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'refreshToken') return 'valid-refresh-token'
      if (key === 'user') return 'invalid-json' // Triggers parse error in interceptor!
      return null
    })

    // Mock api's adapter: first request fails with 401, second retry request succeeds
    const mockAdapter = jest
      .fn()
      .mockRejectedValueOnce(createAxiosError(401, { url: '/test-route', headers: {} }))
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test-route', headers: {} },
      })

    api.defaults.adapter = mockAdapter

    // Trigger api call
    const res = await api.get('/test-route')

    // Assert request succeeded eventually
    expect(res.data).toEqual({ success: true })

    // Verify localStorage.setItem was called with new tokens
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token')

    // Verify cookies are NOT updated (since parse failed)
    expect(document.cookie).not.toContain('userRole=')
  })

  it('Case 2: parses valid user JSON with role and sets auth cookies', async () => {
    // Mock token refresh endpoint to succeed
    ;(axios.post as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    })

    // Mock localStorage
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'refreshToken') return 'valid-refresh-token'
      if (key === 'user') return JSON.stringify({ role: 'load_owner' }) // Valid JSON with role!
      return null
    })

    // Mock api's adapter: first request fails with 401, second retry request succeeds
    const mockAdapter = jest
      .fn()
      .mockRejectedValueOnce(createAxiosError(401, { url: '/test-route', headers: {} }))
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test-route', headers: {} },
      })

    api.defaults.adapter = mockAdapter

    // Trigger api call
    const res = await api.get('/test-route')

    // Assert request succeeded eventually
    expect(res.data).toEqual({ success: true })

    // Verify cookies are updated
    expect(document.cookie).toContain('userRole=load_owner')
  })

  it('Case 3: parses valid user JSON but without role and does not set cookies', async () => {
    // Mock token refresh endpoint to succeed
    ;(axios.post as jest.Mock).mockResolvedValue({
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    })

    // Mock localStorage
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'refreshToken') return 'valid-refresh-token'
      if (key === 'user') return JSON.stringify({ name: 'John Doe' }) // No role!
      return null
    })

    // Mock api's adapter: first request fails with 401, second retry request succeeds
    const mockAdapter = jest
      .fn()
      .mockRejectedValueOnce(createAxiosError(401, { url: '/test-route', headers: {} }))
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url: '/test-route', headers: {} },
      })

    api.defaults.adapter = mockAdapter

    // Trigger api call
    const res = await api.get('/test-route')

    // Assert request succeeded eventually
    expect(res.data).toEqual({ success: true })

    // Verify userRole cookie is NOT set
    expect(document.cookie).not.toContain('userRole=')
import axios from 'axios'

let mockResponseInterceptorResolve: any
let mockResponseInterceptorReject: any

const mockApiInstance = jest.fn() as any
mockApiInstance.interceptors = {
  request: {
    use: jest.fn(),
    eject: jest.fn(),
  },
  response: {
    use: jest.fn((resolve, reject) => {
      mockResponseInterceptorResolve = resolve
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
const { api } = require('./api')

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
    mockLocalStorage['user'] = JSON.stringify({ role: 'load_owner' })
    mockCookies['accessToken'] = 'expired-access-token'
    mockCookies['userRole'] = 'load_owner'

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
    expect(localGlobal.document.cookie).toBe('')

    // 5. Verify redirect to /login
    expect(localGlobal.window.location.href).toBe('/login')
  })

  it('should fail immediately when no refresh token is present in localStorage', async () => {
    // 1. Arrange
    mockCookies['accessToken'] = 'expired-access-token'
    mockCookies['userRole'] = 'load_owner'

    // No refreshToken in mockLocalStorage
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
    expect(localGlobal.document.cookie).toBe('')

    // 5. Verify redirect to /login
    expect(localGlobal.window.location.href).toBe('/login')
  })

  it('should successfully refresh the token, update storage/cookies and retry the original request', async () => {
    // 1. Arrange
    mockLocalStorage['refreshToken'] = 'valid-refresh-token'
    mockLocalStorage['accessToken'] = 'expired-access-token'
    mockLocalStorage['user'] = JSON.stringify({ role: 'load_owner' })

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

    // Mock the subsequent retry request
    mockApiInstance.mockResolvedValueOnce({ data: 'success-data' })

    // 2. Act
    const result = await mockResponseInterceptorReject(error401)

    // 3. Assert
    expect(result).toEqual({ data: 'success-data' })
    expect(mockPost).toHaveBeenCalledWith(expect.any(String), {
      refreshToken: 'valid-refresh-token',
    })

    // Verify localStorage has been updated
    expect(mockLocalStorage['accessToken']).toBe(newAccessToken)
    expect(mockLocalStorage['refreshToken']).toBe(newRefreshToken)

    // Verify cookies are set with the new token
    expect(mockCookies['accessToken']).toBe(newAccessToken)
    expect(mockCookies['userRole']).toBe('load_owner')
    expect(localGlobal.document.cookie).toContain(`accessToken=${newAccessToken}`)
    expect(localGlobal.document.cookie).toContain('userRole=load_owner')

    // Verify original request has been updated and retried
    expect(originalRequest._retry).toBe(true)
    expect(originalRequest.headers.Authorization).toBe(`Bearer ${newAccessToken}`)
    expect(mockApiInstance).toHaveBeenCalledWith(originalRequest)
  })
})
