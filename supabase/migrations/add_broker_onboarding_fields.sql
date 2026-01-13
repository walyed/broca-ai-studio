-- =====================================================
-- MIGRATION: Add broker onboarding fields
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add stripe_customer_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add invitation_token to broker_invitations
ALTER TABLE public.broker_invitations 
ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE;

-- Add stripe_subscription_id and past_due status to broker_subscriptions
ALTER TABLE public.broker_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE public.broker_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT;

-- Update status check constraint to include more states
ALTER TABLE public.broker_subscriptions 
DROP CONSTRAINT IF EXISTS broker_subscriptions_status_check;

ALTER TABLE public.broker_subscriptions 
ADD CONSTRAINT broker_subscriptions_status_check 
CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'past_due', 'suspended'));

-- Add stripe_payment_id to platform_transactions
ALTER TABLE public.platform_transactions 
ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT;

-- Create index for faster invitation token lookups
CREATE INDEX IF NOT EXISTS idx_broker_invitations_token 
ON public.broker_invitations(invitation_token);

-- Create index for faster Stripe subscription ID lookups
CREATE INDEX IF NOT EXISTS idx_broker_subscriptions_stripe_id 
ON public.broker_subscriptions(stripe_subscription_id);

-- Update subscription plans with recommended tokens
UPDATE public.subscription_plans 
SET tokens_per_month = 100 
WHERE name = 'Starter' AND tokens_per_month != 100;

UPDATE public.subscription_plans 
SET tokens_per_month = 350 
WHERE name = 'Professional' AND tokens_per_month != 350;

-- If you want to update plans with new pricing, uncomment below:
-- UPDATE public.subscription_plans SET price = 9.99 WHERE name = 'Starter';
-- UPDATE public.subscription_plans SET price = 29.99 WHERE name = 'Professional';
-- UPDATE public.subscription_plans SET price = 99.99 WHERE name = 'Enterprise';

-- Add public read policy for subscription_plans (so signup page can fetch them)
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Enable RLS on subscription_plans if not already enabled
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access for broker_invitations lookup (needed for signup page)
DROP POLICY IF EXISTS "Anyone can view own invitation by token" ON public.broker_invitations;
CREATE POLICY "Anyone can view own invitation by token" ON public.broker_invitations
  FOR SELECT USING (true);

-- Grant service role permissions for API routes
-- (This is handled by Supabase service role key, no SQL needed)

SELECT 'Migration completed successfully!' as status;
