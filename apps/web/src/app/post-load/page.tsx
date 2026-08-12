'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Button, Badge } from '@/components/ui'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { FreightRateEstimatorCard } from '@/components/intelligence'
import { toast } from '@/lib/toast'

interface LoadFormData {
  tonnageRequired: number
  loadingAddress: string
  loadingPin: string
  unloadingAddress: string
  unloadingPin: string
  truckType: 'Open' | 'Container' | 'OpenBody'
  minLengthFt?: number
  minHeightFt?: number
  urgent: boolean
  maxPrice?: number
  expectedDeliveryAt?: string
  advancePayable?: number
}

export default function PostLoadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, setValue, watch } = useForm<LoadFormData>({
    defaultValues: {
      urgent: false,
      truckType: 'Open',
    },
  })

  const onSubmit = async (data: LoadFormData) => {
    setLoading(true)
    setError('')

    try {
      await api.post('/loads', {
        ...data,
        tonnageRequired: Number(data.tonnageRequired),
        minLengthFt: data.minLengthFt ? Number(data.minLengthFt) : undefined,
        minHeightFt: data.minHeightFt ? Number(data.minHeightFt) : undefined,
        maxPrice: data.maxPrice ? Number(data.maxPrice) : undefined,
        advancePayable: data.advancePayable ? Number(data.advancePayable) : undefined,
      })

      toast.success('Freight load posted successfully!')
      router.push('/my-loads?success=true')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to post freight load. Please check details.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout
      title="Post freight cargo requirement"
      subtitle="Publish your cargo specifications to get direct bids from Vahan-verified transporters within 50km."
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-danger-950/40 border border-danger-900/60 text-danger-300 text-sm font-sans flex items-center gap-2 animate-fade-in">
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-7 space-y-6">
            {/* Section 1: Route & Locations */}
            <div className="bg-[#0F131D] rounded-[20px] border border-white/10 p-6 sm:p-7 space-y-5 shadow-modal">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-primary-500/20 text-primary-400 font-sans font-bold text-xs flex items-center justify-center border border-primary-500/30">
                    1
                  </span>
                  <h3 className="text-[15px] font-semibold text-white font-sans">
                    Pickup & delivery highway corridor
                  </h3>
                </div>
                <Badge variant="primary" size="sm">
                  Geofenced route
                </Badge>
              </div>

              {/* Loading Origin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <AddressAutocomplete
                    label="Pickup Address / Warehouse *"
                    value={watch('loadingAddress') || ''}
                    onChange={(address, pincode) => {
                      setValue('loadingAddress', address)
                      if (pincode) setValue('loadingPin', pincode)
                    }}
                    placeholder="Enter pickup location (City, Industrial Area)..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                    Pickup PIN *
                  </label>
                  <input
                    type="text"
                    {...register('loadingPin', { required: 'PIN code is required' })}
                    placeholder="e.g. 411018"
                    className="w-full px-3.5 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-primary-500"
                    maxLength={6}
                  />
                </div>
              </div>

              {/* Unloading Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <AddressAutocomplete
                    label="Delivery Address / Destination *"
                    value={watch('unloadingAddress') || ''}
                    onChange={(address, pincode) => {
                      setValue('unloadingAddress', address)
                      if (pincode) setValue('unloadingPin', pincode)
                    }}
                    placeholder="Enter delivery location (City, Warehouse)..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                    Delivery PIN *
                  </label>
                  <input
                    type="text"
                    {...register('unloadingPin', { required: 'PIN code is required' })}
                    placeholder="e.g. 560100"
                    className="w-full px-3.5 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-primary-500"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Cargo & Vehicle Specifications */}
            <div className="bg-[#0F131D] rounded-[20px] border border-white/10 p-6 sm:p-7 space-y-5 shadow-modal">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-primary-500/20 text-primary-400 font-sans font-bold text-xs flex items-center justify-center border border-primary-500/30">
                    2
                  </span>
                  <h3 className="text-[15px] font-semibold text-white font-sans">
                    Cargo & vehicle configuration
                  </h3>
                </div>
                <Badge variant="info" size="sm">
                  Payload specs
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tonnage Required */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                    Cargo weight (Metric tons) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    {...register('tonnageRequired', { required: true, min: 0.5 })}
                    placeholder="e.g. 15.5"
                    className="w-full px-4 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                {/* Truck Type */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                    Preferred truck body *
                  </label>
                  <select {...register('truckType')} className="w-full px-4 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white font-medium text-xs sm:text-sm focus:outline-none focus:border-primary-500">
                    <option value="Open">Open Body Truck</option>
                    <option value="Container">Closed Container</option>
                    <option value="OpenBody">Open Body Trailer</option>
                  </select>
                </div>
              </div>

              {/* Optional Dimensions */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                    Min deck length (ft) <span className="text-surface-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    {...register('minLengthFt')}
                    placeholder="e.g. 24"
                    className="w-full px-3.5 py-2.5 bg-surface-950/80 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                    Min container height (ft) <span className="text-surface-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    {...register('minHeightFt')}
                    placeholder="e.g. 8"
                    className="w-full px-3.5 py-2.5 bg-surface-950/80 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Commercial Terms & Pricing */}
            <div className="bg-[#0F131D] rounded-[20px] border border-white/10 p-6 sm:p-7 space-y-5 shadow-modal">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-primary-500/20 text-primary-400 font-sans font-bold text-xs flex items-center justify-center border border-primary-500/30">
                    3
                  </span>
                  <h3 className="text-[15px] font-semibold text-white font-sans">
                    Commercial terms & delivery schedule
                  </h3>
                </div>
                <Badge variant="warning" size="sm">
                  50/50 Direct terms
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 font-sans mb-1.5">
                    Target freight price (₹) <span className="text-surface-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    {...register('maxPrice')}
                    placeholder="e.g. 45000"
                    className="w-full px-4 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-surface-400 mb-1.5">
                    Expected Delivery Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    {...register('expectedDeliveryAt')}
                    className="w-full px-4 py-3 bg-surface-950/80 border border-white/10 rounded-xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Advance and Urgency */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="urgent"
                    {...register('urgent')}
                    className="w-4 h-4 text-primary-500 rounded border-white/20 bg-surface-950 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="urgent" className="text-xs font-bold text-danger-400 cursor-pointer">
                    🚨 Mark as Urgent Freight (Immediate Vehicle Needed)
                  </label>
                </div>

                <div className="text-[11px] font-mono text-surface-400">
                  Standard Commercial terms: 50% advance upon loading
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="py-4 text-base font-bold shadow-glow-primary"
              >
                Publish Freight Cargo Requirement
              </Button>
            </div>
          </form>

          {/* Right Column: Live Freight Rate Intelligence Preview */}
          <div className="lg:col-span-5 space-y-4">
            <FreightRateEstimatorCard
              input={{
                tonnage: Number(watch('tonnageRequired')) || 10,
                truckType: watch('truckType') || 'Open',
              }}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
