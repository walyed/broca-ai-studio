-- Migration: Add missing columns to documents table
-- Run this in Supabase SQL Editor to add AI extraction support

-- Add ai_extracted_data column to store AI-extracted information from documents
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB;

-- Add file_url column to store the public URL of uploaded files
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add document_type column to store the type of document (e.g., 'government_id', 'proof_of_income')
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Update status check constraint to include 'completed'
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_status_check 
CHECK (status IN ('verified', 'pending', 'rejected', 'completed'));

-- Add comment explaining the ai_extracted_data column
COMMENT ON COLUMN public.documents.ai_extracted_data IS 'JSON data extracted from document using AI (GPT-4o vision for images, text extraction + analysis for PDFs)';
