import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAIL = 'bataillejust@gmail.com'

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ isAdmin: false, blocked: false })
    }

    // ONLY bataillejust@gmail.com is admin - NO other users
    const isAdmin = user.email === SUPER_ADMIN_EMAIL

    return NextResponse.json({ 
      isAdmin: isAdmin,
      blocked: false
    })
  } catch (error) {
    return NextResponse.json({ isAdmin: false, blocked: false })
  }
}
