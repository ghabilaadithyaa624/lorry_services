'use client'

import React from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  /** Controls modal open/close visibility */
  open: boolean
  /** Callback function triggered when modal is requested to close (backdrop, ESC key, or X button) */
  onClose: () => void
  /** Modal header title string */
  title: string
  /** Optional description text displayed under the title */
  description?: string
  /** Maximum width size variant. Defaults to 'md' */
  size?: ModalSize
  /** Additional custom Tailwind class names for the modal panel */
  className?: string
  /** Main body content of the modal */
  children?: React.ReactNode
}

export interface ModalFooterProps {
  /** Footer content, typically action buttons */
  children: React.ReactNode
  /** Additional custom class names for the footer wrapper */
  className?: string
}

/**
 * Size mapping for Modal panel maximum width.
 */
const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

/**
 * Footer sub-component for action buttons at the bottom of a Modal.
 */
export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-800',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Accessible Modal dialog component wrapping Headless UI Dialog.
 * Supports ESC key close, click-outside backdrop close, custom sizing, and composable Modal.Footer.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  className,
  children,
}: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Container for centering modal */}
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <Dialog.Panel
            className={cn(
              'relative w-full transform overflow-hidden bg-white dark:bg-surface-900 rounded-2xl p-6 text-left shadow-modal animate-scale-in transition-all border border-surface-100 dark:border-surface-800',
              sizeClasses[size],
              className
            )}
          >
            {/* Close Button in top-right corner */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Title */}
            <Dialog.Title className="text-lg font-bold text-surface-900 dark:text-surface-50 pr-8">
              {title}
            </Dialog.Title>

            {/* Description */}
            {description && (
              <Dialog.Description className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {description}
              </Dialog.Description>
            )}

            {/* Content Body */}
            <div className="mt-4">{children}</div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  )
}

Modal.Footer = ModalFooter

export default Modal
