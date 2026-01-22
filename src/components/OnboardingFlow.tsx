import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, GraduationCap, MapPin, BookOpen, Heart, User } from "lucide-react";
import { YEAR_LEVELS, STATES, SUBJECTS, INTERESTS, saveStudentProfile, type StudentProfile } from "@/lib/storage";

interface OnboardingFlowProps {
  onComplete: (profile: StudentProfile) => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [state, setState] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const toggleSubject = (value: string) => {
    setSubjects(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  const toggleInterest = (value: string) => {
    setInterests(prev =>
      prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0: return name !== "";
      case 1: return yearLevel !== "";
      case 2: return state !== "";
      case 3: return subjects.length > 0;
      case 4: return interests.length >= 3;
      default: return false;
    }
  };

  const handleComplete = () => {
    const profile: StudentProfile = {
      name,
      yearLevel,
      state,
      subjects,
      interests,
      onboardingComplete: true,
    };
    saveStudentProfile(profile);
    onComplete(profile);
  };

  const steps = [
    {
      icon: User,
      title: "What's your name?",
      subtitle: "I'll personalize your learning experience",
    },
    {
      icon: GraduationCap,
      title: "What year are you in?",
      subtitle: "This helps me match content to your curriculum level",
    },
    {
      icon: MapPin,
      title: "Where do you study?",
      subtitle: "Different states have slightly different syllabuses",
    },
    {
      icon: BookOpen,
      title: "What subjects are you studying?",
      subtitle: "Select all that apply",
    },
    {
      icon: Heart,
      title: "What are your interests?",
      subtitle: "Pick at least 3 — I'll use these to make learning more fun!",
    },
  ];

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="w-full min-h-screen bg-background bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-tertiary/10 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-3xl border-2 border-border shadow-md">
        <CardHeader className="text-center border-b-2 border-border">
          <div className="flex items-center justify-center gap-2 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-12 border-2 border-border transition-colors ${
                  index <= step ? "bg-primary" : "bg-secondary"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 bg-primary border-2 border-border shadow-sm">
              <StepIcon className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{currentStep.title}</CardTitle>
          <p className="text-muted-foreground">{currentStep.subtitle}</p>
        </CardHeader>

        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg p-6 border-2 border-border"
                autoFocus
              />
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {YEAR_LEVELS.map((year) => (
                <button
                  key={year}
                  onClick={() => setYearLevel(year)}
                  className={`p-4 border-2 border-border text-center font-medium transition-all hover:shadow-sm ${
                    yearLevel === year
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card hover:bg-secondary"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {STATES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setState(s.value)}
                  className={`p-4 border-2 border-border text-left transition-all hover:shadow-sm ${
                    state === s.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card hover:bg-secondary"
                  }`}
                >
                  <span className="font-bold">{s.value}</span>
                  <span className="block text-sm opacity-80">{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SUBJECTS.map((subject) => (
                <button
                  key={subject.value}
                  onClick={() => toggleSubject(subject.value)}
                  className={`p-4 border-2 border-border text-center transition-all hover:shadow-sm ${
                    subjects.includes(subject.value)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card hover:bg-secondary"
                  }`}
                >
                  <span className="text-2xl block mb-1">{subject.icon}</span>
                  <span className="font-medium text-sm">{subject.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {interests.length > 0 && (
                  <div className="w-full pb-2 border-b-2 border-border mb-2">
                    <span className="text-sm text-muted-foreground">Selected ({interests.length}):</span>
                  </div>
                )}
                {interests.map((interest) => {
                  const item = INTERESTS.find(i => i.value === interest);
                  return (
                    <Badge
                      key={interest}
                      variant="default"
                      className="cursor-pointer border-2 border-border"
                      onClick={() => toggleInterest(interest)}
                    >
                      {item?.label} ✕
                    </Badge>
                  );
                })}
              </div>
              <div className="space-y-4">
                {Array.from(new Set(INTERESTS.map(i => i.category))).map((category) => (
                  <div key={category}>
                    <h4 className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.filter(i => i.category === category).map((interest) => (
                        <button
                          key={interest.value}
                          onClick={() => toggleInterest(interest.value)}
                          className={`px-3 py-2 border-2 border-border text-sm font-medium transition-all ${
                            interests.includes(interest.value)
                              ? "bg-primary text-primary-foreground"
                              : "bg-card hover:bg-secondary"
                          }`}
                        >
                          {interest.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t-2 border-border">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="border-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="border-2 border-border shadow-sm"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed()}
                className="border-2 border-border shadow-sm bg-accent hover:bg-accent/90"
              >
                Start Learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
