'use client'

import React, { createContext, useContext, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardContextValue {
  padding?: CardPadding
}

const CardContext = createContext<CardContextValue>({ padding: 'md' })

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Adds hover elevation shadow when true.
   * @default false
   */
  hover?: boolean
  /**
   * Adds interactive state (hover shadow, border highlights, pointer cursor).
   * @default false
   */
  interactive?: boolean
  /**
   * Base padding applied to Card.Body unless overridden.
   * @default 'md'
   */
  padding?: CardPadding
  /**
   * Additional CSS class names.
   */
  className?: string
  /**
   * Card content.
   */
  children?: React.ReactNode
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: React.ReactNode
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Override padding for this body section.
   */
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
  md: 'p-6',
  lg: 'p-8',
}

/**
 * Card Component
 *
 * Base surface container component with support for headers, bodies, and footers.
 *
 * @example
 * <Card hover interactive>
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 *   <Card.Footer>Actions</Card.Footer>
 * </Card>
 */
const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      hover = false,
      interactive = false,
      padding = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <CardContext.Provider value={{ padding }}>
        <div
          ref={ref}
          className={cn(
            'bg-white dark:bg-surface-900 rounded-card shadow-card border border-surface-100 dark:border-surface-800 transition-all duration-200',
            hover && 'hover:shadow-card-hover',
            interactive &&
              'hover:shadow-card-hover hover:border-surface-200 dark:hover:border-surface-700 cursor-pointer',
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

/**
 * Card.Header Component
 *
 * Header section with border bottom and flex layout for title and actions.
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 border-b border-surface-100 dark:border-surface-800 flex justify-between items-center',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'Card.Header'

/**
 * Card.Body Component
 *
 * Main body content section with customizable padding scale.
 */
export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ padding: bodyPadding, className, children, ...props }, ref) => {
    const context = useContext(CardContext)
    const padding = bodyPadding ?? context.padding ?? 'md'

    return (
      <div
        ref={ref}
        className={cn(paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardBody.displayName = 'Card.Body'

/**
 * Card.Footer Component
 *
 * Footer section with top border and right-aligned flex layout for actions.
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 border-t border-surface-100 dark:border-surface-800 flex justify-end items-center gap-3',
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
  Body: typeof CardBody
  Footer: typeof CardFooter
}

export const Card = CardRoot as CardComponent
Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

export default Card
