/**
 * AuthContext — wraps Supabase auth state for the React tree.
 * Session persistence is handled by Supabase (localStorage on web, MMKV via
 * storage adapter on native). The MMKV here is a fast cache for the user
 * object so the UI can render immediately on cold start.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { MMKV } from "../storage/mmkv";
import { getSupabase } from "../supabase";

const authStorage = new MMKV({ id: "analogix.auth" });
const USER_KEY = "user";

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
    // Optimistically show cached user while Supabase resolves the real session
    const cachedUser = authStorage.getString(USER_KEY);
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        authStorage.delete(USER_KEY);
      }
    }
    // Wait for Supabase to resolve the real session (persisted in localStorage)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUser({ id: data.session.user.id, email: data.session.user.email ?? null });
        authStorage.set(USER_KEY, JSON.stringify({ id: data.session.user.id, email: data.session.user.email ?? null }));
      } else {
        setUser(null);
        authStorage.delete(USER_KEY);
      }
      setIsReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({ id: session.user.id, email: session.user.email ?? null });
        authStorage.set(USER_KEY, JSON.stringify({ id: session.user.id, email: session.user.email ?? null }));
      } else {
        setUser(null);
        authStorage.delete(USER_KEY);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    authStorage.delete(USER_KEY);
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
