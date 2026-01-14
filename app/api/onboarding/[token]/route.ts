import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for public access to client data via token
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

    console.log('Looking up onboarding token:', token);

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find client by onboarding token - simplified query first
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        phone,
        status,
        broker_id,
        form_template_id,
        form_type
      `)
      .eq('onboarding_token', token)
      .single();

    if (error) {
      console.error('Client lookup error:', error);
      return NextResponse.json({ error: 'Invalid or expired onboarding link' }, { status: 404 });
    }

    if (!client) {
      console.error('No client found for token:', token);
      return NextResponse.json({ error: 'Invalid or expired onboarding link' }, { status: 404 });
    }

    console.log('Found client:', client.id, client.name, 'Form type:', client.form_type);

    // Check if already completed
    if (client.status === 'completed') {
      return NextResponse.json({ error: 'This onboarding has already been completed' }, { status: 400 });
    }

    // Get broker details separately
    let brokerName = 'Your Broker';
    const { data: broker } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', client.broker_id)
      .single();
    
    if (broker) {
      brokerName = broker.full_name || broker.email || 'Your Broker';
    }

    // Get form template info if exists
    // Priority: 1. client.form_type (quick-start templates), 2. form_template.form_type/category
    let formType = client.form_type || 'quick-real-estate';
    let formName = null;
    let formTemplateData = null;

    if (client.form_template_id) {
      const { data: formTemplate } = await supabase
        .from('form_templates')
        .select('name, form_type, fields, category')
        .eq('id', client.form_template_id)
        .single();
      
      if (formTemplate) {
        formName = formTemplate.name;
        // Only override formType if client.form_type is not set
        if (!client.form_type) {
          formType = formTemplate.form_type || formTemplate.category || 'quick-real-estate';
        }
        // The form template data is stored in the `fields` column as an array with a single object
        // containing baseSections, customFields, and requiredDocuments
        formTemplateData = formTemplate.fields;
      }
    }

    console.log('Returning form type:', formType, 'Has template data:', !!formTemplateData);

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        broker_name: brokerName,
        form_template_id: client.form_template_id,
        form_name: formName,
        form_type: formType,
        form_template_data: formTemplateData,
      }
    });
  } catch (error) {
    console.error('Onboarding fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
