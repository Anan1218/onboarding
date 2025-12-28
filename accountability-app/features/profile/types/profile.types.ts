import type { Profile, ProfileInsert, ProfileUpdate } from '@/shared/types/database.types';
import type { Result } from '@/shared/types/common.types';

export type { Profile, ProfileInsert, ProfileUpdate };

export interface ProfileService {
  getByUserId: (userId: string) => Promise<Result<Profile | null>>;
  create: (data: ProfileInsert) => Promise<Result<Profile>>;
  update: (userId: string, data: ProfileUpdate) => Promise<Result<Profile>>;
}
