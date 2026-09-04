/**
 * Booking payment milestone client contract.
 *
 * README documents two explicit milestone endpoints:
 *   PATCH /bookings/:id/confirm-advance
 *   PATCH /bookings/:id/confirm-balance
 *
 * `PATCH /bookings/:id/status` is retained for lifecycle transitions only and
 * must not be the path used to record a payment milestone. These tests pin the
 * URLs and verb so the client cannot silently drift back to the status route.
 */

const mockApiInstance = jest.fn() as any
mockApiInstance.interceptors = {
  request: { use: jest.fn(), eject: jest.fn() },
  response: { use: jest.fn(), eject: jest.fn() },
}
mockApiInstance.defaults = { headers: { common: {} } }
mockApiInstance.get = jest.fn()
mockApiInstance.post = jest.fn()
mockApiInstance.patch = jest.fn()

jest.mock('axios', () => {
  const create = jest.fn(() => mockApiInstance)
  return {
    __esModule: true,
    create,
    post: jest.fn(),
    default: { create, post: jest.fn() },
  }
})

const globalAny = global as any
globalAny.window = { location: { href: '', pathname: '/bookings' } }
globalAny.localStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
globalAny.document = { cookie: '' }

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bookingsApi } = require('./api')

describe('bookingsApi payment milestones', () => {
  beforeEach(() => {
    mockApiInstance.patch.mockReset()
    mockApiInstance.patch.mockResolvedValue({ data: {} })
  })

  it('confirms the advance via the dedicated endpoint', async () => {
    await bookingsApi.confirmAdvance('booking-1001')

    expect(mockApiInstance.patch).toHaveBeenCalledTimes(1)
    expect(mockApiInstance.patch).toHaveBeenCalledWith('/bookings/booking-1001/confirm-advance')
  })

  it('confirms the balance via the dedicated endpoint', async () => {
    await bookingsApi.confirmBalance('booking-1001')

    expect(mockApiInstance.patch).toHaveBeenCalledTimes(1)
    expect(mockApiInstance.patch).toHaveBeenCalledWith('/bookings/booking-1001/confirm-balance')
  })

  it('never routes a milestone through the status endpoint', async () => {
    await bookingsApi.confirmAdvance('booking-1001')
    await bookingsApi.confirmBalance('booking-1001')

    for (const [url] of mockApiInstance.patch.mock.calls) {
      expect(url).not.toContain('/status')
    }
  })

  it('url-encodes nothing unexpected and targets the booking id given', async () => {
    await bookingsApi.confirmAdvance('abc-123')
    expect(mockApiInstance.patch).toHaveBeenCalledWith('/bookings/abc-123/confirm-advance')
  })

  it('keeps PATCH /status available for lifecycle transitions', async () => {
    await bookingsApi.updateStatus('booking-1001', 'InTransit')

    expect(mockApiInstance.patch).toHaveBeenCalledWith('/bookings/booking-1001/status', {
      status: 'InTransit',
    })
  })

  it('propagates milestone errors to the caller instead of resolving', async () => {
    const forbidden = Object.assign(new Error('Request failed'), {
      response: { status: 403, data: { message: 'Only the cargo owner can confirm payment milestones' } },
    })
    mockApiInstance.patch.mockRejectedValueOnce(forbidden)

    await expect(bookingsApi.confirmAdvance('booking-1001')).rejects.toMatchObject({
      response: { status: 403 },
    })
  })
})
