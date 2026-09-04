import React from 'react'
import { TruckCard, Truck } from './TruckCard'

describe('TruckCard Component', () => {
  let useStateSpy: jest.SpyInstance

  beforeEach(() => {
    useStateSpy = jest.spyOn(React, 'useState')
  })

  afterEach(() => {
    useStateSpy.mockRestore()
  })

  const mockTruck: Truck = {
    id: 'truck-101',
    bodyType: 'Open',
    lengthFt: 32,
    tonnageCapacity: 25,
    status: 'AVAILABLE',
    verificationStatus: 'Verified',
    registrationNumber: 'MH-12-AB-1234',
    distanceKm: 18.5,
    preferredDestinations: ['Mumbai', 'Delhi'],
    owner: {
      id: 'owner-1',
      name: 'Rajesh Sharma',
      phone: '9876543210',
    },
  }

  it('renders truck card details and action triggers with correct accessible attributes', () => {
    useStateSpy.mockImplementation((initial: any) => {
      if (typeof initial === 'object' && initial !== null && 'owner' in initial) {
        return [{ owner: mockTruck.owner }, jest.fn()]
      }
      return [false, jest.fn()]
    })

    const handleBook = jest.fn()
    const element = TruckCard({ truck: mockTruck, onBook: handleBook })

    expect(element).toBeDefined()
    // Fragment wrapper: element.props.children = [ <div card>, showPaywall && <ContactRevealModal> ]
    const cardDiv = element.props.children[0]
    // cardDiv.props.children = [ Header, 4-Stat Row, Preferred Corridor (if any), Actions Area ]
    const actionsArea = cardDiv.props.children[3]
    const [contactContainer, buttonsContainer] = actionsArea.props.children

    // contactContainer.props.children = [ phoneSpan, whatsappLink ]
    const whatsappLink = contactContainer.props.children[1]
    expect(whatsappLink.props['aria-label']).toBe('Chat on WhatsApp with Rajesh Sharma for truck MH-12-AB-1234')

    // buttonsContainer.props.children = [ !contactData?.owner && unlockButton, onBook && bookButton ]
    const bookButton = buttonsContainer.props.children[1]
    expect(bookButton.props['aria-label']).toBe('Book lorry MH-12-AB-1234')

    bookButton.props.onClick()
    expect(handleBook).toHaveBeenCalledWith(mockTruck)
  })

  it('renders unlock contact button when owner details are not present', () => {
    useStateSpy.mockImplementation((initial: any) => [initial, jest.fn()])

    const unrevealedTruck: Truck = {
      ...mockTruck,
      owner: undefined,
    }

    const element = TruckCard({ truck: unrevealedTruck })
    const cardDiv = element.props.children[0]
    const actionsArea = cardDiv.props.children[3]
    const buttonsContainer = actionsArea.props.children[1]
    const unlockButton = buttonsContainer.props.children[0]

    expect(unlockButton.props['aria-label']).toBe('Unlock contact details for truck MH-12-AB-1234')
  })
})
