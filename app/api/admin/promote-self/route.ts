import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST: Promote first user to admin (one-time setup)
// Requires ADMIN_SETUP_SECRET for additional security
export async function POST(request: NextRequest) {
  try {
    // Optional secret key protection
    const body = await request.json().catch(() => ({}))
    const ADMIN_SECRET = process.env.ADMIN_SETUP_SECRET
    
    // If secret is configured, require it
    if (ADMIN_SECRET && body.secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Invalid admin setup secret' }, { status: 403 })
    }
    
    const supabase = await createServerClient()
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Only bataillejust@gmail.com can be promoted to admin
    if (user.email !== 'bataillejust@gmail.com') {
      return NextResponse.json({ 
        error: 'Only bataillejust@gmail.com can be promoted to admin' 
      }, { status: 403 })
    }

    // Check if there's already an admin
    const { data: existingAdmins } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1)

    // If there are existing admins and you're not one, deny
    if (existingAdmins && existingAdmins.length > 0) {
      const { data: currentProfile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!currentProfile?.is_admin) {
        return NextResponse.json({ error: 'Only first user can be promoted' }, { status: 403 })
      }
    }

    // Promote user to admin
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', user.id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log action
    await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        admin_email: user.email!,
        action: 'self_promote_to_admin',
        target_user_id: user.id,
        target_email: user.email,
        details: { reason: 'Initial admin setup' }
      })

    return NextResponse.json({ 
      success: true, 
      message: 'Promoted to admin',
      data 
    })
  } catch (error) {
    console.error('[v0] Promote admin error:', error)
    return NextResponse.json({ error: 'Failed to promote admin' }, { status: 500 })
  }
}
