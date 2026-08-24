/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BookingTermsModal } from './BookingTermsModal'

jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}))

describe('BookingTermsModal component', () => {
  const mockTruckInfo = {
    registrationNumber: 'MH12AB1234',
    bodyType: 'Container 32ft',
    ownerName: 'Rajesh Transport',
  }
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  it('renders with correct accessibility attributes and closes on button click', () => {
    render(
      <BookingTermsModal
        loadId="load-123"
        truckId="truck-456"
        truckInfo={mockTruckInfo}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'booking-modal-title')

    const heading = screen.getByRole('heading', { name: 'Confirm Booking' })
    expect(heading).toHaveAttribute('id', 'booking-modal-title')

    const closeButton = screen.getByRole('button', { name: /close dialog/i })
    expect(closeButton).toBeInTheDocument()

    fireEvent.click(closeButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
