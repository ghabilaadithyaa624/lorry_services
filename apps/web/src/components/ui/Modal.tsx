'use client'

import React from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: ModalSize
  className?: string
  children?: React.ReactNode
}

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-white/10',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Accessible Modal dialog component wrapping Headless UI Dialog.
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
    <Dialog open={open} onClose={onClose} className="relative z-50 font-sans">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 " aria-hidden="true" />

      {/* Container for centering modal */}
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <Dialog.Panel
            className={cn(
              'relative w-full transform overflow-hidden bg-[#0F172A]/85 backdrop-blur-[18px] text-white rounded-[24px] p-6 sm:p-7 text-left shadow-modal animate-scale-in transition-all border border-white/[0.12]',
              sizeClasses[size],
              className
            )}
          >
            {/* Close Button in top-right corner */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-xl text-surface-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* Title */}
            <Dialog.Title className="text-base sm:text-lg font-bold text-white pr-8">
              {title}
            </Dialog.Title>

            {/* Description */}
            {description && (
              <Dialog.Description className="text-xs font-mono text-surface-400 mt-1">
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
