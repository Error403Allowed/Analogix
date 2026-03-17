"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as Lucide from "lucide-react";

// Popular icons for quick selection
const POPULAR_ICONS = [
  "BookOpen", "Brain", "Calculator", "Microscope", "Landmark", "Zap",
  "FlaskConical", "Cpu", "LineChart", "Briefcase", "Wallet", "HeartPulse",
  "Globe", "Wrench", "Stethoscope", "Languages", "Music", "Palette",
  "Trophy", "Star", "Heart", "Flame", "Lightbulb", "Rocket", "Target",
  "Award", "Bookmark", "Calendar", "CheckCircle", "Clock", "Compass",
  "Diamond", "Eye", "FileText", "Folder", "Gift", "GraduationCap",
  "Home", "Key", "Lock", "Mail", "MapPin", "Megaphone", "MessageCircle",
  "Moon", "Paperclip", "PenTool", "Pencil", "Phone", "PieChart", "Pin",
  "Play", "Plus", "Power", "Printer", "Puzzle", "Radio", "RefreshCw",
  "Save", "Search", "Send", "Settings", "Share", "Shield", "ShoppingBag",
  "Smile", "Snowflake", "Sparkles", "Speaker", "Sun", "Tag",
  "ThumbsUp", "Tool", "Truck", "Tv", "Umbrella", "User", "Users", "Video",
  "Volume2", "Watch", "Wifi"
] as const;

interface IconPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIcon: string;
  onSelect: (iconName: string) => void;
}

export function IconPicker({ open, onOpenChange, selectedIcon, onSelect }: IconPickerProps) {
  const [search, setSearch] = useState("");

  const filteredIcons = POPULAR_ICONS.filter(name =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (iconName: string) => {
    // Verify icon exists
    if ((Lucide as any)[iconName]) {
      onSelect(iconName);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choose an Icon</DialogTitle>
          <DialogDescription>
            Select an icon to represent this subject
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {filteredIcons.map((iconName) => {
              const IconComponent = (Lucide as any)[iconName];
              const isSelected = selectedIcon === iconName;
              
              if (!IconComponent) {
                return null;
              }
              
              return (
                <motion.button
                  key={iconName}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(iconName)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground border-transparent"
                  )}
                >
                  <IconComponent className="w-5 h-5" />
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Helper to render an icon by name dynamically
export function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Lucide as any)[name];
  
  if (!IconComponent) {
    // Fallback to BookOpen if icon not found
    return <Lucide.BookOpen className={className} />;
  }

  return <IconComponent className={className} />;
}
