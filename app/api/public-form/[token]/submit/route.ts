import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { sendClientOnboardingCompleteEmail } from '@/lib/email/resend';

// Use service role for operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to parse OpenAI JSON responses safely
function parseOpenAIJsonResponse(responseText: string): Record<string, unknown> {
  let cleanedJson = responseText.trim();
  
  // Remove markdown code fences
  if (cleanedJson.startsWith('```json')) {
    cleanedJson = cleanedJson.slice(7);
  } else if (cleanedJson.startsWith('```')) {
    cleanedJson = cleanedJson.slice(3);
  }
  if (cleanedJson.endsWith('```')) {
    cleanedJson = cleanedJson.slice(0, -3);
  }
  cleanedJson = cleanedJson.trim();
  
  try {
    return JSON.parse(cleanedJson);
  } catch (parseErr) {
    console.error('JSON parse error:', parseErr, 'Preview:', cleanedJson.substring(0, 200));
    return { 
      raw_text: responseText,
      document_description: 'Could not parse AI response into structured format.',
      extraction_confidence: 'low'
    };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find link by token
    const { data: link, error: linkError } = await supabase
      .from('public_form_links')
      .select('id, broker_id, form_type, form_name, status, submissions_count, max_submissions, expires_at')
      .eq('link_token', token)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: 'Invalid form link' }, { status: 404 });
    }

    // Validate link is still active
    if (link.status !== 'active') {
      return NextResponse.json({ error: 'This form link is no longer active' }, { status: 400 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This form link has expired' }, { status: 400 });
    }

    if (link.max_submissions && link.submissions_count >= link.max_submissions) {
      return NextResponse.json({ error: 'This form has reached its maximum number of submissions' }, { status: 400 });
    }

    // Check if broker has enough tokens
    const { data: subscription, error: subError } = await supabase
      .from('broker_subscriptions')
      .select('tokens_remaining')
      .eq('broker_id', link.broker_id)
      .single();

    if (subError) {
      console.error('Subscription fetch error:', subError);
      return NextResponse.json({ error: 'Unable to verify token balance' }, { status: 500 });
    }

    const tokensRemaining = subscription?.tokens_remaining || 0;
    const MIN_TOKENS_REQUIRED = 5;

    if (tokensRemaining < MIN_TOKENS_REQUIRED) {
      return NextResponse.json({ 
        error: 'The broker does not have enough tokens to process this submission. Please contact them.' 
      }, { status: 402 });
    }

    // Get form data
    const formData = await request.formData();
    const fieldValuesStr = formData.get('fieldValues') as string;
    const fieldValues = JSON.parse(fieldValuesStr || '{}');

    // Extract client information from form data
    const submitterName = fieldValues.full_name || 'Unknown';
    const submitterEmail = fieldValues.email || '';
    const submitterPhone = fieldValues.phone || '';

    // Determine required documents based on form type
    const getRequiredDocsCount = (type: string | null): number => {
      if (type === 'quick-mortgage' || type === 'mortgage') return 5;
      if (type === 'quick-real-estate' || type === 'real-estate') return 3;
      if (type === 'quick-life-insurance' || type === 'life-insurance') return 3;
      return 1;
    };

    const documentsRequired = getRequiredDocsCount(link.form_type);

    // Create a client record for this submission
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        broker_id: link.broker_id,
        name: submitterName,
        email: submitterEmail,
        phone: submitterPhone || null,
        status: 'completed',
        form_type: link.form_type,
        form_data: fieldValues,
        onboarding_progress: 100,
        documents_submitted: 0,
        documents_required: documentsRequired,
        notes: `Submitted via public form link`,
      })
      .select()
      .single();

    if (clientError) {
      console.error('Failed to create client:', clientError);
      return NextResponse.json({ error: 'Failed to save form data' }, { status: 500 });
    }

    // Process uploaded documents
    const documentEntries: Array<{ key: string; file: File }> = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('document_') && value instanceof File) {
        documentEntries.push({ key: key.replace('document_', ''), file: value });
      }
    }

    // Upload documents to Supabase Storage and extract text with AI
    const extractedData: Record<string, unknown> = {};
    const uploadedDocs: Array<{ id: string; name: string; url: string; ai_extracted?: unknown }> = [];

    for (const { key, file } of documentEntries) {
      try {
        // Sanitize filename
        const sanitizedFileName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .replace(/_+/g, '_');
        
        // Upload to Supabase Storage
        const fileName = `${newClient.id}/${Date.now()}_${sanitizedFileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error for', key, ':', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        // Map MIME type to allowed file_type values
        const getFileType = (mimeType: string): 'pdf' | 'image' | 'doc' => {
          if (mimeType.startsWith('image/')) return 'image';
          if (mimeType === 'application/pdf') return 'pdf';
          return 'doc';
        };

        // Create document record
        const { data: docRecord, error: docError } = await supabase
          .from('documents')
          .insert({
            client_id: newClient.id,
            broker_id: link.broker_id,
            name: file.name,
            file_path: fileName,
            file_url: urlData.publicUrl,
            file_type: getFileType(file.type),
            file_size: String(file.size),
            document_type: key,
            status: 'pending',
          })
          .select()
          .single();

        if (docError) {
          console.error('Document record error:', docError);
          continue;
        }

        // AI extraction for images
        let aiExtraction = null;
        
        if (file.type.startsWith('image/')) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = file.type;

            const response = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: `You are an AI assistant that extracts information from documents. 
                  Extract all relevant personal and important information from this document.
                  Return the extracted data as a JSON object with the following structure:
                  
                  REQUIRED FIELDS TO LOOK FOR:
                  - full_name: string
                  - date_of_birth: string
                  - address: string
                  - phone_number: string
                  - email: string
                  - id_number: string
                  - document_type: string
                  - expiration_date: string
                  - employer: string
                  - income: string
                  - other_info: object
                  
                  ALWAYS INCLUDE:
                  - document_description: string
                  - fields_found: array of strings
                  - fields_not_found: array of strings
                  - extraction_confidence: "high" | "medium" | "low"
                  
                  Return ONLY valid JSON, no markdown.`
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${mimeType};base64,${base64}`,
                      },
                    },
                    {
                      type: 'text',
                      text: 'Please extract all relevant information from this document.',
                    },
                  ],
                },
              ],
              max_tokens: 1000,
            });

            const extractedText = response.choices[0]?.message?.content || '';
            aiExtraction = parseOpenAIJsonResponse(extractedText);
          } catch (aiError) {
            console.error('AI extraction error:', aiError);
            aiExtraction = { error: 'Failed to extract information' };
          }
        } else if (file.type === 'application/pdf') {
          // Handle PDF documents
          try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            const { extractText } = await import('unpdf');
            
            let pdfText = '';
            try {
              const { text } = await extractText(uint8Array, { mergePages: true });
              pdfText = (text || '').trim();
            } catch (textErr) {
              console.log('Text extraction failed:', textErr);
            }

            if (pdfText && pdfText.length > 50) {
              const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'system',
                    content: `You are an AI assistant that extracts information from document text.
Extract all relevant information and return as JSON.

FIELDS TO LOOK FOR:
- full_name, date_of_birth, address, phone_number, email, id_number
- document_type, employer, income, expiration_date, other_info

METADATA:
- document_description: string
- fields_found: array
- fields_not_found: array
- extraction_confidence: "high" | "medium" | "low"

Return ONLY valid JSON.`
                  },
                  {
                    role: 'user',
                    content: `Extract information from this document:\n\n${pdfText.substring(0, 10000)}`,
                  },
                ],
                max_tokens: 1500,
                temperature: 0.1,
              });

              const responseText = response.choices[0]?.message?.content || '';
              aiExtraction = parseOpenAIJsonResponse(responseText);
            } else {
              aiExtraction = {
                error: 'This PDF appears to be a scanned document.',
                document_description: 'Please upload documents as images for best results.',
                extraction_confidence: 'low',
              };
            }
          } catch (err) {
            const error = err as Error;
            console.error('PDF processing error:', error.message);
            aiExtraction = { 
              error: `Failed to process PDF: ${error.message}`,
              extraction_confidence: 'low'
            };
          }
        }

        // Update document with AI extraction
        if (aiExtraction) {
          await supabase
            .from('documents')
            .update({
              ai_extracted_data: aiExtraction,
              status: 'completed',
            })
            .eq('id', docRecord.id);

          extractedData[key] = aiExtraction;
        } else {
          await supabase
            .from('documents')
            .update({ status: 'completed' })
            .eq('id', docRecord.id);
        }

        uploadedDocs.push({
          id: docRecord.id,
          name: file.name,
          url: urlData.publicUrl,
          ai_extracted: aiExtraction,
        });

      } catch (err) {
        console.error('Error processing document', key, ':', err);
      }
    }

    // Update client with document count and AI data
    await supabase
      .from('clients')
      .update({
        documents_submitted: uploadedDocs.length,
        ai_extracted_data: extractedData,
      })
      .eq('id', newClient.id);

    // Deduct tokens
    const aiScannedDocs = Object.keys(extractedData).length;
    const onboardingTokenCost = 5;
    const aiScanTokenCost = aiScannedDocs * 10;
    const totalTokensUsed = onboardingTokenCost + aiScanTokenCost;
    
    // Deduct onboarding tokens
    if (onboardingTokenCost > 0) {
      await supabase.rpc('deduct_tokens', {
        p_broker_id: link.broker_id,
        p_amount: onboardingTokenCost,
        p_action_type: 'onboarding',
        p_description: `Public form submission: ${submitterName}`,
      });
    }
    
    // Deduct AI scan tokens
    if (aiScanTokenCost > 0) {
      await supabase.rpc('deduct_tokens', {
        p_broker_id: link.broker_id,
        p_amount: aiScanTokenCost,
        p_action_type: 'ai_scan',
        p_description: `AI document scanning: ${aiScannedDocs} documents for ${submitterName}`,
      });
    }

    // Create submission record
    const { error: submissionError } = await supabase
      .from('public_form_submissions')
      .insert({
        link_id: link.id,
        broker_id: link.broker_id,
        client_id: newClient.id,
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        submitter_phone: submitterPhone,
        form_data: fieldValues,
        ai_extracted_data: extractedData,
        documents_count: uploadedDocs.length,
        tokens_used: totalTokensUsed,
        status: 'completed',
      });

    if (submissionError) {
      console.error('Submission record error:', submissionError);
      // Don't fail the request, the main data is already saved
    }

    console.log(`Public form submitted. Documents: ${uploadedDocs.length}. Tokens: ${totalTokensUsed}`);

    // Send notification email to broker
    try {
      const { data: broker } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', link.broker_id)
        .single();

      if (broker?.email) {
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await sendClientOnboardingCompleteEmail({
          to: broker.email,
          brokerName: broker.full_name || 'there',
          clientName: submitterName,
          clientEmail: submitterEmail,
          documentsCount: uploadedDocs.length,
          hasAiExtraction: Object.keys(extractedData).length > 0,
          clientViewUrl: `${APP_URL}/dashboard/clients/${newClient.id}`,
        });
        console.log('Broker notification email sent to:', broker.email);
      }
    } catch (emailError) {
      console.error('Failed to send broker notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully',
      documentsProcessed: uploadedDocs.length,
    });

  } catch (error) {
    console.error('Public form submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
