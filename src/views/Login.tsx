"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Mail, Chrome, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginView() {
  const { signInWithGoogle, signInWithMagicLink, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Already logged in — redirect
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setMagicLoading(true);
    setMagicError(null);
    const { error } = await signInWithMagicLink(email.trim());
    setMagicLoading(false);
    if (error) {
      setMagicError(error);
    } else {
      setMagicSent(true);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl space-y-8">
          {/* Logo */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mx-auto">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Welcome to Analogix</h1>
              <p className="text-muted-foreground text-sm mt-1">Sign in to continue learning</p>
            </div>
          </div>

          {searchParams.get("error") && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-medium">
              Something went wrong with sign-in. Please try again.
            </div>
          )}

          {magicSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-4"
            >
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <div>
                <p className="font-bold text-foreground">Check your email!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a magic link to <span className="font-semibold text-foreground">{email}</span>.
                  Click the link to sign in.
                </p>
              </div>
              <button
                onClick={() => { setMagicSent(false); setEmail(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                Use a different email
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Google OAuth */}
              <Button
                variant="outline"
                className="w-full h-12 gap-3 rounded-2xl font-semibold border-2 hover:border-primary/30 transition-all"
                onClick={handleGoogle}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Magic Link */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 rounded-2xl border-2 focus:border-primary transition-colors"
                    required
                  />
                </div>
                {magicError && (
                  <p className="text-xs text-destructive font-medium">{magicError}</p>
                )}
                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl font-bold gap-2 shadow-lg shadow-primary/10"
                  disabled={magicLoading || !email.trim()}
                >
                  {magicLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Send Magic Link <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </form>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <button className="underline-offset-2 hover:underline">Terms</button> and{" "}
            <button className="underline-offset-2 hover:underline">Privacy Policy</button>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
