"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, User, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "./ThemeToggle";
import ThemeSelector from "./ThemeSelector";
import { useRouter } from "next/navigation";
import SettingsDialog from "./SettingsDialog";
import { getAIGreeting } from "@/services/groq";
import { HOBBY_OPTIONS, POPULAR_INTERESTS } from "@/utils/interests";

interface HeaderProps {
  userName?: string;
  streak?: number;
}

const SUBJECT_OPTIONS = [
  { id: "math", label: "Mathematics" },
  { id: "biology", label: "Biology" },
  { id: "history", label: "History" },
  { id: "physics", label: "Physics" },
  { id: "chemistry", label: "Chemistry" },
  { id: "english", label: "English" },
  { id: "computing", label: "Computing" },
  { id: "economics", label: "Economics" },
  { id: "business", label: "Business Studies" },
  { id: "commerce", label: "Commerce" },
  { id: "pdhpe", label: "PDHPE" },
  { id: "geography", label: "Geography" },
  { id: "engineering", label: "Engineering" },
  { id: "medicine", label: "Medicine" },
  { id: "languages", label: "Languages" }
];


const Header = ({ userName = "Student", streak = 0 }: HeaderProps) => {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [greeting, setGreeting] = useState(`Welcome back, ${userName}.`);

  useEffect(() => {
    getAIGreeting(userName, streak).then(setGreeting);
  }, [userName, streak]);

  const [profileName, setProfileName] = useState(userName);
  const [profileGrade, setProfileGrade] = useState<string>("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [interestSelections, setInterestSelections] = useState<Record<string, string[]>>({});
  const [customInterest, setCustomInterest] = useState<Record<string, string>>({});

  const loadPreferences = () => {
    let prefs: any = {};
    try {
      prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    } catch {
      prefs = {};
    }

    const hobbyLabelToId = HOBBY_OPTIONS.reduce<Record<string, string>>((acc, hobby) => {
      acc[hobby.label.toLowerCase()] = hobby.id;
      return acc;
    }, {});

    const parsedHobbyDetails: Record<string, string> = { ...(prefs.hobbyDetails || {}) };
    const hobbyIds = Array.isArray(prefs.hobbyIds) ? prefs.hobbyIds : [];
    let derivedHobbyIds = hobbyIds;

    if (Array.isArray(prefs.hobbies)) {
      const parsedIds = prefs.hobbies
        .map((entry: string) => {
          const label = entry.split(" (")[0]?.trim().toLowerCase();
          const id = hobbyLabelToId[label] || "";
          const detail = entry.includes("(") ? entry.split(" (")[1]?.replace(/\)$/, "") : "";
          if (id && detail && !parsedHobbyDetails[id]) parsedHobbyDetails[id] = detail;
          return id;
        })
        .filter(Boolean);
      if (!derivedHobbyIds.length) derivedHobbyIds = parsedIds;
    }

    const detailSelections = HOBBY_OPTIONS.reduce<Record<string, string[]>>((acc, hobby) => {
      const detail = parsedHobbyDetails[hobby.id];
      acc[hobby.id] = detail ? detail.split(",").map((item) => item.trim()).filter(Boolean) : [];
      return acc;
    }, {});

    setProfileName(prefs.name || userName);
    setProfileGrade(prefs.grade || "");
    setSelectedSubjects(Array.isArray(prefs.subjects) ? prefs.subjects : []);
    setSelectedHobbies(derivedHobbyIds);
    setInterestSelections(detailSelections);
    setCustomInterest({});
  };

  useEffect(() => {
    if (showProfile) loadPreferences();
  }, [showProfile]);

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

  const saveProfile = () => {
    let prefs: any = {};
    try {
      prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    } catch {
      prefs = {};
    }

    const nextDetails: Record<string, string> = {};
    selectedHobbies.forEach((id) => {
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

    const hobbiesWithDetails = selectedHobbies.map((id) => {
      const label = HOBBY_OPTIONS.find((h) => h.id === id)?.label || id;
      const detail = nextDetails[id] || "";
      return detail ? `${label} (${detail})` : label;
    });

    const nextPrefs = {
      ...prefs,
      name: profileName.trim() || "Student",
      grade: profileGrade || "",
      subjects: selectedSubjects,
      hobbies: hobbiesWithDetails,
      hobbyIds: selectedHobbies,
      hobbyDetails: nextDetails,
      onboardingComplete: true
    };

    localStorage.setItem("userPreferences", JSON.stringify(nextPrefs));
    window.location.reload();
  };

  return (
    <>
      <motion.header
        className="glass px-6 py-4 mb-6 relative z-50 rounded-2xl shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
          {/* Left: Greeting */}
          <div className="justify-self-start">
            <p className="text-sm text-muted-foreground">
              {greeting}
            </p>
          </div>

          {/* Centered Brand */}
          <motion.h1
            className="text-xl font-bold gradient-text cursor-pointer justify-self-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => router.push("/?force=true")}
          >
            Analogix
          </motion.h1>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4 justify-self-end">
            {/* Settings */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSettings(true)}
              className="text-grey-500 dark:text-grey-400 hover:text-[var(--g-1)] transition-colours"
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Profile */}
            <motion.button
              className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-lg hover:shadow-primary/20 transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowProfile(true)}
            >
              <User className="w-5 h-5 text-primary-foreground" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="grid gap-3">
              <Label>Grade</Label>
              <div className="flex flex-wrap gap-2">
                {["7", "8", "9", "10", "11", "12"].map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setProfileGrade(grade)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      profileGrade === grade
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border glass hover:border-primary/50"
                    }`}
                  >
                    Year {grade}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Subjects</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SUBJECT_OPTIONS.map((subject) => {
                  const isActive = selectedSubjects.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      onClick={() => toggleSubject(subject.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all ${
                        isActive
                          ? "border-primary bg-primary/10 shadow-lg"
                          : "border-border glass hover:border-primary/50"
                      }`}
                    >
                      {subject.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Interests</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HOBBY_OPTIONS.map((hobby) => {
                  const isActive = selectedHobbies.includes(hobby.id);
                  return (
                    <button
                      key={hobby.id}
                      onClick={() => toggleHobby(hobby.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all ${
                        isActive
                          ? "border-primary bg-primary/10 shadow-lg"
                          : "border-border glass hover:border-primary/50"
                      }`}
                    >
                      {hobby.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedHobbies.map((id) => {
              const hobby = HOBBY_OPTIONS.find((h) => h.id === id);
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
                <div key={id} className="grid gap-3">
                  <Label>Popular {label}</Label>
                  <div className="flex flex-wrap gap-2">
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
                  <div className="flex gap-2">
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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowProfile(false)}>
              Cancel
            </Button>
            <Button onClick={saveProfile} className="gradient-primary">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
