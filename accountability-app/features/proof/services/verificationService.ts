import { supabase } from '@/shared/lib/supabase';
import type { VerificationResult } from '../types/proof.types';
import type { Result } from '@/shared/types/common.types';

interface VerifyResponse {
  success: boolean;
  result: VerificationResult;
}

// Type guard for verify response
function isValidVerifyResponse(data: unknown): data is VerifyResponse {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  if (!('success' in data && typeof data.success === 'boolean')) {
    return false;
  }
  if (!('result' in data && data.result !== null && typeof data.result === 'object')) {
    return false;
  }
  const result = data.result;
  return (
    'isValid' in result &&
    typeof result.isValid === 'boolean' &&
    'confidence' in result &&
    typeof result.confidence === 'number' &&
    'reasoning' in result &&
    typeof result.reasoning === 'string' &&
    'checkedAt' in result &&
    typeof result.checkedAt === 'string'
  );
}

export const verificationService = {
  async verifyProof(
    proofId: string,
    goalDescription: string,
    imageUrl: string
  ): Promise<Result<VerificationResult>> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-proof', {
        body: {
          proofId,
          goalDescription,
          imageUrl,
        },
      });

      if (error !== null) {
        return { success: false, error: new Error(error.message) };
      }

      if (!isValidVerifyResponse(data)) {
        return { success: false, error: new Error('Invalid verification response') };
      }

      if (!data.success) {
        return { success: false, error: new Error('Verification failed') };
      }

      return { success: true, data: data.result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      return { success: false, error: new Error(message) };
    }
  },
};
