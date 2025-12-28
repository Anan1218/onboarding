import { supabase } from '@/shared/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import type { ProofSubmission } from '../types/proof.types';
import { mapDbProofToProof, isValidDbProof, isValidDbProofArray } from '../types/proof.types';
import type { DbProofSubmission } from '@/shared/types/database.types';
import type { Result } from '@/shared/types/common.types';

// Type guard for signed URL response
interface SignedUrlData {
  signedUrl: string;
}

function isValidSignedUrlData(data: unknown): data is SignedUrlData {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return 'signedUrl' in data && typeof data.signedUrl === 'string';
}

async function getProofWithSignedUrl(dbProof: DbProofSubmission): Promise<ProofSubmission> {
  // Get signed URL (valid for 1 hour)
  const { data: signedUrlData } = await supabase.storage
    .from('proofs')
    .createSignedUrl(dbProof.image_path, 3600);

  const proof = mapDbProofToProof(dbProof);
  if (isValidSignedUrlData(signedUrlData)) {
    proof.imageUrl = signedUrlData.signedUrl;
  }

  return proof;
}

export const proofService = {
  async uploadProof(
    goalId: string,
    userId: string,
    imageUri: string
  ): Promise<Result<ProofSubmission>> {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Generate unique path
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${userId}/${goalId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false,
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
          image_path: filePath,
        })
        .select()
        .single();

      if (error !== null) {
        // Clean up uploaded file if db insert fails
        await supabase.storage.from('proofs').remove([filePath]);
        return { success: false, error: new Error(error.message) };
      }

      if (!isValidDbProof(data)) {
        return { success: false, error: new Error('Invalid proof data received') };
      }

      // Get signed URL for the image
      const proofWithUrl = await getProofWithSignedUrl(data);

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

    if (!isValidDbProofArray(data)) {
      return { success: false, error: new Error('Invalid proofs data received') };
    }

    // Get signed URLs for all proofs
    const proofsWithUrls = await Promise.all(data.map(getProofWithSignedUrl));

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

    if (!isValidDbProof(data)) {
      return { success: false, error: new Error('Invalid proof data received') };
    }

    const proofWithUrl = await getProofWithSignedUrl(data);

    return { success: true, data: proofWithUrl };
  },
};
