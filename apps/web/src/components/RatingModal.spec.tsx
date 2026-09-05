import React from 'react'
import { RatingModal } from './RatingModal'

describe('RatingModal Component', () => {
  const mockBooking = {
    id: 'booking-123',
    truckOwnerId: 'truck-owner-456',
    truckOwnerName: 'John Doe',
    truckRegistrationNumber: 'KA-01-AB-1234',
  }

  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(React, 'useId').mockReturnValue('review-textarea-id-123')
    jest.spyOn(React, 'useState').mockImplementation((initial: any) => [
      typeof initial === 'function' ? initial() : initial,
      jest.fn(),
    ])
    jest.spyOn(React, 'useEffect').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders modal dialog with accessible attributes when open', () => {
    const modalElement = RatingModal({
      isOpen: true,
      onClose: mockOnClose,
      booking: mockBooking,
    })

    expect(modalElement).not.toBeNull()
    if (!modalElement) return

    // Verify backdrop click handler
    const backdrop = modalElement.props.children[0]
    expect(backdrop.props.onClick).toBe(mockOnClose)

    // Verify modal container dialog attributes
    const container = modalElement.props.children[1]
    expect(container.props.role).toBe('dialog')
    expect(container.props['aria-modal']).toBe('true')
    expect(container.props['aria-labelledby']).toBe('rating-modal-title')
  })

  it('renders star rating buttons with descriptive aria-label descriptors', () => {
    const modalElement = RatingModal({
      isOpen: true,
      onClose: mockOnClose,
      booking: mockBooking,
    })

    if (!modalElement) return

    const container = modalElement.props.children[1]
    const content = container.props.children[1]
    const mainSection = content.props.children
    const ratingSection = mainSection.props.children[1]
    const starsContainer = ratingSection.props.children[1]
    const starButtons = starsContainer.props.children

    expect(starButtons).toHaveLength(5)
    starButtons.forEach((button: any, index: number) => {
      expect(button.props['aria-label']).toBe(`Rate ${index + 1} out of 5 stars`)
      expect(button.props.type).toBe('button')
    })
  })

  it('associates review textarea with label using generated id', () => {
    const modalElement = RatingModal({
      isOpen: true,
      onClose: mockOnClose,
      booking: mockBooking,
    })

    if (!modalElement) return

    const container = modalElement.props.children[1]
    const content = container.props.children[1]
    const mainSection = content.props.children
    const reviewSection = mainSection.props.children[2]
    const label = reviewSection.props.children[0]
    const textarea = reviewSection.props.children[1]

    expect(label.props.htmlFor).toBe('review-textarea-id-123')
    expect(textarea.props.id).toBe('review-textarea-id-123')
  })

  it('registers keydown listener for Escape key when modal is open', () => {
    let capturedEffect: any
    jest.spyOn(React, 'useEffect').mockImplementation((effect: any) => {
      capturedEffect = effect
    })

    RatingModal({
      isOpen: true,
      onClose: mockOnClose,
      booking: mockBooking,
    })

    expect(capturedEffect).toBeDefined()

    const addEventListenerSpy = jest.fn()
    const removeEventListenerSpy = jest.fn()

    const mockWindow = {
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    } as any

    const originalWindow = global.window
    global.window = mockWindow

    try {
      const cleanup = capturedEffect()
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      const keydownHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'keydown'
      )?.[1]

      expect(keydownHandler).toBeDefined()
      keydownHandler({ key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalled()

      if (cleanup) cleanup()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', keydownHandler)
    } finally {
      global.window = originalWindow
    }
  })

  it('returns null when isOpen is false', () => {
    const modalElement = RatingModal({
      isOpen: false,
      onClose: mockOnClose,
      booking: mockBooking,
    })

    expect(modalElement).toBeNull()
  })
})
