'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Interface for public form links
export interface PublicFormLink {
  id: string;
  broker_id: string;
  link_token: string;
  form_template_id?: string;
  form_type?: string;
  form_name?: string;
  title?: string;
  description?: string;
  status: 'active' | 'paused' | 'expired';
  submissions_count: number;
  max_submissions?: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  form_template?: {
    id: string;
    name: string;
    category: string;
  };
}

// Interface for public form submissions
export interface PublicFormSubmission {
  id: string;
  link_id: string;
  broker_id: string;
  client_id?: string;
  submitter_name: string;
  submitter_email: string;
  submitter_phone?: string;
  form_data: Record<string, unknown>;
  ai_extracted_data: Record<string, unknown>;
  documents_count: number;
  tokens_used: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

// =====================================================
// PUBLIC FORM LINKS HOOKS
// =====================================================

// Fetch all public form links for the current broker
export function usePublicFormLinks() {
  return useQuery({
    queryKey: ['public-form-links'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const response = await fetch(`/api/invite-link?brokerId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch links');
      }

      return data.links as PublicFormLink[];
    },
  });
}

// Create a new public form link
export function useCreatePublicFormLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      formTemplateId,
      formType,
      formName,
      title,
      description,
      maxSubmissions,
      expiresAt,
    }: { 
      formTemplateId?: string;
      formType?: string;
      formName?: string;
      title?: string;
      description?: string;
      maxSubmissions?: number;
      expiresAt?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/invite-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerId: user.id,
          formTemplateId,
          formType,
          formName,
          title,
          description,
          maxSubmissions,
          expiresAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create link');
      }

      return data as { success: boolean; link: PublicFormLink; publicLink: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-form-links'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// Update a public form link
export function useUpdatePublicFormLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      linkId,
      title,
      description,
      status,
      maxSubmissions,
      expiresAt,
    }: { 
      linkId: string;
      title?: string;
      description?: string;
      status?: 'active' | 'paused' | 'expired';
      maxSubmissions?: number;
      expiresAt?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/invite-link', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          brokerId: user.id,
          title,
          description,
          status,
          maxSubmissions,
          expiresAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update link');
      }

      return data as { success: boolean; link: PublicFormLink };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-form-links'] });
    },
  });
}

// Delete a public form link
export function useDeletePublicFormLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(`/api/invite-link?linkId=${linkId}&brokerId=${user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete link');
      }

      return data as { success: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-form-links'] });
    },
  });
}

// =====================================================
// PUBLIC FORM SUBMISSIONS HOOKS
// =====================================================

// Fetch submissions for a specific link
export function usePublicFormSubmissions(linkId: string | null) {
  return useQuery({
    queryKey: ['public-form-submissions', linkId],
    queryFn: async () => {
      if (!linkId) return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('public_form_submissions')
        .select('*')
        .eq('link_id', linkId)
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PublicFormSubmission[];
    },
    enabled: !!linkId,
  });
}

// Fetch all submissions for the broker
export function useAllPublicFormSubmissions() {
  return useQuery({
    queryKey: ['all-public-form-submissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('public_form_submissions')
        .select(`
          *,
          link:public_form_links(id, form_name, title)
        `)
        .eq('broker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (PublicFormSubmission & { link: { id: string; form_name: string; title: string } })[];
    },
  });
}
