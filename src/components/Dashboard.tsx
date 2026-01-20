import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MessageCircle,
  Flame,
  BookOpen,
  TrendingUp,
  GraduationCap,
  Settings,
  Sparkles,
  Target,
  Calendar,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { type StudentProfile, type LearningStats, SUBJECTS } from "@/lib/storage";
import { Analytics } from "@vercel/analytics/next"

interface DashboardProps {
  profile: StudentProfile;
  stats: LearningStats;
  onStartChat: () => void;
  onEditProfile: () => void;
}

export const Dashboard = ({ profile, stats, onStartChat, onEditProfile }: DashboardProps) => {
  const { theme, toggleTheme } = useTheme();

  const getSubjectLabel = (value: string) => {
    return SUBJECTS.find(s => s.value === value)?.label || value;
  };

  const getSubjectIcon = (value: string) => {
    return SUBJECTS.find(s => s.value === value)?.icon || '📖';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxActivity = Math.max(...stats.weeklyActivity, 1);

  const topSubjects = Object.entries(stats.subjectBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const dailyGoal = 5;
  const goalProgress = Math.min((stats.questionsToday / dailyGoal) * 100, 100);

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <header className="w-full border-b-2 border-border bg-card p-4">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary border-2 border-border shadow-xs">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Analogix</h1>
              <p className="text-sm text-muted-foreground">
                {profile.yearLevel} • {profile.state}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="border-2"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditProfile}
              className="border-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Section with CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-2 border-border bg-gradient-to-br from-primary/10 to-accent/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">G'day! Ready to learn?</h2>
                  <p className="text-muted-foreground mb-4">
                    Your AI tutor is ready to explain any concept using analogies from{" "}
                    <span className="font-medium text-foreground">
                      {profile.interests.slice(0, 2).join(", ")}
                    </span>{" "}
                    and more!
                  </p>
                  <Button onClick={onStartChat} className="border-2 border-border shadow-sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Learning Session
                  </Button>
                </div>
                <div className="hidden md:block p-4 bg-card border-2 border-border">
                  <MessageCircle className="h-16 w-16 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Streak Card */}
          <Card className="border-2 border-border">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full">
              <div className="p-3 bg-accent/20 border-2 border-border mb-3">
                <Flame className="h-8 w-8 text-accent" />
              </div>
              <div className="text-4xl font-bold">{stats.streakDays}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
              {stats.streakDays >= 7 && (
                <Badge className="mt-2 bg-accent text-accent-foreground border-2 border-border">
                  🔥 On Fire!
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2 border-border">
            <CardContent className="p-4 text-center">
              <MessageCircle className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
              <div className="text-xs text-muted-foreground">Total Questions</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <div className="text-xs text-muted-foreground">Study Sessions</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.questionsToday}</div>
              <div className="text-xs text-muted-foreground">Today's Questions</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-border">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold">{profile.subjects.length}</div>
              <div className="text-xs text-muted-foreground">Active Subjects</div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Goal & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Goal */}
          <Card className="border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Daily Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{stats.questionsToday} of {dailyGoal} questions</span>
                  <span className="font-medium">{Math.round(goalProgress)}%</span>
                </div>
                <Progress value={goalProgress} className="h-3 border border-border" />
                {goalProgress >= 100 && (
                  <p className="text-sm text-accent font-medium">
                    ✨ Goal achieved! Keep the momentum going!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Activity */}
          <Card className="border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                This Week's Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-20">
                {stats.weeklyActivity.map((count, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/20 border border-border relative"
                      style={{ height: "60px" }}
                    >
                      <div
                        className="absolute bottom-0 w-full bg-primary transition-all"
                        style={{ height: `${(count / maxActivity) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{weekDays[index]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subjects Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Your Subjects */}
          <Card className="border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Your Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.subjects.map((subject) => (
                  <Badge
                    key={subject}
                    variant="secondary"
                    className="border-2 border-border text-sm py-1 px-3"
                  >
                    {getSubjectIcon(subject)} {getSubjectLabel(subject)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Studied Subjects */}
          <Card className="border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Most Studied
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topSubjects.length > 0 ? (
                <div className="space-y-3">
                  {topSubjects.map(([subject, count], index) => (
                    <div key={subject} className="flex items-center gap-3">
                      <div className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {getSubjectIcon(subject)} {getSubjectLabel(subject)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {count} questions
                          </span>
                        </div>
                        <Progress 
                          value={(count / (topSubjects[0][1] || 1)) * 100} 
                          className="h-2 mt-1 border border-border" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Start learning to see your top subjects here!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Start Suggestions */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Quick Start Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                "Explain Newton's laws",
                "Help with quadratic equations",
                "What caused World War I?",
                "How does photosynthesis work?",
              ].map((topic) => (
                <Button
                  key={topic}
                  variant="outline"
                  className="border-2 h-auto py-3 text-left justify-start"
                  onClick={onStartChat}
                >
                  {topic}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};