"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Check, Edit3, RotateCcw, Search, Sparkles, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { flashcardStore, Flashcard, FlashcardRating } from "@/utils/flashcardStore";

const subjectLabel = (id: string) =>
  SUBJECT_CATALOG.find(s => s.id === id)?.label || id;

type View = "library" | "review" | "create";

export default function Flashcards() {
  const router = useRouter();
  const [view, setView] = useState<View>("library");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");

  const [userSubjects, setUserSubjects] = useState<string[]>([]);

  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newSubject, setNewSubject] = useState("math");
  const [creating, setCreating] = useState(false);

  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const load = () => {
      try {
        const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
        setUserSubjects(Array.isArray(prefs.subjects) ? prefs.subjects : []);
      } catch {
        setUserSubjects([]);
      }
    };
    load();
    window.addEventListener("userPreferencesUpdated", load);
    return () => window.removeEventListener("userPreferencesUpdated", load);
  }, []);

  const refresh = useCallback(async () => {
    const [all, due] = await Promise.all([
      flashcardStore.getAll(),
      flashcardStore.getDue(),
    ]);
    setCards(all);
    setDueCards(due);
    return { all, due };
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (dueCards.length === 0) {
      setReviewIndex(0);
      return;
    }
    if (reviewIndex >= dueCards.length) {
      setReviewIndex(dueCards.length - 1);
    }
  }, [dueCards, reviewIndex]);

  const subjectOptions = useMemo(() => {
    const ids = userSubjects.length > 0
      ? userSubjects
      : SUBJECT_CATALOG.map(s => s.id);
    return ids;
  }, [userSubjects]);

  useEffect(() => {
    if (!subjectOptions.length) return;
    if (!subjectOptions.includes(newSubject)) {
      setNewSubject(subjectOptions[0]);
    }
  }, [subjectOptions, newSubject]);

  useEffect(() => {
    if (filterSubject !== "all" && !subjectOptions.includes(filterSubject)) {
      setFilterSubject("all");
    }
  }, [filterSubject, subjectOptions]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter(card => {
      if (filterSubject !== "all" && card.subjectId !== filterSubject) return false;
      if (!q) return true;
      return (
        card.front.toLowerCase().includes(q)
        || card.back.toLowerCase().includes(q)
      );
    });
  }, [cards, filterSubject, query]);

  const totalCount = cards.length;
  const dueCount = dueCards.length;
  const currentCard = dueCards[reviewIndex];

  const startReview = () => {
    if (dueCards.length === 0) return;
    setView("review");
    setReviewIndex(0);
    setReviewedCount(0);
    setFlipped(false);
  };

  const handleRate = async (rating: FlashcardRating) => {
    if (!currentCard) return;
    await flashcardStore.review(currentCard.id, rating);
    setReviewedCount(c => c + 1);
    setFlipped(false);
    const { due } = await refresh();
    if (due.length === 0) {
      setReviewIndex(0);
      return;
    }
    setReviewIndex(i => Math.min(i, due.length - 1));
  };

  const handleCreate = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    setCreating(true);
    await flashcardStore.add([
      { subjectId: newSubject, front: newFront.trim(), back: newBack.trim() },
    ]);
    setNewFront("");
    setNewBack("");
    setCreating(false);
    await refresh();
    setView("library");
  };

  const beginEdit = (card: Flashcard) => {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await flashcardStore.update(editingId, { front: editFront.trim(), back: editBack.trim() });
    setEditingId(null);
    await refresh();
  };

  const deleteCard = async (cardId: string) => {
    const confirmed = typeof window !== "undefined"
      ? window.confirm("Delete this flashcard?")
      : false;
    if (!confirmed) return;
    await flashcardStore.delete(cardId);
    await refresh();
  };

  return (
    <div className="bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}
            className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Flashcard Studio</p>
              <h1 className="text-lg font-semibold">Flashcards</h1>
            </div>
          </div>
          <div className="w-24" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Progress</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{totalCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due today</span>
                  <span className="font-semibold">{dueCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reviewed</span>
                  <span className="font-semibold">{reviewedCount}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Button onClick={startReview} className="gap-2" disabled={dueCount === 0}>
                  <Sparkles className="w-4 h-4" />
                  Review Due
                </Button>
                <Button variant="outline" onClick={() => setView("create")}>Create New</Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Views</p>
              <div className="mt-3 grid gap-2">
                {(["library", "review", "create"] as View[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                      view === item
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:border-primary/50"
                    )}
                  >
                    {item === "library" && "Library"}
                    {item === "review" && "Review"}
                    {item === "create" && "Create"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {view === "library" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Your Library</p>
                      <p className="text-xs text-muted-foreground">Search, edit, and clean up your flashcards.</p>
                    </div>
                    <div className="relative w-full sm:max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search flashcards"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterSubject("all")}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        filterSubject === "all"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All subjects
                    </button>
                    {subjectOptions.map(subjectId => (
                      <button
                        key={subjectId}
                        type="button"
                        onClick={() => setFilterSubject(subjectId)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          filterSubject === subjectId
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {subjectLabel(subjectId)}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                    Loading flashcards...
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                    No flashcards yet. Create your first set.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredCards.map(card => {
                      const isDue = new Date(card.nextReview) <= new Date();
                      const isEditing = editingId === card.id;
                      return (
                        <div key={card.id} className="rounded-2xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{card.front}</p>
                              <p className="text-xs text-muted-foreground mt-1">{card.back}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                  {subjectLabel(card.subjectId)}
                                </Badge>
                                {isDue && (
                                  <Badge className="text-[10px] uppercase tracking-wide">Due</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => beginEdit(card)}
                                className="p-2 rounded-lg border border-border hover:border-primary/60 text-muted-foreground hover:text-foreground"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCard(card.id)}
                                className="p-2 rounded-lg border border-border hover:border-destructive/60 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="mt-4 space-y-2">
                              <Textarea value={editFront} onChange={e => setEditFront(e.target.value)}
                                className="min-h-16" placeholder="Front" />
                              <Textarea value={editBack} onChange={e => setEditBack(e.target.value)}
                                className="min-h-20" placeholder="Back" />
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={saveEdit} className="gap-1">
                                  <Check className="w-4 h-4" />Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {view === "review" && (
              <div className="space-y-4">
                {!currentCard ? (
                  <div className="min-h-[600px] flex flex-col items-center justify-center">
                    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-4">
                      <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-semibold">No flashcards due right now</p>
                        <p className="text-xs text-muted-foreground mt-1">Great work! You're all caught up.</p>
                      </div>
                      <Button onClick={() => setView("library")} variant="outline">Back to Library</Button>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[100dvh] flex flex-col items-center justify-center py-8 px-4">
                    {/* Progress bar */}
                    <div className="w-full max-w-2xl mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold">{reviewIndex + 1} / {dueCards.length}</span>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {subjectLabel(currentCard.subjectId)}
                        </Badge>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${((reviewIndex + 1) / dueCards.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Large flashcard */}
                    <motion.div
                      key={currentCard.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-2xl mb-8"
                    >
                      <motion.button
                        type="button"
                        onClick={() => setFlipped(f => !f)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full aspect-video rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 transition-colors shadow-lg"
                      >
                        <p className="text-sm font-semibold text-primary/70 uppercase tracking-widest mb-4">
                          {flipped ? "Answer" : "Question"}
                        </p>
                        <p className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                          {flipped ? currentCard.back : currentCard.front}
                        </p>
                        <p className="text-xs text-muted-foreground mt-6">Click to {flipped ? "reveal question" : "reveal answer"}</p>
                      </motion.button>
                    </motion.div>

                    {/* Rating buttons */}
                    <div className="w-full max-w-2xl space-y-4 mb-8">
                      {flipped && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="grid grid-cols-2 sm:grid-cols-5 gap-2"
                        >
                          {[
                            { rating: 0, label: "Again", color: "bg-red-500/20 hover:bg-red-500/30 text-red-600" },
                            { rating: 2, label: "Hard", color: "bg-orange-500/20 hover:bg-orange-500/30 text-orange-600" },
                            { rating: 3, label: "Good", color: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-600" },
                            { rating: 4, label: "Easy", color: "bg-green-500/20 hover:bg-green-500/30 text-green-600" },
                            { rating: 5, label: "Perfect", color: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600" },
                          ].map(({ rating, label, color }) => (
                            <motion.button
                              key={rating}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => handleRate(rating as FlashcardRating)}
                              className={`py-3 rounded-xl font-semibold text-sm transition-colors ${color}`}
                            >
                              {label}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="w-full max-w-2xl flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setFlipped(false);
                          if (reviewIndex > 0) {
                            setReviewIndex(reviewIndex - 1);
                            setReviewedCount(Math.max(0, reviewedCount - 1));
                          }
                        }}
                        disabled={reviewIndex === 0}
                        className="gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>

                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Progress</p>
                        <p className="text-2xl font-bold text-foreground">{reviewedCount}</p>
                      </div>

                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setFlipped(false);
                          if (reviewIndex < dueCards.length - 1) {
                            setReviewIndex(reviewIndex + 1);
                          }
                        }}
                        disabled={reviewIndex === dueCards.length - 1}
                        className="gap-2"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Exit button */}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setView("library");
                        setFlipped(false);
                        setReviewIndex(0);
                        setReviewedCount(0);
                      }}
                      className="mt-8 gap-2"
                    >
                      <X className="w-4 h-4" />
                      Exit Review
                    </Button>
                  </div>
                )}
              </div>
            )}

            {view === "create" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold">Create a Flashcard</p>
                  <p className="text-xs text-muted-foreground">Keep it focused. One idea per card.</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Subject</label>
                    <select
                      value={newSubject}
                      onChange={e => setNewSubject(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      {subjectOptions.map(subjectId => (
                        <option key={subjectId} value={subjectId}>{subjectLabel(subjectId)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Front</label>
                    <Textarea
                      value={newFront}
                      onChange={e => setNewFront(e.target.value)}
                      className="mt-2 min-h-20"
                      placeholder="Question or term"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Back</label>
                    <Textarea
                      value={newBack}
                      onChange={e => setNewBack(e.target.value)}
                      className="mt-2 min-h-24"
                      placeholder="Answer or explanation"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleCreate} disabled={creating} className="gap-2">
                      <Check className="w-4 h-4" />
                      {creating ? "Saving..." : "Save Flashcard"}
                    </Button>
                    <Button variant="ghost" onClick={() => setView("library")}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
