import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Target, 
  Zap, 
  TrendingUp,
  MessageCircle,
  Clock,
  Layout,
  Star,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Mascot from "@/components/Mascot";
import StatsCard from "@/components/StatsCard";
import AchievementBadge from "@/components/AchievementBadge";
import QuizCreator from "@/components/QuizCreator";
import ExamManager from "@/components/ExamManager";
import CalendarWidget from "@/components/CalendarWidget";
import DailyMascotCard from "@/components/DailyMascotCard";
import { useNavigate } from "react-router-dom";
import { achievementStore } from "@/utils/achievementStore";
import { statsStore } from "@/utils/statsStore";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState(
    achievementStore.getAll().filter(a => a.unlocked).slice(-4)
  );

  // MEMORY
  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const userName = userPrefs.name || "Student";
  const hasCompletedOnboarding = userPrefs.onboardingComplete;

  const [statsData, setStatsData] = useState(() => statsStore.get());

  useEffect(() => {
    const handleStatsUpdate = () => setStatsData(statsStore.get());
    window.addEventListener("statsUpdated", handleStatsUpdate);
    return () => window.removeEventListener("statsUpdated", handleStatsUpdate);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] pb-12 relative overflow-hidden flex flex-col">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-[1700px] mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-6 relative z-10 flex-1 flex flex-col">
        <Header userName={userName} streak={statsData.currentStreak} />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-12 gap-6 lg:gap-8 flex-1"
        >
          {/* LEFT: CALENDAR & ACHIEVEMENTS */}
          <section className="col-span-12 lg:col-span-3 space-y-8 order-2 lg:order-1">
            <motion.div variants={itemVariants} className="space-y-4">
              <CalendarWidget />
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-accent" />
                    Achievements
                  </h3>
                  <button 
                    onClick={() => navigate("/achievements")}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                  {recentAchievements.length > 0 ? (
                    recentAchievements.map((achievement) => (
                      <AchievementBadge
                        key={achievement.id}
                        icon={achievement.icon}
                        title={achievement.title}
                        description={achievement.description}
                        isUnlocked={true}
                      />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-6 glass-card border-dashed">
                      <p className="text-xs text-muted-foreground">Start learning to unlock badges!</p>
                    </div>
                  )}
               </div>
            </motion.div>
          </section>

          {/* MIDDLE: THE QUIZZY HUB */}
          <main className="col-span-12 lg:col-span-6 space-y-6 order-1 lg:order-2">
            {/* AI Welcome Banner */}
            <motion.div variants={itemVariants} className="glass-card p-6 md:p-8 border-none bg-gradient-to-r from-primary/10 to-accent/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />
               <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 text-center md:text-left">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                  </motion.div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-black text-foreground mb-3 leading-tight tracking-tight">
                      What's the plan for today, <span className="text-primary">{userName}</span>? 
                    </h2>
                    <p className="text-muted-foreground text-lg mb-6 leading-relaxed max-w-lg">
                      I'm ready to turn your hardest concepts into easy analogies. What should we tackle first?
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <Button onClick={() => navigate("/quiz")} className="gradient-primary text-primary-foreground border-0 px-8 h-12 rounded-2xl font-black shadow-xl shadow-primary/30 hover:scale-105 transition-transform">
                        Start Learning
                      </Button>
                      <Button variant="outline" onClick={() => setShowQuizCreator(true)} className="h-12 px-6 rounded-2xl font-bold bg-background/50 backdrop-blur hover:bg-background/80">
                        Create Custom Quiz
                      </Button>
                    </div>
                  </div>
               </div>
            </motion.div>

            {/* QUIZZY CHAT (Simplified) */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-foreground flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  Ask Quizzy Anything
                </h2>
              </div>
              <DailyMascotCard 
                userName={userName} 
                onChatStart={() => navigate("/chat")} 
              />
            </motion.div>

            {showQuizCreator && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <QuizCreator onCreateQuiz={() => navigate("/quiz")} />
              </motion.div>
            )}
          </main>

          {/* RIGHT: TRACKING (Stats & Exams) */}
          <section className="col-span-12 lg:col-span-3 space-y-8 order-3 lg:order-3">
            {/* Exam Center */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="px-2 text-muted-foreground font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Deadlines
              </div>
              <div className="glass-card p-5 bg-background/50">
                <ExamManager />
              </div>
            </motion.div>

            {/* Stats Vertical */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="px-2 text-muted-foreground font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                <Target className="w-4 h-4 text-success" />
                Your Mastery
              </div>
              <div className="grid grid-cols-1 gap-4">
                <StatsCard 
                  title="Study Streak" 
                  value={statsData.currentStreak} 
                  icon={Zap} 
                  color="warning" 
                  subtitle="Days active"
                />
                <StatsCard 
                  title="AI Help" 
                  value={`${statsData.conversationsCount} Chats`} 
                  icon={MessageCircle} 
                  color="accent"
                  subtitle={`Topic: ${statsData.topSubject}`}
                />
                <StatsCard 
                  title="Quizzes" 
                  value={statsData.quizzesDone} 
                  icon={TrendingUp} 
                  color="tertiary"
                  subtitle="This month"
                />
              </div>
            </motion.div>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
