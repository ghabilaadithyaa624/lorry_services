'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Display name used to derive initials and the accessible label. */
  name?: string | null
  /** Fallback identifier (e.g. phone) when no name is set. */
  fallback?: string
  size?: AvatarSize
  /** Renders the brand-accent treatment instead of the neutral one. */
  accent?: boolean
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl',
}

/**
 * Derive up to two initials from a display name.
 * Falls back to 'LC' so the avatar is never empty.
 */
export function getInitials(name?: string | null, fallback?: string): string {
  const source = (name || '').trim()
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  // Use the last two digits of a phone number as a stable fallback.
  const digits = (fallback || '').replace(/\D/g, '')
  if (digits.length >= 2) return digits.slice(-2)
  return 'LC'
}

/**
 * Avatar — initial-based identity chip.
 *
 * No remote image is used: the platform stores no avatar URL, so rendering
 * initials avoids inventing a field the backend does not support.
 */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ name, fallback, size = 'md', accent = false, className, ...props }, ref) => {
    const initials = getInitials(name, fallback)
    const label = name?.trim() || fallback || 'Account'

    return (
      <span
        ref={ref}
        role="img"
        aria-label={`${label} avatar`}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-bold shrink-0 select-none tracking-tight',
          accent
            ? 'bg-primary-500 text-white'
            : 'bg-sunken text-body border border-hairline',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {initials}
      </span>
    )
  }
)

Avatar.displayName = 'Avatar'

export default Avatar
