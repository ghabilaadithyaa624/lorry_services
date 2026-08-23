'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: Crumb[]
  className?: string
}

/**
 * Breadcrumbs — hierarchical location indicator.
 *
 * The final crumb is marked `aria-current="page"` and is not a link.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex items-center gap-1.5 text-xs flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && (
                <ChevronRightIcon className="w-3.5 h-3.5 text-subtle shrink-0" aria-hidden="true" />
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn('truncate', isLast ? 'text-ink font-medium' : 'text-muted')}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  /** Actions rendered on the trailing edge (buttons, filters). */
  actions?: React.ReactNode
  /** Optional status/metric strip rendered beneath the title block. */
  children?: React.ReactNode
  className?: string
}

/**
 * PageHeader — consistent page title block.
 *
 * Renders the single `<h1>` for the page, keeping heading order valid across
 * the application.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-2.5" />}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted mt-1.5 max-w-3xl leading-relaxed">{description}</p>
          )}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </div>

      {children && <div className="mt-5">{children}</div>}
    </header>
  )
}

export default PageHeader
