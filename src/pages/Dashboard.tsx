import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Target, 
  Zap, 
  TrendingUp,
  MessageCircle,
  Clock,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import AchievementBadge from "@/components/AchievementBadge";
import QuizCreator from "@/components/QuizCreator";
import ExamManager from "@/components/ExamManager";
import CalendarWidget from "@/components/CalendarWidget";
import DailyMascotCard from "@/components/DailyMascotCard";
import { useNavigate } from "react-router-dom";
import { achievementStore } from "@/utils/achievementStore";
import { statsStore } from "@/utils/statsStore";
import { getAIBannerPhrase } from "@/services/groq";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [bannerPhrase, setBannerPhrase] = useState("Loading your plan...");
  
  // Start Achievement Sync
  useAchievementChecker();

  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const userName = userPrefs.name || "Student";
  const [statsData, setStatsData] = useState(() => statsStore.get());

  useEffect(() => {
    const handleStatsUpdate = () => {
      setStatsData(statsStore.get());
    };
    
    const handleAchievementsUpdate = () => {
      setRecentAchievements(achievementStore.getAll().filter(a => a.unlocked).slice(-4));
    };

    window.addEventListener("statsUpdated", handleStatsUpdate);
    window.addEventListener("achievementsUpdated", handleAchievementsUpdate);
    
    // Initial Load
    handleStatsUpdate();
    handleAchievementsUpdate();
    
    // Fetch AI banner specifically for the dashboard
    getAIBannerPhrase(userName, userPrefs.subjects || []).then(setBannerPhrase);
    
    return () => {
      window.removeEventListener("statsUpdated", handleStatsUpdate);
      window.removeEventListener("achievementsUpdated", handleAchievementsUpdate);
    };
  }, [userName]);

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
      {/* Background Decor */}
      <div className="liquid-blob w-[500px] h-[500px] bg-primary/20 -top-48 -left-48 fixed blur-3xl opacity-20" />
      <div className="liquid-blob w-[400px] h-[400px] bg-accent/20 bottom-20 right-10 fixed blur-3xl opacity-20" style={{ animationDelay: "-3s" }} />
      
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 relative z-10 flex-1 flex flex-col">
        <Header userName={userName} streak={statsData.currentStreak} />

        {/* BENTO GRID LAYOUT */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Row 1: AI Welcome & Quick Stats */}
          <div className="lg:col-span-8 space-y-6">
            <motion.div variants={itemVariants} className="glass-card p-8 border-none bg-gradient-to-br from-primary/10 via-background/50 to-accent/5 relative overflow-hidden group min-h-[220px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full -mr-40 -mt-40 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10">
                   <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-black text-xs mb-4 uppercase tracking-widest">
                      <Sparkles className="w-3 h-3" />
                      Daily Insight
                   </span>
                   <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4 leading-tight tracking-tight max-w-2xl">
                      {bannerPhrase}
                   </h2>
                   <div className="flex flex-wrap gap-4 mt-2">
                      <Button onClick={() => navigate("/quiz", { state: { topic: userPrefs.subjects?.[0] || 'general knowledge' } })} className="gradient-primary text-primary-foreground border-0 px-8 h-12 rounded-2xl font-black shadow-xl hover:scale-105 transition-transform">
                        Start Learning Session
                      </Button>
                      <Button variant="outline" onClick={() => setShowQuizCreator(true)} className="h-12 px-6 rounded-2xl font-bold bg-background/50 backdrop-blur hover:bg-background/80">
                        Custom Quiz
                      </Button>
                   </div>
                </div>
            </motion.div>

            {/* QUICK STATS BAR - This fulfills "resize and go on the bottom" logic on mobile, but is top-level on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatsCard 
                  title="Daily Streak" 
                  value={statsData.currentStreak} 
                  icon={Zap} 
                  color="warning" 
                  subtitle="Keep it up!"
                />
                <StatsCard 
                  title="AI Conversations" 
                  value={`${statsData.conversationsCount}`} 
                  icon={MessageCircle} 
                  color="accent"
                  subtitle={statsData.topSubject !== "None" 
                    ? `${statsData.subjectCounts[statsData.topSubject] || 0} chats in ${statsData.topSubject}` 
                    : "Start a chat to track stats!"}
                />
                <StatsCard 
                  title="Quiz History" 
                  value={statsData.quizzesDone} 
                  icon={TrendingUp} 
                  color="tertiary"
                  subtitle="Last 30 days"
                />
            </div>
          </div>

          {/* Right Column (Top): Ask Quizzy */}
          <div className="lg:col-span-4 space-y-6 h-full">
            <motion.div variants={itemVariants} className="h-full flex flex-col">
               <div className="flex items-center justify-between px-2 mb-4">
                 <h2 className="text-lg font-black text-foreground flex items-center gap-3">
                   <div className="p-1 px-2 rounded-lg bg-primary/10">
                     <MessageCircle className="w-4 h-4 text-primary" />
                   </div>
                   AI Tutor
                 </h2>
               </div>
               <div className="flex-1">
                 <DailyMascotCard 
                   userName={userName} 
                   onChatStart={() => navigate("/chat")} 
                 />
               </div>
            </motion.div>
          </div>

          {/* Row 2: Secondary Content */}
          {/* Calendar Card */}
          <div className="lg:col-span-4">
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between px-2 mb-4">
                 <h2 className="text-lg font-black text-foreground flex items-center gap-2 uppercase tracking-widest text-[10px] opacity-70">
                    Your Calendar
                 </h2>
              </div>
              <CalendarWidget />
            </motion.div>
          </div>

          {/* Deadlines Card - Takes up space based on content */}
          <div className="lg:col-span-4">
            <motion.div variants={itemVariants} className="space-y-4">
               <div className="px-2 text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                 <Clock className="w-3 h-3 text-accent" />
                 Upcoming Deadlines
               </div>
               <div className="glass-card p-5 bg-background/50 h-full">
                 <ExamManager />
               </div>
            </motion.div>
          </div>

          {/* Achievements Card */}
          <div className="lg:col-span-4">
            <motion.div variants={itemVariants} className="space-y-4">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-muted-foreground font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                    <Trophy className="w-3 h-3 text-accent" />
                    Achievements
                  </h3>
                  <button 
                    onClick={() => navigate("/achievements")}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View Library <ArrowRight className="w-2 h-2" />
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
                      <p className="text-xs text-muted-foreground font-bold">Earn badges by studying!</p>
                    </div>
                  )}
               </div>

                {/* MOVED TO BOTTOM IF SPACE PERMITS: Quiz Creator Toggle */}
                {/* Now handled via Dialog */}
            </motion.div>
          </div>
        </motion.div>
      </div>

      <Dialog open={showQuizCreator} onOpenChange={setShowQuizCreator}>
        <DialogContent className="max-w-2xl bg-transparent border-none p-0 shadow-none">
           <DialogHeader className="hidden">
             <DialogTitle>Create Custom Quiz</DialogTitle>
           </DialogHeader>
           <QuizCreator 
             onCreateQuiz={(config) => {
               setShowQuizCreator(false);
               navigate("/quiz", { 
                 state: { 
                    topic: config.content,
                    numQuestions: config.numQuestions,
                    timerDuration: config.timerDuration
                 } 
               });
             }} 
           />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
