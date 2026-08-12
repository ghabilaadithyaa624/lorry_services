'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface DataTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /**
   * Optional title header bar string.
   */
  title?: string
  /**
   * Subtitle or status summary text.
   */
  subtitle?: string
  /**
   * Action buttons rendered in top header bar.
   */
  action?: React.ReactNode
  /**
   * Additional wrapper class names.
   */
  containerClassName?: string
  /**
   * Additional table element class names.
   */
  className?: string
  /**
   * Table contents (`<thead>`, `<tbody>`, etc.).
   */
  children?: React.ReactNode
}

/**
 * DataTable Root Component
 *
 * Dark glass table container with responsive overflow and clean column hierarchy.
 */
const DataTableRoot = forwardRef<HTMLTableElement, DataTableProps>(
  ({ title, subtitle, action, containerClassName, className, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'bg-[#0F131D] rounded-[20px] border border-white/10 shadow-modal overflow-hidden font-mono text-xs',
          containerClassName
        )}
      >
        {(title || action) && (
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F131D]">
            <div>
              {title && <h3 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h3>}
              {subtitle && <p className="text-[11px] text-surface-400 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}

        <div className="overflow-x-auto scrollbar-thin">
          <table ref={ref} className={cn('w-full border-collapse', className)} {...props}>
            {children}
          </table>
        </div>
      </div>
    )
  }
)

DataTableRoot.displayName = 'DataTable'

/**
 * DataTable.Header (`<thead>`)
 */
export const DataTableHeader = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('border-b border-white/10 bg-surface-950/60 text-surface-400 uppercase text-[11px] font-sans font-semibold tracking-[0.08em]', className)}
    {...props}
  >
    {children}
  </thead>
))
DataTableHeader.displayName = 'DataTable.Header'

/**
 * DataTable.Row (`<tr>`)
 */
export const DataTableRow = forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, children, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('border-b border-white/5 hover:bg-white/5 transition-colors h-16 sm:h-18', className)}
    {...props}
  >
    {children}
  </tr>
))
DataTableRow.displayName = 'DataTable.Row'

/**
 * DataTable.Cell (`<td>` or `<th>`)
 */
export interface DataTableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right'
  header?: boolean
}

export const DataTableCell = forwardRef<HTMLTableCellElement, DataTableCellProps>(
  ({ align = 'left', header = false, className, children, ...props }, ref) => {
    const Component = header ? 'th' : 'td'
    return (
      <Component
        ref={ref as any}
        className={cn(
          'py-4 px-4 text-sm',
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          align === 'left' && 'text-left',
          header ? 'font-semibold text-surface-400 text-[11px] font-sans uppercase tracking-[0.08em]' : 'text-white font-sans',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
DataTableCell.displayName = 'DataTable.Cell'

export type DataTableComponent = React.ForwardRefExoticComponent<
  DataTableProps & React.RefAttributes<HTMLTableElement>
> & {
  Header: typeof DataTableHeader
  Row: typeof DataTableRow
  Cell: typeof DataTableCell
}

export const DataTable = DataTableRoot as DataTableComponent
DataTable.Header = DataTableHeader
DataTable.Row = DataTableRow
DataTable.Cell = DataTableCell

export default DataTable
