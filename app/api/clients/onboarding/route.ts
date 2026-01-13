import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendClientOnboardingEmail } from '@/lib/email/resend';
import { randomBytes } from 'crypto';

// Use service role for operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { 
      clientName, 
      clientEmail, 
      clientPhone,
      clientNotes,
      formTemplateId, 
      formName,
      brokerId,
      sendEmail = true 
    } = await request.json();

    console.log('Creating client onboarding for:', clientEmail);

    if (!clientEmail || !clientName) {
      return NextResponse.json({ error: 'Client name and email are required' }, { status: 400 });
    }

    if (!brokerId) {
      return NextResponse.json({ error: 'Broker ID is required' }, { status: 400 });
    }

    // Check if required env vars are set for email
    if (sendEmail && !process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Get broker details for the email
    const { data: broker, error: brokerError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', brokerId)
      .single();

    if (brokerError || !broker) {
      console.error('Broker fetch error:', brokerError);
      return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
    }

    // Generate a unique onboarding token for the client
    const onboardingToken = randomBytes(32).toString('hex');

    // Check if client already exists for this broker
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('broker_id', brokerId)
      .eq('email', clientEmail)
      .maybeSingle();

    let client;

    if (existingClient) {
      // Update existing client with new onboarding token
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({
          name: clientName,
          phone: clientPhone || null,
          notes: clientNotes || null,
          status: 'pending',
          onboarding_token: onboardingToken,
          form_template_id: formTemplateId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingClient.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: `Database error: ${updateError.message}` }, { status: 500 });
      }
      client = updatedClient;
    } else {
      // Create new client
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          broker_id: brokerId,
          name: clientName,
          email: clientEmail,
          phone: clientPhone || null,
          notes: clientNotes || null,
          status: 'pending',
          onboarding_token: onboardingToken,
          form_template_id: formTemplateId || null,
          onboarding_progress: 0,
          documents_submitted: 0,
          documents_required: 5,
        })
        .select()
        .single();

      if (createError) {
        console.error('Create error:', createError);
        return NextResponse.json({ error: `Database error: ${createError.message}` }, { status: 500 });
      }
      client = newClient;
    }

    console.log('Client created/updated:', client.id);

    // Send onboarding email if enabled
    if (sendEmail) {
      try {
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const onboardingLink = `${APP_URL}/onboarding/${onboardingToken}`;

        console.log('Sending onboarding email via Resend...');
        console.log('Onboarding link:', onboardingLink);

        await sendClientOnboardingEmail({
          to: clientEmail,
          clientName: clientName,
          brokerName: broker.full_name || broker.email || 'Your Broker',
          onboardingLink: onboardingLink,
          formName: formName || undefined,
        });

        console.log('Onboarding email sent successfully');
      } catch (emailError) {
        console.error('Email error:', emailError);
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error';
        
        // In development, don't fail if email sending fails
        if (process.env.NODE_ENV === 'development') {
          console.log('========================================');
          console.log('DEV MODE: Email not sent. Use this link:');
          console.log(`http://localhost:3000/onboarding/${onboardingToken}`);
          console.log('========================================');
        } else {
          return NextResponse.json({ error: `Failed to send email: ${errorMessage}` }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        status: client.status,
      },
      onboardingLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/${onboardingToken}`,
    });
  } catch (error) {
    console.error('Client onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Resend onboarding email to existing client
export async function PUT(request: NextRequest) {
  try {
    const { clientId, brokerId } = await request.json();

    if (!clientId || !brokerId) {
      return NextResponse.json({ error: 'Client ID and Broker ID are required' }, { status: 400 });
    }

    // Get the client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, form_template:form_templates(name)')
      .eq('id', clientId)
      .eq('broker_id', brokerId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get broker details
    const { data: broker } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', brokerId)
      .single();

    // Generate new onboarding token
    const newToken = randomBytes(32).toString('hex');

    // Update client with new token
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        onboarding_token: newToken,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }

    // Send email
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const onboardingLink = `${APP_URL}/onboarding/${newToken}`;

    await sendClientOnboardingEmail({
      to: client.email,
      clientName: client.name,
      brokerName: broker?.full_name || broker?.email || 'Your Broker',
      onboardingLink: onboardingLink,
      formName: client.form_template?.name,
    });

    return NextResponse.json({ 
      success: true,
      onboardingLink 
    });
  } catch (error) {
    console.error('Resend onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
