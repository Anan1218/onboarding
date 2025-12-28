# Phase 7: Photo Upload (No AI)

**Goal:** User can upload a photo as proof
**Test:** Take photo → upload → see it displayed in goal detail

---

## Prerequisites

- Phase 6 completed
- Expo ImagePicker available

---

## Step 1: Create Proof Submissions Table

Run this SQL in Supabase SQL Editor:

```sql
-- supabase/migrations/00004_create_proof_submissions.sql

-- Verification status enum
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- Proof submissions table
CREATE TABLE proof_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Image
  image_path TEXT NOT NULL,
  image_url TEXT,  -- Signed URL, regenerated as needed

  -- AI Verification (filled in Phase 8)
  verification_status verification_status NOT NULL DEFAULT 'pending',
  verification_result JSONB,
  verified_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated at trigger
CREATE TRIGGER update_proof_submissions_updated_at
  BEFORE UPDATE ON proof_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE proof_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view proofs for goals they participate in
CREATE POLICY "Participants can view proofs"
  ON proof_submissions FOR SELECT
  USING (
    goal_id IN (
      SELECT goal_id FROM goal_participants WHERE user_id = auth.uid()
    )
  );

-- Only goal owner can submit proofs
CREATE POLICY "Goal owners can submit proofs"
  ON proof_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals WHERE id = goal_id AND user_id = auth.uid()
    )
  );

-- System can update verification status (via service role)
CREATE POLICY "Users can view their proof updates"
  ON proof_submissions FOR UPDATE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX proof_submissions_goal_id_idx ON proof_submissions(goal_id);
CREATE INDEX proof_submissions_user_id_idx ON proof_submissions(user_id);
```

---

## Step 2: Create Storage Bucket

In Supabase Dashboard → Storage:

1. Create new bucket: `proofs`
2. Make it **private** (not public)
3. Add RLS policies:

```sql
-- Storage RLS for proofs bucket

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read proofs for goals they participate in
CREATE POLICY "Participants can view proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proofs' AND
  (storage.foldername(name))[1] IN (
    SELECT gp.user_id::text
    FROM goal_participants gp
    WHERE gp.user_id = auth.uid()
    OR gp.goal_id IN (
      SELECT goal_id FROM goal_participants WHERE user_id = auth.uid()
    )
  )
);
```

---

## Step 3: Install Image Picker

```bash
npx expo install expo-image-picker
```

---

## Step 4: Update Database Types

```typescript
// shared/types/database.types.ts
// Add to existing file:

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface VerificationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  checkedAt: string;
}

// Add to Tables interface:
proof_submissions: {
  Row: {
    id: string;
    goal_id: string;
    user_id: string;
    image_path: string;
    image_url: string | null;
    verification_status: VerificationStatus;
    verification_result: VerificationResult | null;
    verified_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    goal_id: string;
    user_id: string;
    image_path: string;
    image_url?: string | null;
    verification_status?: VerificationStatus;
    verification_result?: VerificationResult | null;
    verified_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    goal_id?: string;
    user_id?: string;
    image_path?: string;
    image_url?: string | null;
    verification_status?: VerificationStatus;
    verification_result?: VerificationResult | null;
    verified_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};

export type ProofSubmission = Tables<'proof_submissions'>;
```

---

## Step 5: Create Proof Types

```typescript
// features/proof/types/proof.types.ts
import type { VerificationStatus, VerificationResult } from '@/shared/types/database.types';

export type { VerificationStatus, VerificationResult };

export interface ProofSubmission {
  id: string;
  goalId: string;
  userId: string;
  imagePath: string;
  imageUrl: string | null;
  verificationStatus: VerificationStatus;
  verificationResult: VerificationResult | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapDbProofToProof(dbProof: {
  id: string;
  goal_id: string;
  user_id: string;
  image_path: string;
  image_url: string | null;
  verification_status: VerificationStatus;
  verification_result: VerificationResult | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}): ProofSubmission {
  return {
    id: dbProof.id,
    goalId: dbProof.goal_id,
    userId: dbProof.user_id,
    imagePath: dbProof.image_path,
    imageUrl: dbProof.image_url,
    verificationStatus: dbProof.verification_status,
    verificationResult: dbProof.verification_result,
    verifiedAt: dbProof.verified_at !== null ? new Date(dbProof.verified_at) : null,
    createdAt: new Date(dbProof.created_at),
    updatedAt: new Date(dbProof.updated_at)
  };
}
```

---

## Step 6: Create Proof Service

```typescript
// features/proof/services/proofService.ts
import { supabase } from '@/shared/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import type { ProofSubmission } from '../types/proof.types';
import { mapDbProofToProof } from '../types/proof.types';
import type { Result } from '@/shared/types/common.types';

export const proofService = {
  async uploadProof(
    goalId: string,
    userId: string,
    imageUri: string
  ): Promise<Result<ProofSubmission>> {
    try {
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
        // Clean up uploaded file if db insert fails
        await supabase.storage.from('proofs').remove([filePath]);
        return { success: false, error: new Error(error.message) };
      }

      // Get signed URL for the image
      const proofWithUrl = await this.getProofWithSignedUrl(data);

      return { success: true, data: proofWithUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload proof';
      return { success: false, error: new Error(message) };
    }
  },

  async getProofsByGoalId(goalId: string): Promise<Result<ProofSubmission[]>> {
    const { data, error } = await supabase
      .from('proof_submissions')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    // Get signed URLs for all proofs
    const proofsWithUrls = await Promise.all(
      data.map((proof) => this.getProofWithSignedUrl(proof))
    );

    return { success: true, data: proofsWithUrls };
  },

  async getLatestProof(goalId: string): Promise<Result<ProofSubmission | null>> {
    const { data, error } = await supabase
      .from('proof_submissions')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data === null) {
      return { success: true, data: null };
    }

    const proofWithUrl = await this.getProofWithSignedUrl(data);

    return { success: true, data: proofWithUrl };
  },

  async getProofWithSignedUrl(dbProof: {
    id: string;
    goal_id: string;
    user_id: string;
    image_path: string;
    image_url: string | null;
    verification_status: 'pending' | 'verified' | 'rejected';
    verification_result: {
      isValid: boolean;
      confidence: number;
      reasoning: string;
      checkedAt: string;
    } | null;
    verified_at: string | null;
    created_at: string;
    updated_at: string;
  }): Promise<ProofSubmission> {
    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from('proofs')
      .createSignedUrl(dbProof.image_path, 3600);

    const proof = mapDbProofToProof(dbProof);
    proof.imageUrl = signedUrlData?.signedUrl ?? null;

    return proof;
  }
};
```

---

## Step 7: Install File System

```bash
npx expo install expo-file-system
```

Add base64-arraybuffer for decoding:

```bash
npm install base64-arraybuffer
```

---

## Step 8: Create Proof Upload Hook

```typescript
// features/proof/hooks/useProofUpload.ts
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { proofService } from '../services/proofService';
import type { ProofSubmission } from '../types/proof.types';
import type { Result } from '@/shared/types/common.types';

interface UseProofUploadReturn {
  isUploading: boolean;
  error: Error | null;
  pickAndUpload: (goalId: string, userId: string) => Promise<Result<ProofSubmission>>;
  takePhotoAndUpload: (goalId: string, userId: string) => Promise<Result<ProofSubmission>>;
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
      userId: string
    ): Promise<Result<ProofSubmission>> => {
      setIsUploading(true);
      setError(null);

      const result = await proofService.uploadProof(goalId, userId, imageUri);

      if (!result.success) {
        setError(result.error);
      }

      setIsUploading(false);
      return result;
    },
    []
  );

  const pickAndUpload = useCallback(
    async (goalId: string, userId: string): Promise<Result<ProofSubmission>> => {
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

      const imageUri = result.assets[0].uri;
      return uploadImage(imageUri, goalId, userId);
    },
    [requestPermissions, uploadImage]
  );

  const takePhotoAndUpload = useCallback(
    async (goalId: string, userId: string): Promise<Result<ProofSubmission>> => {
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

      const imageUri = result.assets[0].uri;
      return uploadImage(imageUri, goalId, userId);
    },
    [requestPermissions, uploadImage]
  );

  return { isUploading, error, pickAndUpload, takePhotoAndUpload };
}
```

---

## Step 9: Create Proof Uploader Component

```typescript
// features/proof/components/ProofUploader.tsx
import { View, Text, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useProofUpload } from '../hooks/useProofUpload';

interface ProofUploaderProps {
  goalId: string;
  userId: string;
  onUploadSuccess: () => void;
}

export function ProofUploader({
  goalId,
  userId,
  onUploadSuccess
}: ProofUploaderProps): JSX.Element {
  const { isUploading, pickAndUpload, takePhotoAndUpload } = useProofUpload();

  async function handleTakePhoto(): Promise<void> {
    const result = await takePhotoAndUpload(goalId, userId);

    if (!result.success) {
      if (result.error.message !== 'No photo taken') {
        Alert.alert('Error', result.error.message);
      }
      return;
    }

    Alert.alert('Success', 'Proof uploaded! AI verification will begin shortly.');
    onUploadSuccess();
  }

  async function handlePickPhoto(): Promise<void> {
    const result = await pickAndUpload(goalId, userId);

    if (!result.success) {
      if (result.error.message !== 'No image selected') {
        Alert.alert('Error', result.error.message);
      }
      return;
    }

    Alert.alert('Success', 'Proof uploaded! AI verification will begin shortly.');
    onUploadSuccess();
  }

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

## Step 10: Create Proof Display Component

```typescript
// features/proof/components/ProofDisplay.tsx
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { proofService } from '../services/proofService';
import type { ProofSubmission } from '../types/proof.types';
import { formatDateTime } from '@/shared/utils/formatters';

interface ProofDisplayProps {
  goalId: string;
}

export function ProofDisplay({ goalId }: ProofDisplayProps): JSX.Element {
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProofs(): Promise<void> {
      const result = await proofService.getProofsByGoalId(goalId);
      if (result.success) {
        setProofs(result.data);
      }
      setIsLoading(false);
    }

    void loadProofs();
  }, [goalId]);

  if (isLoading) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#0284c7" />
      </View>
    );
  }

  if (proofs.length === 0) {
    return (
      <View className="bg-gray-50 rounded-xl p-4">
        <Text className="text-gray-500 text-center">No proofs submitted yet</Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {proofs.map((proof) => (
        <ProofCard key={proof.id} proof={proof} />
      ))}
    </View>
  );
}

interface ProofCardProps {
  proof: ProofSubmission;
}

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
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-gray-500">
            {formatDateTime(proof.createdAt)}
          </Text>
          <View className={`px-2 py-1 rounded-full ${statusConfig.bg}`}>
            <Text className={`text-xs font-medium ${statusConfig.text}`}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Verification result - will be shown in Phase 8 */}
        {proof.verificationResult !== null && (
          <View className="mt-2 p-2 bg-white rounded-lg">
            <Text className="text-sm text-gray-700">
              {proof.verificationResult.reasoning}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

function getStatusConfig(status: ProofSubmission['verificationStatus']): StatusConfig {
  switch (status) {
    case 'pending':
      return { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'verified':
      return { label: 'Verified', bg: 'bg-green-100', text: 'text-green-800' };
    case 'rejected':
      return { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800' };
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unknown status: ${String(_exhaustive)}`);
    }
  }
}
```

---

## Step 11: Update Goal Detail with Proof Components

```typescript
// app/goal/[id].tsx
// Update the proof section in the existing component

import { useState, useCallback } from 'react';
// ... other imports
import { ProofUploader } from '@/features/proof/components/ProofUploader';
import { ProofDisplay } from '@/features/proof/components/ProofDisplay';

export default function GoalDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { goal, isLoading, error, updateStatus } = useGoal(id);
  const [proofKey, setProofKey] = useState(0); // For refreshing proof list

  const handleProofUploaded = useCallback((): void => {
    // Increment key to force ProofDisplay to refresh
    setProofKey((prev) => prev + 1);
  }, []);

  // ... keep existing loading/error handling

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  if (error !== null || goal === null) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-center">
            {error?.message ?? 'Goal not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = goal.userId === user?.id;
  const isActive = goal.status === 'active' || goal.status === 'pending';

  async function handleCancel(): Promise<void> {
    Alert.alert('Cancel Goal', 'Are you sure you want to cancel this goal?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async (): Promise<void> => {
          const result = await updateStatus('cancelled');
          if (result.success) {
            router.back();
          } else {
            Alert.alert('Error', 'Failed to cancel goal');
          }
        }
      }
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen options={{ title: goal.title }} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* ... keep existing title, description, details, participants, invite sections */}

        {/* Title & Status */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">{goal.title}</Text>
          <StatusBadge status={goal.status} />
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-500 mb-1">
            What the photo should show:
          </Text>
          <Text className="text-gray-900">{goal.description}</Text>
        </View>

        {/* Details */}
        <View className="bg-gray-50 rounded-xl p-4 gap-3 mb-6">
          <DetailRow label="Deadline" value={formatDate(goal.deadline)} />
          <DetailRow
            label="Stake"
            value={goal.stakeAmountCents > 0 ? formatCurrency(goal.stakeAmountCents) : 'Free'}
          />
          <DetailRow label="Created" value={formatDate(goal.createdAt)} />
        </View>

        {/* Participants */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Accountability Partners
          </Text>
          <ParticipantsList goalId={goal.id} />
        </View>

        {/* Invite Link (only for owner) */}
        {isOwner && isActive && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Invite Partner
            </Text>
            <InviteLink goalId={goal.id} />
          </View>
        )}

        {/* Proof Upload Section - NOW REAL */}
        {isOwner && isActive && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Submit Proof
            </Text>
            <ProofUploader
              goalId={goal.id}
              userId={user?.id ?? ''}
              onUploadSuccess={handleProofUploaded}
            />
          </View>
        )}

        {/* Proof History */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Proof Submissions
          </Text>
          <ProofDisplay key={proofKey} goalId={goal.id} />
        </View>

        {/* Actions (only for owner) */}
        {isOwner && isActive && (
          <View className="mt-4">
            <Button
              title="Cancel Goal"
              onPress={(): void => void handleCancel()}
              variant="secondary"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Keep existing StatusBadge and DetailRow components
```

---

## Step 12: Add iOS Permissions

```json
// app.json - add to expo.ios
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to take proof photos for your goals.",
        "NSPhotoLibraryUsageDescription": "This app accesses your photos to upload proof for your goals."
      }
    }
  }
}
```

---

## Step 13: Export Proof Feature

```typescript
// features/proof/index.ts
export { proofService } from './services/proofService';
export { useProofUpload } from './hooks/useProofUpload';
export { ProofUploader } from './components/ProofUploader';
export { ProofDisplay } from './components/ProofDisplay';
export type { ProofSubmission, VerificationStatus, VerificationResult } from './types/proof.types';
```

---

## Verification Checklist

```bash
# 1. Type check passes
npm run typecheck

# 2. Lint passes
npm run lint

# 3. App starts without errors
npx expo start
```

### Manual Testing

1. **Create goal**: Make a new goal with description
2. **View goal**: See "Submit Proof" section with camera/library buttons
3. **Take photo**: Tap "Take Photo", grant camera permission, take picture
4. **See upload**: Loading indicator while uploading
5. **Success**: Alert shows, proof appears in "Proof Submissions" section
6. **View image**: Photo displays with "Pending" status
7. **Pick from library**: Test "Choose from Library" option
8. **Supabase check**:
   - View proof_submissions table, see record
   - View Storage → proofs bucket, see uploaded image
9. **Partner view**: Log in as partner, view goal, see proof (but can't upload)

---

## Files Created/Modified

```
accountability-app/
├── app/
│   └── goal/
│       └── [id].tsx              # MODIFIED
├── features/
│   └── proof/
│       ├── components/
│       │   ├── ProofUploader.tsx # NEW
│       │   └── ProofDisplay.tsx  # NEW
│       ├── hooks/
│       │   └── useProofUpload.ts # NEW
│       ├── services/
│       │   └── proofService.ts   # NEW
│       ├── types/
│       │   └── proof.types.ts    # NEW
│       └── index.ts              # NEW
├── shared/
│   └── types/
│       └── database.types.ts     # MODIFIED
├── supabase/
│   └── migrations/
│       └── 00004_create_proof_submissions.sql # NEW
└── app.json                      # MODIFIED (permissions)
```

---

## Database State After Phase 7

| Table | Purpose | RLS |
|-------|---------|-----|
| profiles | User profile data | Enabled |
| goals | User goals with deadlines and stakes | Enabled |
| goal_participants | Goal owners and partners | Enabled |
| proof_submissions | Photo proofs for goals | Enabled |

**Storage Buckets:**
| Bucket | Purpose | Public |
|--------|---------|--------|
| proofs | Proof photos | No |

---

## Next Phase

Proceed to [Phase 8: AI Verification](./phase-08-ai-verification.md) to add Gemini-based proof verification.
