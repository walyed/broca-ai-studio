import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Server client with auth context
async function createServerSupabase() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createServerSupabase();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch client with form template
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        *,
        form_template:form_templates(id, name, category, fields)
      `)
      .eq('id', clientId)
      .eq('broker_id', user.id)
      .single();

    if (clientError) {
      console.error('Client fetch error:', clientError);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch documents for this client
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('Documents fetch error:', docsError);
    }

    return NextResponse.json({
      client: {
        ...client,
        documents: documents || [],
      },
    });
  } catch (error) {
    console.error('Client details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
