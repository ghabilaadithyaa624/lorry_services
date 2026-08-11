'use client'

import React, { useState } from 'react'
import {
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import { AssistantResponse } from '@/lib/intelligence/aiAssistantEngine'
import { ReturnLoadOpportunityCard } from './ReturnLoadOpportunityCard'
import { FreightRateEstimatorCard } from './FreightRateEstimatorCard'
import { Button, Badge, Spinner } from '@/components/ui'
import { api } from '@/lib/api'
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
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your LorryCarry AI Freight Assistant. Ask me to find trucks, discover return loads, estimate rates, or check shipment risk.',
    },
  ])

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
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white font-bold text-xs shadow-elevated hover:shadow-card-hover hover:scale-105 transition-all duration-200 cursor-pointer"
      >
        <SparklesIcon className="w-5 h-5 animate-pulse" />
        <span>AI Freight Assistant</span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-surface-950/60 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-surface-900 h-full shadow-2xl flex flex-col justify-between border-l border-surface-200 dark:border-surface-800">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between bg-surface-50 dark:bg-surface-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-500 to-purple-600 flex items-center justify-center text-white">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                    LorryCarry AI Freight Assistant
                  </h3>
                  <span className="text-[10px] text-surface-500 font-mono block">
                    Grounded strictly in live database records
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Sample Prompts Bar */}
            <div className="p-3 border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900 overflow-x-auto scrollbar-none flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400 shrink-0">
                Prompts:
              </span>
              {SAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuery(prompt)}
                  className="px-2.5 py-1 rounded-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-[11px] font-medium text-surface-700 dark:text-surface-300 hover:border-primary-400 transition-colors shrink-0 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
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
                        ? 'bg-primary-600 text-white rounded-br-none font-medium'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white rounded-bl-none border border-surface-200/60 dark:border-surface-700/60'
                    )}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>

                  {/* Assistant Structured Result Cards */}
                  {msg.response && (
                    <div className="w-full space-y-3 pt-1">
                      
                      {/* Structured Intent Badge */}
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-surface-400">
                        <span>Intent:</span>
                        <Badge variant="info" size="sm">
                          {msg.response.intent.operation}
                        </Badge>
                      </div>

                      {/* Prepared Financial Booking Card */}
                      {msg.response.preparedAction && (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 space-y-3">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                            <ShieldExclamationIcon className="w-5 h-5 text-amber-600 shrink-0" />
                            <h4 className="text-xs font-bold uppercase tracking-wider">
                              Explicit User Confirmation Required
                            </h4>
                          </div>

                          <div className="p-3 rounded-lg bg-white dark:bg-surface-900 border border-amber-200 text-xs space-y-1">
                            <p className="font-black text-surface-900 dark:text-white text-sm">
                              Create booking for {formatINR(msg.response.preparedAction.details.agreedPrice)}?
                            </p>
                            <p className="text-surface-600 dark:text-surface-300 text-[11px]">
                              Route: {msg.response.preparedAction.details.routeLabel} ({msg.response.preparedAction.details.tonnage}T {msg.response.preparedAction.details.truckType})
                            </p>
                          </div>

                          <Button
                            variant="primary"
                            size="md"
                            fullWidth
                            loading={actionLoading}
                            onClick={() => handleExecuteConfirmedBooking(msg.response?.preparedAction)}
                            className="font-bold text-xs py-2.5"
                          >
                            [Confirm Booking]
                          </Button>
                        </div>
                      )}

                      {/* Return Load Opportunity Cards */}
                      {msg.response.returnLoads && msg.response.returnLoads.length > 0 && (
                        <div className="space-y-3">
                          {msg.response.returnLoads.slice(0, 2).map((opp) => (
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
                <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-50 dark:bg-surface-800 text-xs font-semibold text-surface-500">
                  <Spinner size="sm" />
                  <span>Converting intent & querying live database records...</span>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendQuery()
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask LorryCarry AI (e.g. Find 20T Container Chennai to Bengaluru)..."
                  className="input flex-1 text-xs py-2.5"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !inputQuery.trim()}
                  className="shrink-0"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
              </form>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
