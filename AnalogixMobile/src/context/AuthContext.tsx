/**
 * AuthContext — wraps Supabase auth state for the React tree.
 * Session persistence is handled by Supabase (localStorage on web, MMKV via
 * storage adapter on native). The SecureStore here is a fast cache for the user
 * object so the UI can render immediately on cold start.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getSupabase } from "../supabase";

const USER_KEY = "user";

async function getCachedUser(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(USER_KEY);
  }
  try {
    return await SecureStore.getItemAsync(USER_KEY);
  } catch {
    return null;
  }
}

async function setCachedUser(value: string | null) {
  if (Platform.OS === "web") {
    if (value) {
      localStorage.setItem(USER_KEY, value);
    } else {
      localStorage.removeItem(USER_KEY);
    }
    return;
  }
  try {
    if (value) {
      await SecureStore.setItemAsync(USER_KEY, value);
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch {
    // SecureStore may fail on simulators without keychain access
  }
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isReady: boolean;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    (async () => {
      // Optimistically show cached user while Supabase resolves the real session
      const cachedUser = await getCachedUser();
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          await setCachedUser(null);
        }
      }
      // Wait for Supabase to resolve the real session (persisted in localStorage)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const userObj = { id: data.session.user.id, email: data.session.user.email ?? null };
        setUser(userObj);
        await setCachedUser(JSON.stringify(userObj));
      } else {
        setUser(null);
        await setCachedUser(null);
      }
      setIsReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const userObj = { id: session.user.id, email: session.user.email ?? null };
        setUser(userObj);
        setCachedUser(JSON.stringify(userObj));
      } else {
        setUser(null);
        setCachedUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    await setCachedUser(null);
    setUser(null);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isReady, signOut, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
