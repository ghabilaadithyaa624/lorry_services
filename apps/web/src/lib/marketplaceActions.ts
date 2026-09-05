/**
 * Marketplace card ownership & action gating (Prompt 9).
 *
 * Owners and non-owners see different action sets on marketplace/listing
 * cards. The backend now stamps every load/truck row (search results, my-lists
 * and detail endpoints) with an `isOwner` boolean computed against the caller
 * — preferred over returning the owner's `userId` because it exposes no
 * unnecessary user detail. These helpers turn that flag (with a legacy
 * `userId` fallback for older payloads) into the per-card action set.
 *
 * Subscription behaviour is untouched: `Unlock Contact` stays a non-owner
 * marketplace action backed by the existing reveal + paywall flow.
 */

/** Row shape shared by load/truck listing endpoints and search results. */
export interface OwnableRow {
  /** Backend-computed ownership flag (Prompt 9) — the preferred signal. */
  isOwner?: boolean
  /** Legacy fallback: the row's owner user id (absent on search rows). */
  userId?: string | null
}

/**
 * Ownership check for rows from the *shared marketplace feed* (`/search/trucks`,
 * `/search/loads`). These lists mix strangers' posts with the caller's own, and
 * the backend always sends `isOwner`, so ownership is exactly what the flag
 * says — never inferred from a missing userId, or every stranger's card would
 * render owner controls.
 */
export function isOwnerOfMarketplaceRow(row: OwnableRow | null | undefined): boolean {
  return row?.isOwner === true
}

/**
 * Ownership check for rows from *ownership-scoped* endpoints
 * (`/loads/my-loads`, `/trucks/my-trucks`): every row is the caller's by
 * construction. An explicit backend `isOwner` flag wins; otherwise fall back
 * to the legacy userId comparison, and finally trust a missing userId (the
 * list itself is owner-scoped) so older payloads keep working.
 */
export function isOwnListingRow(
  row: OwnableRow | null | undefined,
  currentUserId?: string | null
): boolean {
  if (typeof row?.isOwner === 'boolean') return row.isOwner
  if (!row?.userId) return true
  return !currentUserId || row.userId === currentUserId
}

/** Which marketplace side a card belongs to. */
export type MarketplaceCardKind = 'load' | 'truck'

/** The per-card action set the UI must render (owner controls vs market actions). */
export interface MarketplaceCardActions {
  /** Non-owner detail disclosure ("View"). */
  view: boolean
  /** Subscription-gated contact reveal — non-owners only, never for own posts. */
  unlockContact: boolean
  /** Contact/Book: WhatsApp once unlocked, or "Book Lorry" for trucks. */
  contactOrBook: boolean
  /** Owner control: edit the listing. */
  edit: boolean
  /** Owner control: delete the listing. */
  remove: boolean
  /** Owner control: manage the listing / its documents. */
  manage: boolean
  /** Label for the manage control — "Manage" (loads) / "Manage Documents" (trucks). */
  manageLabel: string
}

/**
 * Action set for a marketplace card (Prompt 9 rules):
 *
 * - Own load:     Edit, Delete, Manage — and NO Unlock Contact for the own post.
 * - Other's load: View, Unlock Contact, Contact/Book if allowed — no Edit/Delete.
 * - Own truck:    Edit, Delete, Manage Documents — NO Unlock Contact.
 * - Other truck:  View, Unlock Contact, Book Lorry — no Edit/Delete.
 */
export function marketplaceCardActions(
  kind: MarketplaceCardKind,
  isOwner: boolean
): MarketplaceCardActions {
  if (isOwner) {
    return {
      view: false,
      unlockContact: false,
      contactOrBook: false,
      edit: true,
      remove: true,
      manage: true,
      manageLabel: kind === 'truck' ? 'Manage Documents' : 'Manage',
    }
  }

  return {
    view: true,
    unlockContact: true,
    contactOrBook: true,
    edit: false,
    remove: false,
    manage: false,
    manageLabel: kind === 'truck' ? 'Manage Documents' : 'Manage',
  }
}
