import { api, matchesApi } from './api'

describe('return-load API client', () => {
  afterEach(() => { jest.restoreAllMocks() })

  it('uses the canonical matching endpoint and lets the server apply the 50 km default', async () => {
    const get = jest.spyOn(api, 'get').mockResolvedValue({ data: { opportunities: [] } })
    await matchesApi.getReturnLoads('truck-1')
    expect(get).toHaveBeenCalledWith('/matching/truck/truck-1/return-loads', { params: {}, signal: undefined })
  })

  it('forwards zero values, paired coordinates and cancellation', async () => {
    const get = jest.spyOn(api, 'get').mockResolvedValue({ data: {} })
    const { signal } = new AbortController()
    const params = { radius: 25, limit: 5, minScore: 0, destinationLat: 0, destinationLng: 0 }
    await matchesApi.getReturnLoads('truck-1', params, signal)
    expect(get).toHaveBeenCalledWith('/matching/truck/truck-1/return-loads', { params, signal })
  })

  it('does not hide invalid partial coordinates or a zero radius from server validation', async () => {
    const get = jest.spyOn(api, 'get').mockRejectedValue(new Error('Invalid parameters'))
    await expect(matchesApi.getReturnLoads('truck-1', { radius: 0, destinationLat: 10 })).rejects.toThrow('Invalid parameters')
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith('/matching/truck/truck-1/return-loads', {
      params: { radius: 0, destinationLat: 10 }, signal: undefined,
    })
  })

  it('encodes truck IDs as a single path segment', async () => {
    const get = jest.spyOn(api, 'get').mockResolvedValue({ data: {} })
    await matchesApi.getReturnLoads('a/b?radius=300')
    expect(get.mock.calls[0][0]).toBe('/matching/truck/a%2Fb%3Fradius%3D300/return-loads')
  })
})
