-- Migration: Update subscription plans tokens
-- Run this in your Supabase SQL Editor

-- Add Free plan if it doesn't exist
INSERT INTO public.subscription_plans (name, price, tokens_per_month, features) 
VALUES ('Free', 0.00, 150, '["150 AI tokens/month", "Up to 5 clients", "Email support", "Basic forms"]')
ON CONFLICT (name) DO UPDATE SET
  price = 0.00,
  tokens_per_month = 150,
  features = '["150 AI tokens/month", "Up to 5 clients", "Email support", "Basic forms"]';

-- Update the Starter plan
UPDATE subscription_plans 
SET 
  price = 29.00,
  tokens_per_month = 250,
  features = '["250 AI tokens/month", "Up to 25 clients", "Email support", "Basic forms"]'
WHERE name = 'Starter';

-- Update the Professional plan
UPDATE subscription_plans 
SET 
  price = 99.00,
  tokens_per_month = 1000,
  features = '["1000 AI tokens/month", "Unlimited clients", "Priority support", "Custom forms", "Advanced analytics"]'
WHERE name = 'Professional';

-- Update the Enterprise plan
UPDATE subscription_plans 
SET 
  price = 299.00,
  tokens_per_month = 5000,
  features = '["5000 AI tokens/month", "Unlimited clients", "Dedicated support", "Custom integrations", "White-label option", "API access"]'
WHERE name = 'Enterprise';

-- Update any existing subscriptions to have correct token amounts
-- Free users
UPDATE broker_subscriptions bs
SET tokens_remaining = GREATEST(0, 150 - COALESCE(tokens_used, 0))
FROM subscription_plans sp
WHERE bs.plan_id = sp.id 
  AND sp.name = 'Free'
  AND bs.status = 'active';

-- Starter users
UPDATE broker_subscriptions bs
SET tokens_remaining = GREATEST(0, 250 - COALESCE(tokens_used, 0))
FROM subscription_plans sp
WHERE bs.plan_id = sp.id 
  AND sp.name = 'Starter'
  AND bs.status = 'active';

-- Professional users  
UPDATE broker_subscriptions bs
SET tokens_remaining = GREATEST(0, 1000 - COALESCE(tokens_used, 0))
FROM subscription_plans sp
WHERE bs.plan_id = sp.id 
  AND sp.name = 'Professional'
  AND bs.status = 'active';

-- Enterprise users
UPDATE broker_subscriptions bs
SET tokens_remaining = GREATEST(0, 5000 - COALESCE(tokens_used, 0))
FROM subscription_plans sp
WHERE bs.plan_id = sp.id 
  AND sp.name = 'Enterprise'
  AND bs.status = 'active';

-- Update the deduct_tokens function to remove unlimited token handling
CREATE OR REPLACE FUNCTION deduct_tokens(
  p_broker_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT bs.tokens_remaining INTO v_current_balance
  FROM public.broker_subscriptions bs
  WHERE bs.broker_id = p_broker_id;
  
  -- Check if enough tokens
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct tokens
  UPDATE public.broker_subscriptions 
  SET tokens_remaining = tokens_remaining - p_amount,
      tokens_used = tokens_used + p_amount,
      updated_at = NOW()
  WHERE broker_id = p_broker_id;
  
  -- Log transaction
  INSERT INTO public.token_transactions (broker_id, action_type, description, tokens_amount, balance_after)
  VALUES (p_broker_id, p_action_type, p_description, -p_amount, v_current_balance - p_amount);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the changes
SELECT name, price, tokens_per_month, features FROM subscription_plans ORDER BY price;
