import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/shared/lib/supabase';
import type { Result } from '@/shared/types/common.types';
import type { Session } from '@supabase/supabase-js';

// Configure Google Sign-In
// Note: You need to set up OAuth credentials in Google Cloud Console
// and configure the iOS app in Xcode with the correct bundle ID
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

let isConfigured = false;

export const googleAuthService = {
  configure(): void {
    if (isConfigured) {
      return;
    }

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['profile', 'email'],
    });

    isConfigured = true;
  },

  async signIn(): Promise<Result<Session>> {
    try {
      this.configure();

      // Check if play services are available (Android) or if signed in
      await GoogleSignin.hasPlayServices();

      // Perform sign in
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return { success: false, error: new Error('Google sign-in was cancelled') };
      }

      const idToken = response.data.idToken;
      if (idToken === null) {
        return { success: false, error: new Error('No ID token received from Google') };
      }

      // Sign in with Supabase using the Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error !== null) {
        return { success: false, error: new Error(error.message) };
      }

      if (data.session === null) {
        return { success: false, error: new Error('No session returned from Supabase') };
      }

      return { success: true, data: data.session };
    } catch (err) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            return { success: false, error: new Error('Sign-in was cancelled') };
          case statusCodes.IN_PROGRESS:
            return { success: false, error: new Error('Sign-in already in progress') };
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            return { success: false, error: new Error('Google Play Services not available') };
          default:
            return { success: false, error: new Error(err.message) };
        }
      }

      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      return { success: false, error: new Error(message) };
    }
  },

  async signOut(): Promise<Result<void>> {
    try {
      this.configure();

      // Check if user is signed in with Google
      const isSignedIn = await GoogleSignin.getCurrentUser();
      if (isSignedIn !== null) {
        await GoogleSignin.signOut();
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error !== null) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, data: undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      return { success: false, error: new Error(message) };
    }
  },

  async isSignedIn(): Promise<boolean> {
    try {
      this.configure();
      const currentUser = await GoogleSignin.getCurrentUser();
      return currentUser !== null;
    } catch {
      return false;
    }
  },
};
