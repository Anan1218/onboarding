function getEnvVar(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

export const config = {
  supabase: {
    url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },
};
