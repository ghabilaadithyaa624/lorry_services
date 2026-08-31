import React from 'react'
import { SearchFilters } from './SearchFilters'

describe('SearchFilters Component Accessibility and Micro-UX', () => {
  let prevDispatcher: any
  const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED

  beforeEach(() => {
    let idCounter = 0
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
      useId: () => `:filter-id-${++idCounter}:`,
    }

    prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher
  })

  afterEach(() => {
    ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
  })

  it('should export SearchFilters component function', () => {
    expect(typeof SearchFilters).toBe('function')
  })

  it('should render form controls with associated labels and WAI-ARIA slider attributes', () => {
    const handleRadiusChange = jest.fn()
    const handleTruckTypeChange = jest.fn()
    const handleMinTonnageChange = jest.fn()

    const element = SearchFilters({
      radius: 50,
      onRadiusChange: handleRadiusChange,
      truckType: 'Open',
      onTruckTypeChange: handleTruckTypeChange,
      minTonnage: '10',
      onMinTonnageChange: handleMinTonnageChange,
    })

    expect(element).toBeDefined()
    expect(element.type).toBe('div')

    const flexContainer = element.props.children
    const [radiusCol, truckTypeCol, minTonnageCol] = flexContainer.props.children

    // 1. Search Radius Slider Column
    const radiusLabel = radiusCol.props.children[0]
    const radiusInput = radiusCol.props.children[1]

    expect(radiusLabel.type).toBe('label')
    expect(radiusLabel.props.htmlFor).toBe(':filter-id-1:')
    expect(radiusInput.type).toBe('input')
    expect(radiusInput.props.id).toBe(':filter-id-1:')
    expect(radiusInput.props.type).toBe('range')
    expect(radiusInput.props['aria-label']).toBe('Search Radius')
    expect(radiusInput.props['aria-valuemin']).toBe(10)
    expect(radiusInput.props['aria-valuemax']).toBe(300)
    expect(radiusInput.props['aria-valuenow']).toBe(50)
    expect(radiusInput.props['aria-valuetext']).toBe('50 km')

    // 2. Truck Type Select Column
    const truckTypeLabel = truckTypeCol.props.children[0]
    const truckTypeSelect = truckTypeCol.props.children[1]

    expect(truckTypeLabel.type).toBe('label')
    expect(truckTypeLabel.props.htmlFor).toBe(':filter-id-2:')
    expect(truckTypeSelect.type).toBe('select')
    expect(truckTypeSelect.props.id).toBe(':filter-id-2:')
    expect(truckTypeSelect.props['aria-label']).toBe('Truck Type')
    expect(truckTypeSelect.props.value).toBe('Open')

    // 3. Min Tonnage Number Input Column
    const minTonnageLabel = minTonnageCol.props.children[0]
    const minTonnageInput = minTonnageCol.props.children[1]

    expect(minTonnageLabel.type).toBe('label')
    expect(minTonnageLabel.props.htmlFor).toBe(':filter-id-3:')
    expect(minTonnageInput.type).toBe('input')
    expect(minTonnageInput.props.id).toBe(':filter-id-3:')
    expect(minTonnageInput.props.type).toBe('number')
    expect(minTonnageInput.props.min).toBe('0')
    expect(minTonnageInput.props['aria-label']).toBe('Min Tonnage (Tons)')
    expect(minTonnageInput.props.value).toBe('10')
  })

  it('should trigger callback handlers on user change events', () => {
    const handleRadiusChange = jest.fn()
    const handleTruckTypeChange = jest.fn()
    const handleMinTonnageChange = jest.fn()

    const element = SearchFilters({
      radius: 100,
      onRadiusChange: handleRadiusChange,
      truckType: 'Container',
      onTruckTypeChange: handleTruckTypeChange,
      minTonnage: '20',
      onMinTonnageChange: handleMinTonnageChange,
    })

    const flexContainer = element.props.children
    const [radiusCol, truckTypeCol, minTonnageCol] = flexContainer.props.children

    // Trigger Radius Change
    radiusCol.props.children[1].props.onChange({
      target: { value: '150' },
    })
    expect(handleRadiusChange).toHaveBeenCalledWith(150)

    // Trigger Truck Type Change
    truckTypeCol.props.children[1].props.onChange({
      target: { value: 'OpenBody' },
    })
    expect(handleTruckTypeChange).toHaveBeenCalledWith('OpenBody')

    // Trigger Min Tonnage Change
    minTonnageCol.props.children[1].props.onChange({
      target: { value: '25' },
    })
    expect(handleMinTonnageChange).toHaveBeenCalledWith('25')
  })
})
