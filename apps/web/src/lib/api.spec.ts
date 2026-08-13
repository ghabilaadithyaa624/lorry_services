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
  })
})
