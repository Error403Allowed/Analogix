import { useState } from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Trophy, 
  Target, 
  Zap, 
  Plus,
  ChevronRight,
  TrendingUp
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
    <div className="min-h-screen pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Header userName="Student" streak={7} />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Mood Check */}
          {showMoodCheck && (
            <motion.div variants={itemVariants}>
              <MoodCheck onMoodSelect={handleMoodSelect} />
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowQuizCreator(!showQuizCreator)}
              className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Create Quiz
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/quiz")}>
              <Zap className="w-4 h-4 text-warning" />
              Quick Practice
            </Button>
            <Button variant="outline" className="gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              View Achievements
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
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Subjects */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
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
                  <div>
                    <h3 className="font-bold text-foreground mb-1">
                      🌟 You're a star in History—keep shining!
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your History scores are amazing! Let's focus on Biology next—I've prepared some fun quizzes to help you improve.
                    </p>
                    <Button size="sm" className="gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Start Biology Quiz
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Exams & Achievements */}
            <motion.div variants={itemVariants} className="space-y-6">
              {/* Upcoming Exams */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  📅 Upcoming Exams
                </h2>
                <div className="space-y-4">
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
