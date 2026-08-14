import { NextResponse } from 'next/server'
import {
  parseNaturalLanguageIntent,
  processAssistantQuery,
} from '@/lib/intelligence/aiAssistantEngine'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const query = body.query || ''
    const contextData = body.contextData || {}

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      )
    }

    // Server-side intent parsing & data execution
    // API keys remain server-side
    const intent = parseNaturalLanguageIntent(query)
    const response = processAssistantQuery(intent, contextData)

    return NextResponse.json(response)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Assistant failed to process query'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
