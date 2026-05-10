import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SUPER_ADMIN_EMAIL = 'bataillejust@gmail.com'

// GET: List all users (ONLY bataillejust@gmail.com can access)
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const supabaseAdmin = getSupabaseAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  // ONLY bataillejust@gmail.com can access admin panel - NO EXCEPTIONS
  if (user.email !== SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  // Get ALL users from Supabase Auth directly
  const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Try to get profiles (may not exist for all users)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')

  // Combine auth users with profiles
  const enrichedUsers = authUsers?.map(authUser => {
    const profile = profiles?.find(p => p.id === authUser.id)
    return {
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at,
      last_sign_in_at: authUser.last_sign_in_at,
      created_at: authUser.created_at,
      is_admin: profile?.is_admin || authUser.email === SUPER_ADMIN_EMAIL,
      blocked: profile?.blocked || false,
      blocked_reason: profile?.blocked_reason || null,
    }
  }) || []

  return NextResponse.json({ users: enrichedUsers })
}

// POST: Admin actions (ONLY bataillejust@gmail.com can perform)
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const supabaseAdmin = getSupabaseAdmin()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  // ONLY bataillejust@gmail.com can perform admin actions
  if (user.email !== SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const body = await request.json()
  const { action, target_user_id, reason } = body

  if (!action || !target_user_id) {
    return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 })
  }

  // Prevent self-modification for certain actions
  if (target_user_id === user.id && (action === 'block' || action === 'remove_admin')) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous bloquer ou retirer vos droits admin' }, { status: 400 })
  }

  // Get target user info
  const { data: targetProfile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', target_user_id)
    .single()

  let updateData: Record<string, any> = {}
  let logAction = ''

  switch (action) {
    case 'block':
      updateData = {
        blocked: true,
        blocked_at: new Date().toISOString(),
        blocked_reason: reason || 'Bloque par admin'
      }
      logAction = 'BLOCK_USER'
      break
    case 'unblock':
      updateData = {
        blocked: false,
        blocked_at: null,
        blocked_reason: null
      }
      logAction = 'UNBLOCK_USER'
      break
    case 'make_admin':
      updateData = { is_admin: true }
      logAction = 'MAKE_ADMIN'
      break
    case 'remove_admin':
      updateData = { is_admin: false }
      logAction = 'REMOVE_ADMIN'
      break
    case 'delete':
      // Delete user from auth (will cascade to profile)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id)
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
      logAction = 'DELETE_USER'
      break
    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }

  // Update profile if not delete
  if (action !== 'delete') {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', target_user_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  // Log admin action
  await supabaseAdmin.from('admin_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: logAction,
    target_user_id: action === 'delete' ? null : target_user_id,
    target_email: targetProfile?.email,
    details: { reason }
  })

  return NextResponse.json({ success: true, action: logAction })
}
