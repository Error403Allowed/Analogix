"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User, Check, Pencil, RotateCcw,
  Calculator, Microscope, Landmark, Zap, FlaskConical,
  BookOpen, Cpu, LineChart, Briefcase, Wallet, HeartPulse,
  Globe, Wrench, Stethoscope, Languages,
  Dumbbell, Gamepad2, Music, CookingPot, Palette, Film,
  Leaf, Laptop, Book, Plane, Upload, Trash2,
  Brain, Sparkles, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { achievementStore } from "@/utils/achievementStore";
import { HOBBY_OPTIONS, POPULAR_INTERESTS } from "@/utils/interests";
import type { HobbyId } from "@/utils/interests";
import { AustralianState, STATE_LABELS } from "@/utils/termData";
import { PersonalityEditor } from "@/components/PersonalityEditor";
import { MemoryManager } from "@/components/MemoryManager";


// ── Data ─────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { id: "math",        label: "Mathematics",      Icon: Calculator  },
  { id: "biology",     label: "Biology",           Icon: Microscope  },
  { id: "history",     label: "History",           Icon: Landmark    },
  { id: "physics",     label: "Physics",           Icon: Zap         },
  { id: "chemistry",   label: "Chemistry",         Icon: FlaskConical},
  { id: "english",     label: "English",           Icon: BookOpen    },
  { id: "computing",   label: "Computing",         Icon: Cpu         },
  { id: "economics",   label: "Economics",         Icon: LineChart   },
  { id: "business",    label: "Business Studies",  Icon: Briefcase   },
  { id: "commerce",    label: "Commerce",          Icon: Wallet      },
  { id: "pdhpe",       label: "PDHPE",             Icon: HeartPulse  },
  { id: "geography",   label: "Geography",         Icon: Globe       },
  { id: "engineering", label: "Engineering",       Icon: Wrench      },
  { id: "medicine",    label: "Medicine",          Icon: Stethoscope },
  { id: "languages",   label: "Languages",         Icon: Languages   },
];

const HOBBY_ICONS: Record<string, React.ReactNode> = {
  sports:  <Dumbbell  className="w-4 h-4" />,
  gaming:  <Gamepad2  className="w-4 h-4" />,
  music:   <Music     className="w-4 h-4" />,
  cooking: <CookingPot className="w-4 h-4" />,
  art:     <Palette   className="w-4 h-4" />,
  movies:  <Film      className="w-4 h-4" />,
  nature:  <Leaf      className="w-4 h-4" />,
  tech:    <Laptop    className="w-4 h-4" />,
  reading: <Book      className="w-4 h-4" />,
  travel:  <Plane     className="w-4 h-4" />,
};

const YEARS = ["7", "8", "9", "10", "11", "12"];


// ── Types ─────────────────────────────────────────────────────────────────────

interface Prefs {
  name?: string;
  grade?: string;
  state?: AustralianState;
  subjects?: string[];
  hobbyIds?: string[];
  hobbyDetails?: Record<string, string>;
  hobbies?: string[];
  avatarUrl?: string;
  onboardingComplete?: boolean;
}

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ProfileSheet = ({ open, onOpenChange }: ProfileSheetProps) => {
  const loadPrefs = (): Prefs =>
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [name, setName] = useState(prefs.name || "");
  const [grade, setGrade] = useState(prefs.grade || "");
  const [state, setState] = useState<AustralianState | "">(prefs.state || "");
  const [subjects, setSubjects] = useState<string[]>(prefs.subjects || []);
  const [hobbyIds, setHobbyIds] = useState<string[]>(prefs.hobbyIds || []);
  const [hobbyDetails, setHobbyDetails] = useState<Record<string, string>>(prefs.hobbyDetails || {});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [avatarUrl, setAvatarUrl] = useState(prefs.avatarUrl || "");
  const [editingName, setEditingName] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "personality" | "memory">("profile");

  // Re-sync when sheet opens
  useEffect(() => {
    if (open) {
      const p = loadPrefs();
      setPrefs(p);
      setName(p.name || "");
      setGrade(p.grade || "");
      setState(p.state || "");
      setSubjects(p.subjects || []);
      setHobbyIds(p.hobbyIds || []);
      setHobbyDetails(p.hobbyDetails || {});
      setAvatarUrl(p.avatarUrl || "");
      setCustomInputs({});
      setDirty(false);
      setEditingName(false);
    }
  }, [open]);

  const mark = () => setDirty(true);

  const toggleSubject = (id: string) => {
    setSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    mark();
  };

  const toggleHobby = (id: string) => {
    setHobbyIds(prev => {
      if (prev.includes(id)) {
        setHobbyDetails(d => { const n = { ...d }; delete n[id]; return n; });
        return prev.filter(h => h !== id);
      }
      return [...prev, id];
    });
    mark();
  };

  const toggleInterestItem = (hobbyId: string, item: string) => {
    setHobbyDetails(prev => {
      const current = (prev[hobbyId] || "").split(",").map(s => s.trim()).filter(Boolean);
      const exists = current.some(e => e.toLowerCase() === item.toLowerCase());
      const next = exists ? current.filter(e => e.toLowerCase() !== item.toLowerCase()) : [...current, item];
      return { ...prev, [hobbyId]: next.join(", ") };
    });
    mark();
  };

  const addCustomItem = (hobbyId: string) => {
    const val = (customInputs[hobbyId] || "").trim();
    if (!val) return;
    setHobbyDetails(prev => {
      const current = (prev[hobbyId] || "").split(",").map(s => s.trim()).filter(Boolean);
      if (current.some(e => e.toLowerCase() === val.toLowerCase())) return prev;
      return { ...prev, [hobbyId]: [...current, val].join(", ") };
    });
    setCustomInputs(prev => ({ ...prev, [hobbyId]: "" }));
    mark();
  };

  const readImage = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });

  const loadImageElement = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = src;
    });

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large. Please use a file under 5MB.");
      return;
    }

    try {
      const dataUrl = await readImage(file);
      const img = await loadImageElement(dataUrl);
      const size = Math.min(img.width, img.height);
      const sx = Math.max(0, (img.width - size) / 2);
      const sy = Math.max(0, (img.height - size) / 2);
      const canvas = document.createElement("canvas");
      const target = 256;
      canvas.width = target;
      canvas.height = target;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");
      ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);
      const output = canvas.toDataURL("image/jpeg", 0.85);
      setAvatarUrl(output);
      mark();
    } catch {
      toast.error("Could not process this image.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const handleAvatarRemove = () => {
    setAvatarUrl("");
    mark();
  };

  const handleSave = () => {
    // Build hobbies array (label + details) same format as onboarding
    const hobbiesWithDetails = hobbyIds.map(id => {
      const label = HOBBY_OPTIONS.find(h => h.id === id)?.label || id;
      const detail = hobbyDetails[id] || "";
      return detail ? `${label} (${detail})` : label;
    });

    const next: Prefs = {
      ...prefs,
      name: name.trim(),
      grade,
      state: state || undefined,
      subjects,
      hobbyIds,
      hobbyDetails,
      hobbies: hobbiesWithDetails,
      avatarUrl: avatarUrl || undefined,
      onboardingComplete: true,
    };
    localStorage.setItem("userPreferences", JSON.stringify(next));
    window.dispatchEvent(new Event("userPreferencesUpdated"));
    toast.success("Profile saved!");
    setDirty(false);
    onOpenChange(false);
  };

  const handleReset = () => {
    if (!confirm("This will wipe all your data including achievements. Are you sure?")) return;
    localStorage.clear();
    achievementStore.reset();
    window.location.reload();
  };


  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0 bg-background border-r border-border" aria-describedby="sheet-description">
        <SheetDescription id="sheet-description" className="sr-only">
          Manage your profile settings, AI personality, and memory
        </SheetDescription>
        {/* Tab Navigation - Fixed at top, always visible */}
        <div className="px-6 pt-6 pb-3 border-b border-border shrink-0">
          <div className="flex gap-1.5 mb-4">
            <button
              onClick={() => setActiveTab("profile")}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
                activeTab === "profile"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground/70 border border-border/60 hover:border-primary/30 hover:text-foreground"
              )}
            >
              <UserCircle className="w-3.5 h-3.5" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("personality")}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
                activeTab === "personality"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground/70 border border-border/60 hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Settings
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
                activeTab === "memory"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground/70 border border-border/60 hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Brain className="w-3.5 h-3.5" />
              Memory
            </button>
          </div>
          <SheetTitle className="text-lg font-black tracking-tight">
            {activeTab === "profile" && "Your Profile"}
            {activeTab === "personality" && "AI Personality Settings"}
            {activeTab === "memory" && "AI Memory"}
          </SheetTitle>
        </div>

        {/* Scrollable content area */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5">
            
            {/* Render content based on active tab */}
            {activeTab === "profile" && (
              <div className="space-y-8">

            {/* ── Name ── */}
            <section>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">Profile Photo</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border border-border/60 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground/60" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-2" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-muted-foreground"
                    onClick={handleAvatarRemove}
                    disabled={!avatarUrl}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Remove
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-[10px] text-muted-foreground/60 w-full">
                    JPG/PNG, cropped to a square. Max 5MB.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">Name</Label>
              <div className="flex items-center gap-2">
                {editingName ? (
                  <Input
                    autoFocus
                    value={name}
                    onChange={e => { setName(e.target.value); mark(); }}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={e => e.key === "Enter" && setEditingName(false)}
                    className="h-10 rounded-xl text-sm font-semibold"
                  />
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{name || "—"}</span>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0"
                  onClick={() => setEditingName(e => !e)}>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            </section>

            {/* ── Year ── */}
            <section>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">Year</Label>
              <div className="grid grid-cols-6 gap-2">
                {YEARS.map(y => (
                  <button key={y} onClick={() => { setGrade(y); mark(); }}
                    className={cn(
                      "h-10 rounded-xl text-sm font-black border transition-all",
                      grade === y
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border/80 bg-card/40 text-foreground/80 hover:border-primary/50 hover:text-foreground"
                    )}>
                    {y}
                  </button>
                ))}
              </div>
            </section>

            {/* ── State ── */}
            <section>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">State</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(STATE_LABELS) as [AustralianState, string][]).map(([code]) => (
                  <button key={code} onClick={() => { setState(code); mark(); }}
                    className={cn(
                      "h-10 rounded-xl text-xs font-black border transition-all",
                      state === code
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border/80 bg-card/40 text-foreground/80 hover:border-primary/50 hover:text-foreground"
                    )}>
                    {code}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Subjects ── */}
            <section>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">
                Subjects <span className="text-muted-foreground/40 normal-case font-normal tracking-normal">({subjects.length} selected)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECTS.map(({ id, label, Icon }) => {
                  const active = subjects.includes(id);
                  return (
                    <button key={id} onClick={() => toggleSubject(id)}
                      className={cn(
                        "relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all",
                        active
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border/80 bg-card/40 text-foreground/80 hover:border-primary/50 hover:text-foreground"
                      )}>
                      {active && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </span>
                      )}
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>


            {/* ── Interests ── */}
            <section>
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 block">
                Interests <span className="text-muted-foreground/40 normal-case font-normal tracking-normal">(used for analogies)</span>
              </Label>

              {/* Hobby category toggles */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {HOBBY_OPTIONS.map(({ id, label }) => {
                  const active = hobbyIds.includes(id);
                  return (
                    <button key={id} onClick={() => toggleHobby(id)}
                      className={cn(
                        "relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all",
                        active
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-border/80 bg-card/40 text-foreground/80 hover:border-primary/50 hover:text-foreground"
                      )}>
                      {active && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </span>
                      )}
                      <span className="shrink-0">{HOBBY_ICONS[id]}</span>
                      <span className="text-xs font-bold truncate">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Per-hobby detail chips */}
              <AnimatePresence>
                {hobbyIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {hobbyIds.map(id => {
                      const hobbyLabel = HOBBY_OPTIONS.find(h => h.id === id)?.label || id;
                      const popularItems = POPULAR_INTERESTS[id as HobbyId] || [];
                      const currentDetails = (hobbyDetails[id] || "").split(",").map(s => s.trim()).filter(Boolean);
                      const normalizedPopular = popularItems.map(i => i.toLowerCase());
                      const customItems = currentDetails.filter(i => !normalizedPopular.includes(i.toLowerCase()));
                      const allItems = [...popularItems, ...customItems];

                      return (
                        <div key={id} className="rounded-xl border border-border/80 bg-card/75 p-3">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <span className="text-primary">{HOBBY_ICONS[id]}</span>
                            <span className="text-xs font-black uppercase tracking-wider text-foreground">{hobbyLabel}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {allItems.map(item => {
                              const active = currentDetails.some(e => e.toLowerCase() === item.toLowerCase());
                              const isCustom = !normalizedPopular.includes(item.toLowerCase());
                              return (
                                <button key={item} onClick={() => toggleInterestItem(id, item)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                                    active
                                      ? "bg-primary/12 border-primary text-primary"
                                      : "border-border/80 bg-card/50 text-foreground/80 hover:border-primary/40 hover:text-foreground",
                                    isCustom && "border-dashed"
                                  )}>
                                  {item}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex gap-1.5">
                            <Input
                              value={customInputs[id] || ""}
                              onChange={e => setCustomInputs(prev => ({ ...prev, [id]: e.target.value }))}
                              placeholder={`Add your fave ${hobbyLabel.toLowerCase()}...`}
                              className="h-8 text-xs rounded-lg bg-background/90 border-border/80 placeholder:text-foreground/50"
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomItem(id); } }}
                            />
                            <Button type="button" variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs shrink-0 border-border/80 bg-card/40 hover:bg-card/70"
                              onClick={() => addCustomItem(id)}>
                              Add
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* ── Danger Zone ── */}
            <section className="border-t border-border pt-6">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/70 mb-3 block">Danger Zone</Label>
              <Button variant="destructive" size="sm" className="w-full rounded-xl" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                Reset All Data
              </Button>
            </section>

              </div>
            )}

            {/* Personality Tab */}
            {activeTab === "personality" && (
              <div className="h-full">
                <PersonalityEditor onClose={() => setActiveTab("profile")} />
              </div>
            )}

            {/* Memory Tab */}
            {activeTab === "memory" && (
              <div className="h-full">
                <MemoryManager onClose={() => setActiveTab("profile")} />
              </div>
            )}

          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        {activeTab === "profile" && (
          <div className="px-6 py-4 border-t border-border shrink-0 flex gap-2">
            <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl gradient-primary text-primary-foreground border-0"
              onClick={handleSave}
              disabled={!dirty}
            >
              Save Changes
            </Button>
          </div>
        )}

      </SheetContent>
    </Sheet>
  );
};

export default ProfileSheet;
