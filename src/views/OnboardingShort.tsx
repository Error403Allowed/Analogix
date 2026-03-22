"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Sparkles, Brain,
  Calculator, Microscope, Landmark, Zap, FlaskConical, BookOpen,
  Cpu, LineChart, Briefcase, Wallet, HeartPulse, Globe, Wrench,
  Stethoscope, Languages, Dumbbell, Gamepad2, Music, CookingPot,
  Palette, Film, Leaf, Laptop, Book, Plane, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import Confetti from "@/components/Confetti";
import { achievementStore } from "@/utils/achievementStore";
import { HOBBY_OPTIONS } from "@/utils/interests";
import { AustralianState, STATE_LABELS } from "@/utils/termData";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

// ── Auth Step ─────────────────────────────────────────────────────────────────
function AuthStep({ onAuthed, externalError }: { onAuthed: () => void; externalError?: string | null }) {
  const { signInWithGoogle, user, loading } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) onAuthed();
  }, [user, loading, onAuthed]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already authenticated, automatically proceed
  if (user) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] items-stretch">
      <div className="relative overflow-hidden rounded-3xl border border-white/6 bg-gradient-to-br from-primary/6 via-transparent to-accent/6 p-8 md:p-10">
        <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.14),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(34,197,94,0.12),transparent_50%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Analogix</p>
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">Welcome!</h1>
              </div>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">
              Let's set up your profile in just a few steps. We'll keep it quick!
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">Sign in</h2>
          <p className="text-muted-foreground text-sm mt-1">Use your Google account to continue.</p>
        </div>

        <Button variant="outline" className="w-full h-12 gap-3 rounded-2xl font-semibold border-2 hover:border-primary/40 transition-all"
          onClick={handleGoogle} disabled={googleLoading}>
          {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continue with Google
        </Button>

        {externalError && (
          <p className="text-sm text-destructive text-center">{externalError}</p>
        )}
      </div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const SUBJECTS = [
  { id: "math",        icon: <Calculator className="w-5 h-5" />,   label: "Mathematics"      },
  { id: "biology",     icon: <Microscope className="w-5 h-5" />,   label: "Biology"          },
  { id: "history",     icon: <Landmark className="w-5 h-5" />,     label: "History"          },
  { id: "physics",     icon: <Zap className="w-5 h-5" />,          label: "Physics"          },
  { id: "chemistry",   icon: <FlaskConical className="w-5 h-5" />, label: "Chemistry"        },
  { id: "english",     icon: <BookOpen className="w-5 h-5" />,     label: "English"          },
  { id: "computing",   icon: <Cpu className="w-5 h-5" />,          label: "Computing"        },
  { id: "economics",   icon: <LineChart className="w-5 h-5" />,    label: "Economics"        },
  { id: "business",    icon: <Briefcase className="w-5 h-5" />,    label: "Business"         },
  { id: "pdhpe",       icon: <HeartPulse className="w-5 h-5" />,   label: "PDHPE"            },
  { id: "geography",   icon: <Globe className="w-5 h-5" />,        label: "Geography"        },
  { id: "engineering", icon: <Wrench className="w-5 h-5" />,       label: "Engineering"      },
  { id: "medicine",    icon: <Stethoscope className="w-5 h-5" />,  label: "Medicine"         },
  { id: "languages",   icon: <Languages className="w-5 h-5" />,    label: "Languages"        },
];

const HOBBY_ICONS: Record<string, React.ReactNode> = {
  sports: <Dumbbell className="w-5 h-5" />, gaming: <Gamepad2 className="w-5 h-5" />,
  music: <Music className="w-5 h-5" />, cooking: <CookingPot className="w-5 h-5" />,
  art: <Palette className="w-5 h-5" />, movies: <Film className="w-5 h-5" />,
  nature: <Leaf className="w-5 h-5" />, tech: <Laptop className="w-5 h-5" />,
  reading: <Book className="w-5 h-5" />, travel: <Plane className="w-5 h-5" />,
};

// ── Main ──────────────────────────────────────────────────────────────────────
// SHORTENED: 4 steps total (was 6)
// 1=Auth, 2=Name/Year/State, 3=Subjects, 4=Hobbies
const TOTAL_STEPS = 4;
const IS_DEV = process.env.NODE_ENV === "development";
const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
const BYPASS_AUTH = IS_DEV && SKIP_AUTH;

const Onboarding = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();

  // Initialize step and error from URL parameters
  const [step, setStep] = useState(() => {
    if (BYPASS_AUTH) return 2;
    const urlStep = searchParams?.get("step");
    if (urlStep) return parseInt(urlStep, 10);
    return 1;
  });
  const [authError, setAuthError] = useState<string | null>(() => {
    return searchParams?.get("error") === "auth_failed" ? "Authentication failed. Please try again." : null;
  });

  // Handle auth state after OAuth callback
  useEffect(() => {
    if (BYPASS_AUTH) {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        if (prefs?.onboardingComplete) {
          router.replace("/dashboard");
        }
      } catch {}
      return;
    }

    if (authLoading) return;

    if (authUser) {
      const loadProfile = async () => {
        try {
          const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
          if (prefs?.onboardingComplete && (!prefs.userId || prefs.userId === authUser.id)) {
            router.replace("/dashboard");
            return;
          }
        } catch {}

        try {
          const supabase = createClient();
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, grade, state, subjects, hobbies, hobby_ids, hobby_details, onboarding_complete")
            .eq("id", authUser.id)
            .single();

          const hasProfile =
            profile?.onboarding_complete ||
            !!profile?.grade ||
            !!profile?.state ||
            (Array.isArray(profile?.subjects) && profile.subjects.length > 0);

          if (hasProfile) {
            try {
              const existing = JSON.parse(localStorage.getItem("userPreferences") || "{}");
              const next = {
                ...existing,
                name: profile?.name ?? existing.name,
                grade: profile?.grade ?? existing.grade ?? null,
                state: profile?.state ?? existing.state ?? null,
                subjects: Array.isArray(profile?.subjects) ? profile.subjects : (existing.subjects ?? []),
                hobbies: Array.isArray(profile?.hobbies) ? profile.hobbies : (existing.hobbies ?? []),
                hobbyIds: Array.isArray(profile?.hobby_ids) ? profile.hobby_ids : (existing.hobbyIds ?? []),
                hobbyDetails: profile?.hobby_details && typeof profile.hobby_details === "object"
                  ? profile.hobby_details
                  : (existing.hobbyDetails ?? {}),
                onboardingComplete: true,
                userId: authUser.id,
              };
              localStorage.setItem("userPreferences", JSON.stringify(next));
              window.dispatchEvent(new Event("userPreferencesUpdated"));
            } catch {}
            router.replace("/dashboard");
            return;
          }
        } catch {}

        setStep(2);
      };

      loadProfile();
    }
  }, [authUser, authLoading]);

  const getExistingPrefs = () => {
    try {
      return JSON.parse(localStorage.getItem("userPreferences") || "{}");
    } catch {
      return {};
    }
  };

  const existingPrefs = getExistingPrefs();
  const [name, setName] = useState(existingPrefs.name || "");
  const [grade, setGrade] = useState<string | null>(existingPrefs.grade || null);
  const [state, setState] = useState<AustralianState | null>(existingPrefs.state || null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(existingPrefs.subjects || []);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(existingPrefs.hobbyIds || []);
  const [isComplete, setIsComplete] = useState(false);

  const toggleSubject = (id: string) =>
    setSelectedSubjects(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);

  const toggleHobby = (id: string) =>
    setSelectedHobbies(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);

  const getAuthName = useCallback(() => {
    if (!authUser) return "";
    const meta = authUser.user_metadata || {};
    const first = meta.first_name || meta.given_name;
    const last = meta.last_name || meta.family_name;
    const full = meta.full_name || meta.name;
    const combined = [first, last].filter(Boolean).join(" ").trim();
    return (combined || full || authUser.email?.split("@")[0] || "").trim();
  }, [authUser]);

  useEffect(() => {
    const derived = getAuthName();
    if (derived && !name.trim()) setName(derived);
  }, [getAuthName, name]);

  const displayName = name.trim() || getAuthName() || "Student";

  const savePreferences = async (hobbyIds: string[]) => {
    const hobbies = hobbyIds.map(id => {
      const label = HOBBY_OPTIONS.find(h => h.id === id)?.label || id;
      return label;
    });
    const finalName = displayName;
    const existing = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    const prefs = {
      ...existing,
      name: finalName,
      grade,
      state,
      subjects: selectedSubjects,
      hobbies,
      hobbyIds,
      hobbyDetails: {},
      onboardingComplete: true,
      userId: authUser?.id,
    };
    localStorage.setItem("userPreferences", JSON.stringify(prefs));

    try {
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await supabase.from("profiles").upsert({
          id: currentUser.id, name: prefs.name, grade: prefs.grade, state: prefs.state,
          subjects: prefs.subjects, hobbies: prefs.hobbies, hobby_ids: prefs.hobbyIds,
          hobby_details: prefs.hobbyDetails, onboarding_complete: true,
          timezone, updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }
    } catch (e) { console.error("[Onboarding] Supabase save failed:", e); }

    achievementStore.unlock("start_1");
    if (displayName.trim().toLowerCase() !== "student") achievementStore.unlock("start_2");
  };

  const canNext =
    (step === 1 && !!authUser) ||
    (step === 2 && !!grade && !!state && displayName.trim()) ||
    (step === 3 && selectedSubjects.length > 0) ||
    (step === 4 && selectedHobbies.length > 0);

  const handleNext = async () => {
    if (!canNext) return;
    if (step === 2) { setStep(3); return; }
    if (step === 3) { setStep(4); return; }
    if (step === 4) {
      await savePreferences(selectedHobbies);
      setIsComplete(true);
      setTimeout(() => router.push("/dashboard"), 1500);
      return;
    }
  };

  const handleBack = () => {
    if (step > 2) setStep(s => s - 1);
  };

  const GRADES = ["7", "8", "9", "10", "11", "12"];
  const STATES: AustralianState[] = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="liquid-blob w-96 h-96 bg-primary/20 -top-48 -left-48 fixed" />
      <div className="liquid-blob w-80 h-80 bg-accent/20 bottom-20 right-10 fixed" style={{ animationDelay: "-3s" }} />
      
      <motion.div
        className={cn("w-full relative z-10", step === 1 ? "max-w-5xl" : "max-w-2xl")}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className={cn("glass-card shadow-xl border-white/8", step === 1 ? "p-6 md:p-8" : "p-8 md:p-10")}
            >
              {/* Progress bar */}
              {step > 1 && (
                <div className="flex items-center gap-2 mb-8">
                  {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn("h-2 flex-1 rounded-full transition-colors", step - 1 >= i + 1 ? "gradient-primary" : "bg-muted")}
                    />
                  ))}
                </div>
              )}

              {/* Step 1 — Auth */}
              {step === 1 && <AuthStep onAuthed={() => setStep(2)} externalError={authError} />}

              {/* Step 2 — Name, Year, State (combined for speed) */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Quick intro.</h1>
                    <p className="text-muted-foreground text-base mt-1">Tell us a bit about yourself.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">Your name</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="What should we call you?"
                        className="h-12 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">Year level</label>
                        <div className="grid grid-cols-3 gap-2">
                          {GRADES.map((g) => (
                            <button
                              key={g}
                              onClick={() => setGrade(g)}
                              className={cn(
                                "h-10 rounded-lg text-sm font-bold transition-all",
                                grade === g
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-foreground mb-2 block">State</label>
                        <select
                          value={state || ""}
                          onChange={(e) => setState(e.target.value as AustralianState)}
                          className="h-10 px-3 rounded-lg bg-muted border border-border text-sm font-medium"
                        >
                          <option value="">Select</option>
                          {STATES.map((s) => (
                            <option key={s} value={s}>{STATE_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 — Subjects */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Pick your subjects.</h1>
                    <p className="text-muted-foreground text-base mt-1">Choose all that apply. You can add more later.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                    {SUBJECTS.map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => toggleSubject(subject.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left",
                          selectedSubjects.includes(subject.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn("mb-2", selectedSubjects.includes(subject.id) ? "text-primary" : "text-muted-foreground")}>
                          {subject.icon}
                        </div>
                        <p className="text-sm font-bold text-foreground">{subject.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4 — Hobbies */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">What are you into?</h1>
                    <p className="text-muted-foreground text-base mt-1">We'll use these to make learning click.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                    {HOBBY_OPTIONS.map((hobby) => (
                      <button
                        key={hobby.id}
                        onClick={() => toggleHobby(hobby.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left",
                          selectedHobbies.includes(hobby.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn("mb-2", selectedHobbies.includes(hobby.id) ? "text-primary" : "text-muted-foreground")}>
                          {HOBBY_ICONS[hobby.id] || <Sparkles className="w-5 h-5" />}
                        </div>
                        <p className="text-sm font-bold text-foreground">{hobby.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation */}
              {step > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={step === 2}
                    className="gap-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canNext}
                    className="gap-2 px-6"
                  >
                    {step === TOTAL_STEPS ? (
                      <>
                        Let's go <Sparkles className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Next <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card shadow-xl border-white/8 p-12 text-center"
            >
              <Confetti />
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-black text-foreground mb-2">You're all set!</h1>
              <p className="text-muted-foreground">Heading to your dashboard...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
