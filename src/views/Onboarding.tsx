"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Sparkles, User,
  Calculator, Microscope, Landmark, Zap, FlaskConical, BookOpen,
  Cpu, LineChart, Briefcase, Wallet, HeartPulse, Globe, Wrench,
  Stethoscope, Languages, Dumbbell, Gamepad2, Music, CookingPot,
  Palette, Film, Leaf, Laptop, Book, Plane, CalendarDays, Upload,
  Loader2, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import Confetti from "@/components/Confetti";
import { achievementStore } from "@/utils/achievementStore";
import { HOBBY_OPTIONS, POPULAR_INTERESTS } from "@/utils/interests";
import { parseICS } from "@/utils/icsParser";
import { eventStore } from "@/utils/eventStore";
import { AustralianState, STATE_LABELS } from "@/utils/termData";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";

// ── Typewriter ────────────────────────────────────────────────────────────────
const TypewriterText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [cursor, setCursor] = useState(true);

  useState(() => {
    let i = 0;
    const t = setTimeout(function type() {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
        const ch = text[i - 1];
        const speed = ch === " " ? 30 : ch === "." || ch === "!" ? 150 : 50;
        setTimeout(type, speed);
      } else { setDone(true); }
    }, delay);
    return () => clearTimeout(t);
  });

  useState(() => {
    if (!done) return;
    const iv = setInterval(() => setCursor(p => !p), 530);
    const h = setTimeout(() => { setCursor(false); clearInterval(iv); }, 3000);
    return () => { clearInterval(iv); clearTimeout(h); };
  });

  return (
    <span>
      {displayed}
      <motion.span animate={{ opacity: cursor ? 1 : 0 }} transition={{ duration: 0.1 }}
        className="inline-block w-[3px] h-[1em] ml-0.5 bg-primary align-middle rounded-sm" style={{ verticalAlign: "text-bottom" }} />
    </span>
  );
};

// ── Auth Step ─────────────────────────────────────────────────────────────────
function AuthStep({ onAuthed, externalError }: { onAuthed: () => void; externalError?: string | null }) {
  const { signInWithGoogle, user, loading } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  // If they're already authed (came back from OAuth redirect), skip ahead.
  // We wait for loading=false so we don't jump before the session cookie is read.
  useEffect(() => {
    if (!loading && user) onAuthed();
  }, [user, loading, onAuthed]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    // Page will navigate away via OAuth — no need to call onAuthed()
  };

  // Show a spinner while we're checking the session from the cookie
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
          <Brain className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Welcome to Analogix.</h1>
          <p className="text-muted-foreground text-base mt-0.5">Create an account to save your progress.</p>
        </div>
      </div>

      {externalError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-medium">
          {externalError}
        </div>
      )}

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

      <p className="text-center text-xs text-muted-foreground pt-2">
        Already have an account? Signing in will link to your existing profile.
      </p>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const SUBJECTS = [
  { id: "math",        icon: <Calculator className="w-6 h-6" />,   label: "Mathematics",     description: "Numbers, algebra, geometry"      },
  { id: "biology",     icon: <Microscope className="w-6 h-6" />,   label: "Biology",          description: "Life, cells, nature"             },
  { id: "history",     icon: <Landmark className="w-6 h-6" />,     label: "History",          description: "Past events, cultures"           },
  { id: "physics",     icon: <Zap className="w-6 h-6" />,          label: "Physics",          description: "Matter, energy, forces"          },
  { id: "chemistry",   icon: <FlaskConical className="w-6 h-6" />, label: "Chemistry",        description: "Elements, reactions"             },
  { id: "english",     icon: <BookOpen className="w-6 h-6" />,     label: "English",          description: "Reading, writing, speaking"      },
  { id: "computing",   icon: <Cpu className="w-6 h-6" />,          label: "Computing",        description: "Coding, hardware, software"      },
  { id: "economics",   icon: <LineChart className="w-6 h-6" />,    label: "Economics",        description: "Supply, demand, markets"         },
  { id: "business",    icon: <Briefcase className="w-6 h-6" />,    label: "Business Studies", description: "Management, strategy, startups" },
  { id: "commerce",    icon: <Wallet className="w-6 h-6" />,       label: "Commerce",         description: "Trade, finance, accounting"      },
  { id: "pdhpe",       icon: <HeartPulse className="w-6 h-6" />,   label: "PDHPE",            description: "Health, fitness, well-being"     },
  { id: "geography",   icon: <Globe className="w-6 h-6" />,        label: "Geography",        description: "World, maps, environment"        },
  { id: "engineering", icon: <Wrench className="w-6 h-6" />,       label: "Engineering",      description: "Design, mechanics, innovation"   },
  { id: "medicine",    icon: <Stethoscope className="w-6 h-6" />,  label: "Medicine",         description: "Anatomy, health, diagnosis"      },
  { id: "languages",   icon: <Languages className="w-6 h-6" />,    label: "Languages",        description: "Vocabulary, grammar, fluency"    },
];

const HOBBY_ICONS: Record<string, React.ReactNode> = {
  sports: <Dumbbell className="w-6 h-6" />, gaming: <Gamepad2 className="w-6 h-6" />,
  music: <Music className="w-6 h-6" />, cooking: <CookingPot className="w-6 h-6" />,
  art: <Palette className="w-6 h-6" />, movies: <Film className="w-6 h-6" />,
  nature: <Leaf className="w-6 h-6" />, tech: <Laptop className="w-6 h-6" />,
  reading: <Book className="w-6 h-6" />, travel: <Plane className="w-6 h-6" />,
};

// ── ICS step ──────────────────────────────────────────────────────────────────
function IcsStep({ importing, imported, count, error, onFile }:
  { importing: boolean; imported: boolean; count: number; error: string | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">One last thing.</h1>
        <p className="text-muted-foreground text-lg mt-1">If you want to import from Sentral, click the "export as ics" button in the timetable, so you can see all your classes and their details right here!</p>
      </div>
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        onClick={() => !imported && !importing && ref.current?.click()}
        className={cn("relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 text-center transition-all cursor-pointer select-none",
          dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50",
          imported && "border-green-500/60 bg-green-500/5")}>
        <input ref={ref} type="file" accept=".ics" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        {imported ? (
          <><div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center"><Check className="w-8 h-8 text-green-500" /></div>
            <div><p className="font-black text-foreground text-lg">Imported {count} event{count !== 1 ? "s" : ""}!</p><p className="text-sm text-muted-foreground mt-1">Your calendar is ready to go.</p></div></>
        ) : importing ? (
          <><div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse"><CalendarDays className="w-8 h-8 text-primary" /></div>
            <p className="font-bold text-muted-foreground">Reading calendar…</p></>
        ) : (
          <><div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center"><Upload className="w-8 h-8 text-muted-foreground" /></div>
            <div><p className="font-black text-foreground">Drop your .ics file here</p><p className="text-sm text-muted-foreground mt-1">or click to browse</p></div>
            <div className="flex flex-wrap justify-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span>Google Calendar</span><span>·</span><span>Outlook</span><span>·</span><span>Apple Calendar</span>
            </div></>
        )}
      </div>
      {error && <p className="text-sm text-destructive font-bold text-center">{error}</p>}
      <p className="text-xs text-muted-foreground text-center">This is completely optional — you can always import from the Calendar page later.</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
// Steps: 1=Auth, 2=Name, 3=Year, 4=State, 5=Subjects, 6=Hobbies, 7=ICS
const TOTAL_STEPS = 7;

const Onboarding = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();

  const [authError] = useState<string | null>(
    searchParams?.get("error") === "auth_failed" ? "Authentication failed. Please try again." : null
  );

  // Always start on step 1 — the gate below moves us forward once auth resolves.
  // This prevents ?step=2 in the URL from skipping auth for unauthenticated users.
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (authLoading) return;

    if (authUser) {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        if (prefs?.onboardingComplete) {
          router.replace("/dashboard");
          return;
        }
      } catch {}
      // Signed in but not finished — jump to step from URL (or 2)
      const urlStep = parseInt(searchParams?.get("step") ?? "2", 10);
      setStep(isNaN(urlStep) || urlStep <= 1 ? 2 : urlStep);
    }
    // Not signed in — stay on step 1
  }, [authUser, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const [name, setName] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [state, setState] = useState<AustralianState | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [interestSelections, setInterestSelections] = useState<Record<string, string[]>>({});
  const [customInterest, setCustomInterest] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [icsImporting, setIcsImporting] = useState(false);
  const [icsImported, setIcsImported] = useState(false);
  const [icsCount, setIcsCount] = useState(0);
  const [icsError, setIcsError] = useState<string | null>(null);

  const toggleSubject = (id: string) =>
    setSelectedSubjects(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);

  const toggleHobby = (id: string) => {
    setSelectedHobbies(prev => {
      if (prev.includes(id)) {
        setInterestSelections(d => { const n = { ...d }; delete n[id]; return n; });
        setCustomInterest(d => { const n = { ...d }; delete n[id]; return n; });
        return prev.filter(h => h !== id);
      }
      return [...prev, id];
    });
  };

  const toggleInterestItem = (id: string, item: string) => {
    setInterestSelections(prev => {
      const curr = prev[id] || [];
      const exists = curr.some(e => e.toLowerCase() === item.toLowerCase());
      return { ...prev, [id]: exists ? curr.filter(e => e.toLowerCase() !== item.toLowerCase()) : [...curr, item] };
    });
  };

  const addCustomInterest = (id: string) => {
    const val = (customInterest[id] || "").trim();
    if (!val) return;
    setInterestSelections(prev => {
      const curr = prev[id] || [];
      if (curr.some(e => e.toLowerCase() === val.toLowerCase())) return prev;
      return { ...prev, [id]: [...curr, val] };
    });
    setCustomInterest(prev => ({ ...prev, [id]: "" }));
  };

  const buildHobbyDetails = (ids: string[]) => {
    const d: Record<string, string> = {};
    ids.forEach(id => {
      const items = [...(interestSelections[id] || []), (customInterest[id] || "").trim()].filter(Boolean);
      const unique = items.filter((v, i, a) => i === a.findIndex(e => e.toLowerCase() === v.toLowerCase()));
      if (unique.length) d[id] = unique.join(", ");
    });
    return d;
  };

  const savePreferences = async (hobbyIds: string[], hobbyDetails: Record<string, string>) => {
    const hobbies = hobbyIds.map(id => {
      const label = HOBBY_OPTIONS.find(h => h.id === id)?.label || id;
      const detail = hobbyDetails[id] || "";
      return detail ? `${label} (${detail})` : label;
    });
    const prefs = {
      name: name.trim(), grade, state, subjects: selectedSubjects,
      hobbies, hobbyIds, hobbyDetails, onboardingComplete: true,
    };
    localStorage.setItem("userPreferences", JSON.stringify(prefs));

    try {
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from("profiles").upsert({
          id: currentUser.id, name: prefs.name, grade: prefs.grade, state: prefs.state,
          subjects: prefs.subjects, hobbies: prefs.hobbies, hobby_ids: prefs.hobbyIds,
          hobby_details: prefs.hobbyDetails, onboarding_complete: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }
    } catch (e) { console.error("[Onboarding] Supabase save failed:", e); }

    achievementStore.unlock("start_1");
    if (name.trim().toLowerCase() !== "student") achievementStore.unlock("start_2");
  };

  const handleIcsFile = async (file: File) => {
    if (!file.name.endsWith(".ics")) { setIcsError("Please upload a .ics file"); return; }
    setIcsError(null); setIcsImporting(true);
    try {
      const evts = await parseICS(file);
      if (!evts.length) { setIcsError("No events found in that file"); return; }
      eventStore.addMultiple(evts); setIcsCount(evts.length); setIcsImported(true);
    } catch { setIcsError("Couldn't parse that file. Try exporting it again."); }
    finally { setIcsImporting(false); }
  };

  // Step 1 (auth) is complete once the user is logged in
  const canNext =
    (step === 1 && !!authUser) ||
    (step === 2 && !!name.trim()) ||
    (step === 3 && !!grade) ||
    (step === 4 && !!state) ||
    (step === 5 && selectedSubjects.length > 0) ||
    (step === 6 && selectedHobbies.length > 0) ||
    (step === 7 && !icsImporting);

  const handleNext = async () => {
    if (!canNext) return;
    if (step < 6) { setStep(s => s + 1); return; }
    if (step === 6) {
      await savePreferences(selectedHobbies, buildHobbyDetails(selectedHobbies));
      setStep(7); return;
    }
    setIsComplete(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  };

  const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const iv = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="liquid-blob w-96 h-96 bg-primary/20 -top-48 -left-48 fixed" />
      <div className="liquid-blob w-80 h-80 bg-accent/20 bottom-20 right-10 fixed" style={{ animationDelay: "-3s" }} />
      <motion.div className="w-full max-w-2xl relative z-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
              className="glass-card p-8 md:p-10 shadow-2xl border-white/20">

              {/* Progress bar — only show from step 2 onwards */}
              {step > 1 && (
                <div className="flex items-center gap-2 mb-10">
                  {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
                    <div key={i} className={cn("h-2 flex-1 rounded-full transition-colors", step - 1 >= i + 1 ? "gradient-primary" : "bg-muted")} />
                  ))}
                </div>
              )}

              {/* Step 1 — Auth */}
              {step === 1 && <AuthStep onAuthed={() => setStep(2)} externalError={authError} />}

              {/* Step 2 — Name */}
              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight"><TypewriterText text="Hi there! I'm Quizzy." delay={300} /></h1>
                    <p className="text-muted-foreground text-lg"><TypewriterText text="What should I call you?" delay={1200} /></p>
                  </div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input autoFocus placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                      className="pl-12 h-14 text-xl glass border-2 focus:border-primary transition-all rounded-2xl"
                      onKeyDown={e => e.key === "Enter" && handleNext()} />
                  </div>
                </div>
              )}

              {/* Step 3 — Year */}
              {step === 3 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">What year are you in?</h1>
                    <p className="text-muted-foreground text-lg">I'll tailor the difficulty to your level.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {["7","8","9","10","11","12"].map(y => (
                      <motion.button key={y} onClick={() => setGrade(y)} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
                        className={cn("p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 group",
                          grade === y ? "border-primary bg-primary/10 shadow-lg scale-[1.02]" : "border-border glass hover:border-primary/50")}>
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Year</span>
                        <span className="text-4xl font-black text-foreground group-hover:scale-110 transition-transform">{y}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4 — State */}
              {step === 4 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Where do you go to school?</h1>
                    <p className="text-muted-foreground text-lg mt-1">I'll track your term and week automatically.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(Object.entries(STATE_LABELS) as [AustralianState, string][]).map(([code, label]) => (
                      <motion.button key={code} onClick={() => setState(code)} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                        className={cn("p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                          state === code ? "border-primary bg-primary/10 shadow-lg scale-[1.02]" : "border-border glass hover:border-primary/50")}>
                        <span className="text-2xl font-black text-foreground">{code}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center leading-tight">{label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5 — Subjects */}
              {step === 5 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Nice to meet you, {name}!</h1>
                    <p className="text-muted-foreground text-lg">Which subjects are we tackling?</p>
                  </div>
                  <motion.div className="grid grid-cols-2 sm:grid-cols-3 gap-3" variants={cv} initial="hidden" animate="visible">
                    {SUBJECTS.map(s => (
                      <motion.button key={s.id} variants={iv} onClick={() => toggleSubject(s.id)} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
                        className={cn("relative p-5 rounded-2xl border-2 transition-all text-left group",
                          selectedSubjects.includes(s.id) ? "border-primary bg-primary/10 shadow-lg scale-[1.02]" : "border-border glass hover:border-primary/50")}>
                        {selectedSubjects.includes(s.id) && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}
                        <span className="mb-3 block text-primary group-hover:scale-110 transition-transform">{s.icon}</span>
                        <div className="font-bold text-foreground">{s.label}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 opacity-70 group-hover:opacity-100">{s.description}</div>
                      </motion.button>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* Step 6 — Hobbies */}
              {step === 6 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Almost there!</h1>
                    <p className="text-muted-foreground text-lg">Tell me about your interests for analogies.</p>
                  </div>
                  <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" variants={cv} initial="hidden" animate="visible">
                    {HOBBY_OPTIONS.map(h => (
                      <motion.button key={h.id} variants={iv} onClick={() => toggleHobby(h.id)} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
                        className={cn("relative p-5 rounded-2xl border-2 transition-all group",
                          selectedHobbies.includes(h.id) ? "border-primary bg-primary/10 shadow-lg scale-[1.02]" : "border-border glass hover:border-primary/50")}>
                        {selectedHobbies.includes(h.id) && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}
                        <span className="mb-3 block text-primary group-hover:scale-110 transition-transform">{HOBBY_ICONS[h.id]}</span>
                        <span className="text-sm font-bold text-foreground">{h.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                  {selectedHobbies.length > 0 && (
                    <div className="space-y-4">
                      {selectedHobbies.map(id => {
                        const h = HOBBY_OPTIONS.find(x => x.id === id);
                        const popular = POPULAR_INTERESTS[id as keyof typeof POPULAR_INTERESTS] || [];
                        const selections = interestSelections[id] || [];
                        const normPop = popular.map(i => i.toLowerCase());
                        const customItems = selections.filter(i => !normPop.includes(i.toLowerCase()));
                        return (
                          <div key={id} className="glass p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                              <span className="text-primary">{HOBBY_ICONS[id]}</span>
                              <span>Popular {h?.label}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[...popular, ...customItems].map(item => {
                                const active = selections.some(e => e.toLowerCase() === item.toLowerCase());
                                const isCustom = !normPop.includes(item.toLowerCase());
                                return (
                                  <button key={item} onClick={() => toggleInterestItem(id, item)}
                                    className={cn("px-3 py-2 rounded-full border text-xs font-bold transition-all",
                                      active ? "border-primary bg-primary/10 shadow-lg" : "border-border glass hover:border-primary/50",
                                      isCustom && "border-dashed")}>
                                    {item}{isCustom && <span className="ml-1 text-[9px] uppercase tracking-widest text-muted-foreground">Custom</span>}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Input value={customInterest[id] || ""} onChange={e => setCustomInterest(p => ({ ...p, [id]: e.target.value }))}
                                placeholder={`Add your favourite ${h?.label.toLowerCase()}...`}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomInterest(id); } }} />
                              <Button type="button" variant="outline" onClick={() => addCustomInterest(id)}>Add</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 7 — ICS */}
              {step === 7 && (
                <IcsStep importing={icsImporting} imported={icsImported} count={icsCount} error={icsError} onFile={handleIcsFile} />
              )}

              {/* Footer buttons — hidden on auth step since it handles its own flow */}
              {step > 1 && (
                <div className="flex justify-between items-center mt-10">
                  <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="px-6 rounded-xl">Back</Button>
                  <div className="flex items-center gap-3">
                    {step === 7 && !icsImported && (
                      <Button variant="ghost" onClick={handleNext} className="px-6 rounded-xl text-muted-foreground">Skip</Button>
                    )}
                    <Button onClick={handleNext} disabled={!canNext}
                      className="gap-2 gradient-primary text-primary-foreground border-0 h-14 px-8 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-opacity">
                      {step === 7 ? (
                        <><Sparkles className="w-5 h-5" />{icsImported ? "All Done!" : "Finish Setup"}</>
                      ) : (
                        <>Next <ArrowRight className="w-5 h-5" /></>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* On the auth step, show Continue if already authed */}
              {step === 1 && authUser && (
                <div className="flex justify-end mt-10">
                  <Button onClick={() => setStep(2)}
                    className="gap-2 gradient-primary text-primary-foreground border-0 h-14 px-8 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-opacity">
                    Continue <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              )}

            </motion.div>
          ) : (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-16 text-center relative overflow-hidden shadow-2xl">
              <Confetti />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 space-y-4">
                <h1 className="text-4xl font-black text-foreground tracking-tight">You're all set, {name}.</h1>
                <p className="text-muted-foreground text-xl max-w-md mx-auto">I'm ready to help you master your subjects with custom analogies!</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
