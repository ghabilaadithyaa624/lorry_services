'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  TruckIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface OperationalEmptyStateProps {
  title: string
  description: string
  role: 'factory_owner' | 'truck_driver'
  actionLabel?: string
  actionHref?: string
  secondaryActionLabel?: string
  secondaryActionHref?: string
  className?: string
}

export function OperationalEmptyState({
  title,
  description,
  role,
  actionLabel,
  actionHref,
  secondaryActionLabel,
  secondaryActionHref,
  className,
}: OperationalEmptyStateProps) {
  const router = useRouter()

  const factoryOwnerWorkflow = [
    { step: '01', title: 'Post Cargo Requirements', desc: 'Specify tonnage, route, and vehicle type', icon: TruckIcon },
    { step: '02', title: 'Smart Proximity Match', desc: '50km radius matching finds verified trucks', icon: MapPinIcon },
    { step: '03', title: 'Direct WhatsApp Contact', desc: 'Call drivers directly without middleman fees', icon: ChatBubbleLeftRightIcon },
    { step: '04', title: 'Track 5-Stage Milestones', desc: 'Follow transit checkpoints along the highway', icon: CheckBadgeIcon },
  ]

  const truckDriverWorkflow = [
    { step: '01', title: 'Complete RC Verification', desc: 'Upload vehicle RC and insurance documents', icon: ShieldCheckIcon },
    { step: '02', title: 'Discover Nearby Loads', desc: 'Match with shippers requiring your lorry specs', icon: MagnifyingGlassIcon },
    { step: '03', title: 'Capture Return Loads', desc: 'Minimize empty return trips at destination', icon: MapPinIcon },
    { step: '04', title: 'Standard 50/50 Terms', desc: 'Receive advance and confirmed balance on POD', icon: CheckBadgeIcon },
  ]

  const steps = role === 'factory_owner' ? factoryOwnerWorkflow : truckDriverWorkflow

  return (
    <div className={cn('bg-panel rounded-[20px] border border-white/10 p-6 sm:p-8 shadow-modal text-center space-y-6 font-sans', className)}>
      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-lg sm:text-xl font-bold text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-surface-300 leading-relaxed">
          {description}
        </p>
      </div>

      {/* 4-Step Operational Flow Guide */}
      <div className="pt-2">
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-surface-400 block mb-4">
          LorryCarry Direct Operating Workflow
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
          {steps.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.step}
                className="p-4 rounded-2xl bg-surface-950/70 border border-white/5 space-y-2 hover:border-white/15 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-primary-400">
                    {s.step}
                  </span>
                  <Icon className="w-4 h-4 text-surface-400" />
                </div>
                <h4 className="text-xs font-bold text-white">
                  {s.title}
                </h4>
                <p className="text-[11px] text-surface-300 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {actionLabel && actionHref && (
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push(actionHref)}
            className="font-bold px-6 shadow-glow-primary text-xs"
          >
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && secondaryActionHref && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.push(secondaryActionHref)}
            className="font-bold px-6 text-xs border-white/10 hover:border-white/20"
          >
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
