"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Brain, Smile, BookOpen, Lightbulb, Target,
  MessageCircle, Zap, Heart, GraduationCap, Clock, Check,
  ArrowRight, RotateCcw, Save, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AIPersonality } from "@/types/ai-personality";
import { DEFAULT_AI_PERSONALITY, PERSONALITY_PRESETS } from "@/types/ai-personality";
import { useAIPersonality } from "@/hooks/useAIPersonality";

interface PersonalityEditorProps {
  onClose?: () => void;
}

const TRAIT_ICONS: Record<string, React.ReactNode> = {
  friendliness: <Smile className="w-4 h-4" />,
  formality: <BookOpen className="w-4 h-4" />,
  humor: <Sparkles className="w-4 h-4" />,
  detail_level: <Target className="w-4 h-4" />,
  patience: <Clock className="w-4 h-4" />,
  encouragement: <Heart className="w-4 h-4" />,
};

const TRAIT_LABELS: Record<string, string> = {
  friendliness: "Friendliness",
  formality: "Formality",
  humor: "Humor",
  detail_level: "Detail Level",
  patience: "Patience",
  encouragement: "Encouragement",
};

const TRAIT_DESCRIPTIONS: Record<string, string> = {
  friendliness: "How warm and friendly should I be?",
  formality: "How formal or casual should I sound?",
  humor: "How much wit and humor should I use?",
  detail_level: "How detailed should my explanations be?",
  patience: "How patient should I be with repetition?",
  encouragement: "How encouraging and supportive should I be?",
};

const TRAIT_END_LABELS: Record<string, [string, string]> = {
  friendliness: ["Reserved", "Warm"],
  formality: ["Casual", "Formal"],
  humor: ["Serious", "Playful"],
  detail_level: ["Brief", "Thorough"],
  patience: ["Quick", "Patient"],
  encouragement: ["Direct", "Supportive"],
};

export const PersonalityEditor: React.FC< PersonalityEditorProps> = ({ onClose }) => {
  const { personality, loading, saving, savePersonality, applyPreset, resetToDefaults } = useAIPersonality();
  const [localPersonality, setLocalPersonality] = useState<AIPersonality>(personality);
  const [dirty, setDirty] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Sync with loaded personality
  useEffect(() => {
    setLocalPersonality(personality);
  }, [personality]);

  // Mark as dirty when changed
  const updateTrait = (key: keyof AIPersonality, value: number | boolean | string) => {
    setLocalPersonality(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // Check if values have changed from original
  const hasChanges = () => {
    return (
      personality.friendliness !== localPersonality.friendliness ||
      personality.formality !== localPersonality.formality ||
      personality.humor !== localPersonality.humor ||
      personality.detail_level !== localPersonality.detail_level ||
      personality.patience !== localPersonality.patience ||
      personality.encouragement !== localPersonality.encouragement ||
      personality.socratic_method !== localPersonality.socratic_method ||
      personality.step_by_step !== localPersonality.step_by_step ||
      personality.real_world_examples !== localPersonality.real_world_examples ||
      personality.use_emojis !== localPersonality.use_emojis ||
      personality.use_analogies !== localPersonality.use_analogies ||
      personality.analogy_frequency !== localPersonality.analogy_frequency ||
      personality.use_section_dividers !== localPersonality.use_section_dividers ||
      personality.custom_instructions !== localPersonality.custom_instructions ||
      personality.persona_description !== localPersonality.persona_description
    );
  };

  // Save changes
  const handleSave = async () => {
    const success = await savePersonality(localPersonality);
    if (success) {
      setDirty(false);
      onClose?.();
    }
  };

  // Apply a preset
  const handleApplyPreset = (presetKey: keyof typeof PERSONALITY_PRESETS) => {
    const preset = PERSONALITY_PRESETS[presetKey];
    setLocalPersonality(prev => ({
      ...prev,
      ...preset.settings,
      custom_instructions: prev.custom_instructions,
      persona_description: prev.persona_description,
    }));
    setDirty(true);
    toast.success(`Applied "${preset.name}" preset`);
    setShowPresets(false);
  };

  // Reset to defaults
  const handleReset = async () => {
    if (confirm("Reset all personality settings to default?")) {
      await resetToDefaults();
      setDirty(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading personality settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with preset button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">AI Personality</h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Customize how the AI teaches and interacts with you
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs border-border/80 bg-card/40"
          onClick={() => setShowPresets(!showPresets)}
        >
          <Wand2 className="w-3.5 h-3.5 mr-1.5" />
          Use Preset
        </Button>
      </div>

      {/* Presets Panel */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-border/60 bg-muted/20">
              {Object.entries(PERSONALITY_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handleApplyPreset(key as keyof typeof PERSONALITY_PRESETS)}
                  className="p-3 rounded-lg border border-border/60 bg-card/50 text-left hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">{preset.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">{preset.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personality Traits */}
      <ScrollArea className="h-[650px] pr-4">
        <div className="space-y-5">
          {/* Trait Sliders */}
          <div className="space-y-4">
            {(Object.keys(TRAIT_LABELS) as Array<keyof typeof TRAIT_LABELS>).map((traitKey) => {
              const value = localPersonality[traitKey as keyof AIPersonality] as number;
              return (
                <div key={traitKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/70">
                        {TRAIT_ICONS[traitKey]}
                      </span>
                      <Label className="text-xs font-semibold text-foreground">
                        {TRAIT_LABELS[traitKey]}
                      </Label>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground/60">
                      {value}%
                    </span>
                  </div>
                  <Slider
                    value={[value]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([newValue]) => updateTrait(traitKey as keyof AIPersonality, newValue)}
                    className="py-2"
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
                    <span>{TRAIT_END_LABELS[traitKey][0]}</span>
                    <span className="text-[10px] text-muted-foreground/40">
                      {TRAIT_DESCRIPTIONS[traitKey]}
                    </span>
                    <span>{TRAIT_END_LABELS[traitKey][1]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Teaching Style Options */}
          <div className="pt-4 border-t border-border/60">
            <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              Teaching Style
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Socratic Method</Label>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Ask guiding questions instead of direct answers
                  </p>
                </div>
                <Switch
                  checked={localPersonality.socratic_method}
                  onCheckedChange={(checked) => updateTrait("socratic_method", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Step-by-Step Solutions</Label>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Always show working for problems
                  </p>
                </div>
                <Switch
                  checked={localPersonality.step_by_step}
                  onCheckedChange={(checked) => updateTrait("step_by_step", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Real-World Examples</Label>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Use practical, real-world applications
                  </p>
                </div>
                <Switch
                  checked={localPersonality.real_world_examples}
                  onCheckedChange={(checked) => updateTrait("real_world_examples", checked)}
                />
              </div>
            </div>
          </div>

          {/* Response Preferences */}
          <div className="pt-4 border-t border-border/60">
            <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-primary" />
              Response Preferences
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Use Emojis</Label>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Add emojis to responses
                  </p>
                </div>
                <Switch
                  checked={localPersonality.use_emojis}
                  onCheckedChange={(checked) => updateTrait("use_emojis", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Use Analogies</Label>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Explain concepts using analogies
                  </p>
                </div>
                <Switch
                  checked={localPersonality.use_analogies}
                  onCheckedChange={(checked) => updateTrait("use_analogies", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Use Section Dividers</Label>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Use horizontal dashes (⸻) to separate sections like ChatGPT
                  </p>
                </div>
                <Switch
                  checked={localPersonality.use_section_dividers}
                  onCheckedChange={(checked) => updateTrait("use_section_dividers", checked)}
                />
              </div>

              {localPersonality.use_analogies && (
                <div className="space-y-2 pl-3 border-l-2 border-border/40">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">Analogy Frequency</Label>
                    <span className="text-xs font-mono text-muted-foreground/60">
                      {localPersonality.analogy_frequency}/5
                    </span>
                  </div>
                  <Slider
                    value={[localPersonality.analogy_frequency]}
                    min={0}
                    max={5}
                    step={1}
                    onValueChange={([newValue]) => updateTrait("analogy_frequency", newValue)}
                  />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
                    <span>Never</span>
                    <span>Always</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="pt-4 border-t border-border/60">
            <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-primary" />
              Custom Instructions
            </h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Persona Description
                </Label>
                <Textarea
                  value={localPersonality.persona_description}
                  onChange={(e) => updateTrait("persona_description", e.target.value)}
                  placeholder="Describe how the AI should behave (e.g., 'Be like a friendly older sibling who loves science')"
                  className="min-h-[60px] text-xs rounded-lg bg-background/90 border-border/80"
                />
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  {localPersonality.persona_description.length}/1000 characters
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Additional Instructions
                </Label>
                <Textarea
                  value={localPersonality.custom_instructions}
                  onChange={(e) => updateTrait("custom_instructions", e.target.value)}
                  placeholder="Any specific rules or preferences (e.g., 'Always use metric units', 'Never use emojis in math explanations')"
                  className="min-h-[80px] text-xs rounded-lg bg-background/90 border-border/80"
                />
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                  {localPersonality.custom_instructions.length}/2000 characters
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl text-xs border-border/80"
          onClick={handleReset}
          disabled={saving}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded-xl text-xs gradient-primary"
          onClick={handleSave}
          disabled={saving || !hasChanges()}
        >
          {saving ? (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {hasChanges() && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <Check className="w-4 h-4 text-primary" />
          <p className="text-xs text-primary font-medium">
            You have unsaved changes
          </p>
        </div>
      )}
    </div>
  );
};

export default PersonalityEditor;
