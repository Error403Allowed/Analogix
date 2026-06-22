"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, Plus, RotateCcw } from "lucide-react";
import { WorkspaceScaffold, Panel } from "@/components/v2/WorkspaceScaffold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flashcardStore, type Flashcard, type FlashcardSet } from "@/utils/flashcardStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";

type Stage = "library" | "workspace" | "session";

export default function FlashcardsStudio() {
  const [stage, setStage] = useState<Stage>("library");
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const refresh = async () => {
    const [allSets, allCards] = await Promise.all([flashcardStore.getSets(), flashcardStore.getAll()]);
    setSets(allSets);
    setCards(allCards);
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeSet = useMemo(() => sets.find((set) => set.id === activeSetId) ?? null, [sets, activeSetId]);
  const activeCards = useMemo(
    () => cards.filter((card) => card.setId === activeSetId),
    [cards, activeSetId],
  );
  const current = activeCards[index];

  const createSet = async () => {
    if (!newSetName.trim()) return;
    const subjectId = SUBJECT_CATALOG[0]?.id ?? "math";
    const created = await flashcardStore.createSet(subjectId, newSetName.trim());
    if (!created) return;
    setNewSetName("");
    setCreating(false);
    await refresh();
  };

  const addCard = async () => {
    if (!activeSet || !front.trim() || !back.trim()) return;
    await flashcardStore.add([
      {
        setId: activeSet.id,
        subjectId: activeSet.subjectId,
        front: front.trim(),
        back: back.trim(),
      },
    ]);
    setFront("");
    setBack("");
    await refresh();
  };

  const rate = async (rating: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!current) return;
    await flashcardStore.review(current.id, rating);
    setShowAnswer(false);
    setIndex((prev) => (prev + 1 >= activeCards.length ? 0 : prev + 1));
    await refresh();
  };

  return (
    <WorkspaceScaffold
      title="Flashcard Studio"
      subtitle="Library, deck workspace, and a focused study session flow."
      actions={
        <Button variant="outline" size="sm" onClick={() => setStage("library")}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset View
        </Button>
      }
      rail={
        <Panel title="Session Status">
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Stage: <span className="text-foreground">{stage}</span></p>
            <p className="text-muted-foreground">Decks: <span className="text-foreground">{sets.length}</span></p>
            <p className="text-muted-foreground">Cards: <span className="text-foreground">{cards.length}</span></p>
          </div>
        </Panel>
      }
    >
      {stage === "library" ? (
        <Panel title="Library" description="Pick a deck to continue or create a new one.">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setCreating((prev) => !prev)}>
              <Plus className="mr-2 h-4 w-4" />
              New Deck
            </Button>
          </div>
          {creating ? (
            <div className="mb-4 flex gap-2">
              <Input value={newSetName} onChange={(e) => setNewSetName(e.target.value)} placeholder="Deck name" />
              <Button onClick={createSet}>Create</Button>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {sets.map((set) => (
              <button
                key={set.id}
                onClick={() => {
                  setActiveSetId(set.id);
                  setStage("workspace");
                }}
                className="rounded-lg border border-border/60 bg-background p-4 text-left transition hover:border-primary/50"
              >
                <p className="text-base font-semibold">{set.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{cards.filter((card) => card.setId === set.id).length} cards</p>
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      {stage === "workspace" && activeSet ? (
        <Panel title={activeSet.name} description="Authoring zone before study session.">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front (term/question)" />
            <Input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back (answer/definition)" />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={addCard}>
              <Check className="mr-2 h-4 w-4" />
              Add Card
            </Button>
            <Button variant="outline" onClick={() => setStage("session")} disabled={activeCards.length === 0}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Start Session
            </Button>
          </div>
          <div className="mt-5 space-y-2">
            {activeCards.map((card) => (
              <div key={card.id} className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                <p className="font-medium">{card.front}</p>
                <p className="text-muted-foreground">{card.back}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {stage === "session" && activeSet && current ? (
        <Panel title={`Session · ${activeSet.name}`} description="Focused review loop with rating-based progress.">
          <div className="rounded-lg border border-border/60 bg-background p-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{showAnswer ? "Answer" : "Prompt"}</p>
            <p className="mt-4 text-2xl font-semibold">{showAnswer ? current.back : current.front}</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => setShowAnswer((prev) => !prev)}>
                Flip
              </Button>
              {[1, 3, 5].map((score) => (
                <Button key={score} onClick={() => rate(score as 1 | 3 | 5)}>
                  Rate {score}
                </Button>
              ))}
            </div>
          </div>
        </Panel>
      ) : null}
    </WorkspaceScaffold>
  );
}
