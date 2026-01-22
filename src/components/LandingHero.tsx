import ParticlesBackground from './ParticlesBackground';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Sparkles, BookOpen, Target, Brain, ArrowRight } from "lucide-react";
import { Analytics } from "@vercel/analytics/next"

interface LandingHeroProps {
  onGetStarted: () => void;
}

export const LandingHero = ({ onGetStarted }: LandingHeroProps) => {
  const features = [
    {
      icon: Brain,
      title: "Personalised Analogies",
      description: "Learn physics through Formula 1, maths through Minecraft, or history through your favourite movies.",
    },
    {
      icon: Target,
      title: "Curriculum Aligned",
      description: "All content follows ACARA and state-specific syllabuses. Perfect for NAPLAN, HSC, and VCE prep.",
    },
    {
      icon: BookOpen,
      title: "Exam Ready",
      description: "Every explanation includes exam-style practice questions and common pitfalls to avoid.",
    },
  ];

  const subjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "History",
    "Geography",
  ];

  return (
    <div className="w-full min-h-screen bg-background relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/5 via-background to-tertiary/5">
      <ParticlesBackground />
      {/* Navigation */}
      <nav className="w-full border-b-2 border-border bg-card">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary border-2 border-border shadow-xs">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Analogix</span>
          </div>
          <Button onClick={onGetStarted} className="border-2 border-border shadow-sm">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge variant="secondary" className="mb-6 border-2 border-border px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Powered Learning for Australian Students
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Learn Any Subject Through
              <span className="block text-primary">Your Interests</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Analogix uses AI to explain curriculum concepts using analogies from
              what you love — whether it's gaming, sports, music, or anything else.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="text-lg px-8 border-2 border-border shadow-md hover:shadow-sm transition-shadow"
              >
                Start Learning Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Subject Pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-16">
            {subjects.map((subject) => (
              <Badge
                key={subject}
                variant="outline"
                className="px-4 py-2 text-sm border-2"
              >
                {subject}
              </Badge>
            ))}
          </div>

          {/* Demo Card */}
          <Card className="max-w-2xl mx-auto border-2 border-border shadow-md overflow-hidden">
            <div className="bg-secondary border-b-2 border-border p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-destructive border border-border"></div>
                <div className="h-3 w-3 bg-accent border border-border"></div>
                <div className="h-3 w-3 bg-primary border border-border"></div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground px-4 py-2 border-2 border-border max-w-xs">
                  <p className="text-sm">Explain Newton's Second Law using Formula 1</p>
                </div>
              </div>
              <div className="bg-card border-2 border-border p-4 max-w-md">
                <p className="text-sm mb-3">
                  <strong>📚 Official Definition:</strong> Force = Mass × Acceleration
                </p>
                <p className="text-sm mb-3">
                  <strong>🏎️ F1 Analogy:</strong> Imagine an F1 car on the starting grid.
                  The engine's thrust is the <em>force</em>, the car's weight is the <em>mass</em>,
                  and how quickly it speeds up is the <em>acceleration</em>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Just like a heavier F1 car needs a more powerful engine to accelerate as fast...
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-secondary border-t-2 border-b-2 border-border">
        <div className="w-full max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How Analogix Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="p-6 border-2 border-border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="p-3 bg-primary border-2 border-border inline-block mb-4 shadow-xs">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Learn Smarter?</h2>
          <p className="text-muted-foreground mb-8">
            Set up your profile in 60 seconds and start getting personalised explanations.
          </p>
          <Button
            size="lg"
            onClick={onGetStarted}
            className="text-lg px-8 border-2 border-border shadow-md"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t-2 border-border bg-card py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary border-2 border-border">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">Analogix</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for Australian students, Years 7–12
          </p>
        </div>
      </footer>
    </div>
  );
};
