import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch user's favorites
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ favorites: [] }, { status: 200 })
    }
    
    const { data, error } = await supabase
      .from('user_favorites')
      .select('symbol')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json({ favorites: [] }, { status: 200 })
    }
    
    const favorites = data?.map(f => f.symbol) || []
    
    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json({ favorites: [] }, { status: 200 })
  }
}

// POST - Add a favorite
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { symbol } = await request.json()
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: user.id, symbol })
    
    if (error) {
      // Ignore duplicate errors (user already has this favorite)
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already in favorites' })
      }
      console.error('Error adding favorite:', error)
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE - Remove a favorite
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { symbol } = await request.json()
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('symbol', symbol)
    
    if (error) {
      console.error('Error removing favorite:', error)
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
