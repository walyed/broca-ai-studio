import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if user has a subscription
      const { data: subscription } = await supabase
        .from('broker_subscriptions')
        .select('id, status')
        .eq('broker_id', data.user.id)
        .eq('status', 'active')
        .maybeSingle()
      
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // If admin, go to admin dashboard
      if (profile?.role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`)
      }

      // If no subscription and broker role, redirect to plan selection
      if (!subscription && profile?.role === 'broker') {
        return NextResponse.redirect(`${origin}/signup?step=plan`)
      }

      // Otherwise go to next or dashboard
      const redirectTo = next || '/dashboard'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
