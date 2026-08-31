import React from 'react'
import { AIFreightAssistantDrawer } from './AIFreightAssistantDrawer'

describe('AIFreightAssistantDrawer', () => {
  beforeEach(() => {
    jest.spyOn(React, 'useState').mockImplementation((initial: any) => [
      typeof initial === 'function' ? initial() : initial,
      jest.fn(),
    ])
    jest.spyOn(React, 'useEffect').mockImplementation(() => {})
    jest.spyOn(React, 'useRef').mockImplementation((initial: any) => ({ current: initial }))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders trigger button with accessibility attributes', () => {
    const element = AIFreightAssistantDrawer()
    expect(element).not.toBeNull()

    const triggerBtn = element.props.children[0]
    expect(triggerBtn.props['aria-label']).toBe('Open AI Freight Assistant')
    expect(triggerBtn.props['aria-expanded']).toBe(false)
    expect(triggerBtn.props['aria-controls']).toBe('ai-freight-assistant-drawer')
  })
})
