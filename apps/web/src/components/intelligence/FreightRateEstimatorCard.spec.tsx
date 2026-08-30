import React from 'react'
import { FreightRateEstimatorCard } from './FreightRateEstimatorCard'

describe('FreightRateEstimatorCard component accessibility & functionality', () => {
  it('should export FreightRateEstimatorCard function', () => {
    expect(typeof FreightRateEstimatorCard).toBe('function')
  })

  it('should render correct tablist, tab roles, aria-selected, and focus-visible attributes', () => {
    const stateMap: Record<string, any> = {}
    let stateIndex = 0

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
        const idx = stateIndex++
        if (!(idx in stateMap)) {
          stateMap[idx] = typeof initial === 'function' ? initial() : initial
        }
        return [stateMap[idx], (val: any) => { stateMap[idx] = val }]
      },
      useDebugValue: jest.fn(),
      useDeferredValue: (value: any) => value,
      useTransition: () => [false, jest.fn()],
      useId: () => 'test-id-1',
    }

    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher

    try {
      const element = FreightRateEstimatorCard({
        input: {
          tonnage: 10,
          truckType: 'Open',
          distanceKm: 250,
        },
      })

      expect(element.type).toBe('div')

      const childrenArr = React.Children.toArray(element.props.children)
      const tablist = childrenArr.find((c: any) => c && c.props && c.props.role === 'tablist') as React.ReactElement

      expect(tablist).toBeDefined()
      expect(tablist.props['aria-label']).toBe('Freight rate analysis options')

      const tabs = React.Children.toArray(tablist.props.children) as React.ReactElement[]
      expect(tabs.length).toBe(3)

      expect(tabs[0].props.role).toBe('tab')
      expect(tabs[0].props['aria-selected']).toBe(true)
      expect(tabs[0].props['aria-controls']).toBe('panel-overview')

      expect(tabs[1].props.role).toBe('tab')
      expect(tabs[1].props['aria-selected']).toBe(false)
      expect(tabs[1].props['aria-controls']).toBe('panel-sensitivity')

      expect(tabs[2].props.role).toBe('tab')
      expect(tabs[2].props['aria-selected']).toBe(false)
      expect(tabs[2].props['aria-controls']).toBe('panel-comparison')

      // Check overview panel
      const overviewPanel = childrenArr.find((c: any) => c && c.props && c.props.role === 'tabpanel') as React.ReactElement
      expect(overviewPanel).toBeDefined()
      expect(overviewPanel.props.id).toBe('panel-overview')
      expect(overviewPanel.props['aria-labelledby']).toBe('tab-overview')
    } finally {
      ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
    }
  })

  it('should render collapsible pricing explanation button with proper aria-expanded attribute', () => {
    const stateMap: Record<string, any> = {}
    let stateIndex = 0

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
        const idx = stateIndex++
        if (!(idx in stateMap)) {
          stateMap[idx] = typeof initial === 'function' ? initial() : initial
        }
        return [stateMap[idx], (val: any) => { stateMap[idx] = val }]
      },
      useDebugValue: jest.fn(),
      useDeferredValue: (value: any) => value,
      useTransition: () => [false, jest.fn()],
      useId: () => 'test-id-2',
    }

    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    const prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher

    try {
      const element = FreightRateEstimatorCard({
        input: {
          tonnage: 15,
          truckType: 'Container',
          distanceKm: 400,
        },
      })

      const childrenArr = React.Children.toArray(element.props.children)
      const overviewPanel = childrenArr.find((c: any) => c && c.props && c.props.id === 'panel-overview') as React.ReactElement

      const panelChildren = React.Children.toArray(overviewPanel.props.children)
      const collapsibleCard = panelChildren.find((c: any) => c && c.props && c.props.className && c.props.className.includes('bg-primary-50/40')) as React.ReactElement

      const collapsibleChildren = React.Children.toArray(collapsibleCard.props.children)
      const toggleButton = collapsibleChildren.find((c: any) => c && c.type === 'button') as React.ReactElement

      expect(toggleButton).toBeDefined()
      expect(toggleButton.props['aria-expanded']).toBe(false)
      expect(toggleButton.props['aria-controls']).toBe('pricing-explanation-panel')
    } finally {
      ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
    }
  })
})
