import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client that throws helpful errors
    return {
      auth: {
        signInWithPassword: async () => {
          throw new Error('Supabase n\'est pas configure. Veuillez connecter Supabase dans les parametres.')
        },
        signInWithOAuth: async () => {
          throw new Error('Supabase n\'est pas configure. Veuillez connecter Supabase dans les parametres.')
        },
        signUp: async () => {
          throw new Error('Supabase n\'est pas configure. Veuillez connecter Supabase dans les parametres.')
        },
        signOut: async () => {
          throw new Error('Supabase n\'est pas configure.')
        },
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
    } as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
