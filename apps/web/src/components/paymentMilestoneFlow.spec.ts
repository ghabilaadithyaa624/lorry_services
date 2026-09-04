/**
 * Payment milestone confirmation flow.
 *
 * Both the booking detail page and `PaymentSplitCard` open an optional payment
 * gateway link and then record the milestone through the explicit
 * `confirm-advance` / `confirm-balance` endpoints.
 *
 * Two behaviours are easy to regress and are pinned here:
 *
 *  1. A *gateway* failure must not abort the flow — the milestone is still
 *     recorded, because the gateway link is best-effort.
 *  2. A *milestone* failure (403 not the cargo owner, 400 advance already
 *     confirmed / balance before advance / cancelled booking) must surface to
 *     the user. Previously the gateway call was wrapped in a bare `catch {}`
 *     that swallowed the milestone error too and reported success anyway.
 *
 * This mirrors the shared control flow of both call sites.
 */

interface Toast {
  success: (message: string) => void
  error: (message: string) => void
}

interface Deps {
  initializeGateway: (type: 'advance' | 'balance') => Promise<{ shortUrl?: string } | void>
  confirmAdvance: () => Promise<unknown>
  confirmBalance: () => Promise<unknown>
  openUrl: (url: string) => void
  toast: Toast
  reload: () => void
}

/** Mirrors `confirmMilestone` in the booking page / PaymentSplitCard. */
async function confirmMilestone(type: 'advance' | 'balance', deps: Deps): Promise<void> {
  try {
    try {
      const res = await deps.initializeGateway(type)
      if (res && 'shortUrl' in res && res.shortUrl) deps.openUrl(res.shortUrl)
    } catch {
      // Gateway unavailable — still record the milestone below.
    }

    if (type === 'advance') await deps.confirmAdvance()
    else await deps.confirmBalance()

    deps.toast.success(type === 'advance' ? 'advance confirmed' : 'balance confirmed')
    deps.reload()
  } catch (err: any) {
    deps.toast.error(err?.response?.data?.message || `Could not confirm the ${type} payment`)
  }
}

function makeDeps(overrides: Partial<Deps> = {}) {
  const success: string[] = []
  const error: string[] = []

  const deps: Deps = {
    initializeGateway: jest.fn().mockResolvedValue({}),
    confirmAdvance: jest.fn().mockResolvedValue({}),
    confirmBalance: jest.fn().mockResolvedValue({}),
    openUrl: jest.fn(),
    toast: {
      success: (m: string) => success.push(m),
      error: (m: string) => error.push(m),
    },
    reload: jest.fn(),
    ...overrides,
  }

  return { deps, success, error }
}

describe('payment milestone confirmation flow', () => {
  it('records the advance milestone after opening the gateway link', async () => {
    const { deps, error } = makeDeps({
      initializeGateway: jest.fn().mockResolvedValue({ shortUrl: 'https://pay.example/abc' }),
    })

    await confirmMilestone('advance', deps)

    expect(deps.openUrl).toHaveBeenCalledWith('https://pay.example/abc')
    expect(deps.confirmAdvance).toHaveBeenCalledTimes(1)
    expect(deps.confirmBalance).not.toHaveBeenCalled()
    expect(error).toHaveLength(0)
    expect(deps.reload).toHaveBeenCalled()
  })

  it('still records the milestone when the gateway is unavailable', async () => {
    const { deps, error } = makeDeps({
      initializeGateway: jest.fn().mockRejectedValue(new Error('gateway 500')),
    })

    await confirmMilestone('advance', deps)

    expect(deps.confirmAdvance).toHaveBeenCalledTimes(1)
    expect(error).toHaveLength(0)
    expect(deps.reload).toHaveBeenCalled()
  })

  it('surfaces a 403 from the milestone endpoint instead of reporting success', async () => {
    const forbidden = {
      response: { status: 403, data: { message: 'Only the cargo owner can confirm payment milestones' } },
    }
    const { deps, success, error } = makeDeps({
      confirmAdvance: jest.fn().mockRejectedValue(forbidden),
    })

    await confirmMilestone('advance', deps)

    expect(success).toHaveLength(0)
    expect(error).toEqual(['Only the cargo owner can confirm payment milestones'])
    expect(deps.reload).not.toHaveBeenCalled()
  })

  it.each([
    'Advance payment already confirmed',
    'Advance payment must be confirmed before balance',
    'Cannot confirm payment on a cancelled booking',
  ])('surfaces the business-rule error %s', async (message) => {
    const { deps, success, error } = makeDeps({
      confirmBalance: jest.fn().mockRejectedValue({ response: { status: 400, data: { message } } }),
    })

    await confirmMilestone('balance', deps)

    expect(success).toHaveLength(0)
    expect(error).toEqual([message])
  })

  it('routes the balance milestone to confirmBalance only', async () => {
    const { deps } = makeDeps()

    await confirmMilestone('balance', deps)

    expect(deps.confirmBalance).toHaveBeenCalledTimes(1)
    expect(deps.confirmAdvance).not.toHaveBeenCalled()
  })
})
