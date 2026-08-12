'use client'

import React, { createContext, useContext, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardContextValue {
  padding?: CardPadding
}

const CardContext = createContext<CardContextValue>({ padding: 'md' })

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  interactive?: boolean
  padding?: CardPadding
  className?: string
  children?: React.ReactNode
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
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
  md: 'p-6',
  lg: 'p-8',
}

/**
 * Card Component
 *
 * Dark glassmorphic surface container component with header, body, and footer sections.
 */
const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, interactive = false, padding = 'md', className, children, ...props }, ref) => {
    return (
      <CardContext.Provider value={{ padding }}>
        <div
          ref={ref}
          className={cn(
            'bg-[#0F131D] rounded-2xl border border-white/10 text-white shadow-modal transition-transform duration-200 ease-out relative overflow-hidden',
            hover && 'hover:border-white/20 hover:-translate-y-0.5',
            interactive && 'hover:border-primary-500/40 hover:-translate-y-1 active:translate-y-0 cursor-pointer',
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
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-6 py-4 border-b border-white/10 flex justify-between items-center bg-transparent', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'Card.Header'

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
        className={cn('px-6 py-4 border-t border-white/10 bg-surface-950/60 flex justify-end items-center gap-3', className)}
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
