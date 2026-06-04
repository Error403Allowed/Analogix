/**
 * Centralized runtime config for AnalogixMobile.
 * All values come from `process.env.EXPO_PUBLIC_*` (inlined into the bundle
 * at build time by Expo). NEVER read process.env directly in feature code —
 * always import from here.
 */
import Constants from "expo-constants";

function read(key: string, fallback: string): string {
  const fromEnv = process.env[key];
  if (fromEnv && fromEnv.trim() && !fromEnv.startsWith("YOUR-")) return fromEnv;
  const fromExtra = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.[key];
  if (fromExtra) return fromExtra;
  return fallback;
}

export const config = {
  supabase: {
    url: read("EXPO_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co"),
    anonKey: read("EXPO_PUBLIC_SUPABASE_ANON_KEY", "placeholder-anon"),
  },
  graphql: {
    httpUrl: read("EXPO_PUBLIC_GRAPHQL_HTTP_URL", "http://localhost:4000/graphql"),
    wsUrl: read("EXPO_PUBLIC_GRAPHQL_WS_URL", "ws://localhost:4000/graphql"),
  },
  google: {
    iosClientId: read("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", ""),
    androidClientId: read("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", ""),
    webClientId: read("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", ""),
    redirectScheme: read("EXPO_PUBLIC_GOOGLE_REDIRECT_SCHEME", "analogix"),
  },
};
