export { proofService } from './services/proofService';
export { useProofUpload } from './hooks/useProofUpload';
export { ProofUploader } from './components/ProofUploader';
export { ProofDisplay } from './components/ProofDisplay';
export type {
  ProofSubmission,
  VerificationStatus,
  VerificationResult,
} from './types/proof.types';
export { mapDbProofToProof } from './types/proof.types';
