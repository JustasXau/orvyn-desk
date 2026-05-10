import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Create Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Rate limiters pour differents types d'API
// Chaque utilisateur a un quota par fenetre de temps

// API de prix/donnees - 100 requetes par minute par utilisateur
export const priceApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit:price',
})

// API de news - 30 requetes par minute par utilisateur
export const newsApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'ratelimit:news',
})

// API d'analyse IA (Groq) - 10 requetes par minute par utilisateur (plus couteux)
export const aiApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:ai',
})

// API de biais/analyse technique - 20 requetes par minute par utilisateur
export const analysisApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'ratelimit:analysis',
})

// API generique - 60 requetes par minute par utilisateur
export const generalApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: 'ratelimit:general',
})

// Helper pour obtenir l'identifiant de l'utilisateur (IP ou user ID)
export function getIdentifier(request: Request, userId?: string): string {
  if (userId) return userId
  
  // Utiliser l'IP comme fallback
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous'
  return ip
}

// Helper pour creer une reponse de rate limit
export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  return new Response(
    JSON.stringify({
      error: 'Trop de requetes. Veuillez patienter.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(reset),
      },
    }
  )
}

// Middleware helper pour verifier le rate limit
export async function checkRateLimit(
  request: Request,
  limiter: Ratelimit,
  userId?: string
): Promise<{ success: boolean; response?: Response }> {
  const identifier = getIdentifier(request, userId)
  const { success, reset, remaining } = await limiter.limit(identifier)
  
  if (!success) {
    return { success: false, response: rateLimitResponse(reset) }
  }
  
  return { success: true }
}
