'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

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
  id?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address...',
  label,
  id,
}: AddressAutocompleteProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const listboxId = `${inputId}-listbox`

  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const generatedId = useId()
  const inputId = id || `address-input-${generatedId}`
  const listboxId = `address-listbox-${generatedId}`

  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      setActiveIndex(-1)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        // Using Mappls/MapmyIndia API through our backend search proxy
        const res = await api.get(`/search/suggestions?query=${encodeURIComponent(query)}`)
        setSuggestions(res.data)
        setShowSuggestions(true)
        setActiveIndex(-1)
      } catch {
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
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setShowSuggestions(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          e.preventDefault()
          handleSelect(suggestions[activeIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setActiveIndex(-1)
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-1 dark:text-gray-200">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          showSuggestions && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        placeholder={placeholder}
        className="input"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions && suggestions.length > 0}
        aria-controls={listboxId}
        aria-haspopup="listbox"
      />
      {loading && (
        <div role="status" aria-live="polite" className="absolute right-3 top-9 text-xs text-gray-400">
          Loading...
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-button shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, idx) => (
            <li
              key={suggestion.placeId || idx}
              id={`${listboxId}-option-${idx}`}
              role="option"
              aria-selected={activeIndex === idx}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                'px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors',
                activeIndex === idx && 'bg-gray-100 dark:bg-gray-700'
              )}
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
