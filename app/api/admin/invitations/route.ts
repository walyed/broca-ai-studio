import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendBrokerInvitationEmail } from '@/lib/email/resend';
import { randomBytes } from 'crypto';

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, name, planId, adminId } = await request.json();

    console.log('Creating invitation for:', email);

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if required env vars are set
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Generate a unique invitation token
    const invitationToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Get plan details if planId provided
    let planName: string | undefined;
    if (planId) {
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', planId)
        .single();
      
      if (planError) {
        console.error('Plan fetch error:', planError);
      }
      planName = plan?.name;
    }

    // Check if email already has pending invitation
    const { data: existingInvitation } = await supabase
      .from('broker_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    let invitation;

    if (existingInvitation) {
      // Update existing invitation with new token and expiry
      console.log('Updating existing invitation:', existingInvitation.id);
      const { data: updatedInvitation, error: updateError } = await supabase
        .from('broker_invitations')
        .update({
          name,
          plan_id: planId || null,
          invited_by: adminId || null,
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', existingInvitation.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: `Database error: ${updateError.message}` }, { status: 500 });
      }
      invitation = updatedInvitation;
    } else {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }

      // Create new invitation in database
      console.log('Inserting invitation into database...');
      const { data: newInvitation, error: dbError } = await supabase
        .from('broker_invitations')
        .insert({
          email,
          name,
          plan_id: planId || null,
          invited_by: adminId || null,
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
      }
      invitation = newInvitation;
    }

    console.log('Invitation created:', invitation.id);

    // Send invitation email
    try {
      console.log('Sending email via Resend...');
      await sendBrokerInvitationEmail({
        to: email,
        brokerName: name || 'Broker',
        invitationToken,
        planName,
        expiresAt,
      });
      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Email error:', emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error';
      
      // In development, don't fail if email sending fails - just log the signup URL
      if (process.env.NODE_ENV === 'development') {
        console.log('========================================');
        console.log('DEV MODE: Email not sent. Use this link:');
        console.log(`http://localhost:3000/signup?invitation=${invitationToken}`);
        console.log('========================================');
        // Don't delete the invitation, just continue
      } else {
        // In production, delete the invitation and return error
        await supabase.from('broker_invitations').delete().eq('id', invitation.id);
        return NextResponse.json({ error: `Failed to send email: ${errorMessage}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        status: invitation.status,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error('Invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Resend invitation
export async function PUT(request: NextRequest) {
  try {
    const { invitationId } = await request.json();

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    // Get the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('broker_invitations')
      .select('*, plan:subscription_plans(name)')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Generate new token and expiration
    const newToken = randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update invitation
    const { error: updateError } = await supabase
      .from('broker_invitations')
      .update({
        invitation_token: newToken,
        expires_at: newExpiresAt.toISOString(),
        status: 'pending',
      })
      .eq('id', invitationId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    // Resend email
    await sendBrokerInvitationEmail({
      to: invitation.email,
      brokerName: invitation.name || 'Broker',
      invitationToken: newToken,
      planName: invitation.plan?.name,
      expiresAt: newExpiresAt,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
