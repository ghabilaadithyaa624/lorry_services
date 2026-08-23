'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Surface elevation.
   * - `0`: opaque panel (no blur) — safest for dense, text-heavy content.
   * - `1`: standard frosted glass — summary cards, filters, floating controls.
   * - `2`: stronger frosting — modal/drawer surfaces and overlays.
   *
   * Blur is deliberately capped: heavier values hurt legibility and cost
   * compositing performance on mid-range mobile hardware.
   */
  level?: 0 | 1 | 2
  /**
   * Adds hover affordance and pointer cursor.
   * @default false
   */
  interactive?: boolean
  /**
   * Inner padding scale.
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
}

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

const levelClasses = {
  0: 'bg-panel border border-hairline',
  1: 'glass',
  2: 'glass-strong',
}

/**
 * GlassPanel — frosted surface primitive.
 *
 * Used selectively for navigation, floating controls, summary cards, filters,
 * and modal/drawer surfaces. Falls back to an opaque panel where
 * `backdrop-filter` is unsupported (see `globals.css`) so text never loses
 * contrast against the page behind it.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ level = 1, interactive = false, padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-panel text-body shadow-card relative overflow-hidden',
          'transition-[box-shadow,border-color,transform] duration-200 ease-out',
          levelClasses[level],
          paddingClasses[padding],
          interactive &&
            'hover:border-primary-500/40 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer motion-reduce:hover:translate-y-0',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GlassPanel.displayName = 'GlassPanel'

export default GlassPanel
