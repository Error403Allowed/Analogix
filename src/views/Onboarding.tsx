"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Sparkles,
  User,
  Calculator,
  Microscope,
  Landmark,
  Zap,
  FlaskConical,
  BookOpen,
  Cpu,
  LineChart,
  Briefcase,
  Wallet,
  HeartPulse,
  Globe,
  Wrench,
  Stethoscope,
  Languages,
  Dumbbell,
  Gamepad2,
  Music,
  CookingPot,
  Palette,
  Film,
  Leaf,
  Laptop,
  Book,
  Plane,
  CalendarDays,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import Confetti from "@/components/Confetti";
import { achievementStore } from "@/utils/achievementStore";
import { HOBBY_OPTIONS, POPULAR_INTERESTS } from "@/utils/interests";
import { parseICS } from "@/utils/icsParser";
import { eventStore } from "@/utils/eventStore";

// Cool typewriter animation component for Quizzy
const TypewriterText = ({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let charIndex = 0;

    const startTyping = () => {
      const typeNextChar = () => {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1));
          charIndex++;
          // Variable speed for more natural feel
          const char = text[charIndex - 1];
          const speed = char === " " ? 30 : char === "." || char === "!" || char === "?" ? 150 : 50;
          timeoutId = setTimeout(typeNextChar, speed);
        } else {
          setIsComplete(true);
        }
      };
      typeNextChar();
    };

    timeoutId = setTimeout(startTyping, delay);
    return () => clearTimeout(timeoutId);
  }, [text, delay]);

  // Blinking cursor effect
  useEffect(() => {
    if (!isComplete) return;
    const cursorInterval = setInterval(() => setShowCursor(prev => !prev), 530);
    const hideCursor = setTimeout(() => {
      setShowCursor(false);
      clearInterval(cursorInterval);
    }, 3000);
    return () => {
      clearInterval(cursorInterval);
      clearTimeout(hideCursor);
    };
  }, [isComplete]);

  return (
    <span className={className}>
      {displayedText}
      <motion.span
        animate={{ opacity: showCursor ? 1 : 0 }}
        transition={{ duration: 0.1 }}
        className="inline-block w-[3px] h-[1em] ml-0.5 bg-primary align-middle rounded-sm"
        style={{ verticalAlign: "text-bottom" }}
      />
    </span>
  );
};

const subjects = [
  { id: "math", icon: <Calculator className="w-6 h-6" />, label: "Mathematics", description: "Numbers, algebra, geometry" },
  { id: "biology", icon: <Microscope className="w-6 h-6" />, label: "Biology", description: "Life, cells, nature" },
  { id: "history", icon: <Landmark className="w-6 h-6" />, label: "History", description: "Past events, cultures" },
  { id: "physics", icon: <Zap className="w-6 h-6" />, label: "Physics", description: "Matter, energy, forces" },
  { id: "chemistry", icon: <FlaskConical className="w-6 h-6" />, label: "Chemistry", description: "Elements, reactions" },
  { id: "english", icon: <BookOpen className="w-6 h-6" />, label: "English", description: "Reading, writing, speaking" },
  { id: "computing", icon: <Cpu className="w-6 h-6" />, label: "Computing", description: "Coding, hardware, software" },
  { id: "economics", icon: <LineChart className="w-6 h-6" />, label: "Economics", description: "Supply, demand, markets" },
  { id: "business", icon: <Briefcase className="w-6 h-6" />, label: "Business Studies", description: "Management, strategy, startups" },
  { id: "commerce", icon: <Wallet className="w-6 h-6" />, label: "Commerce", description: "Trade, finance, accounting" },
  { id: "pdhpe", icon: <HeartPulse className="w-6 h-6" />, label: "PDHPE", description: "Health, fitness, well-being" },
  { id: "geography", icon: <Globe className="w-6 h-6" />, label: "Geography", description: "World, maps, environment" },
  { id: "engineering", icon: <Wrench className="w-6 h-6" />, label: "Engineering", description: "Design, mechanics, innovation" },
  { id: "medicine", icon: <Stethoscope className="w-6 h-6" />, label: "Medicine", description: "Anatomy, health, diagnosis" },
  { id: "languages", icon: <Languages className="w-6 h-6" />, label: "Languages", description: "Vocabulary, grammar, fluency" },
];

const hobbyIcons: Record<string, JSX.Element> = {
  sports: <Dumbbell className="w-6 h-6" />,
  gaming: <Gamepad2 className="w-6 h-6" />,
  music: <Music className="w-6 h-6" />,
  cooking: <CookingPot className="w-6 h-6" />,
  art: <Palette className="w-6 h-6" />,
  movies: <Film className="w-6 h-6" />,
  nature: <Leaf className="w-6 h-6" />,
  tech: <Laptop className="w-6 h-6" />,
  reading: <Book className="w-6 h-6" />,
  travel: <Plane className="w-6 h-6" />
};

const hobbies = HOBBY_OPTIONS.map((hobby) => ({
  ...hobby,
  icon: hobbyIcons[hobby.id]
}));

// ── ICS import step ──────────────────────────────────────────────────────────
interface IcsStepProps {
  importing: boolean;
  imported: boolean;
  count: number;
  error: string | null;
  onFile: (file: File) => void;
}

function IcsStep({ importing, imported, count, error, onFile }: IcsStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">One last thing.</h1>
        <p className="text-muted-foreground text-lg mt-1">
          Got a school timetable or exam schedule as a calendar file? Import it and it'll show up on your dashboard.
        </p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 text-center transition-all cursor-pointer select-none
          ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50"}
          ${imported ? "border-green-500/60 bg-green-500/5" : ""}
        `}
        onClick={() => !imported && !importing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".ics"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />

        {imported ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="font-black text-foreground text-lg">Imported {count} event{count !== 1 ? "s" : ""}!</p>
              <p className="text-sm text-muted-foreground mt-1">Your calendar is ready to go.</p>
            </div>
          </>
        ) : importing ? (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <CalendarDays className="w-8 h-8 text-primary" />
            </div>
            <p className="font-bold text-muted-foreground">Reading calendar…</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-black text-foreground">Drop your .ics file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span>Google Calendar</span>
              <span>·</span>
              <span>Outlook</span>
              <span>·</span>
              <span>Apple Calendar</span>
              <span>·</span>
              <span>Any .ics file</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive font-bold text-center">{error}</p>
      )}

      <p className="text-xs text-muted-foreground text-center">
        This is completely optional — you can always import from the Calendar page later.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const Onboarding = () => {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [interestSelections, setInterestSelections] = useState<Record<string, string[]>>({});
  const [customInterest, setCustomInterest] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  // ICS import step state
  const [icsImporting, setIcsImporting] = useState(false);
  const [icsImported, setIcsImported] = useState(false);
  const [icsCount, setIcsCount] = useState(0);
  const [icsError, setIcsError] = useState<string | null>(null);

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleHobby = (id: string) => {
    setSelectedHobbies((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((h) => h !== id);
        setInterestSelections((details) => {
          const updated = { ...details };
          delete updated[id];
          return updated;
        });
        setCustomInterest((details) => {
          const updated = { ...details };
          delete updated[id];
          return updated;
        });
        return next;
      }
      return [...prev, id];
    });
  };

  const toggleInterestItem = (id: string, item: string) => {
    setInterestSelections((prev) => {
      const current = prev[id] || [];
      const exists = current.some((entry) => entry.toLowerCase() === item.toLowerCase());
      const next = exists
        ? current.filter((entry) => entry.toLowerCase() !== item.toLowerCase())
        : [...current, item];
      return { ...prev, [id]: next };
    });
  };

  const addCustomInterest = (id: string) => {
    const trimmed = (customInterest[id] || "").trim();
    if (!trimmed) return;
    setInterestSelections((prev) => {
      const current = prev[id] || [];
      const exists = current.some((entry) => entry.toLowerCase() === trimmed.toLowerCase());
      if (exists) return prev;
      return { ...prev, [id]: [...current, trimmed] };
    });
    setCustomInterest((prev) => ({ ...prev, [id]: "" }));
  };

  const buildHobbyDetails = (hobbyIds: string[]) => {
    const nextDetails: Record<string, string> = {};
    hobbyIds.forEach((id) => {
      const merged = [
        ...(interestSelections[id] || []),
        (customInterest[id] || "").trim()
      ].filter(Boolean);
      const unique = merged.filter(
        (item, index, self) =>
          index === self.findIndex((entry) => entry.toLowerCase() === item.toLowerCase())
      );
      const detail = unique.join(", ").trim();
      if (detail) nextDetails[id] = detail;
    });
    return nextDetails;
  };

  const savePreferences = (hobbyIds: string[], hobbyDetails: Record<string, string>) => {
    const hobbiesWithDetails = hobbyIds.map((id) => {
      const label = HOBBY_OPTIONS.find((hobby) => hobby.id === id)?.label || id;
      const detail = hobbyDetails[id] || "";
      return detail ? `${label} (${detail})` : label;
    });
    localStorage.setItem("userPreferences", JSON.stringify({
      name: name.trim(),
      grade: grade,
      subjects: selectedSubjects,
      hobbies: hobbiesWithDetails,
      hobbyIds,
      hobbyDetails,
      onboardingComplete: true,
    }));
    achievementStore.unlock("start_1");
    if (name.trim().toLowerCase() !== "student") {
      achievementStore.unlock("start_2");
    }
  };

  const handleIcsFile = async (file: File) => {
    if (!file.name.endsWith(".ics")) {
      setIcsError("Please upload a .ics file");
      return;
    }
    setIcsError(null);
    setIcsImporting(true);
    try {
      const events = await parseICS(file);
      if (events.length === 0) {
        setIcsError("No events found in that file");
        return;
      }
      eventStore.addMultiple(events);
      setIcsCount(events.length);
      setIcsImported(true);
    } catch {
      setIcsError("Couldn't parse that calendar file. Try exporting it again.");
    } finally {
      setIcsImporting(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && name.trim()) {
      setStep(2);
    } else if (step === 2 && grade) {
      setStep(3);
    } else if (step === 3 && selectedSubjects.length > 0) {
      setStep(4);
    } else if (step === 4 && selectedHobbies.length > 0) {
      // Save preferences now, then move to ICS step
      const hobbyDetails = buildHobbyDetails(selectedHobbies);
      savePreferences(selectedHobbies, hobbyDetails);
      setStep(5);
    } else if (step === 5) {
      // ICS step complete (whether they imported or skipped)
      setIsComplete(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="liquid-blob w-96 h-96 bg-primary/20 -top-48 -left-48 fixed" />
      <div className="liquid-blob w-80 h-80 bg-accent/20 bottom-20 right-10 fixed" style={{ animationDelay: '-3s' }} />

      <motion.div
        className="w-full max-w-2xl relative z-10"
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
              className="glass-card p-8 md:p-10 shadow-2xl border-white/20"
            >
              <div className="flex items-center gap-2 mb-10">
                <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 1 ? 'gradient-primary' : 'bg-muted'}`} />
                <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 2 ? 'gradient-primary' : 'bg-muted'}`} />
                <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 3 ? 'gradient-primary' : 'bg-muted'}`} />
                <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 4 ? 'gradient-primary' : 'bg-muted'}`} />
                <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 5 ? 'gradient-primary' : 'bg-muted'}`} />
              </div>

              {step === 1 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <div>
                      <h1 className="text-3xl font-black text-foreground tracking-tight">
                        <TypewriterText text="Hi there! I'm Quizzy." delay={300} />
                      </h1>
                      <p className="text-muted-foreground text-lg">
                        <TypewriterText text="What should I call you?" delay={1200} />
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      autoFocus
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-12 h-14 text-xl glass border-2 focus:border-primary transition-all rounded-2xl"
                      onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <div>
                      <h1 className="text-3xl font-black text-foreground tracking-tight">
                        What year are you in?
                      </h1>
                      <p className="text-muted-foreground text-lg">
                        I'll tailor the difficulty to your level.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {["7", "8", "9", "10", "11", "12"].map((y) => (
                      <motion.button
                        key={y}
                        onClick={() => setGrade(y)}
                        className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 group ${
                          grade === y
                            ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                            : "border-border glass hover:border-primary/50"
                        }`}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Year</span>
                        <span className="text-4xl font-black text-foreground group-hover:scale-110 transition-transform">{y}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <div>
                      <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Nice to meet you, {name}!
                      </h1>
                      <p className="text-muted-foreground text-lg">
                        Which subjects are we tackling today?
                      </p>
                    </div>
                  </div>

                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {subjects.map((subject) => (
                      <motion.button
                        key={subject.id}
                        variants={itemVariants}
                        onClick={() => toggleSubject(subject.id)}
                        className={`relative p-5 rounded-2xl border-2 transition-all text-left group ${
                          selectedSubjects.includes(subject.id)
                            ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                            : "border-border glass hover:border-primary/50"
                        }`}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {selectedSubjects.includes(subject.id) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg"
                          >
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}
                        <span className="mb-3 block text-primary group-hover:scale-110 transition-transform">{subject.icon}</span>
                        <div className="font-bold text-foreground">{subject.label}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 opacity-70 group-hover:opacity-100">{subject.description}</div>
                      </motion.button>
                    ))}
                  </motion.div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <div>
                      <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Almost there!
                      </h1>
                      <p className="text-muted-foreground text-lg">
                        Tell me about your interests for analogies.
                      </p>
                    </div>
                  </div>

                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {hobbies.map((hobby) => (
                      <motion.button
                        key={hobby.id}
                        variants={itemVariants}
                        onClick={() => toggleHobby(hobby.id)}
                        className={`relative p-5 rounded-2xl border-2 transition-all group ${
                          selectedHobbies.includes(hobby.id)
                            ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                            : "border-border glass hover:border-primary/50"
                        }`}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {selectedHobbies.includes(hobby.id) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg"
                          >
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}
                        <span className="mb-3 block text-primary group-hover:scale-110 transition-transform">{hobby.icon}</span>
                        <span className="text-sm font-bold text-foreground">{hobby.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>

                  {selectedHobbies.length > 0 && (
                    <div className="space-y-4">
                      {selectedHobbies.map((id) => {
                        const hobby = hobbies.find((item) => item.id === id);
                        const label = hobby?.label || id;
                        const popularItems = POPULAR_INTERESTS[id as keyof typeof POPULAR_INTERESTS] || [];
                        const selections = interestSelections[id] || [];
                        const normalizedPopular = popularItems.map((item) => item.toLowerCase());
                        const customItems = selections.filter(
                          (item) => !normalizedPopular.includes(item.toLowerCase())
                        );
                        const displayItems = [...popularItems, ...customItems];
                        const customValue = customInterest[id] || "";

                        return (
                          <div key={id} className="glass p-4 rounded-2xl border border-white/10">
                            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                              <span className="text-primary">{hobby?.icon}</span>
                              <span>Popular {label}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {displayItems.map((item) => {
                                const isActive = selections.some(
                                  (entry) => entry.toLowerCase() === item.toLowerCase()
                                );
                                const isCustom = !normalizedPopular.includes(item.toLowerCase());
                                return (
                                  <button
                                    key={item}
                                    onClick={() => toggleInterestItem(id, item)}
                                    className={`px-3 py-2 rounded-full border text-xs font-bold transition-all ${
                                      isActive
                                        ? "border-primary bg-primary/10 shadow-lg"
                                        : "border-border glass hover:border-primary/50"
                                    } ${isCustom ? "border-dashed" : ""}`}
                                  >
                                    <span className="whitespace-nowrap">
                                      {item}
                                      {isCustom && (
                                        <span className="ml-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                                          Custom
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Input
                                value={customValue}
                                onChange={(e) =>
                                  setCustomInterest((prev) => ({ ...prev, [id]: e.target.value }))
                                }
                                placeholder={`Add your favourite ${label.toLowerCase()}...`}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addCustomInterest(id);
                                  }
                                }}
                              />
                              <Button type="button" variant="outline" onClick={() => addCustomInterest(id)}>
                                Add
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <IcsStep
                  importing={icsImporting}
                  imported={icsImported}
                  count={icsCount}
                  error={icsError}
                  onFile={handleIcsFile}
                />
              )}

              <div className="flex justify-between items-center mt-10">
                {step > 1 ? (
                  <Button variant="ghost" onClick={() => setStep(step - 1)} className="px-6 rounded-xl">
                    Back
                  </Button>
                ) : <div />}
                <div className="flex items-center gap-3">
                  {step === 5 && !icsImported && (
                    <Button
                      variant="ghost"
                      onClick={handleNext}
                      className="px-6 rounded-xl text-muted-foreground"
                    >
                      Skip
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    disabled={
                      (step === 1 && !name.trim()) ||
                      (step === 2 && !grade) ||
                      (step === 3 && selectedSubjects.length === 0) ||
                      (step === 4 && selectedHobbies.length === 0) ||
                      (step === 5 && icsImporting)
                    }
                    className="gap-2 gradient-primary text-primary-foreground border-0 h-14 px-8 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-opacity"
                  >
                    {step === 5 ? (
                      <>
                        <Sparkles className="w-5 h-5" />
                        {icsImported ? "All Done!" : "Finish Setup"}
                      </>
                    ) : step === 4 ? (
                      <>
                        Next
                        <ArrowRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-16 text-center relative overflow-hidden shadow-2xl"
            >
              <Confetti />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 space-y-4"
              >
                <h1 className="text-4xl font-black text-foreground tracking-tight">
                  You're all set, {name}.
                </h1>
                <p className="text-muted-foreground text-xl max-w-md mx-auto">
                  I'm ready to help you master your subjects with custom analogies!
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
