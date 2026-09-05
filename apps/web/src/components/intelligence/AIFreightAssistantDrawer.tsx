'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { AssistantResponse, parseNaturalLanguageIntent } from '@/lib/intelligence/aiAssistantEngine'
import { ReturnLoadOpportunityCard } from './ReturnLoadOpportunityCard'
import { FreightRateEstimatorCard } from './FreightRateEstimatorCard'
import { Button, Spinner } from '@/components/ui'
import { api } from '@/lib/api'
import { fetchReturnLoadsAnswer } from '@/lib/intelligence/returnLoadAssistant'
import { formatINR, cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

interface MessageItem {
  id: string
  sender: 'user' | 'assistant'
  text: string
  response?: AssistantResponse
}

const SAMPLE_PROMPTS = [
  'Find me a 20 ton container from Chennai to Bengaluru.',
  'Which of my trucks are closest to Chennai?',
  'Find return loads for my truck after it reaches Bengaluru.',
  'What is the indicative freight price?',
  'Why is this shipment delayed?',
]

export function AIFreightAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your LorryCarry AI Freight Assistant. Ask me to find trucks, discover return loads, estimate rates, or check shipment risk.',
    },
  ])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSendQuery = async (queryText?: string) => {
    const q = queryText || inputQuery
    if (!q.trim()) return

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
    }

    setMessages((prev) => [...prev, userMsg])
    if (!queryText) setInputQuery('')
    setLoading(true)

    try {
      // Return-load questions are answered by the backend product API so the
      // driver sees the same ranked, paywall-aware opportunities as the
      // dashboard — not a client-side re-computation.
      const intent = parseNaturalLanguageIntent(q)
      if (intent.operation === 'FIND_RETURN_LOADS') {
        const backendAnswer = await fetchReturnLoadsAnswer(intent)
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            text: backendAnswer.message,
            response: backendAnswer,
          },
        ])
        return
      }

      // Fetch live context records to execute against
      const [trucksRes, loadsRes, bookingsRes] = await Promise.allSettled([
        api.get('/search/trucks?radius=150'),
        api.get('/search/loads?radius=150'),
        api.get('/bookings'),
      ])

      const contextData = {
        realTrucks: trucksRes.status === 'fulfilled' ? trucksRes.value.data : [],
        realLoads: loadsRes.status === 'fulfilled' ? loadsRes.value.data : [],
        realBookings: bookingsRes.status === 'fulfilled' ? bookingsRes.value.data : [],
      }

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, contextData }),
      })

      const data: AssistantResponse = await res.json()

      const assistantMsg: MessageItem = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.message,
        response: data,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      toast.error('Assistant could not process query.')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteConfirmedBooking = async (action: any) => {
    try {
      setActionLoading(true)
      // Call real booking API only after explicit user confirmation
      const res = await api.post('/bookings', {
        loadId: action.details.loadId || 'load-direct-ai',
        truckId: action.details.truckId || 'truck-direct-ai',
        agreedPrice: action.details.agreedPrice,
      })

      toast.success(`Booking #${res.data?.id || 'confirmed'} created successfully!`)

      setMessages((prev) => [
        ...prev,
        {
          id: `confirmed-${Date.now()}`,
          sender: 'assistant',
          text: `✓ Booking confirmed for ${action.details.routeLabel} at ${formatINR(action.details.agreedPrice)}. 50% loading advance pending dispatch.`,
        },
      ])
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Booking confirmation failed.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      {/* Floating Assistant Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Freight Assistant"
        aria-expanded={isOpen}
        aria-controls="ai-freight-assistant-drawer"
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-button bg-surface-900/90 text-white font-semibold text-xs shadow-elevated hover:shadow-card-hover border border-white/10 font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <SparklesIcon className="w-4 h-4 animate-pulse" aria-hidden="true" />
        <span>AI Freight Assistant</span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          id="ai-freight-assistant-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="LorryCarry AI Freight Assistant"
          className="fixed inset-0 z-50 flex justify-end bg-black/80 transition-opacity animate-fade-in font-sans"
        >
          <div className="w-full max-w-lg bg-panel text-white h-full shadow-modal flex flex-col justify-between border-l border-white/10">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center text-primary-400 border border-white/10">
                  <SparklesIcon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    LorryCarry AI Freight Assistant
                  </h3>
                  <span className="text-[10px] text-surface-400 font-sans block">
                    Operations Intelligence
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Freight Assistant"
                className="p-1.5 rounded-xl text-surface-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Quick Sample Prompts Bar */}
            <div className="p-3 border-b border-white/10 bg-surface-950/60 overflow-x-auto no-scrollbar flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-surface-400 shrink-0">
                Prompts:
              </span>
              {SAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendQuery(prompt)}
                  aria-label={`Ask sample prompt: ${prompt}`}
                  className="px-3 py-1 rounded-full bg-surface-900/80 border border-white/10 text-[11px] font-mono text-surface-300 hover:border-primary-400 hover:text-white transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Body */}
            <div
              aria-live="polite"
              aria-atomic="false"
              className="flex-1 p-4 overflow-y-auto space-y-4"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-[90%] space-y-2',
                    msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                  {/* Chat Bubble */}
                  <div
                    className={cn(
                      'p-3.5 rounded-2xl text-xs space-y-1.5',
                      msg.sender === 'user'
                        ? 'bg-primary-500 text-white rounded-br-none font-bold shadow-glow-primary'
                        : 'bg-surface-950/80 text-surface-100 rounded-bl-none border border-white/10 shadow-card'
                    )}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>

                  {/* Assistant Interactive Structured Result Rendering */}
                  {msg.sender === 'assistant' && msg.response && (
                    <div className="w-full space-y-3 pt-1">
                      {/* Actionable Intent Execution Button */}
                      {msg.response.preparedAction && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary-950/60 via-purple-950/40 to-surface-950 border border-purple-500/40 space-y-2.5 shadow-card">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                            Direct Commercial Dispatch Agreement
                          </span>
                          <p className="text-xs text-white font-bold">
                            {msg.response.preparedAction.details.routeLabel} @ {formatINR(msg.response.preparedAction.details.agreedPrice)}
                          </p>
                          <p className="text-[11px] text-surface-300 font-mono">
                            Terms: Standard 50% Loading Advance / 50% Balance on POD unloading.
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={actionLoading}
                            onClick={() => handleExecuteConfirmedBooking(msg.response?.preparedAction)}
                            className="w-full text-xs font-bold py-2 shadow-glow-primary bg-primary-500 border border-purple-400/30"
                          >
                            Execute Confirmed Direct Booking
                          </Button>
                        </div>
                      )}

                      {/* Return Load Opportunity Cards Stream */}
                      {msg.response.returnLoads && msg.response.returnLoads.length > 0 && (
                        <div className="space-y-2">
                          {msg.response.returnLoads.slice(0, 2).map((opp: any) => (
                            <ReturnLoadOpportunityCard key={opp.loadId} opportunity={opp} />
                          ))}
                        </div>
                      )}

                      {/* Freight Estimator Card */}
                      {msg.response.freightEstimate && (
                        <FreightRateEstimatorCard
                          input={{
                            tonnage: msg.response.intent.tonnage || 15,
                            truckType: (msg.response.intent.truckType as any) || 'Open',
                            distanceKm: 350,
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-950/80 border border-white/10 text-xs font-mono text-surface-400">
                  <Spinner size="sm" />
                  <span>Converting intent & querying live database records...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-white/10 bg-surface-950">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendQuery()
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask LorryCarry AI (e.g. Find 20T Container Chennai to Bengaluru)..."
                  aria-label="Ask AI Assistant a question"
                  className="input flex-1 text-xs py-2.5 bg-surface-900 border-white/10 text-white placeholder:text-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !inputQuery.trim()}
                  aria-label="Send query to AI Freight Assistant"
                  className="shrink-0 font-bold shadow-glow-primary"
                >
                  <PaperAirplaneIcon className="w-4 h-4" aria-hidden="true" />
                </Button>
              </form>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
