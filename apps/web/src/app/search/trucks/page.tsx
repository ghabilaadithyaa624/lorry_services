import { redirect } from 'next/navigation'

export default function SearchTrucksPage() {
  redirect('/search?type=truck')
}
