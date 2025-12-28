import type { JSX } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { proofService } from '../services/proofService';
import type { ProofSubmission, VerificationStatus } from '../types/proof.types';
import { formatDateTime } from '@/shared/utils/formatters';

interface ProofDisplayProps {
  goalId: string;
}

export function ProofDisplay({ goalId }: ProofDisplayProps): JSX.Element {
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProofs = useCallback(async (): Promise<void> => {
    const result = await proofService.getProofsByGoalId(goalId);
    if (result.success) {
      setProofs(result.data);
    }
    setIsLoading(false);
  }, [goalId]);

  useEffect(() => {
    void loadProofs();
  }, [loadProofs]);

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
        <Image source={{ uri: proof.imageUrl }} className="w-full h-48" resizeMode="cover" />
      ) : (
        <View className="w-full h-48 bg-gray-200 items-center justify-center">
          <Text className="text-gray-500">Image unavailable</Text>
        </View>
      )}

      {/* Info */}
      <View className="p-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-gray-500">{formatDateTime(proof.createdAt)}</Text>
          <View className={`px-2 py-1 rounded-full ${statusConfig.bg}`}>
            <Text className={`text-xs font-medium ${statusConfig.text}`}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Verification result - will be shown in Phase 8 */}
        {proof.verificationResult !== null && (
          <View className="mt-2 p-2 bg-white rounded-lg">
            <Text className="text-sm text-gray-700">{proof.verificationResult.reasoning}</Text>
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

function getStatusConfig(status: VerificationStatus): StatusConfig {
  switch (status) {
    case 'pending':
      return { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'verified':
      return { label: 'Verified', bg: 'bg-green-100', text: 'text-green-800' };
    case 'rejected':
      return { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800' };
  }
}
