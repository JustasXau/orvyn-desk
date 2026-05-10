import { NextRequest, NextResponse } from 'next/server'
import { runChainOfThought } from '@/lib/ai/chain-orchestrator'

/**
 * SSE Streaming endpoint for real-time AI analysis
 * Sends analysis updates as they're generated
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { pair: string } }
) {
  const pair = params.pair?.toUpperCase()
  if (!pair) {
    return NextResponse.json({ error: 'Pair required' }, { status: 400 })
  }

  // Create streaming response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sendEvent = (type: string, data: any) => {
          const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(event))
        }

        // Run orchestrator and stream results
        const results = await runChainOfThought(pair, (progress) => {
          sendEvent('progress', progress)
        })

        // Send technical analysis
        if (results.technical) {
          sendEvent('technical', results.technical)
        }

        // Send macro analysis
        if (results.macro) {
          sendEvent('macro', results.macro)
        }

        // Send news analysis
        if (results.news) {
          sendEvent('news', results.news)
        }

        // Send final synthesis
        if (results.synthesis) {
          sendEvent('synthesis', results.synthesis)
        }

        // Done
        sendEvent('done', { timestamp: new Date().toISOString() })
        controller.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`)
        )
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
