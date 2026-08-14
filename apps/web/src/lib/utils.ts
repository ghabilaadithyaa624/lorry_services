import clsx, { type ClassValue } from 'clsx'

/**
 * Merge class names conditionally.
 * Combines clsx for conditional classes.
 *
 * @example
 * cn('base-class', isActive && 'active', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

/**
 * Format Indian Rupee amounts with the ₹ symbol and Indian numbering.
 *
 * @example
 * formatINR(45000) → "₹45,000"
 * formatINR(1500000) → "₹15,00,000"
 */
export function formatINR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '₹0'
  return `₹${num.toLocaleString('en-IN')}`
}

export const PHONE_NUMBER_LENGTH_WITH_COUNTRY_CODE = 13

/**
 * Format a phone number for display.
 * +918072025106 → "+91 80720 25106"
 */
export function formatPhone(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\s/g, '')
  if (cleaned.startsWith('+91') && cleaned.length === PHONE_NUMBER_LENGTH_WITH_COUNTRY_CODE) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`
  }
  return phone
}

/**
 * Get initials from a name string.
 * "Rahul Kumar" → "RK", "Arun" → "AR"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Constants for time conversion and validation
const MILLISECONDS_IN_SECOND = 1000
const SECONDS_IN_MINUTE = 60
const MINUTES_IN_HOUR = 60
const HOURS_IN_DAY = 24
const DAYS_IN_WEEK = 7
const DAYS_IN_MONTH = 30

/**
 * Relative time string.
 * Returns "Just now", "2m ago", "3h ago", "5d ago", etc.
 */
export function timeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / MILLISECONDS_IN_SECOND)
  const diffMin = Math.floor(diffSec / SECONDS_IN_MINUTE)
  const diffHr = Math.floor(diffMin / MINUTES_IN_HOUR)
  const diffDay = Math.floor(diffHr / HOURS_IN_DAY)

  if (diffSec < SECONDS_IN_MINUTE) return 'Just now'
  if (diffMin < MINUTES_IN_HOUR) return `${diffMin}m ago`
  if (diffHr < HOURS_IN_DAY) return `${diffHr}h ago`
  if (diffDay < DAYS_IN_WEEK) return `${diffDay}d ago`
  if (diffDay < DAYS_IN_MONTH) return `${Math.floor(diffDay / DAYS_IN_WEEK)}w ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * Truncate a string and add ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

/**
 * Generate a WhatsApp deep link URL.
 */
export function whatsappLink(phone: string, message?: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  const base = `https://wa.me/${cleaned}`
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`
  }
  return base
}

/**
 * Pluralize a word based on count.
 * pluralize(1, 'truck') → "1 truck"
 * pluralize(5, 'truck') → "5 trucks"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural || `${singular}s`)
  return `${count} ${word}`
}
