'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'

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
      router.push('/my-loads?success=true')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post load')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto card p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Post a Load</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-button text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tonnage */}
          <div>
            <label className="block text-sm font-medium mb-1">Tonnage Required (Tons) *</label>
            <input
              type="number"
              step="0.1"
              {...register('tonnageRequired', { required: true, min: 0.5 })}
              placeholder="e.g., 15.5"
              className="input"
            />
          </div>

          {/* Loading Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <AddressAutocomplete
                label="Pickup Address *"
                value={watch('loadingAddress') || ''}
                onChange={(address, pincode) => {
                  setValue('loadingAddress', address)
                  if (pincode) setValue('loadingPin', pincode)
                }}
                placeholder="Enter pickup location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PIN Code *</label>
              <input
                type="text"
                {...register('loadingPin', { required: true })}
                placeholder="411018"
                className="input"
              />
            </div>
          </div>

          {/* Unloading Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <AddressAutocomplete
                label="Delivery Address *"
                value={watch('unloadingAddress') || ''}
                onChange={(address, pincode) => {
                  setValue('unloadingAddress', address)
                  if (pincode) setValue('unloadingPin', pincode)
                }}
                placeholder="Enter delivery location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PIN Code *</label>
              <input
                type="text"
                {...register('unloadingPin', { required: true })}
                placeholder="560100"
                className="input"
              />
            </div>
          </div>

          {/* Truck Type */}
          <div>
            <label className="block text-sm font-medium mb-1">Truck Type *</label>
            <select {...register('truckType')} className="input">
              <option value="Open">Open Body</option>
              <option value="Container">Container</option>
              <option value="OpenBody">Open Body Trailer</option>
            </select>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Length (ft)</label>
              <input
                type="number"
                {...register('minLengthFt')}
                placeholder="Optional"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Height (ft)</label>
              <input
                type="number"
                {...register('minHeightFt')}
                placeholder="Optional"
                className="input"
              />
            </div>
          </div>

          {/* Price & Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Max Price (₹)</label>
              <input
                type="number"
                {...register('maxPrice')}
                placeholder="Optional"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expected Delivery</label>
              <input
                type="datetime-local"
                {...register('expectedDeliveryAt')}
                className="input"
              />
            </div>
          </div>

          {/* Advance & Urgent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium mb-1">Advance Payable (₹)</label>
              <input
                type="number"
                {...register('advancePayable')}
                placeholder="Optional"
                className="input"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="urgent"
                {...register('urgent')}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
              />
              <label htmlFor="urgent" className="text-sm font-medium text-red-600">
                Mark as Urgent Load
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg py-3 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Load'}
          </button>
        </form>
      </div>
    </div>
  )
}
