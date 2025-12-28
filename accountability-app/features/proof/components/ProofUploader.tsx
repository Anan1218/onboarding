import type { JSX } from 'react';
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
  onUploadSuccess,
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
