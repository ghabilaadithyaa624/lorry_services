import React from 'react'
import { AddressAutocomplete } from './AddressAutocomplete'

describe('AddressAutocomplete component', () => {
  it('should export AddressAutocomplete component function', () => {
    expect(typeof AddressAutocomplete).toBe('function')
  })

  it('should render correct label, input ID, and combobox ARIA attributes', () => {
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
      useId: () => 'test-id-1',
    }

    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher

    try {
      const onChange = jest.fn()
      const element = AddressAutocomplete({
        value: 'Mumbai',
        onChange,
        label: 'Pickup Address',
        id: 'pickup-address-input',
      })

      expect(element.type).toBe('div')

      const children = React.Children.toArray(element.props.children) as React.ReactElement[]
      const labelChild = children.find((child) => child && child.type === 'label')
      expect(labelChild).toBeDefined()
      expect(labelChild?.props.htmlFor).toBe('pickup-address-input')

      const inputChild = children.find((child) => child && child.type === 'input')
      expect(inputChild).toBeDefined()
      expect(inputChild?.props.id).toBe('pickup-address-input')
      expect(inputChild?.props.role).toBe('combobox')
      expect(inputChild?.props['aria-autocomplete']).toBe('list')
      expect(inputChild?.props['aria-controls']).toBe('pickup-address-input-listbox')
      expect(typeof inputChild?.props.onKeyDown).toBe('function')
    } finally {
      ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
    }
  })

  it('should handle keyboard navigation on input onKeyDown', () => {
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
      useId: () => 'auto-id-123',
    }

    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher

    try {
      const onChange = jest.fn()
      const element = AddressAutocomplete({
        value: '',
        onChange,
        label: 'Destination',
      })

      const children = React.Children.toArray(element.props.children) as React.ReactElement[]
      const inputChild = children.find((child) => child && child.type === 'input')
      expect(inputChild).toBeDefined()

      const preventDefault = jest.fn()
      // Test keydown handler when suggestions are hidden
      inputChild?.props.onKeyDown({ key: 'ArrowDown', preventDefault })
      inputChild?.props.onKeyDown({ key: 'Escape', preventDefault })
      expect(typeof inputChild?.props.onKeyDown).toBe('function')
    } finally {
      ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
    }
  })
})
