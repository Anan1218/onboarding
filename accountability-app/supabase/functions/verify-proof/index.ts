import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyProofRequest {
  proofId: string;
  goalDescription: string;
  imageUrl: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface VerificationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  checkedAt: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { proofId, goalDescription, imageUrl } = (await req.json()) as VerifyProofRequest;

    // Validate inputs
    if (!proofId || !goalDescription || !imageUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Download image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // Prepare prompt for Gemini
    const prompt = `You are an accountability app verification assistant. Your job is to verify if a photo proves that someone completed their goal.

Goal Description: "${goalDescription}"

Analyze the provided image and determine if it shows evidence of the goal being completed.

You must respond with a JSON object in exactly this format:
{
  "isValid": true or false,
  "confidence": a number between 0 and 100,
  "reasoning": "A brief explanation of your decision"
}

Rules:
1. Be reasonable - the photo doesn't need to be perfect, just show reasonable evidence
2. Look for key elements mentioned in the goal description
3. If the image is blurry, dark, or unclear, give lower confidence
4. If the image clearly shows something unrelated to the goal, mark as invalid
5. Be encouraging but honest in your reasoning

Respond ONLY with the JSON object, no other text.`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = (await geminiResponse.json()) as GeminiResponse;

    // Parse Gemini response
    const responseText = geminiData.candidates[0]?.content?.parts[0]?.text;
    if (!responseText) {
      throw new Error('No response from Gemini');
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsedResult = JSON.parse(jsonText.trim()) as {
      isValid: boolean;
      confidence: number;
      reasoning: string;
    };

    // Validate parsed result
    if (
      typeof parsedResult.isValid !== 'boolean' ||
      typeof parsedResult.confidence !== 'number' ||
      typeof parsedResult.reasoning !== 'string'
    ) {
      throw new Error('Invalid response format from Gemini');
    }

    const verificationResult: VerificationResult = {
      isValid: parsedResult.isValid,
      confidence: Math.min(100, Math.max(0, parsedResult.confidence)),
      reasoning: parsedResult.reasoning,
      checkedAt: new Date().toISOString(),
    };

    // Update proof submission in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const verificationStatus = verificationResult.isValid ? 'verified' : 'rejected';

    const { error: updateError } = await supabase
      .from('proof_submissions')
      .update({
        verification_status: verificationStatus,
        verification_result: verificationResult,
        verified_at: new Date().toISOString(),
      })
      .eq('id', proofId);

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: verificationResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Verification error:', message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
