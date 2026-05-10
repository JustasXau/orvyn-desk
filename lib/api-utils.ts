/**
 * Get the base URL for internal API calls
 * Works correctly in both development and production (Vercel)
 */
export function getInternalApiUrl(): string {
  // In Vercel production/preview
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // Explicit base URL set
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  // Local development fallback
  return 'http://localhost:3000'
}

/**
 * Make an internal API call with proper error handling
 */
export async function internalFetch<T>(
  path: string, 
  options?: RequestInit & { revalidate?: number }
): Promise<T | null> {
  try {
    const baseUrl = getInternalApiUrl()
    const url = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`
    
    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    }
    
    // Add Next.js revalidation if specified
    if (options?.revalidate !== undefined) {
      (fetchOptions as any).next = { revalidate: options.revalidate }
    }
    
    const response = await fetch(url, fetchOptions)
    
    if (!response.ok) {
      console.warn(`[internalFetch] ${path} returned ${response.status}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error(`[internalFetch] Failed to fetch ${path}:`, error)
    return null
  }
}
