// Wrapper Groq — gestion multi-modeles, timeouts, rate limiting, retry
import Groq from 'groq-sdk'
import { AGENTS, TIMEOUTS, GROQ_RATE_LIMIT } from './config'

// Singleton Groq client
let _groq: Groq | null = null
function getGroqClient(): Groq {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY non definie')
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

// Compteur de requetes en memoire (par process)
const requestCounts = { minute: 0, lastReset: Date.now(), daily: 0, lastDailyReset: Date.now() }

function checkRateLimit(model: string): void {
  const now = Date.now()

  // Reset minute counter
  if (now - requestCounts.lastReset > 60_000) {
    requestCounts.minute = 0
    requestCounts.lastReset = now
  }
  // Reset daily counter
  if (now - requestCounts.lastDailyReset > 86_400_000) {
    requestCounts.daily = 0
    requestCounts.lastDailyReset = now
  }

  const rpm = model.includes('8b') || model.includes('instant')
    ? GROQ_RATE_LIMIT.RPM_FAST
    : GROQ_RATE_LIMIT.RPM_POWERFUL

  if (requestCounts.minute >= rpm) {
    throw new Error(`RATE_LIMIT: ${requestCounts.minute} req/min atteint pour ${model}`)
  }
  if (requestCounts.daily >= GROQ_RATE_LIMIT.DAILY_LIMIT) {
    throw new Error('RATE_LIMIT: quota journalier Groq atteint')
  }
}

function incrementCounter(): void {
  requestCounts.minute++
  requestCounts.daily++
}

export type AgentType = keyof typeof AGENTS

export interface GroqCallResult {
  content: string
  model: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  latency: number
}

// Appel Groq avec timeout, retry et rate limit
export async function callGroq(
  agentType: AgentType,
  systemPrompt: string,
  userPrompt: string,
  retryCount = 0
): Promise<GroqCallResult> {
  const agent = AGENTS[agentType]
  const startTime = Date.now()

  checkRateLimit(agent.model)

  try {
    incrementCounter()

    const completion = await Promise.race([
      getGroqClient().chat.completions.create({
        model: agent.model,
        messages: [
          {
            role: 'system',
            content: `Tu es ${agent.name}. ${agent.description}. Reponds TOUJOURS en JSON valide parsable. Ne mets JAMAIS de texte avant ou apres le JSON. Utilise uniquement les donnees fournies, n'invente rien.`,
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: agent.temperature,
        max_tokens: agent.maxTokens,
        response_format: { type: 'json_object' },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUTS.GROQ_CALL)
      ),
    ])

    const content = completion.choices?.[0]?.message?.content ?? '{}'
    const usage = completion.usage

    return {
      content,
      model: agent.model,
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
      latency: Date.now() - startTime,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'

    // Retry 1 fois si pas rate limit
    if (retryCount < 1 && !message.includes('RATE_LIMIT')) {
      console.warn(`[Groq][${agentType}] Retry apres erreur: ${message}`)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Attendre 2s
      return callGroq(agentType, systemPrompt, userPrompt, retryCount + 1)
    }

    throw new Error(`[Groq][${agentType}] Echec apres retry: ${message}`)
  }
}

// Retourner les stats de rate limiting pour monitoring
export function getGroqStats() {
  return {
    requestsThisMinute: requestCounts.minute,
    requestsToday: requestCounts.daily,
    dailyLimit: GROQ_RATE_LIMIT.DAILY_LIMIT,
    usagePercent: Math.round((requestCounts.daily / GROQ_RATE_LIMIT.DAILY_LIMIT) * 100),
  }
}
