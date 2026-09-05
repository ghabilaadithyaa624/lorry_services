/**
 * Prompt 9 — marketplace card action gating.
 *
 * Owners see management actions (Edit / Delete / Manage[ Documents]); everyone
 * else sees marketplace actions (View / Unlock Contact / Contact-Book). The
 * backend stamps rows with `isOwner` (preferred — no user detail exposed) and
 * these tests pin the full rules table plus the ownership resolvers.
 */
import {
  isOwnListingRow,
  isOwnerOfMarketplaceRow,
  marketplaceCardActions,
  type OwnableRow,
} from './marketplaceActions'

describe('marketplaceCardActions (Prompt 9 rules table)', () => {
  it('rule 1 — a load the user OWNS shows Edit, Delete and Manage, never Unlock Contact', () => {
    const actions = marketplaceCardActions('load', true)

    expect(actions.edit).toBe(true)
    expect(actions.remove).toBe(true)
    expect(actions.manage).toBe(true)
    expect(actions.manageLabel).toBe('Manage')
    expect(actions.unlockContact).toBe(false)
    expect(actions.contactOrBook).toBe(false)
  })

  it('rule 2 — a load the user does NOT own shows View + Unlock Contact + Contact/Book, never Edit/Delete', () => {
    const actions = marketplaceCardActions('load', false)

    expect(actions.view).toBe(true)
    expect(actions.unlockContact).toBe(true)
    expect(actions.contactOrBook).toBe(true)
    expect(actions.edit).toBe(false)
    expect(actions.remove).toBe(false)
    expect(actions.manage).toBe(false)
  })

  it('rule 3 — a truck the user OWNS shows Edit, Delete and Manage Documents, never Unlock Contact', () => {
    const actions = marketplaceCardActions('truck', true)

    expect(actions.edit).toBe(true)
    expect(actions.remove).toBe(true)
    expect(actions.manage).toBe(true)
    expect(actions.manageLabel).toBe('Manage Documents')
    expect(actions.unlockContact).toBe(false)
    expect(actions.contactOrBook).toBe(false)
  })

  it('rule 4 — a truck the user does NOT own shows View + Unlock Contact + Book Lorry, never Edit/Delete', () => {
    const actions = marketplaceCardActions('truck', false)

    expect(actions.view).toBe(true)
    expect(actions.unlockContact).toBe(true)
    expect(actions.contactOrBook).toBe(true) // Book Lorry
    expect(actions.edit).toBe(false)
    expect(actions.remove).toBe(false)
    expect(actions.manage).toBe(false)
  })

  it('View is a non-owner disclosure — owners manage from their own workspaces instead', () => {
    expect(marketplaceCardActions('load', true).view).toBe(false)
    expect(marketplaceCardActions('truck', true).view).toBe(false)
    expect(marketplaceCardActions('load', false).view).toBe(true)
    expect(marketplaceCardActions('truck', false).view).toBe(true)
  })
})

describe('isOwnerOfMarketplaceRow (shared marketplace feed rows)', () => {
  it('trusts only an explicit backend isOwner=true', () => {
    expect(isOwnerOfMarketplaceRow({ isOwner: true })).toBe(true)
    expect(isOwnerOfMarketplaceRow({ isOwner: false })).toBe(false)
  })

  it('never infers ownership from a missing flag or userId — strangers stay strangers', () => {
    expect(isOwnerOfMarketplaceRow({})).toBe(false)
    expect(isOwnerOfMarketplaceRow(undefined)).toBe(false)
    // Search rows never carry the owner's userId; if one ever leaked through,
    // it still must not unlock owner controls on its own.
    expect(isOwnerOfMarketplaceRow({ userId: 'user-1' } as OwnableRow)).toBe(false)
  })
})

describe('isOwnListingRow (ownership-scoped my-list rows)', () => {
  it('prefers the backend isOwner flag over any userId comparison', () => {
    // The endpoint is owner-scoped, but a foreign row must never manage-gate
    // to true just because the legacy userId check would trust it.
    expect(isOwnListingRow({ isOwner: true, userId: 'someone-else' }, 'user-1')).toBe(true)
    expect(isOwnListingRow({ isOwner: false, userId: 'user-1' }, 'user-1')).toBe(false)
  })

  it('falls back to the legacy userId comparison when isOwner is absent', () => {
    expect(isOwnListingRow({ userId: 'user-1' }, 'user-1')).toBe(true)
    expect(isOwnListingRow({ userId: 'someone-else' }, 'user-1')).toBe(false)
  })

  it('keeps the legacy trust rules: missing userId = own row, unresolved session = visible rows are mine', () => {
    expect(isOwnListingRow({}, 'user-1')).toBe(true)
    expect(isOwnListingRow({ userId: 'user-1' }, null)).toBe(true)
  })
})
