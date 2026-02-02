import { useState } from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Trophy, 
  Target, 
  Zap, 
  Plus,
  ChevronRight,
  TrendingUp,
  MessageCircle,
  Sparkles,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Mascot from "@/components/Mascot";
import CountdownTimer from "@/components/CountdownTimer";
import SubjectCard from "@/components/SubjectCard";
import StatsCard from "@/components/StatsCard";
import AchievementBadge from "@/components/AchievementBadge";
import MoodCheck from "@/components/MoodCheck";
import QuizCreator from "@/components/QuizCreator";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [showMoodCheck, setShowMoodCheck] = useState(true);
  const [showQuizCreator, setShowQuizCreator] = useState(false);

  // Check if user has completed onboarding
  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const hasCompletedOnboarding = userPrefs.onboardingComplete;

  // Mock data
  const subjects = [
    { id: 1, name: "Mathematics", icon: "🔢", progress: 75, quizCount: 12, streak: 5 },
    { id: 2, name: "Biology", icon: "🧬", progress: 45, quizCount: 8, streak: 0 },
    { id: 3, name: "History", icon: "📜", progress: 90, quizCount: 15, streak: 3 },
    { id: 4, name: "Physics", icon: "⚡", progress: 60, quizCount: 10, streak: 2 },
  ];

  const upcomingExams = [
    { 
      id: 1, 
      name: "Mid-Term Exam", 
      subject: "Mathematics",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      icon: "🔢"
    },
    { 
      id: 2, 
      name: "Chapter Test", 
      subject: "Biology",
      date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      icon: "🧬"
    },
  ];

  const achievements = [
    { id: 1, icon: "🏆", title: "Quiz Master", description: "Complete 10 quizzes", isUnlocked: true, isNew: false },
    { id: 2, icon: "🔥", title: "On Fire!", description: "7-day streak", isUnlocked: true, isNew: true },
    { id: 3, icon: "🎯", title: "Sharpshooter", description: "100% on any quiz", isUnlocked: true, isNew: false },
    { id: 4, icon: "🌟", title: "Rising Star", description: "Improve by 20%", isUnlocked: false },
    { id: 5, icon: "📚", title: "Bookworm", description: "Study 5 subjects", isUnlocked: false },
    { id: 6, icon: "💎", title: "Diamond", description: "30-day streak", isUnlocked: false },
  ];

  const handleMoodSelect = (mood: string) => {
    console.log("Mood selected:", mood);
    setShowMoodCheck(false);
  };

  const handleCreateQuiz = (content: string) => {
    console.log("Creating quiz from:", content);
    navigate("/quiz");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen pb-8 relative overflow-hidden">
      {/* Decorative liquid blobs */}
      <div className="liquid-blob w-96 h-96 bg-primary/30 -top-48 -left-48 fixed" />
      <div className="liquid-blob w-80 h-80 bg-secondary/30 top-1/3 -right-40 fixed" style={{ animationDelay: '-2s' }} />
      <div className="liquid-blob w-64 h-64 bg-accent/20 bottom-20 left-1/4 fixed" style={{ animationDelay: '-4s' }} />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-6 relative z-10">
        <Header userName="Student" streak={7} />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* Onboarding CTA if not completed */}
          {!hasCompletedOnboarding && (
            <motion.div
              variants={itemVariants}
              className="glass-card p-5 border-l-4 border-accent"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <Sparkles className="w-8 h-8 text-accent" />
                  <div>
                    <h3 className="font-bold text-foreground">Personalize Your Experience!</h3>
                    <p className="text-sm text-muted-foreground">
                      Tell us your interests so we can teach you through analogies you'll love.
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/onboarding")} className="gap-2 gradient-primary text-primary-foreground border-0">
                  <Settings className="w-4 h-4" />
                  Set Up Preferences
                </Button>
              </div>
            </motion.div>
          )}

          {/* Mood Check - Compact Row */}
          {showMoodCheck && (
            <motion.div variants={itemVariants}>
              <MoodCheck onMoodSelect={handleMoodSelect} />
            </motion.div>
          )}

          {/* Quick Actions Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              onClick={() => setShowQuizCreator(!showQuizCreator)}
              className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 shadow-lg h-auto py-3"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Quiz</span>
              <span className="sm:hidden">Quiz</span>
            </Button>
            <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => navigate("/quiz")}>
              <Zap className="w-4 h-4 text-warning" />
              <span className="hidden sm:inline">Quick Practice</span>
              <span className="sm:hidden">Practice</span>
            </Button>
            <Button variant="outline" className="gap-2 h-auto py-3" onClick={() => navigate("/chat")}>
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Analogy Tutor</span>
              <span className="sm:hidden">Tutor</span>
            </Button>
            <Button variant="outline" className="gap-2 h-auto py-3">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="hidden sm:inline">Achievements</span>
              <span className="sm:hidden">Badges</span>
            </Button>
          </motion.div>

          {/* Quiz Creator */}
          {showQuizCreator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <QuizCreator onCreateQuiz={handleCreateQuiz} />
            </motion.div>
          )}

          {/* Stats Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatsCard
              title="Quizzes Completed"
              value={45}
              subtitle="This month"
              icon={BookOpen}
              trend={{ value: 12, isPositive: true }}
              color="primary"
            />
            <StatsCard
              title="Accuracy Rate"
              value="78%"
              subtitle="Keep improving!"
              icon={Target}
              trend={{ value: 5, isPositive: true }}
              color="success"
            />
            <StatsCard
              title="Current Streak"
              value={7}
              subtitle="Days in a row"
              icon={Zap}
              color="warning"
            />
            <StatsCard
              title="Achievements"
              value="12/20"
              subtitle="Unlocked"
              icon={Trophy}
              color="accent"
            />
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Left Column - Subjects */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
              {/* Subjects Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Your Subjects
                </h2>
                <Button variant="ghost" size="sm" className="text-primary">
                  See All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Subjects Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {subjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    name={subject.name}
                    icon={subject.icon}
                    progress={subject.progress}
                    quizCount={subject.quizCount}
                    streak={subject.streak}
                    onStudy={() => navigate("/quiz")}
                  />
                ))}
              </div>

              {/* AI Insights */}
              <motion.div
                className="glass-card p-5 border-l-4 border-primary"
                whileHover={{ x: 4 }}
              >
                <div className="flex items-start gap-4">
                  <Mascot size="sm" mood="excited" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground mb-1">
                      🌟 You're a star in History—keep shining!
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your History scores are amazing! Let's focus on Biology next—I've prepared quizzes with <span className="text-primary font-medium">analogies</span> just for you.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="gap-2" onClick={() => navigate("/quiz")}>
                        <TrendingUp className="w-4 h-4" />
                        Start Biology Quiz
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate("/chat")}>
                        <MessageCircle className="w-4 h-4" />
                        Learn with Analogies
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Exams & Achievements */}
            <motion.div variants={itemVariants} className="space-y-5">
              {/* Upcoming Exams */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  📅 Upcoming Exams
                </h2>
                <div className="space-y-3">
                  {upcomingExams.map((exam) => (
                    <CountdownTimer
                      key={exam.id}
                      examDate={exam.date}
                      examName={exam.name}
                      subject={exam.subject}
                      icon={exam.icon}
                    />
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    🏆 Achievements
                  </h2>
                  <Button variant="ghost" size="sm" className="text-primary">
                    All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {achievements.slice(0, 6).map((achievement) => (
                    <AchievementBadge
                      key={achievement.id}
                      icon={achievement.icon}
                      title={achievement.title}
                      description={achievement.description}
                      isUnlocked={achievement.isUnlocked}
                      isNew={achievement.isNew}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
