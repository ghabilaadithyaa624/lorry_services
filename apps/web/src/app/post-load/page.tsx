'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import {
  MapPinIcon,
  TruckIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline'
import { api } from '@/lib/api'
import { DashboardLayout } from '@/components/layout'
import { Button, Card } from '@/components/ui'
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
      title="Post a Freight Requirement"
      subtitle="Publish your cargo specifications to get direct bids from verified transporters within 50km."
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-danger-700 dark:text-danger-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-7 space-y-6">
            {/* Section 1: Route & Locations */}
            <Card padding="lg" className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-surface-100 dark:border-surface-800">
                <MapPinIcon className="w-5 h-5 text-primary-500" />
                <h3 className="text-base font-bold text-surface-900 dark:text-white">
                  1. Pickup & Delivery Route
                </h3>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1">
                    Pickup PIN *
                  </label>
                  <input
                    type="text"
                    {...register('loadingPin', { required: 'PIN code is required' })}
                    placeholder="e.g. 411018"
                    className="input"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1">
                    Delivery PIN *
                  </label>
                  <input
                    type="text"
                    {...register('unloadingPin', { required: 'PIN code is required' })}
                    placeholder="e.g. 560100"
                    className="input"
                    maxLength={6}
                  />
                </div>
              </div>
            </Card>

            {/* Section 2: Cargo & Vehicle Specifications */}
            <Card padding="lg" className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-surface-100 dark:border-surface-800">
                <TruckIcon className="w-5 h-5 text-primary-500" />
                <h3 className="text-base font-bold text-surface-900 dark:text-white">
                  2. Cargo & Vehicle Specifications
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tonnage Required */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1">
                    Cargo Weight (Metric Tons) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    {...register('tonnageRequired', { required: true, min: 0.5 })}
                    placeholder="e.g. 15.5"
                    className="input font-semibold"
                  />
                </div>

                {/* Truck Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1">
                    Preferred Truck Body *
                  </label>
                  <select {...register('truckType')} className="input">
                    <option value="Open">Open Body Truck</option>
                    <option value="Container">Closed Container</option>
                    <option value="OpenBody">Open Body Trailer</option>
                  </select>
                </div>
              </div>

              {/* Optional Dimensions */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">
                    Min Deck Length (ft) <span className="text-surface-400">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    {...register('minLengthFt')}
                    placeholder="e.g. 24"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">
                    Min Container Height (ft) <span className="text-surface-400">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    {...register('minHeightFt')}
                    placeholder="e.g. 8"
                    className="input"
                  />
                </div>
              </div>
            </Card>

            {/* Section 3: Commercial Terms & Pricing */}
            <Card padding="lg" className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-surface-100 dark:border-surface-800">
                <CurrencyRupeeIcon className="w-5 h-5 text-primary-500" />
                <h3 className="text-base font-bold text-surface-900 dark:text-white">
                  3. Commercial Budget & Schedule
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1">
                    Target Freight Price (₹) <span className="text-surface-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    {...register('maxPrice')}
                    placeholder="e.g. 45000"
                    className="input font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1">
                    Expected Delivery Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    {...register('expectedDeliveryAt')}
                    className="input text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Advance and Urgency */}
              <div className="pt-3 border-t border-surface-100 dark:border-surface-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="urgent"
                    {...register('urgent')}
                    className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="urgent" className="text-xs font-bold text-danger-600 dark:text-danger-400 cursor-pointer">
                    🚨 Mark as Urgent Freight (Immediate Vehicle Needed)
                  </label>
                </div>

                <div className="text-xs text-surface-500">
                  Standard Commercial terms: 50% advance upon loading
                </div>
              </div>
            </Card>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                className="py-3.5 text-base font-bold"
              >
                Publish Load Requirement
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
