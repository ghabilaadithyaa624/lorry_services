import React from 'react'
import { RatingModal } from './RatingModal'

describe('RatingModal component', () => {
  let prevDispatcher: any

  beforeEach(() => {
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
      useId: () => 'rating-modal-id',
    }

    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    prevDispatcher = ReactInternals.ReactCurrentDispatcher.current
    ReactInternals.ReactCurrentDispatcher.current = mockDispatcher
  })

  afterEach(() => {
    const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    ReactInternals.ReactCurrentDispatcher.current = prevDispatcher
  })

  it('should return null when isOpen is false', () => {
    const result = RatingModal({
      isOpen: false,
      onClose: jest.fn(),
      booking: { id: 'b1', truckOwnerId: 'u1' },
    })
    expect(result).toBeNull()
  })

  it('should render dialog role, aria-modal, title ID, and star radiogroup when isOpen is true', () => {
    const onClose = jest.fn()
    const element = RatingModal({
      isOpen: true,
      onClose,
      booking: {
        id: 'b1',
        truckOwnerId: 'u1',
        truckOwnerName: 'Ramesh Kumar',
        truckRegistrationNumber: 'KA 01 EV 2024',
      },
    })

    expect(element).toBeDefined()
    expect(element).not.toBeNull()
    if (!element) return

    expect(element.type).toBe('div')
    expect(element.props.onClick).toBe(onClose)

    const dialogCard = element.props.children
    expect(dialogCard.props.role).toBe('dialog')
    expect(dialogCard.props['aria-modal']).toBe('true')
    expect(dialogCard.props['aria-labelledby']).toBe('rating-modal-title')

    const [header, content] = React.Children.toArray(dialogCard.props.children) as React.ReactElement[]

    const headerChildren = React.Children.toArray(header.props.children) as React.ReactElement[]
    const closeBtn = headerChildren.find((child) => child && child.type === 'button')
    expect(closeBtn).toBeDefined()
    expect(closeBtn?.props['aria-label']).toBe('Close dialog')

    const fragment = content.props.children
    const contentChildren = React.Children.toArray(fragment.props.children) as React.ReactElement[]

    const starsContainer = contentChildren.find(
      (child) => child && child.props && child.props.className === 'space-y-3'
    )
    expect(starsContainer).toBeDefined()

    const starsChildren = React.Children.toArray(starsContainer?.props.children) as React.ReactElement[]
    const radioGroup = starsChildren.find((child) => child && child.props && child.props.role === 'radiogroup')
    expect(radioGroup).toBeDefined()
    expect(radioGroup?.props['aria-labelledby']).toBe('rating-stars-label')

    const starButtons = React.Children.toArray(radioGroup?.props.children) as React.ReactElement[]
    expect(starButtons).toHaveLength(5)
    expect(starButtons[0].props.role).toBe('radio')
    expect(starButtons[0].props['aria-label']).toBe('1 star')
    expect(starButtons[4].props['aria-label']).toBe('5 stars')

    const reviewContainer = contentChildren.find(
      (child) => child && child.props && child.props.className === 'space-y-2'
    )
    const reviewChildren = React.Children.toArray(reviewContainer?.props.children) as React.ReactElement[]
    const label = reviewChildren.find((child) => child && child.type === 'label')
    const textarea = reviewChildren.find((child) => child && child.type === 'textarea')

    expect(label?.props.htmlFor).toBe('review-comment-input')
    expect(textarea?.props.id).toBe('review-comment-input')
  })
})
