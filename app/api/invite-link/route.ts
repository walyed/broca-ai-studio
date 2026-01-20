import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Use service role for operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch broker's public form links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brokerId = searchParams.get('brokerId');

    if (!brokerId) {
      return NextResponse.json({ error: 'Broker ID is required' }, { status: 400 });
    }

    const { data: links, error } = await supabase
      .from('public_form_links')
      .select(`
        *,
        form_template:form_templates(id, name, category)
      `)
      .eq('broker_id', brokerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching links:', error);
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new public form link
export async function POST(request: NextRequest) {
  try {
    const { 
      brokerId,
      formTemplateId,
      formType,
      formName,
      title,
      description,
      maxSubmissions,
      expiresAt,
    } = await request.json();

    if (!brokerId) {
      return NextResponse.json({ error: 'Broker ID is required' }, { status: 400 });
    }

    // Check if broker has enough tokens (at least 5 for form submission)
    const { data: subscription, error: subError } = await supabase
      .from('broker_subscriptions')
      .select('tokens_remaining')
      .eq('broker_id', brokerId)
      .single();

    if (subError) {
      console.error('Subscription fetch error:', subError);
      return NextResponse.json({ error: 'Unable to verify token balance' }, { status: 500 });
    }

    const tokensRemaining = subscription?.tokens_remaining || 0;
    const MIN_TOKENS_REQUIRED = 5;

    if (tokensRemaining < MIN_TOKENS_REQUIRED) {
      return NextResponse.json({ 
        error: `Insufficient tokens. You need at least ${MIN_TOKENS_REQUIRED} tokens to create a public form link. Current balance: ${tokensRemaining} tokens.` 
      }, { status: 402 });
    }

    // Generate a unique link token
    const linkToken = randomBytes(16).toString('hex');

    // Create the link
    const { data: link, error: createError } = await supabase
      .from('public_form_links')
      .insert({
        broker_id: brokerId,
        link_token: linkToken,
        form_template_id: formTemplateId || null,
        form_type: formType || null,
        form_name: formName || null,
        title: title || null,
        description: description || null,
        max_submissions: maxSubmissions || null,
        expires_at: expiresAt || null,
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('Create error:', createError);
      return NextResponse.json({ error: `Database error: ${createError.message}` }, { status: 500 });
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publicLink = `${APP_URL}/form/${linkToken}`;

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        link_token: link.link_token,
        form_type: link.form_type,
        form_name: link.form_name,
        status: link.status,
      },
      publicLink,
    });
  } catch (error) {
    console.error('Create link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a public form link
export async function PUT(request: NextRequest) {
  try {
    const { 
      linkId,
      brokerId,
      title,
      description,
      status,
      maxSubmissions,
      expiresAt,
    } = await request.json();

    if (!linkId || !brokerId) {
      return NextResponse.json({ error: 'Link ID and Broker ID are required' }, { status: 400 });
    }

    const { data: link, error: updateError } = await supabase
      .from('public_form_links')
      .update({
        title,
        description,
        status,
        max_submissions: maxSubmissions,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', linkId)
      .eq('broker_id', brokerId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
    }

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error('Update link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a public form link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');
    const brokerId = searchParams.get('brokerId');

    if (!linkId || !brokerId) {
      return NextResponse.json({ error: 'Link ID and Broker ID are required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('public_form_links')
      .delete()
      .eq('id', linkId)
      .eq('broker_id', brokerId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
