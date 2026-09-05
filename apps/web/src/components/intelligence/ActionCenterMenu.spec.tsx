import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ActionCenterMenu } from './ActionCenterMenu'
import { useOperationalTasks, type UseOperationalTasksResult } from '@/lib/intelligence/useOperationalTasks'

jest.mock('@/lib/intelligence/useOperationalTasks', () => ({ useOperationalTasks: jest.fn() }))
const useTasks = useOperationalTasks as jest.Mock

function descendants(node: React.ReactNode): React.ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(descendants)
  if (!React.isValidElement(node)) return []
  return [node, ...descendants(node.props.children)]
}

describe('ActionCenterMenu', () => {
  let open: boolean
  let state: UseOperationalTasksResult

  beforeEach(() => {
    open = false
    state = {
      tasks: [], summary: { total: 0, high: 0, medium: 0, low: 0 },
      loading: false, loaded: true, unavailableSources: [], refresh: jest.fn(),
    }
    jest.spyOn(React, 'useState').mockImplementation((() => [open, (next: any) => { open = typeof next === 'function' ? next(open) : next }]) as any)
    jest.spyOn(React, 'useRef').mockImplementation(() => ({ current: null }))
    jest.spyOn(React, 'useEffect').mockImplementation(() => {})
    useTasks.mockReturnValue(state)
  })
  afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks() })

  it('keeps No urgent actions reachable in the shell when there are no tasks', () => {
    const tree = ActionCenterMenu({ role: 'factory_owner' })
    expect(tree).not.toBeNull()
    descendants(tree).find((node) => node.type === 'button')!.props.onClick()
    const html = renderToStaticMarkup(ActionCenterMenu({ role: 'factory_owner' }))
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('No urgent actions')
  })

  it('keeps an unavailable-data state reachable rather than silently hiding it', () => {
    state.unavailableSources = ['Trips']
    open = true
    const html = renderToStaticMarkup(ActionCenterMenu({ role: 'truck_driver' }))
    expect(html).toContain('Action data unavailable')
    expect(html).toContain('Retry action data')
    expect(html).not.toContain('No urgent actions')
  })

  it('disables its own fetch when desktop/mobile menus share shell state', () => {
    ActionCenterMenu({ role: 'admin', state })
    expect(useTasks).toHaveBeenLastCalledWith({ role: 'admin', enabled: false })
  })
})
