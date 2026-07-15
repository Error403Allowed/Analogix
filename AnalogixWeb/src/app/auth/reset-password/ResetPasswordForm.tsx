"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Lock, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword, validatePassword } from "@/lib/auth-client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function PasswordRequirements({ password }: { password: string }) {
  const { checks } = validatePassword(password);

  return (
    <div className="space-y-1.5">
      {checks.map((c) => (
        <div key={c.key} className="flex items-center gap-2 text-xs">
          <div className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
            c.pass ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
          )}>
            {c.pass ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />}
          </div>
          <span className={c.pass ? "text-success" : "text-muted-foreground"}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Check for access_token in URL hash (Supabase sends it here)
  const [hasToken, setHasToken] = useState(() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash;
    return !!(hash && (hash.includes("access_token") || hash.includes("type=recovery")));
  });

  useEffect(() => {
    if (hasToken) {
      // Supabase SSR client will automatically pick up the session from hash
      const supabase = createClient();
      supabase.auth.getSession();
    }
  }, [hasToken]);

  const { allPass: pwOk } = validatePassword(password);
  const matchOk = password === confirm;
  const canSubmit = pwOk && matchOk && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 2000);
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Failed to update password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-success" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Password updated!</h1>
            <p className="text-muted-foreground text-sm">Taking you to your dashboard...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!hasToken) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto shadow-lg shadow-primary/20">
            <img src="/tab-icon.png" alt="Analogix" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Invalid reset link</h1>
            <p className="text-muted-foreground text-sm">
              This link may have expired. Please request a new password reset.
            </p>
          </div>
          <Button onClick={() => router.replace("/login")} className="w-full h-12 rounded-2xl">
            Back to Login
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Logo */}
        <div className="relative flex justify-center">
          <motion.div
            className="absolute inset-0 rounded-full blur-xl bg-primary/[0.08]"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Lock className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Create a new password</h1>
          <p className="text-muted-foreground text-sm">At least 8 characters with uppercase, lowercase, numbers, and symbols.</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && canSubmit && handleSubmit()}
            className="pl-12 pr-12 h-14 text-base border-2 focus:border-primary transition-all rounded-2xl"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <div className="relative">
          <Lock className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5",
            confirm && password !== confirm ? "text-destructive" : "text-muted-foreground"
          )} />
          <Input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && canSubmit && handleSubmit()}
            className={cn(
              "pl-12 pr-12 h-14 text-base border-2 transition-all rounded-2xl",
              confirm && password !== confirm
                ? "border-destructive focus:border-destructive"
                : "focus:border-primary"
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(p => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {confirm && password !== confirm && (
          <p className="text-xs text-destructive font-medium -mt-2">Passwords don&apos;t match</p>
        )}

        {password.length > 0 && <PasswordRequirements password={password} />}

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-14 gap-2 gradient-primary text-primary-foreground border-0 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>Update Password <ArrowRight className="w-5 h-5" /></>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
