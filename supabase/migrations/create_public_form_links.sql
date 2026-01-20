-- Migration: Create public form links system
-- This allows brokers to generate shareable links for public forms
-- Run this in your Supabase SQL Editor

-- Create public_form_links table
CREATE TABLE IF NOT EXISTS public.public_form_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  link_token TEXT UNIQUE NOT NULL,
  form_template_id UUID REFERENCES public.form_templates(id) ON DELETE SET NULL,
  form_type TEXT, -- quick-real-estate, quick-life-insurance, quick-mortgage, or null for custom
  form_name TEXT,
  title TEXT, -- Custom title for the link (optional)
  description TEXT, -- Description shown to form filler (optional)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  submissions_count INTEGER DEFAULT 0,
  max_submissions INTEGER, -- null means unlimited
  expires_at TIMESTAMPTZ, -- null means never expires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.public_form_links ENABLE ROW LEVEL SECURITY;

-- Policies for public_form_links
-- Brokers can view their own links
CREATE POLICY "Brokers can view own links" ON public.public_form_links
  FOR SELECT USING (auth.uid() = broker_id);

-- Brokers can create links
CREATE POLICY "Brokers can create links" ON public.public_form_links
  FOR INSERT WITH CHECK (auth.uid() = broker_id);

-- Brokers can update their own links
CREATE POLICY "Brokers can update own links" ON public.public_form_links
  FOR UPDATE USING (auth.uid() = broker_id);

-- Brokers can delete their own links
CREATE POLICY "Brokers can delete own links" ON public.public_form_links
  FOR DELETE USING (auth.uid() = broker_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_public_form_links_token ON public.public_form_links(link_token);
CREATE INDEX IF NOT EXISTS idx_public_form_links_broker ON public.public_form_links(broker_id);

-- Create public_form_submissions table for tracking submissions via public links
CREATE TABLE IF NOT EXISTS public.public_form_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  link_id UUID REFERENCES public.public_form_links(id) ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, -- Links to the client record created
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_phone TEXT,
  form_data JSONB DEFAULT '{}',
  ai_extracted_data JSONB DEFAULT '{}',
  documents_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.public_form_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for public_form_submissions
-- Brokers can view submissions for their links
CREATE POLICY "Brokers can view own submissions" ON public.public_form_submissions
  FOR SELECT USING (auth.uid() = broker_id);

-- System can insert submissions (via service role)
CREATE POLICY "System can insert submissions" ON public.public_form_submissions
  FOR INSERT WITH CHECK (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_public_form_submissions_link ON public.public_form_submissions(link_id);
CREATE INDEX IF NOT EXISTS idx_public_form_submissions_broker ON public.public_form_submissions(broker_id);

-- Function to increment submission count on public links
CREATE OR REPLACE FUNCTION increment_link_submissions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.public_form_links
  SET 
    submissions_count = submissions_count + 1,
    updated_at = NOW()
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-increment submission count
DROP TRIGGER IF EXISTS trigger_increment_link_submissions ON public.public_form_submissions;
CREATE TRIGGER trigger_increment_link_submissions
  AFTER INSERT ON public.public_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION increment_link_submissions();

-- Add public_form action type to token_transactions if not exists
-- This should be done after checking the existing constraint
-- ALTER TABLE public.token_transactions DROP CONSTRAINT IF EXISTS token_transactions_action_type_check;
-- ALTER TABLE public.token_transactions ADD CONSTRAINT token_transactions_action_type_check 
--   CHECK (action_type IN ('ai_scan', 'onboarding', 'email', 'form', 'purchase', 'allocation', 'admin_add', 'public_form', 'referral_bonus'));
