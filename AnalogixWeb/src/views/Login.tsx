"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Eye, EyeOff, Mail, Lock, ArrowRight,
  Check, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithGoogle, signInWithEmail, signUpWithEmail,
  resetPasswordForEmail, getEmailError, validatePassword,
} from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// ── Password requirements checklist ─────────────────────────────────────
function PasswordRequirements({ password }: { password: string }) {
  const { checks, allPass } = validatePassword(password);

  return (
    <div className="space-y-1.5">
      {checks.map((c) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-xs"
        >
          <div className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
            c.pass ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
          )}>
            {c.pass ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />}
          </div>
          <span className={c.pass ? "text-success" : "text-muted-foreground"}>{c.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Animated brain icon ─────────────────────────────────────────────────
function AnimatedBrain({ focused, mode }: {
  focused: boolean;
  mode: "signin" | "signup" | "forgot" | "success";
}) {
  const glow = mode === "forgot"
    ? "rgba(59,130,246,0.25)"
    : mode === "success"
      ? "rgba(34,197,94,0.25)"
      : focused
        ? "rgba(56,189,248,0.25)"
        : "rgba(56,189,248,0.06)";

  return (
    <div className="relative flex justify-center">
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        animate={{ scale: focused ? 1.3 : 1, opacity: focused ? 1 : 0.5, backgroundColor: glow }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      <motion.div
        className="relative w-14 h-14 shadow-lg shadow-primary/20"
        animate={{
          scale: focused ? 1.05 : 1,
          boxShadow: focused
            ? "0 0 30px rgba(56,189,248,0.25)"
            : "0 8px 30px rgba(0,0,0,0.12)",
        }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <img src="/tab-icon.png" alt="Analogix" className="w-full h-full object-contain" />
      </motion.div>
    </div>
  );
}

// ── Mode toggle pill ────────────────────────────────────────────────────
function ModePill({ mode, onChange }: {
  mode: "signin" | "signup";
  onChange: (m: "signin" | "signup") => void;
}) {
  return (
    <div className="flex bg-muted/60 rounded-full p-1 max-w-[200px] mx-auto">
      {(["signin", "signup"] as const).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            "flex-1 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300",
            mode === m
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {m === "signin" ? "Sign In" : "Sign Up"}
        </button>
      ))}
    </div>
  );
}

// ── Main LoginView ──────────────────────────────────────────────────────
export default function LoginView() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  // Progressive disclosure: 1=email, 2=password fields
  const [step, setStep] = useState(1);

  // Inline forgot-password flow
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Focus password field when step advances
  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => passwordRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Redirect if already authed
  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

  // Auto-advance / retreat step based on email
  useEffect(() => {
    if (email.trim().length > 0 && step === 1) {
      const t = setTimeout(() => setStep(2), 400);
      return () => clearTimeout(t);
    }
    if (email.trim().length === 0 && step === 2) {
      setStep(1);
    }
  }, [email, step]);

  const switchMode = useCallback((m: "signin" | "signup") => {
    setMode(m);
    setStep(email.trim() ? 2 : 1);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setError(null);
  }, [email]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const emailOk = isValidEmail(email);
  const { allPass: pwOk } = validatePassword(password);
  const matchOk = mode === "signin" || password === confirmPassword;
  const canSubmit = emailOk && pwOk && matchOk;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        const result = await signUpWithEmail(email, password);
        if (result?.user?.identities?.length === 0) {
          setError("An account with this email already exists. Try signing in.");
        } else {
          setSuccess("Check your email for a confirmation link! ✨");
        }
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(getEmailError(err.code ?? null, err.message ?? null));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!isValidEmail(forgotEmail)) return;
    setForgotLoading(true);
    setError(null);
    try {
      await resetPasswordForEmail(forgotEmail);
      setForgotSent(true);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(getEmailError(err.code ?? null, err.message ?? null));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle("/dashboard");
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(getEmailError(err.code ?? null, err.message ?? null));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs — subtle blue + green */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-8%] left-[-8%] w-[35%] h-[35%] bg-primary/[0.06] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-8%] right-[-8%] w-[35%] h-[35%] bg-accent/[0.06] blur-[120px] rounded-full" />
        <motion.div
          className="absolute top-[30%] left-[50%] w-[25%] h-[25%] bg-accent/[0.04] blur-[100px] rounded-full"
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl space-y-6">
          {/* Animated brain */}
          <AnimatedBrain
            focused={focused !== null}
            mode={success ? "success" : showForgot ? "forgot" : mode}
          />

          <AnimatePresence mode="wait">
            {showForgot ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
                  <p className="text-muted-foreground text-sm">
                    {forgotSent
                      ? "We've sent a reset link to your email."
                      : "Enter your email and we'll send you a reset link."}
                  </p>
                </div>

                {forgotSent ? (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4 py-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Check your inbox (and spam folder) for the reset link.
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
                      className="mt-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign In
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        placeholder="Your email"
                        value={forgotEmail}
                        onChange={e => { setForgotEmail(e.target.value); setError(null); }}
                        onFocus={() => setFocused("forgot-email")}
                        onBlur={() => setFocused(null)}
                        onKeyDown={e => e.key === "Enter" && handleForgot()}
                        className="pl-12 h-14 text-base border-2 focus:border-primary transition-all rounded-2xl"
                        autoFocus
                      />
                    </div>

                    {error && (
                      <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-medium">
                        {error}
                      </div>
                    )}

                    <Button
                      onClick={handleForgot}
                      disabled={!isValidEmail(forgotEmail) || forgotLoading}
                      className="w-full h-14 gap-2 gradient-primary text-primary-foreground border-0 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-opacity"
                    >
                      {forgotLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>Send Reset Link <ArrowRight className="w-5 h-5" /></>
                      )}
                    </Button>

                    <div className="text-center">
                      <button
                        onClick={() => { setShowForgot(false); setError(null); }}
                        className="text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Sign In
                      </button>
                    </div>
                  </>
                )}
              </motion.div>

            ) : success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
                  <p className="text-muted-foreground text-sm">{success}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => { setSuccess(null); setStep(1); setEmail(""); setPassword(""); }}
                  className="w-full h-12 rounded-2xl"
                >
                  Back to Sign In
                </Button>
              </motion.div>

            ) : (
              <motion.div
                key={`${mode}-${step}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {step === 1
                      ? "What's your email?"
                      : mode === "signin"
                        ? "Now, your password"
                        : "Create a password"}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {step === 1
                      ? "Sign in to continue learning"
                      : mode === "signin"
                        ? "Welcome back!"
                        : "At least 8 characters with uppercase, lowercase, numbers, and symbols"}
                  </p>
                </div>

                {/* Mode toggle */}
                <ModePill mode={mode} onChange={switchMode} />

                {/* Error banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Email */}
                <div className="relative">
                  <Mail className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    focused === "email" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <Input
                    ref={emailRef}
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    onKeyDown={e => e.key === "Enter" && step === 2 && handleSubmit()}
                    className={cn(
                      "pl-12 h-14 text-base border-2 transition-all rounded-2xl",
                      focused === "email"
                        ? "border-primary shadow-[0_0_20px_-8px_hsl(var(--p-h)_var(--p-s)_var(--p-l))]"
                        : "border-border"
                    )}
                    autoFocus={step === 1}
                  />
                </div>

                {/* Password fields — slide in when step >= 2 */}
                <AnimatePresence>
                  {step >= 2 && (
                    <motion.div
                      key="pw"
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ type: "spring", stiffness: 200, damping: 22, mass: 0.8 }}
                      className="space-y-4"
                    >
                      {/* Password */}
                      <div className="relative">
                        <Lock className={cn(
                          "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                          focused === "password" ? "text-primary" : "text-muted-foreground"
                        )} />
                        <Input
                          ref={passwordRef}
                          type={showPassword ? "text" : "password"}
                          placeholder={mode === "signin" ? "Your password" : "Create a password"}
                          value={password}
                          onChange={e => { setPassword(e.target.value); setError(null); }}
                          onFocus={() => setFocused("password")}
                          onBlur={() => setFocused(null)}
                          onKeyDown={e => e.key === "Enter" && canSubmit && handleSubmit()}
                          className={cn(
                            "pl-12 pr-12 h-14 text-base border-2 transition-all rounded-2xl",
                            focused === "password"
                              ? "border-primary shadow-[0_0_20px_-8px_hsl(var(--p-h)_var(--p-s)_var(--p-l))]"
                              : "border-border"
                          )}
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

                      {/* Confirm password (sign-up only) */}
                      {mode === "signup" && (
                        <div className="relative">
                          <Lock className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                            focused === "confirm" ? "text-primary" : "text-muted-foreground"
                          )} />
                          <Input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
                            onFocus={() => setFocused("confirm")}
                            onBlur={() => setFocused(null)}
                            onKeyDown={e => e.key === "Enter" && canSubmit && handleSubmit()}
                            className={cn(
                              "pl-12 pr-12 h-14 text-base border-2 transition-all rounded-2xl",
                              focused === "confirm"
                                ? "border-primary shadow-[0_0_20px_-8px_hsl(var(--p-h)_var(--p-s)_var(--p-l))]"
                                : "border-border",
                              confirmPassword && password !== confirmPassword && "border-destructive"
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
                      )}

                      {/* Password mismatch hint */}
                      {mode === "signup" && confirmPassword && password !== confirmPassword && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-destructive font-medium"
                        >
                          Passwords don&apos;t match
                        </motion.p>
                      )}

                      {/* Password requirements (sign-up only) */}
                      {mode === "signup" && <PasswordRequirements password={password} />}

                      {/* Forgot link (sign-in only) */}
                      {mode === "signin" && (
                        <div className="text-center">
                          <button
                            onClick={() => { setShowForgot(true); setError(null); }}
                            className="text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors"
                          >
                            Forgot your password?
                          </button>
                        </div>
                      )}

                      {/* Submit */}
                      <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit || loading}
                        className="w-full h-14 gap-2 gradient-primary text-primary-foreground border-0 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-opacity text-base"
                      >
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>{mode === "signin" ? "Sign In" : "Create Account"} <ArrowRight className="w-5 h-5" /></>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider + Google (hidden during forgot/success) */}
          {!showForgot && !success && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">or continue with</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <Button
                variant="outline"
                className="w-full h-12 gap-3 rounded-2xl font-semibold border-2 hover:border-primary/30 transition-all"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By signing in, you agree to our{" "}
                <button className="underline-offset-2 hover:underline">Terms</button> and{" "}
                <button className="underline-offset-2 hover:underline">Privacy Policy</button>.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
