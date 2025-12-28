import type { JSX } from 'react';
import { useState } from 'react';
import { View, Alert } from 'react-native';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import type { Profile, ProfileUpdate } from '../types/profile.types';
import type { Result } from '@/shared/types/common.types';

interface ProfileEditFormProps {
  profile: Profile;
  onSave: (data: ProfileUpdate) => Promise<Result<Profile>>;
  onCancel: () => void;
}

interface FormErrors {
  username?: string;
  venmoHandle?: string;
}

export function ProfileEditForm({ profile, onSave, onCancel }: ProfileEditFormProps): JSX.Element {
  const [username, setUsername] = useState(profile.username ?? '');
  const [venmoHandle, setVenmoHandle] = useState(profile.venmo_handle ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (username.length > 0 && username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (username.length > 30) {
      newErrors.username = 'Username must be 30 characters or less';
    }

    if (venmoHandle.length > 0 && !venmoHandle.startsWith('@')) {
      newErrors.venmoHandle = 'Venmo handle should start with @';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(): Promise<void> {
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    const updateData: ProfileUpdate = {
      username: username.length > 0 ? username : null,
      venmo_handle: venmoHandle.length > 0 ? venmoHandle : null,
    };

    const result = await onSave(updateData);

    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Error', 'Failed to update profile');
      return;
    }

    Alert.alert('Success', 'Profile updated!');
    onCancel();
  }

  return (
    <View className="w-full gap-4">
      <Input
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="Choose a username"
        autoCapitalize="none"
        autoComplete="username"
        error={errors.username}
      />

      <Input
        label="Venmo Handle"
        value={venmoHandle}
        onChangeText={setVenmoHandle}
        placeholder="@yourhandle"
        autoCapitalize="none"
        error={errors.venmoHandle}
      />

      <View className="flex-row gap-3 mt-4">
        <View className="flex-1">
          <Button title="Cancel" onPress={onCancel} variant="secondary" />
        </View>
        <View className="flex-1">
          <Button title="Save" onPress={(): void => void handleSave()} loading={isLoading} />
        </View>
      </View>
    </View>
  );
}
