"use client";

import { motion } from "framer-motion";
import {
  Brain,
  FileText,
  Paperclip,
  X,
  RefreshCw,
  Check,
  Target,
  Atom,
  Sigma,
  Settings2,
  Square,
  Send,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ACCEPTED_FILE_TYPES } from "@/utils/extractFileText";
import { GROQ_MODELS } from "@/types/groq-models";
import { getFormulaSheet } from "@/data/formulaSheets";

interface AttachedFile {
  name: string;
  isImage?: boolean;
  previewUrl?: string;
}

interface ChatInputProps {
  attachedFiles: AttachedFile[];
  removeAttachment: (index: number) => void;
  selectedSubject: string | null;
  handleGenerateFlashcards: () => void;
  generatingFlashcards: boolean;
  flashcardsGenerated: boolean;
  handleGenerateQuiz: () => void;
  generatingQuiz: boolean;
  quizGenerated: boolean;
  input: string;
  setInput: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleSend: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileExtracting: boolean;
  showModelSelector: boolean;
  setShowModelSelector: React.Dispatch<React.SetStateAction<boolean>>;
  isInputLocked: boolean;
  selectedModel: string;
  researchMode: boolean;
  setResearchMode: React.Dispatch<React.SetStateAction<boolean>>;
  researchLoading: boolean;
  formulaPanelOpen: boolean;
  setFormulaPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showAISettings: boolean;
  setShowAISettings: React.Dispatch<React.SetStateAction<boolean>>;
  isTyping: boolean;
  streamingId: string | null;
  abortRef: React.MutableRefObject<AbortController | null>;
  setStreamingId: (id: string | null) => void;
  setStreamingContent: (content: string) => void;
  setIsTyping: (value: boolean) => void;
}

const ChatInput = ({
  attachedFiles,
  removeAttachment,
  selectedSubject,
  handleGenerateFlashcards,
  generatingFlashcards,
  flashcardsGenerated,
  handleGenerateQuiz,
  generatingQuiz,
  quizGenerated,
  input,
  setInput,
  textareaRef,
  handleSend,
  fileInputRef,
  handleFileSelect,
  fileExtracting,
  setShowModelSelector,
  isInputLocked,
  selectedModel,
  researchMode,
  setResearchMode,
  researchLoading,
  formulaPanelOpen,
  setFormulaPanelOpen,
  setShowAISettings,
  isTyping,
  streamingId,
  abortRef,
  setStreamingId,
  setStreamingContent,
  setIsTyping,
}: ChatInputProps) => {
  return (
    <>
      {/* Input */}
      <motion.div
      className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="px-3 sm:px-4 pb-[max(env(safe-area-inset-bottom,0px)+8px)] sm:pb-4 pt-2 bg-background">
        <div className="mx-auto w-full max-w-4xl">
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 border border-border/40">
                {file.isImage && file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="w-6 h-6 rounded-md object-cover border border-border/40"
                  />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-xs text-foreground max-w-[120px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {selectedSubject && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateFlashcards}
                  disabled={generatingFlashcards}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  title="Generate flashcards from uploaded documents"
                >
                  {generatingFlashcards ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : flashcardsGenerated ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Brain className="w-3.5 h-3.5" />
                  )}
                  {generatingFlashcards ? 'Generating...' : flashcardsGenerated ? 'Created!' : 'Flashcards'}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  title="Generate quiz from uploaded documents"
                >
                  {generatingQuiz ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : quizGenerated ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Target className="w-3.5 h-3.5" />
                  )}
                  {generatingQuiz ? 'Generating...' : quizGenerated ? 'Created!' : 'Quiz'}
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="relative rounded-2xl bg-card border border-border/50 shadow-lg shadow-black/5" data-tour="chat-input">
          {/* Subtle top gradient accent */}

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask me anything..."
            style={{ minHeight: 56, height: 56 }}
            className="w-full px-4 py-4 text-sm sm:text-base bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40 resize-none leading-relaxed rounded-t-2xl"
          />

          {/* Bottom row of input - separate from textarea */}
          <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1 bg-card rounded-b-2xl">
            {/* Left side: attach + toolbar icons */}
            <div className="flex items-center gap-1">
              {/* Attach file */}
              <div className="relative w-8 h-8 group">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  accept={ACCEPTED_FILE_TYPES}
                  disabled={fileExtracting}
                  aria-label="Attach files"
                />
                <button
                  type="button"
                  disabled={fileExtracting}
                  className="w-8 h-8 rounded-lg bg-transparent hover:bg-muted/60 flex items-center justify-center text-muted-foreground/60 transition-all disabled:opacity-50 group-hover:text-foreground"
                  title={fileExtracting ? "Extracting file…" : "Attach files"}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  {fileExtracting
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Paperclip className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Model selector button */}
              <button
                type="button"
                onClick={() => setShowModelSelector(true)}
                disabled={isInputLocked}
                className="h-8 px-2.5 rounded-lg hover:bg-muted/60 flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70 transition-all hover:text-foreground disabled:opacity-40"
                title="Select AI model"
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline truncate max-w-[130px]">
                  {GROQ_MODELS.find(m => m.id === selectedModel)?.name || "Auto"}
                </span>
              </button>

              {/* Research mode */}
              <button
                type="button"
                onClick={() => setResearchMode(p => !p)}
                disabled={isInputLocked}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 ${researchMode ? "text-primary bg-primary/10" : "text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground"}`}
                title={researchMode ? "Research mode on" : "Research mode off"}
              >
                {researchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Atom className="w-3.5 h-3.5" />}
              </button>

              {/* Formula sheet — only if subject has formulas */}
              {getFormulaSheet(selectedSubject || "") && (
                <button
                  type="button"
                  onClick={() => setFormulaPanelOpen(o => !o)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${formulaPanelOpen ? "text-primary bg-primary/10" : "text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground"}`}
                  title="Formula sheet"
                >
                  <Sigma className="w-3.5 h-3.5" />
                </button>
              )}

              {/* AI Settings button */}
              <button
                type="button"
                onClick={() => setShowAISettings(true)}
                disabled={isInputLocked}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground"
                title="AI Settings"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right side: send/stop button */}
            {(isTyping || streamingId) ? (
              <button
                type="button"
                onClick={() => { abortRef.current?.abort(); setStreamingId(null); setStreamingContent(""); setIsTyping(false); }}
                className="w-9 h-9 rounded-lg bg-muted/60 hover:bg-muted flex items-center justify-center text-foreground/70 transition-all"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() && attachedFiles.length === 0}
                className="w-9 h-9 rounded-lg bg-primary hover:bg-primary/90 flex items-center justify-center text-white transition-all hover:shadow-md hover:shadow-primary/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none disabled:hover:shadow-none"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        </div>
        </div>
      </motion.div>
    </>
  );
};

export default ChatInput;
