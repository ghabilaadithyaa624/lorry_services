'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { ContactRevealModal } from './ContactRevealModal'

interface Truck {
  id: string
  bodyType: string
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  serviceableRadiusKm: number
  preferredDestinations: string[]
  verificationStatus: string
  distanceKm: number
}

interface TruckCardProps {
  truck: Truck
}

export function TruckCard({ truck }: TruckCardProps) {
  const [showPaywall, setShowPaywall] = useState(false)
  const [contactData, setContactData] = useState<any>(null)

  const handleViewContact = async () => {
    try {
      const res = await api.post(`/search/truck/${truck.id}/reveal`)
      setContactData(res.data)
    } catch (err: any) {
      if (err.response?.status === 402 || err.response?.status === 403) {
        setShowPaywall(true)
      }
    }
  }

  return (
    <>
      <div className="card p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2">
              ● {truck.verificationStatus}
            </span>
            <h3 className="font-semibold text-lg">{truck.bodyType} Body</h3>
          </div>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {truck.distanceKm}km away
          </span>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 dark:border-gray-800 mb-4 text-center">
          <div>
            <div className="text-xs text-gray-500">Capacity</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{truck.tonnageCapacity}T</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Length</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{truck.lengthFt}ft</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Height</div>
            <div className="font-bold text-gray-900 dark:text-gray-100">{truck.heightFt}ft</div>
          </div>
        </div>

        {/* Service Radius */}
        <div className="text-xs text-gray-500 mb-4">
          <div>Services up to {truck.serviceableRadiusKm}km</div>
          {truck.preferredDestinations?.length > 0 && (
            <div className="mt-1 text-gray-600 dark:text-gray-400">
              Prefers: {truck.preferredDestinations.join(', ')}
            </div>
          )}
        </div>

        {/* Contact Button */}
        {contactData ? (
          <div className="space-y-2">
            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{contactData.owner?.name || 'Truck Owner'}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{contactData.owner?.phone}</div>
            <a
              href={contactData.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full text-center block py-2 text-sm bg-whatsapp hover:bg-green-600"
            >
              💬 Chat on WhatsApp
            </a>
          </div>
        ) : (
          <button onClick={handleViewContact} className="btn-primary w-full text-sm py-2">
            🔒 View Contact Details
          </button>
        )}
      </div>

      {showPaywall && (
        <ContactRevealModal
          onClose={() => setShowPaywall(false)}
          onSubscribe={() => {
            setShowPaywall(false)
            window.location.href = '/subscribe'
          }}
        />
      )}
    </>
  )
}
