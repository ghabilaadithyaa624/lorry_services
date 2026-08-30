import React from 'react'
import { ContactRevealModal } from './ContactRevealModal'

describe('ContactRevealModal component', () => {
  it('should export ContactRevealModal component function', () => {
    expect(typeof ContactRevealModal).toBe('function')
  })

  it('should render Modal component with correct title, description, and children props', () => {
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
      useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, jest.fn()],
      useDebugValue: jest.fn(),
      useDeferredValue: (value: any) => value,
      useTransition: () => [false, jest.fn()],
      useId: () => 'modal-test-id-1',
    }

    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher

    try {
      const onClose = jest.fn()
      const onSubscribe = jest.fn()

      const element = ContactRevealModal({ onClose, onSubscribe })

      expect(element).toBeDefined()
      expect(element.props.open).toBe(true)
      expect(element.props.title).toBe('Unlock Contact Details')
      expect(element.props.description).toContain('Subscribe to view phone numbers')
      expect(element.props.onClose).toBe(onClose)
      expect(element.props.children).toBeDefined()
    } finally {
      ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
    }
  })
})
