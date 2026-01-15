import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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
    return { 
      raw_text: responseText,
      parse_error: 'Could not parse AI response as JSON',
    };
  }
}

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  
  try {
    logs.push('📥 Received PDF test request');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided',
        logs 
      }, { status: 400 });
    }

    logs.push(`📄 File: ${file.name}`);
    logs.push(`📊 Size: ${file.size} bytes`);
    logs.push(`📝 MIME Type: ${file.type}`);

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ 
        error: 'File is not a PDF',
        details: `Got MIME type: ${file.type}`,
        logs 
      }, { status: 400 });
    }

    // Convert file to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    logs.push(`✅ Converted to Uint8Array: ${uint8Array.length} bytes`);

    // Try to extract text using unpdf
    let pdfText = '';
    let extractionMethod = '';
    
    try {
      logs.push('🔍 Attempting text extraction with unpdf...');
      const { extractText } = await import('unpdf');
      const { text } = await extractText(uint8Array, { mergePages: true });
      pdfText = (text || '').trim();
      extractionMethod = 'unpdf';
      logs.push(`✅ unpdf extraction successful: ${pdfText.length} characters`);
      
      if (pdfText.length > 0) {
        logs.push(`📖 First 200 chars: ${pdfText.substring(0, 200).replace(/\n/g, ' ')}`);
      }
    } catch (unpdfError) {
      const err = unpdfError as Error;
      logs.push(`⚠️ unpdf failed: ${err.message}`);
      
      // Fallback: try pdf-parse
      try {
        logs.push('🔍 Trying fallback with pdf-parse...');
        const pdfParseModule = await import('pdf-parse') as any;
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdfParse(buffer);
        pdfText = (pdfData.text || '').trim();
        extractionMethod = 'pdf-parse';
        logs.push(`✅ pdf-parse extraction successful: ${pdfText.length} characters`);
      } catch (pdfParseError) {
        const err2 = pdfParseError as Error;
        logs.push(`❌ pdf-parse also failed: ${err2.message}`);
      }
    }

    // If we have text, analyze with OpenAI
    let aiAnalysis = null;
    
    if (pdfText.length > 10) {
      logs.push('🤖 Sending to OpenAI for analysis...');
      
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an AI that extracts information from document text.
Extract all relevant information and return as JSON.

Fields to look for:
- document_type: string (what type of document this is)
- document_description: string (1-2 sentence summary)
- full_name, date_of_birth, address, phone_number, email
- id_number, employer, income, expiration_date
- other_info: object (any other relevant data)
- extraction_confidence: "high" | "medium" | "low"
- fields_found: array of extracted field names
- fields_not_found: array of fields not present

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
        logs.push(`✅ OpenAI response: ${responseText.length} characters`);
        
        aiAnalysis = parseOpenAIJsonResponse(responseText);
        logs.push('✅ JSON parsing successful');
        
      } catch (openaiError) {
        const err = openaiError as Error;
        logs.push(`❌ OpenAI error: ${err.message}`);
        aiAnalysis = { error: err.message };
      }
    } else {
      logs.push(`⚠️ Insufficient text for analysis (${pdfText.length} chars)`);
      logs.push('💡 This PDF may be scanned/image-based or password-protected');
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      extractionMethod,
      textLength: pdfText.length,
      extractedText: pdfText.substring(0, 2000),
      aiAnalysis,
      logs,
    });

  } catch (error) {
    const err = error as Error;
    logs.push(`💥 Unhandled error: ${err.message}`);
    logs.push(`📋 Stack: ${err.stack?.substring(0, 500)}`);
    
    return NextResponse.json({
      error: err.message,
      details: err.stack,
      logs,
    }, { status: 500 });
  }
}
