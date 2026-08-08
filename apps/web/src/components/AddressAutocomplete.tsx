'use client'

import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'

interface Suggestion {
  placeId: string
  address: string
  pincode?: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, pincode?: string, lat?: number, lng?: number) => void
  placeholder?: string
  label?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address...',
  label,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        // Using MapmyIndia API through our backend
        const res = await api.get(`/mapmyindia/suggestions?query=${encodeURIComponent(query)}`)
        setSuggestions(res.data)
        setShowSuggestions(true)
      } catch (e) {
        // Fallback: just show as typed
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.address)
    onChange(suggestion.address, suggestion.pincode)
    setShowSuggestions(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-medium mb-1 dark:text-gray-200">
          {label}
        </label>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
        }}
        placeholder={placeholder}
        className="input"
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-9 text-xs text-gray-400">
          Loading...
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-button shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <li
              key={suggestion.placeId || idx}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {suggestion.address}
              </div>
              {suggestion.pincode && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  PIN: {suggestion.pincode}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
