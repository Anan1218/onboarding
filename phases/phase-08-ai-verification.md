# Phase 8: AI Verification

**Goal:** Uploaded photo gets analyzed by Gemini
**Test:** Upload photo → see AI verdict + reasoning

---

## Prerequisites

- Phase 7 completed
- Proofs can be uploaded
- Google Cloud account with Gemini API access

---

## Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create new API key
3. Save it securely (you'll add it to Supabase secrets)

---

## Step 2: Add Gemini Key to Supabase Secrets

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```
GEMINI_API_KEY=your-gemini-api-key-here
```

---

## Step 3: Create Edge Function Structure

```bash
# In your project root
mkdir -p supabase/functions/verify-proof
```

---

## Step 4: Create Verification Edge Function

```typescript
// supabase/functions/verify-proof/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
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
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 256
          }
        })
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
    if (typeof parsedResult.isValid !== 'boolean' ||
        typeof parsedResult.confidence !== 'number' ||
        typeof parsedResult.reasoning !== 'string') {
      throw new Error('Invalid response format from Gemini');
    }

    const verificationResult: VerificationResult = {
      isValid: parsedResult.isValid,
      confidence: Math.min(100, Math.max(0, parsedResult.confidence)),
      reasoning: parsedResult.reasoning,
      checkedAt: new Date().toISOString()
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
        verified_at: new Date().toISOString()
      })
      .eq('id', proofId);

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    // If verified and goal stake > 0, we might need to handle subscription
    // This will be implemented in Phase 10

    return new Response(
      JSON.stringify({
        success: true,
        result: verificationResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Verification error:', message);

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

---

## Step 5: Deploy Edge Function

```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy verify-proof
```

---

## Step 6: Create Verification Service

```typescript
// features/proof/services/verificationService.ts
import { supabase } from '@/shared/lib/supabase';
import type { VerificationResult } from '../types/proof.types';
import type { Result } from '@/shared/types/common.types';

interface VerifyResponse {
  success: boolean;
  result: VerificationResult;
}

export const verificationService = {
  async verifyProof(
    proofId: string,
    goalDescription: string,
    imageUrl: string
  ): Promise<Result<VerificationResult>> {
    try {
      const { data, error } = await supabase.functions.invoke<VerifyResponse>(
        'verify-proof',
        {
          body: {
            proofId,
            goalDescription,
            imageUrl
          }
        }
      );

      if (error !== null) {
        return { success: false, error: new Error(error.message) };
      }

      if (data === null || !data.success) {
        return { success: false, error: new Error('Verification failed') };
      }

      return { success: true, data: data.result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      return { success: false, error: new Error(message) };
    }
  }
};
```

---

## Step 7: Update Proof Service to Trigger Verification

```typescript
// features/proof/services/proofService.ts
// Update uploadProof function to trigger verification after upload

import { verificationService } from './verificationService';

export const proofService = {
  async uploadProof(
    goalId: string,
    userId: string,
    imageUri: string,
    goalDescription: string  // Add this parameter
  ): Promise<Result<ProofSubmission>> {
    try {
      // ... existing upload code ...

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Generate unique path
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${userId}/${goalId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError !== null) {
        return { success: false, error: new Error(uploadError.message) };
      }

      // Create proof submission record
      const { data, error } = await supabase
        .from('proof_submissions')
        .insert({
          goal_id: goalId,
          user_id: userId,
          image_path: filePath
        })
        .select()
        .single();

      if (error !== null) {
        await supabase.storage.from('proofs').remove([filePath]);
        return { success: false, error: new Error(error.message) };
      }

      // Get signed URL for the image
      const proofWithUrl = await this.getProofWithSignedUrl(data);

      // Trigger AI verification in the background
      if (proofWithUrl.imageUrl !== null) {
        void this.triggerVerification(
          proofWithUrl.id,
          goalDescription,
          proofWithUrl.imageUrl
        );
      }

      return { success: true, data: proofWithUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload proof';
      return { success: false, error: new Error(message) };
    }
  },

  async triggerVerification(
    proofId: string,
    goalDescription: string,
    imageUrl: string
  ): Promise<void> {
    // This runs in background - errors are logged but not thrown
    const result = await verificationService.verifyProof(
      proofId,
      goalDescription,
      imageUrl
    );

    if (!result.success) {
      console.error('Verification failed:', result.error.message);
    }
  },

  // ... keep existing methods
};
```

---

## Step 8: Update Proof Upload Hook

```typescript
// features/proof/hooks/useProofUpload.ts
// Update to pass goal description

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { proofService } from '../services/proofService';
import type { ProofSubmission } from '../types/proof.types';
import type { Result } from '@/shared/types/common.types';

interface UseProofUploadReturn {
  isUploading: boolean;
  error: Error | null;
  pickAndUpload: (
    goalId: string,
    userId: string,
    goalDescription: string
  ) => Promise<Result<ProofSubmission>>;
  takePhotoAndUpload: (
    goalId: string,
    userId: string,
    goalDescription: string
  ) => Promise<Result<ProofSubmission>>;
}

export function useProofUpload(): UseProofUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraStatus === 'granted' && libraryStatus === 'granted';
  }, []);

  const uploadImage = useCallback(
    async (
      imageUri: string,
      goalId: string,
      userId: string,
      goalDescription: string
    ): Promise<Result<ProofSubmission>> => {
      setIsUploading(true);
      setError(null);

      const result = await proofService.uploadProof(
        goalId,
        userId,
        imageUri,
        goalDescription
      );

      if (!result.success) {
        setError(result.error);
      }

      setIsUploading(false);
      return result;
    },
    []
  );

  const pickAndUpload = useCallback(
    async (
      goalId: string,
      userId: string,
      goalDescription: string
    ): Promise<Result<ProofSubmission>> => {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        const err = new Error('Permission to access photos was denied');
        setError(err);
        return { success: false, error: err };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (result.canceled || result.assets.length === 0) {
        const err = new Error('No image selected');
        return { success: false, error: err };
      }

      return uploadImage(result.assets[0].uri, goalId, userId, goalDescription);
    },
    [requestPermissions, uploadImage]
  );

  const takePhotoAndUpload = useCallback(
    async (
      goalId: string,
      userId: string,
      goalDescription: string
    ): Promise<Result<ProofSubmission>> => {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        const err = new Error('Permission to access camera was denied');
        setError(err);
        return { success: false, error: err };
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (result.canceled || result.assets.length === 0) {
        const err = new Error('No photo taken');
        return { success: false, error: err };
      }

      return uploadImage(result.assets[0].uri, goalId, userId, goalDescription);
    },
    [requestPermissions, uploadImage]
  );

  return { isUploading, error, pickAndUpload, takePhotoAndUpload };
}
```

---

## Step 9: Update ProofUploader Component

```typescript
// features/proof/components/ProofUploader.tsx
import { View, Text, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useProofUpload } from '../hooks/useProofUpload';

interface ProofUploaderProps {
  goalId: string;
  userId: string;
  goalDescription: string;  // Add this
  onUploadSuccess: () => void;
}

export function ProofUploader({
  goalId,
  userId,
  goalDescription,
  onUploadSuccess
}: ProofUploaderProps): JSX.Element {
  const { isUploading, pickAndUpload, takePhotoAndUpload } = useProofUpload();

  async function handleTakePhoto(): Promise<void> {
    const result = await takePhotoAndUpload(goalId, userId, goalDescription);

    if (!result.success) {
      if (result.error.message !== 'No photo taken') {
        Alert.alert('Error', result.error.message);
      }
      return;
    }

    Alert.alert('Success', 'Proof uploaded! AI is verifying your submission...');
    onUploadSuccess();
  }

  async function handlePickPhoto(): Promise<void> {
    const result = await pickAndUpload(goalId, userId, goalDescription);

    if (!result.success) {
      if (result.error.message !== 'No image selected') {
        Alert.alert('Error', result.error.message);
      }
      return;
    }

    Alert.alert('Success', 'Proof uploaded! AI is verifying your submission...');
    onUploadSuccess();
  }

  // ... rest stays the same
  if (isUploading) {
    return (
      <View className="bg-gray-100 rounded-xl p-8 items-center">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="text-gray-600 mt-3">Uploading proof...</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Pressable
        onPress={(): void => void handleTakePhoto()}
        className="bg-primary-600 py-4 rounded-xl items-center active:bg-primary-700"
      >
        <Text className="text-white font-semibold text-lg">Take Photo</Text>
      </Pressable>

      <Pressable
        onPress={(): void => void handlePickPhoto()}
        className="bg-gray-100 py-4 rounded-xl items-center active:bg-gray-200"
      >
        <Text className="text-gray-700 font-semibold text-lg">Choose from Library</Text>
      </Pressable>
    </View>
  );
}
```

---

## Step 10: Update Goal Detail to Pass Description

```typescript
// app/goal/[id].tsx
// Update ProofUploader usage

<ProofUploader
  goalId={goal.id}
  userId={user?.id ?? ''}
  goalDescription={goal.description}
  onUploadSuccess={handleProofUploaded}
/>
```

---

## Step 11: Create Verification Result Component

```typescript
// features/proof/components/VerificationResult.tsx
import { View, Text } from 'react-native';
import type { VerificationResult as VerificationResultType } from '../types/proof.types';

interface VerificationResultProps {
  result: VerificationResultType;
}

export function VerificationResult({ result }: VerificationResultProps): JSX.Element {
  const isValid = result.isValid;
  const bgColor = isValid ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isValid ? 'border-green-200' : 'border-red-200';
  const iconBg = isValid ? 'bg-green-100' : 'bg-red-100';
  const iconText = isValid ? 'text-green-600' : 'text-red-600';
  const titleColor = isValid ? 'text-green-800' : 'text-red-800';

  return (
    <View className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-3">
        <View className={`w-10 h-10 ${iconBg} rounded-full items-center justify-center`}>
          <Text className={`text-xl ${iconText}`}>{isValid ? '✓' : '✗'}</Text>
        </View>
        <View className="flex-1">
          <Text className={`font-semibold text-lg ${titleColor}`}>
            {isValid ? 'Verified!' : 'Not Verified'}
          </Text>
          <Text className="text-gray-500 text-sm">
            Confidence: {result.confidence}%
          </Text>
        </View>
      </View>

      {/* Reasoning */}
      <View className="bg-white rounded-lg p-3">
        <Text className="text-gray-700">{result.reasoning}</Text>
      </View>
    </View>
  );
}
```

---

## Step 12: Update Proof Display to Show Verification

```typescript
// features/proof/components/ProofDisplay.tsx
// Update ProofCard to show verification result

import { VerificationResult } from './VerificationResult';

function ProofCard({ proof }: ProofCardProps): JSX.Element {
  const statusConfig = getStatusConfig(proof.verificationStatus);

  return (
    <View className="bg-gray-50 rounded-xl overflow-hidden">
      {/* Image */}
      {proof.imageUrl !== null ? (
        <Image
          source={{ uri: proof.imageUrl }}
          className="w-full h-48"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-48 bg-gray-200 items-center justify-center">
          <Text className="text-gray-500">Image unavailable</Text>
        </View>
      )}

      {/* Info */}
      <View className="p-3">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-sm text-gray-500">
            {formatDateTime(proof.createdAt)}
          </Text>
          <View className={`px-2 py-1 rounded-full ${statusConfig.bg}`}>
            <Text className={`text-xs font-medium ${statusConfig.text}`}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Verification result */}
        {proof.verificationResult !== null && (
          <VerificationResult result={proof.verificationResult} />
        )}

        {/* Pending state */}
        {proof.verificationStatus === 'pending' && (
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <Text className="text-yellow-800 text-center">
              AI is analyzing your proof...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
```

---

## Step 13: Add Real-time Updates for Verification

```typescript
// features/proof/hooks/useProofSubscription.ts
import { useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';

export function useProofSubscription(
  goalId: string,
  onProofUpdated: () => void
): void {
  useEffect(() => {
    const channel = supabase
      .channel(`proofs:${goalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proof_submissions',
          filter: `goal_id=eq.${goalId}`
        },
        () => {
          onProofUpdated();
        }
      )
      .subscribe();

    return (): void => {
      void supabase.removeChannel(channel);
    };
  }, [goalId, onProofUpdated]);
}
```

---

## Step 14: Export Verification Components

```typescript
// features/proof/index.ts
export { proofService } from './services/proofService';
export { verificationService } from './services/verificationService';
export { useProofUpload } from './hooks/useProofUpload';
export { useProofSubscription } from './hooks/useProofSubscription';
export { ProofUploader } from './components/ProofUploader';
export { ProofDisplay } from './components/ProofDisplay';
export { VerificationResult } from './components/VerificationResult';
export type { ProofSubmission, VerificationStatus, VerificationResult as VerificationResultType } from './types/proof.types';
```

---

## Verification Checklist

```bash
# 1. Deploy edge function
supabase functions deploy verify-proof

# 2. Type check passes
npm run typecheck

# 3. Lint passes
npm run lint

# 4. App starts without errors
npx expo start
```

### Manual Testing

1. **Create goal**: "Go to gym" with description "Show me at gym with equipment"
2. **Upload proof**: Take/select photo of gym equipment
3. **See pending**: Proof shows "AI is analyzing..."
4. **Wait for result**: After ~5-10 seconds, status updates
5. **View result**: See "Verified!" or "Not Verified" with reasoning
6. **Test rejection**: Upload unrelated photo, should be rejected
7. **Check Supabase**: proof_submissions table has verification_result filled

---

## Files Created/Modified

```
accountability-app/
├── features/
│   └── proof/
│       ├── components/
│       │   ├── ProofUploader.tsx     # MODIFIED
│       │   ├── ProofDisplay.tsx      # MODIFIED
│       │   └── VerificationResult.tsx # NEW
│       ├── hooks/
│       │   ├── useProofUpload.ts     # MODIFIED
│       │   └── useProofSubscription.ts # NEW
│       ├── services/
│       │   ├── proofService.ts       # MODIFIED
│       │   └── verificationService.ts # NEW
│       └── index.ts                   # MODIFIED
├── app/
│   └── goal/
│       └── [id].tsx                   # MODIFIED
└── supabase/
    └── functions/
        └── verify-proof/
            └── index.ts               # NEW
```

---

## Edge Function Deployment Notes

```bash
# View function logs
supabase functions logs verify-proof

# Test function locally
supabase functions serve verify-proof --env-file .env.local

# Check function status
supabase functions list
```

---

## Next Phase

Proceed to [Phase 9: Apple Subscription Setup](./phase-09-apple-subscription-setup.md) to configure in-app purchases.
