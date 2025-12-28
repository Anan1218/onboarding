import { supabase } from '@/shared/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { SignUpCredentials, SignInCredentials } from '../types/auth.types';
import type { Result } from '@/shared/types/common.types';

interface SessionData {
  user: User;
  session: Session;
}

export const authService = {
  async signUp(credentials: SignUpCredentials): Promise<Result<SessionData>> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data.user === null || data.session === null) {
      return {
        success: false,
        error: new Error('Sign up succeeded but no user/session returned'),
      };
    }

    return {
      success: true,
      data: { user: data.user, session: data.session },
    };
  },

  async signIn(credentials: SignInCredentials): Promise<Result<SessionData>> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    if (data.user === null || data.session === null) {
      return {
        success: false,
        error: new Error('Sign in succeeded but no user/session returned'),
      };
    }

    return {
      success: true,
      data: { user: data.user, session: data.session },
    };
  },

  async signOut(): Promise<Result<void>> {
    const { error } = await supabase.auth.signOut();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: undefined };
  },

  async getSession(): Promise<Result<Session | null>> {
    const { data, error } = await supabase.auth.getSession();

    if (error !== null) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: data.session };
  },

  onAuthStateChange(
    callback: (user: User | null, session: Session | null) => void
  ): { unsubscribe: () => void } {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session);
    });

    return { unsubscribe: data.subscription.unsubscribe };
  },
};
