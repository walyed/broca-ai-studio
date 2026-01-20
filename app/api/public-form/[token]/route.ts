import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for public access to link data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    console.log('Looking up public form link token:', token);

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find link by token
    const { data: link, error } = await supabase
      .from('public_form_links')
      .select(`
        id,
        broker_id,
        link_token,
        form_template_id,
        form_type,
        form_name,
        title,
        description,
        status,
        submissions_count,
        max_submissions,
        expires_at
      `)
      .eq('link_token', token)
      .single();

    if (error) {
      console.error('Link lookup error:', error);
      return NextResponse.json({ error: 'Invalid or expired form link' }, { status: 404 });
    }

    if (!link) {
      return NextResponse.json({ error: 'Invalid or expired form link' }, { status: 404 });
    }

    // Check if link is active
    if (link.status !== 'active') {
      return NextResponse.json({ error: 'This form link is no longer active' }, { status: 400 });
    }

    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This form link has expired' }, { status: 400 });
    }

    // Check if max submissions reached
    if (link.max_submissions && link.submissions_count >= link.max_submissions) {
      return NextResponse.json({ error: 'This form has reached its maximum number of submissions' }, { status: 400 });
    }

    console.log('Found link:', link.id, 'Form type:', link.form_type);

    // Get broker details
    let brokerName = 'Your Broker';
    const { data: broker } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', link.broker_id)
      .single();
    
    if (broker) {
      brokerName = broker.full_name || broker.email || 'Your Broker';
    }

    // Get form template info if exists
    let formType = link.form_type || 'quick-real-estate';
    let formName = link.form_name;
    let formTemplateData = null;

    if (link.form_template_id) {
      const { data: formTemplate } = await supabase
        .from('form_templates')
        .select('name, form_type, fields, category')
        .eq('id', link.form_template_id)
        .single();
      
      if (formTemplate) {
        formName = formTemplate.name;
        if (!link.form_type) {
          formType = formTemplate.form_type || formTemplate.category || 'quick-real-estate';
        }
        formTemplateData = formTemplate.fields;
      }
    }

    console.log('Returning form type:', formType, 'Has template data:', !!formTemplateData);

    return NextResponse.json({
      link: {
        id: link.id,
        broker_id: link.broker_id,
        broker_name: brokerName,
        title: link.title,
        description: link.description,
        form_template_id: link.form_template_id,
        form_name: formName,
        form_type: formType,
        form_template_data: formTemplateData,
      }
    });
  } catch (error) {
    console.error('Public form fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
