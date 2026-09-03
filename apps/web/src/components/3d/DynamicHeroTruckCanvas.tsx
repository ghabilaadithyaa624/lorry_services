'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui'

// Heavy 3D dependencies are code-split and never block initial page load.
// Only loaded on the client when this component enters viewport, deferred via `ssr:false`.
const HeroTruckCanvas = dynamic(() => import('./HeroTruckCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] sm:h-[460px] lg:h-[520px] rounded-[20px] bg-slate-900 border border-white/10 flex items-center justify-center animate-pulse">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-primary-500/20 mx-auto animate-pulse" />
        <p className="text-xs font-mono text-white/60">Loading 3D fleet visualizer…</p>
      </div>
    </div>
  ),
})

export default function DynamicHeroTruckCanvas() {
  return <HeroTruckCanvas />
}
