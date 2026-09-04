import React from 'react'
import { ActionCenterCard } from './ActionCenterCard'
import { OperationalTask } from '@/lib/intelligence/actionCenterEngine'

describe('ActionCenterCard', () => {
  const mockTasks: OperationalTask[] = [
    {
      id: 'task-1',
      title: 'Upload Fastag Document',
      description: 'Your Fastag verification is pending for truck MH12AB1234.',
      category: 'COMPLIANCE',
      urgency: 'HIGH',
      actionUrl: '/documents',
      actionLabel: 'Upload Now',
    },
    {
      id: 'task-2',
      title: 'Pending Advance Payment',
      description: 'Payment of ₹15,000 for booking BK-9081 is ready for release.',
      category: 'PAYMENT',
      urgency: 'MEDIUM',
      actionUrl: '/bookings/BK-9081',
      actionLabel: 'View Payment',
    },
  ]

  it('renders null when tasks list is empty', () => {
    const element = ActionCenterCard({ tasks: [] })
    expect(element).toBeNull()
  })

  it('renders ActionCenterCard component with task details and accessible attributes', () => {
    const element = ActionCenterCard({ tasks: mockTasks })
    expect(element).not.toBeNull()

    // Check header and task list children structure
    const headerTitle = element?.props.children[0].props.children[0].props.children[1].props.children
    expect(headerTitle).toBe('Operational Action Center')

    const taskItems = element?.props.children[1].props.children
    expect(taskItems.length).toBe(2)

    const firstTaskLink = taskItems[0].props.children[1]
    expect(firstTaskLink.props['aria-label']).toBe('Upload Now for Upload Fastag Document')
    expect(firstTaskLink.props.className).toContain('focus-visible:ring-2')

    const iconDiv = taskItems[0].props.children[0].props.children[0]
    expect(iconDiv.props.children.props['aria-hidden']).toBe('true')
  })
  it('renders a skeleton while dashboard data is loading', () => {
    const element = ActionCenterCard({ tasks: [], loading: true })
    expect(element).not.toBeNull()
    expect(element?.props['aria-busy']).toBe('true')
  })

  it('renders an all-clear panel when explicitly asked to show an empty state', () => {
    const element = ActionCenterCard({ tasks: [], showWhenEmpty: true })
    expect(element).not.toBeNull()
    expect(element?.props.className).toContain('bg-panel')

    // The positive empty state reads "No urgent actions" rather than hiding the panel.
    const body = element?.props.children[1]
    const title = body.props.children[1]
    expect(title.props.children).toBe('No urgent actions')
  })

  it('caps the visible list and reports the overflow count', () => {
    const element = ActionCenterCard({ tasks: mockTasks, maxVisible: 1 })
    const taskItems = element?.props.children[1].props.children
    expect(taskItems.length).toBe(1)

    const footer = element?.props.children[2]
    expect(footer.props.children).toEqual(['+', 1, ' more action', '', ' pending'])
  })

  it('renders urgency and category as monospace telemetry', () => {
    const element = ActionCenterCard({ tasks: mockTasks })
    const taskItems = element?.props.children[1].props.children
    const meta = taskItems[0].props.children[0].props.children[1].props.children[2]
    expect(meta.props.className).toContain('font-mono')
    expect(meta.props.children[0].props.children).toBe('HIGH')
    expect(meta.props.children[2].props.children).toBe('COMPLIANCE')
  })
})
