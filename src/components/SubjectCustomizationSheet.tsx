"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette,
  Image as ImageIcon,
  Type,
  Sparkles,
  MoreHorizontal,
  Settings2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectId } from "@/constants/subjects";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { IconPicker } from "@/components/IconPicker";
import { ColorPicker, SUBJECT_COLORS, type SubjectColorId } from "@/components/ColorPicker";
import { subjectStore } from "@/utils/subjectStore";
import type { CustomSubject } from "@/utils/subjectStore";

interface SubjectCustomizationSheetProps {
  subjectId: SubjectId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomizationChange?: () => void;
}

// Cover gradient options
const COVER_GRADIENTS = [
  { id: "none", name: "None", class: "" },
  { id: "sunset", name: "Sunset", class: "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" },
  { id: "ocean", name: "Ocean", class: "bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500" },
  { id: "forest", name: "Forest", class: "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" },
  { id: "berry", name: "Berry", class: "bg-gradient-to-r from-pink-500 via-rose-500 to-red-500" },
  { id: "sky", name: "Sky", class: "bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-500" },
  { id: "twilight", name: "Twilight", class: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" },
  { id: "fire", name: "Fire", class: "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" },
  { id: "midnight", name: "Midnight", class: "bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900" },
  { id: "gold", name: "Gold", class: "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" },
] as const;

export function SubjectCustomizationSheet({
  subjectId,
  open,
  onOpenChange,
  onCustomizationChange,
}: SubjectCustomizationSheetProps) {
  const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);
  const [customData, setCustomData] = useState<CustomSubject | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [selectedCover, setSelectedCover] = useState<string>("none");
  const [loading, setLoading] = useState(true);

  // Load custom subject data
  useEffect(() => {
    if (open) {
      setLoading(true);
      subjectStore.getCustomSubject(subjectId).then((data) => {
        setCustomData(data);
        if (data) {
          setCustomTitle(data.custom_title || "");
          setSelectedCover(data.custom_cover || "none");
        }
        setLoading(false);
      });
    }
  }, [open, subjectId]);

  const handleSave = async () => {
    await subjectStore.saveCustomSubject(subjectId, {
      custom_icon: customData?.custom_icon || null,
      custom_color: customData?.custom_color || null,
      custom_cover: selectedCover !== "none" ? selectedCover : null,
      custom_title: customTitle.trim() || null,
    });
    onCustomizationChange?.();
    onOpenChange(false);
  };

  const handleReset = async () => {
    setCustomData(null);
    setCustomTitle("");
    setSelectedCover("none");
    await subjectStore.saveCustomSubject(subjectId, {
      custom_icon: null,
      custom_color: null,
      custom_cover: null,
      custom_title: null,
    });
    onCustomizationChange?.();
  };

  const displayTitle = customTitle || subject?.label || "Unknown";
  const displayIcon = customData?.custom_icon || subject?.icon.name || "BookOpen";
  const displayColor = customData?.custom_color || "default";

  const selectedColorData = SUBJECT_COLORS.find((c) => c.id === displayColor);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          {/* Cover Preview */}
          <div className={cn(
            "h-32 w-full transition-all",
            selectedCover !== "none"
              ? COVER_GRADIENTS.find((g) => g.id === selectedCover)?.class
              : selectedColorData?.bg || "bg-muted/40"
          )}>
            <div className="absolute top-4 right-4 z-10">
              <SheetTrigger asChild>
                <Button variant="secondary" size="icon" className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-6 py-6 space-y-6">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Customise Subject
                </SheetTitle>
                <SheetDescription>
                  Personalise how this subject appears
                </SheetDescription>
              </SheetHeader>

              {/* Preview Card */}
              <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className={cn(
                  "h-16 w-full transition-all",
                  selectedCover !== "none"
                    ? COVER_GRADIENTS.find((g) => g.id === selectedCover)?.class
                    : selectedColorData?.bg || "bg-muted/30"
                )} />
                <div className="p-4 -mt-8">
                  <div className={cn(
                    "w-16 h-16 rounded-xl flex items-center justify-center shadow-lg border-2 border-background",
                    selectedColorData?.bg || "bg-muted/40"
                  )}>
                    {/* Icon preview would go here */}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-2">{displayTitle}</h3>
                  <p className="text-xs text-muted-foreground/60">Preview</p>
                </div>
              </div>

              <Separator />

              {/* Custom Title */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-muted-foreground/60" />
                  <Label className="text-sm font-semibold">Custom Title</Label>
                </div>
                <Input
                  placeholder={subject?.label || "Subject name"}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground/50">
                  Give this subject a custom display name
                </p>
              </div>

              {/* Custom Icon */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground/60" />
                  <Label className="text-sm font-semibold">Icon</Label>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIconPickerOpen(true)}
                    className="w-12 h-12 rounded-xl bg-muted/40 border border-border/40 hover:border-primary/40 transition-all flex items-center justify-center"
                  >
                    {/* Dynamic icon would render here */}
                    <Sparkles className="w-5 h-5 text-muted-foreground/60" />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {customData?.custom_icon || subject?.icon.name || "Default"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/50">
                      Click to choose an icon
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Color */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground/60" />
                  <Label className="text-sm font-semibold">Color</Label>
                </div>
                <button
                  onClick={() => setColorPickerOpen(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/40 transition-all text-left"
                >
                  <div className={cn("w-10 h-10 rounded-lg", selectedColorData?.bg || "bg-muted/40")} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{selectedColorData?.name || "Default"}</p>
                    <p className="text-[11px] text-muted-foreground/50">Click to choose a color</p>
                  </div>
                  <Check className="w-4 h-4 text-muted-foreground/40" />
                </button>
              </div>

              {/* Cover Image */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground/60" />
                  <Label className="text-sm font-semibold">Cover</Label>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {COVER_GRADIENTS.map((gradient) => (
                    <button
                      key={gradient.id}
                      onClick={() => setSelectedCover(gradient.id)}
                      className={cn(
                        "aspect-square rounded-lg border-2 transition-all",
                        selectedCover === gradient.id
                          ? "border-primary scale-105"
                          : "border-transparent hover:border-border/60"
                      )}
                    >
                      <div className={cn("w-full h-full rounded-md", gradient.class || "bg-muted/40")} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full text-xs"
                >
                  Reset to Default
                </Button>
              </div>
            </div>
          </ScrollArea>

          {/* Save Button */}
          <div className="p-6 border-t border-border/40">
            <Button onClick={handleSave} className="w-full">
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Icon Picker Dialog */}
      <IconPicker
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        selectedIcon={customData?.custom_icon || subject?.icon.name || ""}
        onSelect={(iconName) => {
          setCustomData((prev) => prev ? { ...prev, custom_icon: iconName } : null);
        }}
      />

      {/* Color Picker Dialog */}
      <ColorPicker
        open={colorPickerOpen}
        onOpenChange={setColorPickerOpen}
        selectedColor={customData?.custom_color || "default"}
        onSelect={(colorId) => {
          setCustomData((prev) => prev ? { ...prev, custom_color: colorId } : null);
        }}
      />
    </>
  );
}
