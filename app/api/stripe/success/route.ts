import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const userId = session.metadata?.user_id;
    const planId = session.metadata?.plan_id;
    const invitationToken = session.metadata?.invitation_token;

    if (!userId || !planId) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    // Check if subscription already exists
    const { data: existingSub } = await supabase
      .from('broker_subscriptions')
      .select('id')
      .eq('broker_id', userId)
      .eq('status', 'active')
      .single();

    if (existingSub) {
      return NextResponse.json({ success: true, message: 'Subscription already exists' });
    }

    // Get plan details
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Create broker subscription (stripe_customer_id is stored in profiles, not broker_subscriptions)
    const { error: subscriptionError } = await supabase
      .from('broker_subscriptions')
      .upsert({
        broker_id: userId,
        plan_id: planId,
        status: 'active',
        stripe_subscription_id: session.subscription as string,
        tokens_remaining: plan.tokens_per_month,
        tokens_used: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'broker_id',
      });

    if (subscriptionError) {
      console.error('Failed to create subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    // Update broker profile with Stripe customer ID
    await supabase
      .from('profiles')
      .update({
        stripe_customer_id: session.customer as string,
      })
      .eq('id', userId);

    // Update invitation status if token provided
    if (invitationToken) {
      await supabase
        .from('broker_invitations')
        .update({ status: 'accepted' })
        .eq('invitation_token', invitationToken);
    }

    console.log(`Subscription activated for user ${userId} with plan ${plan.name}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Success handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
