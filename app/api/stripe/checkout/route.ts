import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const { planId, userId, invitationToken } = await request.json();

    console.log('Checkout request:', { planId, userId, invitationToken });

    if (!planId || !userId) {
      return NextResponse.json({ error: 'Plan ID and User ID are required' }, { status: 400 });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('Plan not found:', planError);
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get user details from profiles table
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, stripe_customer_id')
      .eq('id', userId)
      .single();

    // If profile doesn't exist, get user from Supabase Auth and create profile
    if (profileError || !profile) {
      console.log('Profile not found, checking Supabase Auth...');
      
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authError || !authUser.user) {
        console.error('User not found in auth:', authError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Create profile for the user
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: authUser.user.email,
          full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0],
          role: 'broker',
        })
        .select('email, full_name, stripe_customer_id')
        .single();

      if (createError) {
        console.error('Failed to create profile:', createError);
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }

      profile = newProfile;
      console.log('Created new profile:', profile);
    }

    // Check if user already has active subscription
    const { data: existingSubscription } = await supabase
      .from('broker_subscriptions')
      .select('id, status')
      .eq('broker_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSubscription) {
      return NextResponse.json({ error: 'User already has an active subscription' }, { status: 409 });
    }

    // Create or get Stripe customer
    let customerId: string;
    
    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || undefined,
        metadata: {
          user_id: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan`,
              description: plan.description || `${plan.tokens_per_month === -1 ? 'Unlimited' : plan.tokens_per_month} tokens per month`,
            },
            unit_amount: Math.round(plan.price * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/signup?subscription=cancelled${invitationToken ? `&invitation=${invitationToken}` : ''}&step=plan`,
      metadata: {
        user_id: userId,
        plan_id: planId,
        invitation_token: invitationToken || '',
      },
    });

    console.log('Checkout session created:', session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
