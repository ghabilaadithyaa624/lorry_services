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
})
