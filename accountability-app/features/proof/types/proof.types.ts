import type {
  VerificationStatus,
  VerificationResult,
  DbProofSubmission,
} from '@/shared/types/database.types';

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

export function mapDbProofToProof(dbProof: DbProofSubmission): ProofSubmission {
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
    updatedAt: new Date(dbProof.updated_at),
  };
}

// Type guard for validating proof data from Supabase
export function isValidDbProof(data: unknown): data is DbProofSubmission {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  return (
    'id' in data &&
    typeof data.id === 'string' &&
    'goal_id' in data &&
    typeof data.goal_id === 'string' &&
    'user_id' in data &&
    typeof data.user_id === 'string' &&
    'image_path' in data &&
    typeof data.image_path === 'string' &&
    'verification_status' in data &&
    (data.verification_status === 'pending' ||
      data.verification_status === 'verified' ||
      data.verification_status === 'rejected') &&
    'created_at' in data &&
    typeof data.created_at === 'string' &&
    'updated_at' in data &&
    typeof data.updated_at === 'string'
  );
}

export function isValidDbProofArray(data: unknown): data is DbProofSubmission[] {
  return Array.isArray(data) && data.every(isValidDbProof);
}
