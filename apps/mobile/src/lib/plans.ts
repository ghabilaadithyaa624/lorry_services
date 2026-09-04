import type { PaymentProvider, SubscriptionPlanId } from '../services/types'

/**
 * Display metadata for subscription plans.
 *
 * Prices and durations mirror `SUBSCRIPTION_PLANS` in packages/shared — the
 * API is the source of truth for what is actually charged; these values are
 * only used for labels. The server ignores any client-supplied amount.
 */
export interface PlanDisplay {
  id: SubscriptionPlanId
  label: string
  price: number
  durationDays: number
  durationLabel: string
  description: string
  popular?: boolean
  saving?: string
}

export const PLAN_DISPLAY: Record<SubscriptionPlanId, PlanDisplay> = {
  monthly: {
    id: 'monthly',
    label: 'Monthly Unlimited',
    price: 999,
    durationDays: 30,
    durationLabel: 'month',
    description: 'Unlimited contact reveals and bookings, billed every 30 days.',
  },
  quarterly: {
    id: 'quarterly',
    label: 'Quarterly Unlimited',
    price: 2499,
    durationDays: 90,
    durationLabel: '3 months',
    description: 'Best value for regular corridor runs.',
    popular: true,
    saving: 'Save ₹498',
  },
  annual: {
    id: 'annual',
    label: 'Annual Unlimited',
    price: 7999,
    durationDays: 365,
    durationLabel: 'year',
    description: 'Lowest effective monthly rate for fleets.',
    saving: 'Save ₹3,989',
  },
}

export const PLAN_ORDER: SubscriptionPlanId[] = ['monthly', 'quarterly', 'annual']

export function getPlanDisplay(plan: string | null | undefined): PlanDisplay | null {
  if (!plan) return null
  return (PLAN_DISPLAY as Record<string, PlanDisplay>)[plan] ?? null
}

export function getPlanLabel(plan: string | null | undefined): string {
  return getPlanDisplay(plan)?.label ?? (plan ? `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan` : 'Plan')
}

export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  cashfree: 'Cashfree',
  razorpay: 'Razorpay',
  stripe: 'Stripe',
}

export function getProviderLabel(provider: string | null | undefined): string {
  if (!provider) return 'Payment gateway'
  return (PROVIDER_LABELS as Record<string, string>)[provider] ?? provider
}

export function formatInr(amount: string | number | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (value === null || value === undefined || Number.isNaN(value)) return '₹—'
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
