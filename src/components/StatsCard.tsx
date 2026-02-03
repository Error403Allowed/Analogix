import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: "primary" | "secondary" | "success" | "warning" | "accent" | "tertiary";
}

const StatsCard = ({ title, value, subtitle, icon: Icon, trend, color }: StatsCardProps) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 text-primary",
    secondary: "from-secondary/20 to-secondary/5 text-secondary",
    success: "from-success/20 to-success/5 text-success",
    warning: "from-warning/20 to-warning/5 text-warning",
    accent: "from-accent/20 to-accent/5 text-accent",
    tertiary: "from-tertiary/20 to-tertiary/5 text-tertiary",
  };

  const iconBgClasses = {
    primary: "bg-primary/10",
    secondary: "bg-secondary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    accent: "bg-accent/10",
    tertiary: "bg-tertiary/10",
  };

  return (
    <motion.div
      className={`glass-card p-5 bg-gradient-to-br ${colorClasses[color].split(" ")[0]} ${colorClasses[color].split(" ")[1]}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <motion.p
            className="text-3xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend.isPositive ? "text-success" : "text-destructive"}`}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}% this week</span>
            </div>
          )}
        </div>
        <motion.div
          className={`p-3 rounded-xl ${iconBgClasses[color]}`}
          whileHover={{ rotate: 10 }}
        >
          <Icon className={`w-6 h-6 ${colorClasses[color].split(" ")[2]}`} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
