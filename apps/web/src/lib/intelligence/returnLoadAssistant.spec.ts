import { AxiosHeaders, type AxiosResponse } from 'axios'
import { fetchReturnLoadsAnswer } from './returnLoadAssistant'
import { matchesApi, trucksApi } from '@/lib/api'
import { returnLoadsFixture } from '@/test/fixtures/returnLoads'
import type { StructuredIntent } from './aiAssistantEngine'

jest.mock('@/lib/api', () => ({
  matchesApi: { getReturnLoads: jest.fn() },
  trucksApi: { getMyTrucks: jest.fn() },
}))

const response = <T>(data: T): AxiosResponse<T> => ({ data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })

const intent: StructuredIntent = { operation: 'FIND_RETURN_LOADS', rawQuery: 'return loads', destination: 'Mumbai' }
const fleet = [
  { id: 'unverified', registrationNumber: 'TN01AA0001', verificationStatus: 'Pending' },
  { id: 'truck-1', registrationNumber: 'KA01AB1234', verificationStatus: 'Verified' },
]

describe('return-load assistant API integration', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(trucksApi.getMyTrucks).mockResolvedValue(response(fleet))
    jest.mocked(matchesApi.getReturnLoads).mockResolvedValue(response(returnLoadsFixture()))
  })

  it('uses a real owned truck and server radius, rank and contact decisions without a cast or recomputation', async () => {
    const answer = await fetchReturnLoadsAnswer(intent)
    expect(matchesApi.getReturnLoads).toHaveBeenCalledWith('truck-1', { limit: 5 })
    expect(answer.message).toContain('50 km of Bengaluru hub')
    expect(answer.message).toContain('KA01AB1234')
    expect(answer.message).toContain('94.5/100')
    expect(answer.message).toContain('active subscription')
    expect(answer.message).toContain('not automatically geocoded')
    expect(answer.returnLoads?.[0].loadId).toBe('load-1')
  })

  it('does not invent a truck when the operator has none', async () => {
    jest.mocked(trucksApi.getMyTrucks).mockResolvedValue(response([]))
    const answer = await fetchReturnLoadsAnswer(intent)
    expect(answer.returnLoads).toEqual([])
    expect(answer.message).toContain('Register a truck')
    expect(matchesApi.getReturnLoads).not.toHaveBeenCalled()
  })

  it('reports an unresolved hub instead of claiming there are no loads near a fabricated city', async () => {
    const result = returnLoadsFixture({ opportunities: [] })
    result.anchor = { lat: null, lng: null, source: 'unresolved', label: 'Unknown hub', detail: 'Update vehicle location' }
    jest.mocked(matchesApi.getReturnLoads).mockResolvedValue(response(result))
    const answer = await fetchReturnLoadsAnswer(intent)
    expect(answer.message).toBe('Update vehicle location')
    expect(answer.returnLoads).toEqual([])
  })

  it('reports a genuine empty response without local fallback', async () => {
    jest.mocked(matchesApi.getReturnLoads).mockResolvedValue(response(returnLoadsFixture({ opportunities: [] })))
    expect((await fetchReturnLoadsAnswer(intent)).message).toContain('No eligible open return loads')
  })

  it.each([401, 404, 503])('fails closed on API error %s', async (status) => {
    jest.mocked(matchesApi.getReturnLoads).mockRejectedValue({ response: { status } })
    const answer = await fetchReturnLoadsAnswer(intent)
    expect(answer.returnLoads).toEqual([])
    expect(answer.message).toContain('unavailable')
    expect(answer.message).toContain('No local or sample recommendations')
    expect(matchesApi.getReturnLoads).toHaveBeenCalledTimes(1)
  })
})
