import React from 'react'
import { TruckCard, Truck } from './TruckCard'

describe('TruckCard component', () => {
  const mockTruck: Truck = {
    id: 'truck-123',
    bodyType: 'Open',
    tonnageCapacity: 16,
    status: 'AVAILABLE',
    verificationStatus: 'Verified',
    registrationNumber: 'KA-01-AB-1234',
    distanceKm: 15,
    ratePerTon: 45,
    owner: undefined,
  }

  it('should export TruckCard component function', () => {
    expect(typeof TruckCard).toBe('function')
  })

  it('should render JSX element with proper type and props', () => {
    const onBook = jest.fn()
    const element = <TruckCard truck={mockTruck} onBook={onBook} />

    expect(element).toBeDefined()
    expect(element.type).toBe(TruckCard)
    expect(element.props.truck).toEqual(mockTruck)
    expect(element.props.onBook).toBe(onBook)
  })
})
