import type { Session, User } from '@supabase/supabase-js';
import type { Result } from '@/shared/types/common.types';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthContextValue extends AuthState {
  signUp: (credentials: SignUpCredentials) => Promise<Result<User>>;
  signIn: (credentials: SignInCredentials) => Promise<Result<User>>;
  signOut: () => Promise<Result<void>>;
}
