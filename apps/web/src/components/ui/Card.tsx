'use client'

import React, { createContext, useContext, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

/**
 * Surface treatment for the card.
 * - `solid` (default): opaque panel. The workhorse for content.
 * - `glass`: frosted surface. Reserve for summary/overlay contexts, per the
 *   design direction that glass is applied selectively — not to every element.
 */
export type CardSurface = 'solid' | 'glass'

interface CardContextValue {
  padding?: CardPadding
}

const CardContext = createContext<CardContextValue>({ padding: 'md' })

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  interactive?: boolean
  padding?: CardPadding
  surface?: CardSurface
  className?: string
  children?: React.ReactNode
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional trailing element (actions, badge, menu). */
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  className?: string
  children?: React.ReactNode
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: React.ReactNode
}

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

const surfaceClasses: Record<CardSurface, string> = {
  solid: 'bg-panel border border-hairline',
  glass: 'glass',
}

/**
 * Card — the primary content surface of the design system.
 *
 * Renders an elevated panel that adapts to the active theme via design tokens.
 */
const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  (
    { hover = false, interactive = false, padding = 'md', surface = 'solid', className, children, ...props },
    ref
  ) => {
    return (
      <CardContext.Provider value={{ padding }}>
        <div
          ref={ref}
          className={cn(
            'rounded-card text-body shadow-card relative overflow-hidden',
            'transition-[box-shadow,border-color,transform] duration-200 ease-out',
            surfaceClasses[surface],
            hover && 'hover:shadow-card-hover hover:border-hairline-strong',
            interactive &&
              'hover:shadow-card-hover hover:border-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer motion-reduce:hover:translate-y-0',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </CardContext.Provider>
    )
  }
)

CardRoot.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ action, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-5 sm:px-6 py-4 border-b border-hairline flex flex-wrap justify-between items-center gap-3',
          className
        )}
        {...props}
      >
        {children}
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
    )
  }
)

CardHeader.displayName = 'Card.Header'

/**
 * Card.Title — renders a semantic heading so pages keep a valid outline.
 */
export const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' }
>(({ as: Tag = 'h3', className, children, ...props }, ref) => (
  <Tag ref={ref} className={cn('text-base font-semibold text-ink tracking-tight', className)} {...props}>
    {children}
  </Tag>
))

CardTitle.displayName = 'Card.Title'

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ padding: bodyPadding, className, children, ...props }, ref) => {
    const context = useContext(CardContext)
    const padding = bodyPadding ?? context.padding ?? 'md'

    return (
      <div ref={ref} className={cn(paddingClasses[padding], className)} {...props}>
        {children}
      </div>
    )
  }
)

CardBody.displayName = 'Card.Body'

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-5 sm:px-6 py-4 border-t border-hairline bg-sunken/50 flex flex-wrap justify-end items-center gap-3',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'Card.Footer'

export type CardComponent = React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
> & {
  Header: typeof CardHeader
  Title: typeof CardTitle
  Body: typeof CardBody
  Footer: typeof CardFooter
}

export const Card = CardRoot as CardComponent
Card.Header = CardHeader
Card.Title = CardTitle
Card.Body = CardBody
Card.Footer = CardFooter

export default Card
