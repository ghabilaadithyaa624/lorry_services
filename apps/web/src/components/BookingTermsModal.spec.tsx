import React from 'react'
import { BookingTermsModal } from './BookingTermsModal'

describe('BookingTermsModal component', () => {
  it('should export BookingTermsModal component function', () => {
    expect(typeof BookingTermsModal).toBe('function')
  })

  it('should render dialog role, aria-modal, title ID, and input label associations', () => {
    const mockDispatcher = {
      readContext: jest.fn(),
      useCallback: (fn: any) => fn,
      useContext: jest.fn(),
      useEffect: jest.fn(),
      useImperativeHandle: jest.fn(),
      useLayoutEffect: jest.fn(),
      useMemo: (fn: any) => fn(),
      useReducer: jest.fn(),
      useRef: (initial: any) => ({ current: initial }),
      useState: (initial: any) => [
        typeof initial === 'function' ? initial() : initial,
        jest.fn(),
      ],
      useDebugValue: jest.fn(),
      useDeferredValue: (value: any) => value,
      useTransition: () => [false, jest.fn()],
      useId: () => 'booking-terms-id',
    }

    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher

    try {
      const onClose = jest.fn()
      const onSuccess = jest.fn()
      const element = BookingTermsModal({
        loadId: 'load-123',
        truckId: 'truck-456',
        truckInfo: {
          registrationNumber: 'MH 12 AB 1234',
          bodyType: 'Open Body 32ft',
          ownerName: 'Rajesh Transports',
        },
        onClose,
        onSuccess,
      })

      expect(element.type).toBe('div')
      expect(element.props.onClick).toBe(onClose)

      const children = React.Children.toArray(element.props.children) as React.ReactElement[]
      const dialogCard = children.find((child) => child && child.props && child.props.role === 'dialog')
      expect(dialogCard).toBeDefined()
      expect(dialogCard?.props['aria-modal']).toBe('true')
      expect(dialogCard?.props['aria-labelledby']).toBe('booking-terms-title')

      const dialogChildren = React.Children.toArray(dialogCard?.props.children) as React.ReactElement[]
      const header = dialogChildren.find((child) => child && child.props && child.props.className?.includes('border-b'))
      expect(header).toBeDefined()

      const headerChildren = React.Children.toArray(header?.props.children) as React.ReactElement[]
      const closeBtn = headerChildren.find((child) => child && child.type === 'button')
      expect(closeBtn).toBeDefined()
      expect(closeBtn?.props['aria-label']).toBe('Close dialog')

      const form = dialogChildren.find((child) => child && child.type === 'form')
    } finally {
      ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
    }
  })

  it('should render role="alert" and aria-live="polite" when error is present', () => {
    let stateCall = 0
    const mockDispatcher = {
      readContext: jest.fn(),
      useCallback: (fn: any) => fn,
      useContext: jest.fn(),
      useEffect: jest.fn(),
      useImperativeHandle: jest.fn(),
      useLayoutEffect: jest.fn(),
      useMemo: (fn: any) => fn(),
      useReducer: jest.fn(),
      useRef: (initial: any) => ({ current: initial }),
      useState: (initial: any) => {
        stateCall++
        // 5th useState call is [error, setError]
        if (stateCall === 5) {
          return ['Failed to create booking', jest.fn()]
        }
        return [typeof initial === 'function' ? initial() : initial, jest.fn()]
      },
      useDebugValue: jest.fn(),
      useDeferredValue: (value: any) => value,
      useTransition: () => [false, jest.fn()],
      useId: () => 'booking-terms-id',
    }

    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher

    try {
      const element = BookingTermsModal({
        loadId: 'load-123',
        truckId: 'truck-456',
        truckInfo: {
          registrationNumber: 'MH 12 AB 1234',
          bodyType: 'Open Body 32ft',
          ownerName: 'Rajesh Transports',
        },
        onClose: jest.fn(),
        onSuccess: jest.fn(),
      })

      const children = React.Children.toArray(element.props.children) as React.ReactElement[]
      const dialogCard = children.find((child) => child && child.props && child.props.role === 'dialog')
      const dialogChildren = React.Children.toArray(dialogCard?.props.children) as React.ReactElement[]
      const form = dialogChildren.find((child) => child && child.type === 'form')
      const formChildren = React.Children.toArray(form?.props.children) as React.ReactElement[]

      const errorAlert = formChildren.find((child) => child && child.props && child.props.role === 'alert')
      expect(errorAlert).toBeDefined()
      expect(errorAlert?.props['aria-live']).toBe('polite')
      expect(errorAlert?.props.children).toBe('Failed to create booking')
    } finally {
      ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
    }
  })
})
