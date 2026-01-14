-- Migration: Add onboarding token and form template reference to clients table
-- Run this in your Supabase SQL Editor

-- Add onboarding_token column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS onboarding_token TEXT UNIQUE;

-- Add form_template_id column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS form_template_id UUID REFERENCES public.form_templates(id) ON DELETE SET NULL;

-- Add form_type column to store quick-start form type (e.g., 'quick-real-estate')
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS form_type TEXT;

-- Add form_data column to store submitted form values
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS form_data JSONB;

-- Add ai_extracted_data column to store AI-extracted information
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_clients_onboarding_token ON public.clients(onboarding_token);

-- =====================================================
-- FORM TEMPLATES TABLE UPDATES
-- =====================================================

-- Add form_type column to form_templates table
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS form_type TEXT DEFAULT 'quick-real-estate';

-- Add form_data column to store custom form configuration
ALTER TABLE public.form_templates 
ADD COLUMN IF NOT EXISTS form_data JSONB;

-- =====================================================
-- DOCUMENTS TABLE UPDATES
-- =====================================================

-- Add ai_extracted_data column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB;

-- Add document_type column (govt_id, pay_stubs, etc.)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Add file_url column for public access
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- =====================================================
-- RLS POLICIES FOR PUBLIC ONBOARDING ACCESS
-- =====================================================

-- Allow public read access to clients via onboarding token
DROP POLICY IF EXISTS "Public onboarding access" ON public.clients;
CREATE POLICY "Public onboarding access" ON public.clients
  FOR SELECT USING (onboarding_token IS NOT NULL);

-- Allow public update for onboarding submission
DROP POLICY IF EXISTS "Public onboarding update" ON public.clients;
CREATE POLICY "Public onboarding update" ON public.clients
  FOR UPDATE USING (onboarding_token IS NOT NULL);

-- =====================================================
-- STORAGE BUCKET FOR DOCUMENTS
-- =====================================================
-- Run this separately in Supabase Dashboard > Storage

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', true)
-- ON CONFLICT DO NOTHING;

-- CREATE POLICY "Public document upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'documents');

-- CREATE POLICY "Public document read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'documents');

COMMENT ON COLUMN public.clients.onboarding_token IS 'Unique token for client onboarding access';
COMMENT ON COLUMN public.clients.form_template_id IS 'Reference to the form template assigned to this client';
COMMENT ON COLUMN public.clients.form_data IS 'JSON data containing all submitted form field values';
COMMENT ON COLUMN public.clients.ai_extracted_data IS 'JSON data containing AI-extracted information from documents';
COMMENT ON COLUMN public.documents.ai_extracted_data IS 'JSON data containing AI-extracted information from this document';
