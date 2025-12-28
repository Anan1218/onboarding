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

      const result = await proofService.uploadProof(goalId, userId, imageUri, goalDescription);

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
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      const selectedAsset = result.assets?.[0];
      if (result.canceled || selectedAsset === undefined) {
        const err = new Error('No image selected');
        return { success: false, error: err };
      }

      return uploadImage(selectedAsset.uri, goalId, userId, goalDescription);
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
        quality: 0.8,
      });

      const capturedAsset = result.assets?.[0];
      if (result.canceled || capturedAsset === undefined) {
        const err = new Error('No photo taken');
        return { success: false, error: err };
      }

      return uploadImage(capturedAsset.uri, goalId, userId, goalDescription);
    },
    [requestPermissions, uploadImage]
  );

  return { isUploading, error, pickAndUpload, takePhotoAndUpload };
}
