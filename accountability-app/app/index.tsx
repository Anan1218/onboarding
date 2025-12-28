import type { JSX } from 'react';
import { Redirect } from 'expo-router';

export default function Index(): JSX.Element {
  // Later: check auth state and redirect accordingly
  // For now, always go to tabs
  return <Redirect href="/(tabs)" />;
}
