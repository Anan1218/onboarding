import type { JSX } from 'react';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { profileService } from '@/features/profile';
import type {
  AuthContextValue,
  SignUpCredentials,
  SignInCredentials,
} from '../types/auth.types';
import type { Result } from '@/shared/types/common.types';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    async function initialize(): Promise<void> {
      const result = await authService.getSession();
      if (result.success && result.data !== null) {
        setSession(result.data);
        setUser(result.data.user);
      }
      setIsLoading(false);
    }

    void initialize();

    // Listen for auth changes
    const { unsubscribe } = authService.onAuthStateChange((newUser, newSession) => {
      setUser(newUser);
      setSession(newSession);
    });

    return (): void => {
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<Result<User>> => {
      const result = await authService.signUp(credentials);

      if (!result.success) {
        return result;
      }

      // Create profile for new user
      const profileResult = await profileService.create({
        user_id: result.data.user.id,
      });

      if (!profileResult.success) {
        // Log but don't fail - profile can be created later
        console.error('Failed to create profile:', profileResult.error);
      }

      return { success: true, data: result.data.user };
    },
    []
  );

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<Result<User>> => {
      const result = await authService.signIn(credentials);

      if (!result.success) {
        return result;
      }

      return { success: true, data: result.data.user };
    },
    []
  );

  const signOut = useCallback(async (): Promise<Result<void>> => {
    return authService.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: user !== null,
      signUp,
      signIn,
      signOut,
    }),
    [user, session, isLoading, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
