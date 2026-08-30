"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Check, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Edit3, Loader2, Plus, RotateCcw, Trash2, Trophy, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, cardStyles } from "@/lib/utils";
import { DynamicIcon } from "@/components/shared/IconPicker";
import { IconBadge } from "@/components/shared/IconBadge";
import { FlipCard, StudyCardContent } from "./card-components";
import { subjectLabel, subjectIconName, type CardSet, type SetTab } from "./types";
import type { Flashcard, FlashcardRating } from "@/utils/flashcardStore";

export interface SetDetailViewProps {
  activeSet: CardSet;
  activeSetTab: SetTab;
  reviewCards: Flashcard[];
  reviewIndex: number;
  reviewComplete: boolean;
  flipped: boolean;
  learnCards: Flashcard[];
  learnIndex: number;
  learnComplete: boolean;
  learnFlipped: boolean;
  learnAnswers: Array<"correct" | "incorrect" | null>;
  learnReady: boolean;
  editingId: string | null;
  editFront: string;
  editBack: string;
  onSetActiveSetTab: (tab: SetTab) => void;
  onSetFlipped: (flipped: boolean) => void;
  onHandleRate: (rating: FlashcardRating) => void;
  onGoToPreviousReviewCard: () => void;
  onGoToNextReviewCard: () => void;
  onHandleLearnAnswer: (correct: boolean) => void;
  onResetReview: () => void;
  onResetLearn: () => void;
  onBeginEdit: (card: Flashcard) => void;
  onSaveEdit: () => void;
  onDeleteCard: (id: string) => void;
  onDeleteSet: (setId: string, setName: string) => void;
  onAddCards: (subjectId: string) => void;
  onBack: () => void;
  onSetEditingId: (id: string | null) => void;
  setEditFront: (text: string) => void;
  setEditBack: (text: string) => void;
}

export function SetDetailView(props: SetDetailViewProps) {
  const { activeSet, activeSetTab } = props;

  return (
    <motion.div
      key="set-detail"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <IconBadge size="sm">
            <DynamicIcon name={subjectIconName(activeSet.set.subjectId)} className="w-4 h-4 text-primary" />
          </IconBadge>
          <span className="text-xs font-bold text-muted-foreground">{subjectLabel(activeSet.set.subjectId)}</span>
        </div>
        <h2 className="text-3xl font-black mb-0.5">{activeSet.set.name}</h2>
        <p className="text-sm text-muted-foreground">{activeSet.cards.length} card{activeSet.cards.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-8">
        {([
          { tab: "flashcards" as SetTab, label: "Flashcards", icon: Zap },
          { tab: "learn" as SetTab, label: "Learn", icon: Brain },
        ] as const).map(({ tab, label, icon: Icon }) => (
          <button key={tab}
            onClick={() => props.onSetActiveSetTab(tab)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold transition-all border-b-2 -mb-px",
              activeSetTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSetTab === "flashcards" && (
          <motion.div key="fc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {props.reviewComplete ? (
              <div className="text-center py-16 space-y-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                  <Trophy className="w-16 h-16 mx-auto text-primary" />
                </motion.div>
                <h3 className="text-2xl font-black">All cards reviewed!</h3>
                <p className="text-muted-foreground text-sm">Top effort. Ready for another round?</p>
                <div className="flex gap-3 justify-center mt-4">
                  <Button variant="outline" onClick={props.onResetReview}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Again
                  </Button>
                  <Button onClick={() => props.onSetActiveSetTab("learn")}>
                    <Brain className="w-4 h-4 mr-2" /> Try Learn
                  </Button>
                </div>
              </div>
            ) : props.reviewCards.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">No cards to review.</div>
            ) : (
              <>
                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                    <span>{props.reviewIndex + 1} / {props.reviewCards.length}</span>
                    <span>{Math.round((props.reviewIndex / props.reviewCards.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${(props.reviewIndex / props.reviewCards.length) * 100}%` }}
                      className="h-full bg-primary rounded-full" />
                  </div>
                </div>

                <div style={{ minHeight: 280 }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={props.reviewCards[props.reviewIndex]?.id}
                      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.22 }}
                    >
                      <FlipCard
                        front={props.reviewCards[props.reviewIndex]?.front || ""}
                        back={props.reviewCards[props.reviewIndex]?.back || ""}
                        flipped={props.flipped}
                        onClick={() => props.onSetFlipped(!props.flipped)}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button onClick={props.onGoToPreviousReviewCard}
                    disabled={props.reviewIndex === 0}
                    className="p-3 rounded-full border border-border hover:bg-muted/60 disabled:opacity-30 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => props.onSetFlipped(!props.flipped)}
                    className="px-6 py-2.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition"
                  >
                    {props.flipped ? "Flip back" : "Flip"}
                  </button>
                  <button onClick={props.onGoToNextReviewCard} className="p-3 rounded-full border border-border hover:bg-muted/60 transition">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> to flip and use
                  <kbd className="mx-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{"\u2190"}</kbd>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{"\u2192"}</kbd>
                  to move between cards.
                </p>

                <AnimatePresence>
                  {props.flipped && (
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>
                      <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">How well did you know this?</p>
                      <div className="grid grid-cols-4 gap-2">
                        {([
                          { rating: 0 as FlashcardRating, label: "Again", cls: "bg-red-500 hover:bg-red-600" },
                          { rating: 2 as FlashcardRating, label: "Hard", cls: "bg-orange-500 hover:bg-orange-600" },
                          { rating: 3 as FlashcardRating, label: "Good", cls: "bg-blue-500 hover:bg-blue-600" },
                          { rating: 5 as FlashcardRating, label: "Easy", cls: "bg-emerald-500 hover:bg-emerald-600" },
                        ]).map(({ rating, label, cls }) => (
                          <motion.button key={rating} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                            onClick={() => props.onHandleRate(rating)}
                            className={cn("py-3.5 rounded-xl font-bold text-sm text-white transition-colors", cls)}
                          >
                            {label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pt-8 border-t border-border space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                      Terms ({activeSet.cards.length})
                    </h3>
                    <Button size="sm" variant="outline"
                      onClick={() => props.onAddCards(activeSet.set.subjectId)}
                      className="text-xs gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                  {activeSet.cards.map(card => (
                    <div key={card.id} className={cardStyles.default}>
                      {props.editingId === card.id ? (
                        <div className="p-4 space-y-3">
                          <textarea value={props.editFront} onChange={e => props.setEditFront(e.target.value)} rows={2}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Term" />
                          <textarea value={props.editBack} onChange={e => props.setEditBack(e.target.value)} rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Definition" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={props.onSaveEdit}><Check className="w-3.5 h-3.5 mr-1.5" /> Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => props.onSetEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-4 p-4">
                          <div className="flex-1 grid sm:grid-cols-2 gap-3 min-w-0">
                            <StudyCardContent
                              content={card.front}
                              className="text-sm font-semibold border-b border-border/50 pb-2 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4"
                            />
                            <StudyCardContent
                              content={card.back}
                              className="text-sm text-foreground/75"
                            />
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => props.onBeginEdit(card)} className="p-1.5 rounded-lg hover:bg-muted/60 transition">
                              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => props.onDeleteCard(card.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeSetTab === "learn" && (
          <motion.div key="learn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            {!props.learnReady ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Setting up...
              </div>
            ) : props.learnComplete ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 space-y-4 w-full max-w-xl"
              >
                <Trophy className="w-16 h-16 mx-auto text-primary" />
                <h3 className="text-2xl font-black">Learn session done!</h3>
                <p className="text-muted-foreground">
                  {props.learnAnswers.filter(a => a === "correct").length} of {props.learnCards.length} correct
                </p>
                <div className="flex flex-wrap justify-center gap-2 py-2">
                  {props.learnAnswers.map((ans, i) => (
                    <div key={i} className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      ans === "correct" ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500",
                    )}>{ans === "correct" ? "\u2713" : "\u2717"}</div>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={props.onResetLearn}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Again
                  </Button>
                </div>
              </motion.div>
            ) : props.learnCards.length === 0 ? (
              <p className="py-16 text-muted-foreground text-sm">No cards to learn.</p>
            ) : (
              <div className="w-full max-w-2xl space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                    <span>{props.learnIndex + 1} / {props.learnCards.length}</span>
                    <span className="text-blue-500 font-black">Learn Mode</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${(props.learnIndex / props.learnCards.length) * 100}%` }}
                      className="h-full bg-blue-500 rounded-full" />
                  </div>
                </div>

                <div style={{ minHeight: 280 }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={props.learnCards[props.learnIndex]?.id}
                      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.22 }}
                    >
                      <FlipCard
                        front={props.learnCards[props.learnIndex]?.front || ""}
                        back={props.learnCards[props.learnIndex]?.back || ""}
                        flipped={props.learnFlipped}
                        onClick={() => props.onSetFlipped(!props.learnFlipped)}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {props.learnFlipped && props.learnAnswers[props.learnIndex] === null && (
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex gap-3 justify-center"
                    >
                      <button onClick={() => props.onHandleLearnAnswer(false)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition"
                      >
                        <XCircle className="w-5 h-5" /> Still learning
                      </button>
                      <button onClick={() => props.onHandleLearnAnswer(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20 transition"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Got it
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-center text-[11px] text-muted-foreground">
                  Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> to flip,
                  <kbd className="mx-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{"\u2190"}</kbd>
                  for still learning, and
                  <kbd className="mx-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{"\u2192"}</kbd>
                  for got it.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
