'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Glassmorphism elevation level.
   * level 1: rgba(15,23,42,0.72), blur 12px
   * level 2: rgba(15,23,42,0.52), blur 18px (modals, hero overlays, command palette)
   */
  level?: 0 | 1 | 2
  /**
   * Enables subtle border glow and pointer cursor when hovered.
   * @default false
   */
  interactive?: boolean
  /**
   * Inner padding size scale.
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /**
   * Additional CSS class names.
   */
  className?: string
  /**
   * Panel content.
   */
  children?: React.ReactNode
}

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6 sm:p-7',
  lg: 'p-8 sm:p-10',
}

const levelClasses = {
  0: 'bg-[#0F131D] border border-white/10',
  1: 'bg-[#0F172A]/72 backdrop-blur-[12px] border border-white/[0.08]',
  2: 'bg-[#0F172A]/52 backdrop-blur-[18px] border border-white/[0.12]',
}

/**
 * GlassPanel Component
 *
 * Dark glassmorphic container primitive with level 1 and level 2 options.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ level = 0, interactive = false, padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[20px] text-white shadow-modal transition-all duration-200 relative overflow-hidden',
          levelClasses[level],
          paddingClasses[padding],
          interactive && 'hover:border-primary-500/40 hover:-translate-y-0.5 cursor-pointer',
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
