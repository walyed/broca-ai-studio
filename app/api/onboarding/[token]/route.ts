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

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find client by onboarding token
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
        profiles:broker_id (
          full_name,
          email
        ),
        form_template:form_template_id (
          name,
          form_type,
          form_data
        )
      `)
      .eq('onboarding_token', token)
      .single();

    if (error || !client) {
      console.error('Client lookup error:', error);
      return NextResponse.json({ error: 'Invalid or expired onboarding link' }, { status: 404 });
    }

    // Check if already completed
    if (client.status === 'completed') {
      return NextResponse.json({ error: 'This onboarding has already been completed' }, { status: 400 });
    }

    // Get broker name
    const brokerProfile = Array.isArray(client.profiles) 
      ? client.profiles[0] as { full_name: string; email: string } | undefined
      : client.profiles as { full_name: string; email: string } | null;
    const brokerName = brokerProfile?.full_name || brokerProfile?.email || 'Your Broker';

    // Get form template info
    const formTemplate = Array.isArray(client.form_template)
      ? client.form_template[0] as { name: string; form_type: string; form_data: unknown } | undefined
      : client.form_template as { name: string; form_type: string; form_data: unknown } | null;

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        broker_name: brokerName,
        form_template_id: client.form_template_id,
        form_name: formTemplate?.name,
        form_type: formTemplate?.form_type || 'quick-real-estate',
        form_data: formTemplate?.form_data,
      }
    });
  } catch (error) {
    console.error('Onboarding fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
