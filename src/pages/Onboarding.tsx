import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/Confetti";

const subjects = [
  { id: "math", emoji: "🔢", label: "Mathematics", description: "Numbers, algebra, geometry" },
  { id: "biology", emoji: "🧬", label: "Biology", description: "Life, cells, nature" },
  { id: "history", emoji: "📜", label: "History", description: "Past events, cultures" },
  { id: "physics", emoji: "⚡", label: "Physics", description: "Matter, energy, forces" },
  { id: "chemistry", emoji: "🧪", label: "Chemistry", description: "Elements, reactions" },
  { id: "literature", emoji: "📚", label: "Literature", description: "Books, poetry, stories" },
  { id: "computing", emoji: "💻", label: "Computing", description: "Coding, hardware, software" },
  { id: "economics", emoji: "📈", label: "Economics", description: "Supply, demand, markets" },
  { id: "business", emoji: "💼", label: "Business Studies", description: "Management, strategy, startups" },
  { id: "commerce", emoji: "💰", label: "Commerce", description: "Trade, finance, accounting" },
];

const hobbies = [
  { id: "sports", emoji: "⚽", label: "Sports" },
  { id: "gaming", emoji: "🎮", label: "Gaming" },
  { id: "music", emoji: "🎵", label: "Music" },
  { id: "cooking", emoji: "🍳", label: "Cooking" },
  { id: "art", emoji: "🎨", label: "Art & Design" },
  { id: "movies", emoji: "🎬", label: "Movies & TV" },
  { id: "nature", emoji: "🌿", label: "Nature" },
  { id: "tech", emoji: "💻", label: "Technology" },
  { id: "reading", emoji: "📚", label: "Reading" },
  { id: "travel", emoji: "✈️", label: "Travel" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleHobby = (id: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step === 1 && name.trim()) {
      setStep(2);
    } else if (step === 2 && selectedSubjects.length > 0) {
      setStep(3);
    } else if (step === 3 && selectedHobbies.length > 0) {
      setIsComplete(true);
      
      localStorage.setItem("userPreferences", JSON.stringify({
        name: name.trim(),
        subjects: selectedSubjects,
        hobbies: selectedHobbies,
        onboardingComplete: true
      }));
      
      setTimeout(() => navigate("/dashboard"), 2500);
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
              </div>

              {step === 1 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <Mascot size="md" mood="happy" />
                    <div>
                      <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Hi there! I'm Quizzy.
                      </h1>
                      <p className="text-muted-foreground text-lg">
                        What should I call you?
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
                    <Mascot size="md" mood="excited" />
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
                        <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">{subject.emoji}</span>
                        <div className="font-bold text-foreground">{subject.label}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 opacity-70 group-hover:opacity-100">{subject.description}</div>
                      </motion.button>
                    ))}
                  </motion.div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="flex items-center gap-5">
                    <Mascot size="md" mood="excited" />
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
                        <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">{hobby.emoji}</span>
                        <span className="text-sm font-bold text-foreground">{hobby.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                </div>
              )}

              <div className="flex justify-between items-center mt-10">
                {step > 1 ? (
                  <Button variant="ghost" onClick={() => setStep(step - 1)} className="px-6 rounded-xl">
                    Back
                  </Button>
                ) : <div />}
                <Button
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !name.trim()) ||
                    (step === 2 && selectedSubjects.length === 0) ||
                    (step === 3 && selectedHobbies.length === 0)
                  }
                  className="gap-2 gradient-primary text-primary-foreground border-0 h-14 px-8 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-opacity"
                >
                  {step === 3 ? (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Finish Setup
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
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
              <Mascot size="lg" mood="celebrating" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 space-y-4"
              >
                <h1 className="text-4xl font-black text-foreground tracking-tight">
                  You're all set, {name}! 🎉
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
