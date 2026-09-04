import { redirect } from 'next/navigation'

/**
 * Public convenience URL for load search, mirroring `/search/trucks`.
 * Kept as a redirect so there is a single search implementation.
 */
export default function SearchLoadsPage() {
  redirect('/search?type=load')
}
