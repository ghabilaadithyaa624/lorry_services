'use client'

import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: ModalSize
  /** Hides the default close affordance for flows that must be resolved. */
  hideCloseButton?: boolean
  className?: string
  children?: React.ReactNode
  footer?: React.ReactNode
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
  '2xl': 'max-w-2xl',
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-hairline',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Modal — accessible dialog built on Headless UI.
 *
 * Focus is trapped while open, Escape closes, the backdrop is inert to screen
 * readers, and focus returns to the trigger on close. Animations are skipped
 * automatically under `prefers-reduced-motion` via the global CSS rule.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  hideCloseButton = false,
  className,
  children,
  footer,
}: ModalProps) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'relative w-full transform overflow-hidden text-left align-bottom sm:align-middle',
                  'bg-panel text-body shadow-modal border border-hairline',
                  'rounded-t-modal sm:rounded-modal p-5 sm:p-6',
                  // Full-height sheet on mobile, centred dialog on larger screens
                  'max-h-[92vh] overflow-y-auto',
                  sizeClasses[size],
                  className
                )}
              >
                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="absolute top-4 right-4 p-2 rounded-lg text-subtle hover:text-ink hover:bg-wash transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}

                <Dialog.Title className="text-lg font-semibold text-ink tracking-tight pr-10">
                  {title}
                </Dialog.Title>

                {description && (
                  <Dialog.Description className="text-sm text-muted mt-1.5 pr-10">
                    {description}
                  </Dialog.Description>
                )}

                <div className="mt-4">{children}</div>

                {footer && <ModalFooter>{footer}</ModalFooter>}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

Modal.Footer = ModalFooter

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Use the destructive treatment for irreversible actions. */
  destructive?: boolean
  loading?: boolean
}

/**
 * ConfirmDialog — standard confirmation gate for destructive or irreversible
 * actions, replacing native `window.confirm`.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3.5">
        {destructive && (
          <div
            className="shrink-0 w-10 h-10 rounded-full bg-danger-500/10 flex items-center justify-center"
            aria-hidden="true"
          >
            <ExclamationTriangleIcon className="w-5 h-5 text-danger-600 dark:text-danger-400" />
          </div>
        )}
        <div className="text-sm text-body leading-relaxed">{message}</div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default Modal
