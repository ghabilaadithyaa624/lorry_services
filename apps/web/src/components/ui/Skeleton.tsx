'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type SkeletonVariant = 'text' | 'circular' | 'rectangular'
export type SkeletonAvatarSize = 'sm' | 'md' | 'lg'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Shape variant of the skeleton loader.
   * @default 'text'
   */
  variant?: SkeletonVariant
  /**
   * Optional custom width (number for pixels or string for CSS units).
   */
  width?: string | number
  /**
   * Optional custom height (number for pixels or string for CSS units).
   */
  height?: string | number
  /**
   * Additional CSS classes.
   */
  className?: string
}

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded-md',
  circular: 'rounded-full',
  rectangular: 'rounded-card',
}

const avatarSizeClasses: Record<SkeletonAvatarSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

/**
 * Skeleton Component
 *
 * Shimmering placeholder component used for loading states.
 *
 * @example
 * <Skeleton variant="rectangular" className="w-full h-32" />
 */
const SkeletonRoot = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const inlineStyles: React.CSSProperties = {
      ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
      ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
      ...style,
    }

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn('skeleton', variantClasses[variant], className)}
        style={inlineStyles}
        {...props}
      />
    )
  }
)

SkeletonRoot.displayName = 'Skeleton'

// ── Helper Presets ──

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of text lines to simulate.
   * @default 3
   */
  lines?: number
  /**
   * Tailwind gap class between skeleton text lines.
   * @default 'gap-2'
   */
  gap?: string
  /**
   * Tailwind width class for the final line.
   * @default 'w-2/3'
   */
  lastLineWidth?: string
  /**
   * Additional CSS classes for the container.
   */
  className?: string
}

/**
 * Skeleton.Text Preset
 *
 * Renders multiple lines of skeleton text with customizable lines count and last line width.
 */
export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      lines = 3,
      gap = 'gap-2',
      lastLineWidth = 'w-2/3',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col', gap, className)}
        {...props}
      >
        {Array.from({ length: lines }).map((_, index) => {
          const isLast = index === lines - 1 && lines > 1
          return (
            <SkeletonRoot
              key={index}
              variant="text"
              className={cn('w-full', isLast && lastLineWidth)}
            />
          )
        })}
      </div>
    )
  }
)

SkeletonText.displayName = 'Skeleton.Text'

export interface SkeletonAvatarProps extends SkeletonProps {
  /**
   * Preset avatar size diameter.
   * @default 'md'
   */
  size?: SkeletonAvatarSize
}

/**
 * Skeleton.Avatar Preset
 *
 * Renders a circular avatar skeleton placeholder in small, medium, or large sizes.
 */
export const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ size = 'md', className, ...props }, ref) => {
    return (
      <SkeletonRoot
        ref={ref}
        variant="circular"
        className={cn(avatarSizeClasses[size], className)}
        {...props}
      />
    )
  }
)

SkeletonAvatar.displayName = 'Skeleton.Avatar'

export type SkeletonCardProps = SkeletonProps

/**
 * Skeleton.Card Preset
 *
 * Renders a full card rectangular skeleton placeholder.
 */
export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <SkeletonRoot
        ref={ref}
        variant="rectangular"
        className={cn('w-full h-48 rounded-card', className)}
        {...props}
      />
    )
  }
)

SkeletonCard.displayName = 'Skeleton.Card'

export type SkeletonComponent = React.ForwardRefExoticComponent<
  SkeletonProps & React.RefAttributes<HTMLDivElement>
> & {
  Text: typeof SkeletonText
  Avatar: typeof SkeletonAvatar
  Card: typeof SkeletonCard
}

export const Skeleton = SkeletonRoot as SkeletonComponent
Skeleton.Text = SkeletonText
Skeleton.Avatar = SkeletonAvatar
Skeleton.Card = SkeletonCard

export default Skeleton
