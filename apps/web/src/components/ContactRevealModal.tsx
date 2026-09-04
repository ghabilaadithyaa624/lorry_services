'use client'

import React from 'react'
import { LockClosedIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Modal, Button } from '@/components/ui'

interface ContactRevealModalProps {
  onClose: () => void
  onSubscribe: () => void
}

export function ContactRevealModal({ onClose, onSubscribe }: ContactRevealModalProps) {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Unlock Contact Details"
      description="Subscribe to view phone numbers and connect directly with truck/factory owners via WhatsApp."
      size="md"
    >
      <div className="space-y-5">
        <div className="flex justify-center py-1">
          <div className="w-14 h-14 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center">
            <LockClosedIcon className="w-7 h-7" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-wash p-4 rounded-xl text-left text-xs sm:text-sm border border-hairline">
          <p className="font-semibold text-ink mb-2">Subscription includes:</p>
          <ul className="space-y-1.5">
            <li className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckIcon className="w-4 h-4 mr-2 shrink-0 stroke-[2.5]" aria-hidden="true" />
              Unlimited contact reveals
            </li>
            <li className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckIcon className="w-4 h-4 mr-2 shrink-0 stroke-[2.5]" aria-hidden="true" />
              Direct WhatsApp integration
            </li>
            <li className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckIcon className="w-4 h-4 mr-2 shrink-0 stroke-[2.5]" aria-hidden="true" />
              Verified truck driver details
            </li>
            <li className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckIcon className="w-4 h-4 mr-2 shrink-0 stroke-[2.5]" aria-hidden="true" />
              Priority customer support
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onSubscribe}
          >
            Subscribe Now
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={onClose}
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </Modal>
  )
}
