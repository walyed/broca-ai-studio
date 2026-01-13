import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch subscription using service role (bypasses RLS)
    const { data: subscription, error: subError } = await supabase
      .from('broker_subscriptions')
      .select('*')
      .eq('broker_id', userId)
      .maybeSingle();

    if (subError) {
      console.error('Subscription fetch error:', subError);
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    // Fetch the plan details
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .single();

    return NextResponse.json({
      subscription: {
        ...subscription,
        plan,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
