import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Mascot from "@/components/Mascot";
import Confetti from "@/components/Confetti";

const hobbies = [
  { id: "sports", emoji: "⚽", label: "Sports", examples: "Football, basketball, running" },
  { id: "gaming", emoji: "🎮", label: "Gaming", examples: "Video games, strategy, puzzles" },
  { id: "music", emoji: "🎵", label: "Music", examples: "Playing, listening, concerts" },
  { id: "cooking", emoji: "🍳", label: "Cooking", examples: "Recipes, baking, food" },
  { id: "art", emoji: "🎨", label: "Art & Design", examples: "Drawing, painting, crafts" },
  { id: "movies", emoji: "🎬", label: "Movies & TV", examples: "Films, shows, anime" },
  { id: "nature", emoji: "🌿", label: "Nature", examples: "Hiking, gardening, animals" },
  { id: "tech", emoji: "💻", label: "Technology", examples: "Coding, gadgets, AI" },
  { id: "reading", emoji: "📚", label: "Reading", examples: "Books, comics, stories" },
  { id: "travel", emoji: "✈️", label: "Travel", examples: "Exploring, cultures, adventure" },
];

const learningStyles = [
  { 
    id: "visual", 
    emoji: "👁️", 
    label: "Visual Learner", 
    description: "I learn best with images, diagrams, and videos",
    color: "from-primary/20 to-primary/5"
  },
  { 
    id: "hands-on", 
    emoji: "🖐️", 
    label: "Hands-On Learner", 
    description: "I learn by doing, practicing, and experimenting",
    color: "from-success/20 to-success/5"
  },
  { 
    id: "story", 
    emoji: "📖", 
    label: "Story-Based Learner", 
    description: "I learn through narratives, examples, and analogies",
    color: "from-accent/20 to-accent/5"
  },
  { 
    id: "logical", 
    emoji: "🧩", 
    label: "Logical Learner", 
    description: "I learn by understanding patterns and reasoning",
    color: "from-warning/20 to-warning/5"
  },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const toggleHobby = (id: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step === 1 && selectedHobbies.length > 0) {
      setStep(2);
    } else if (step === 2 && selectedStyle) {
      setIsComplete(true);
      // Save preferences to localStorage (mock persistence)
      localStorage.setItem("userPreferences", JSON.stringify({
        hobbies: selectedHobbies,
        learningStyle: selectedStyle,
        onboardingComplete: true
      }));
      setTimeout(() => navigate("/"), 2500);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="liquid-blob w-96 h-96 bg-primary/20 -top-48 -left-48 fixed" />
      <div className="liquid-blob w-80 h-80 bg-accent/20 bottom-20 right-10 fixed" style={{ animationDelay: '-3s' }} />

      <motion.div
        className="w-full max-w-2xl"
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
              className="glass-card p-8"
            >
              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-8">
                <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'gradient-primary' : 'bg-muted'}`} />
                <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'gradient-primary' : 'bg-muted'}`} />
              </div>

              {step === 1 && (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <Mascot size="md" mood="excited" />
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">
                        Hey there! I'm Quizzy! 🎉
                      </h1>
                      <p className="text-muted-foreground">
                        Tell me about your interests so I can create <span className="text-primary font-medium">analogies</span> that click!
                      </p>
                    </div>
                  </div>

                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    What are you into? <span className="text-muted-foreground font-normal">(Pick at least 2)</span>
                  </h2>

                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {hobbies.map((hobby) => (
                      <motion.button
                        key={hobby.id}
                        variants={itemVariants}
                        onClick={() => toggleHobby(hobby.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          selectedHobbies.includes(hobby.id)
                            ? "border-primary bg-primary/10 shadow-md"
                            : "border-border glass hover:border-primary/50"
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {selectedHobbies.includes(hobby.id) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}
                        <span className="text-3xl mb-2 block">{hobby.emoji}</span>
                        <span className="text-sm font-medium text-foreground">{hobby.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <Mascot size="md" mood="thinking" />
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">
                        How do you learn best? 🧠
                      </h1>
                      <p className="text-muted-foreground">
                        This helps me explain things in a way that sticks!
                      </p>
                    </div>
                  </div>

                  <motion.div
                    className="grid gap-4 mb-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {learningStyles.map((style) => (
                      <motion.button
                        key={style.id}
                        variants={itemVariants}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`relative p-5 rounded-xl border-2 text-left transition-all bg-gradient-to-r ${style.color} ${
                          selectedStyle === style.id
                            ? "border-primary shadow-lg"
                            : "border-border hover:border-primary/50"
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {selectedStyle === style.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{style.emoji}</span>
                          <div>
                            <h3 className="font-semibold text-foreground">{style.label}</h3>
                            <p className="text-sm text-muted-foreground">{style.description}</p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}

              <div className="flex justify-between items-center">
                {step > 1 && (
                  <Button variant="ghost" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  onClick={handleNext}
                  disabled={(step === 1 && selectedHobbies.length < 2) || (step === 2 && !selectedStyle)}
                  className="gap-2 gradient-primary text-primary-foreground border-0"
                >
                  {step === 2 ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Let's Go!
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4" />
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
              className="glass-card p-12 text-center relative overflow-hidden"
            >
              <Confetti />
              <Mascot size="lg" mood="celebrating" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  You're all set! 🎉
                </h1>
                <p className="text-muted-foreground">
                  Get ready for personalized analogies that make learning fun!
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
