import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReturnLoadOpportunityCard } from './ReturnLoadOpportunityCard'
import { returnLoadsFixture } from '@/test/fixtures/returnLoads'

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }))
jest.mock('./MatchScoreBadge', () => ({ MatchScoreBadge: () => <span>Match score</span> }))

describe('ReturnLoadOpportunityCard contact gate', () => {
  it('shows the subscription action without phone/name links for locked opportunities', () => {
    const opportunity = returnLoadsFixture().opportunities[0]
    // Defence in depth: do not display contact values when the API says locked.
    opportunity.contact = { locked: true, phone: '+919000000002', name: 'Hidden name' }
    const html = renderToStaticMarkup(<ReturnLoadOpportunityCard opportunity={opportunity} />)
    expect(html).toContain('href="/subscription"')
    expect(html).not.toContain('+919000000002')
    expect(html).not.toContain('Hidden name')
    expect(html).not.toContain('tel:')
  })

  it('renders an actionable contact link when explicitly unlocked', () => {
    const opportunity = returnLoadsFixture().opportunities[0]
    opportunity.contact = { locked: false, phone: '+919000000002', name: 'Test Shipper' }
    const html = renderToStaticMarkup(<ReturnLoadOpportunityCard opportunity={opportunity} />)
    expect(html).toContain('href="tel:+919000000002"')
    expect(html).toContain('Test Shipper')
    expect(html).not.toContain('Subscribe to unlock')
  })
})
