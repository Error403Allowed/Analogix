"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  ExternalLink,
  FileText,
  GraduationCap,
  Link as LinkIcon,
  Loader2,
  Palette,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SUBJECT_CATALOG,
  getGradeBand,
  getSubjectDescription,
} from "@/constants/subjects";
import {
  subjectStore,
  type CustomSubject,
  type SubjectData,
  type SubjectHomework,
  type SubjectLink,
} from "@/utils/subjectStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getGroqCompletion } from "@/services/groq";
import type { ChatMessage } from "@/types/chat";
import { extractFileText, ACCEPTED_FILE_TYPES } from "@/utils/extractFileText";
import { useTabs } from "@/context/TabsContext";
import { SUBJECT_COLORS } from "@/components/ColorPicker";
import { DynamicIcon } from "@/components/IconPicker";
import { SubjectCustomizationSheet } from "@/components/SubjectCustomizationSheet";

type SubjectPagePrefs = {
  grade?: string;
  state?: string;
  hobbies?: string[];
  learningStyle?: string;
};

const SUBJECT_COVER_STYLES: Record<string, string> = {
  sunset: "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500",
  ocean: "bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500",
  forest: "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500",
  berry: "bg-gradient-to-r from-pink-500 via-rose-500 to-red-500",
  sky: "bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-500",
  twilight: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
  fire: "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500",
  midnight: "bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900",
  gold: "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500",
};

const GRADE_SUMMARY_COPY: Record<ReturnType<typeof getGradeBand>, string> = {
  junior: "Keep this subject simple, visual, and steady so the fundamentals lock in.",
  middle: "Use this workspace to connect ideas, tasks, and revision before they scatter.",
  senior: "Treat this as an exam-prep base with fast access to notes, practice, and output.",
};

const normalizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

function SectionCard({
  icon: Icon,
  title,
  badge,
  description,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/55 bg-card/85 shadow-[0_20px_65px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-muted/35 to-transparent" />
      <div className="relative border-b border-border/40 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-background/85 shadow-sm">
              <Icon className="h-4 w-4 text-foreground/70" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-foreground">{title}</span>
                {badge ? (
                  <span className="rounded-full border border-border/50 bg-background/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                    {badge}
                  </span>
                ) : null}
              </div>
              {description ? (
                <p className="mt-1 text-xs leading-5 text-muted-foreground/70">{description}</p>
              ) : null}
            </div>
          </div>
          {action}
        </div>
      </div>
      <div className="relative p-5">{children}</div>
    </div>
  );
}

export default function SubjectDetail() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find((entry) => entry.id === subjectId);
  const { updateTabLabelByPath } = useTabs();

  const emptyData: SubjectData = {
    id: subjectId,
    marks: [],
    notes: { content: "", lastUpdated: new Date().toISOString(), homework: [], links: [], documents: [] },
  };

  const [data, setData] = useState<SubjectData>(emptyData);
  const [customSubject, setCustomSubject] = useState<CustomSubject | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [homeworkDraft, setHomeworkDraft] = useState({ title: "", dueDate: "", link: "", notes: "" });
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ title: "", url: "" });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [docDraft, setDocDraft] = useState("");
  const [userPrefs, setUserPrefs] = useState<SubjectPagePrefs>({});

  const [assessmentUploading, setAssessmentUploading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const assessmentInputRef = useRef<HTMLInputElement>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const homework = data.notes.homework || [];
  const links = data.notes.links || [];
  const documents = data.notes.documents || [];
  const pendingHomework = homework.filter((item) => !item.completed);
  const pendingCount = pendingHomework.length;
  const avgMark =
    data.marks.length > 0
      ? Math.round(
          data.marks.reduce((sum, mark) => sum + (mark.score / mark.total) * 100, 0) / data.marks.length,
        )
      : null;

  const gradeBand = getGradeBand(userPrefs.grade);
  const appearance = useMemo(() => {
    const colorId = customSubject?.custom_color || "default";
    const colorData = SUBJECT_COLORS.find((color) => color.id === colorId) || SUBJECT_COLORS[0];
    return {
      title: customSubject?.custom_title || subject?.label || "Subject",
      icon: customSubject?.custom_icon || subject?.icon.name || "BookOpen",
      cover: customSubject?.custom_cover,
      color: colorData,
    };
  }, [customSubject, subject]);

  const subjectDescription = subject ? getSubjectDescription(subject.id, userPrefs.grade) : "";
  const workspaceCopy = GRADE_SUMMARY_COPY[gradeBand];

  const nextTask = useMemo(() => {
    if (pendingHomework.length === 0) return null;
    return [...pendingHomework].sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    })[0];
  }, [pendingHomework]);

  const recentDocument = documents[0] || null;
  const focusPanelTitle = nextTask
    ? nextTask.title
    : recentDocument
      ? recentDocument.title || "Untitled document"
      : "Nothing urgent";
  const focusPanelNote = nextTask
    ? nextTask.dueDate
      ? `Due ${nextTask.dueDate}`
      : "Pending task"
    : recentDocument
      ? `Updated ${new Date(recentDocument.lastUpdated).toLocaleDateString()}`
      : "You can start by creating a document or adding a task.";

  useEffect(() => {
    if (appearance.title) {
      updateTabLabelByPath(`/subjects/${subjectId}`, appearance.title, "📖");
    }
  }, [appearance.title, subjectId, updateTabLabelByPath]);

  useEffect(() => {
    const loadPrefs = () => {
      try {
        setUserPrefs(JSON.parse(localStorage.getItem("userPreferences") || "{}") as SubjectPagePrefs);
      } catch {
        setUserPrefs({});
      }
    };

    loadPrefs();
    window.addEventListener("userPreferencesUpdated", loadPrefs);
    return () => window.removeEventListener("userPreferencesUpdated", loadPrefs);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSubjectState = async () => {
      const [subjectData, custom] = await Promise.all([
        subjectStore.getSubject(subjectId),
        subjectStore.getCustomSubject(subjectId),
      ]);
      if (!mounted) return;
      setData(subjectData);
      setCustomSubject(custom);
    };

    const handleSubjectUpdate = () => {
      subjectStore.getSubject(subjectId).then((subjectData) => {
        if (mounted) setData(subjectData);
      });
    };

    const handleCustomUpdate = () => {
      subjectStore.getCustomSubject(subjectId).then((custom) => {
        if (mounted) setCustomSubject(custom);
      });
    };

    loadSubjectState();
    window.addEventListener("subjectDataUpdated", handleSubjectUpdate);
    window.addEventListener("customSubjectsUpdated", handleCustomUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("subjectDataUpdated", handleSubjectUpdate);
      window.removeEventListener("customSubjectsUpdated", handleCustomUpdate);
    };
  }, [subjectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const redirectToLoadingPage = (assessmentText: string, fileName: string) => {
    sessionStorage.setItem(
      "studyGuideJob",
      JSON.stringify({ assessmentText, fileName, subjectId, grade: userPrefs.grade }),
    );
    router.push("/study-guide-loading");
  };

  const handleAssessmentUpload = async (file: File) => {
    setAssessmentUploading(true);
    setAssessmentError(null);
    try {
      const text = await extractFileText(file);
      redirectToLoadingPage(text, file.name);
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : "Couldn't read file. Try pasting instead.");
    } finally {
      setAssessmentUploading(false);
      if (assessmentInputRef.current) assessmentInputRef.current.value = "";
    }
  };

  const submitAssessmentText = (text: string, fileName = "Pasted text") => {
    if (!text.trim()) return;
    redirectToLoadingPage(text, fileName);
    setPasteMode(false);
    setPasteText("");
  };

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="mb-2 text-2xl font-bold text-foreground">Subject not found</h2>
        <Button onClick={() => router.push("/subjects")}>Go back</Button>
      </div>
    );
  }

  const buildContext = () => {
    const hwPending =
      pendingHomework
        .map((item) => `"${item.title}"${item.dueDate ? ` (due ${item.dueDate})` : ""}`)
        .join(", ") || "none";
    const docList = documents.map((doc) => `"${doc.title || "Untitled"}"`).join(", ") || "none";
    return `You are a study assistant in the ${appearance.title} workspace of Analogix.\nDocuments: ${docList}\nPending homework: ${hwPending}\nCompleted tasks: ${homework.filter((item) => item.completed).length}\nMarks average: ${avgMark !== null ? `${avgMark}%` : "none yet"}\nBe concise.`;
  };

  const openChat = () => {
    if (messages.length === 0) {
      let greeting = `Hey! I can see your **${appearance.title}** workspace. `;
      if (pendingCount > 0) {
        greeting += `You've got **${pendingCount} pending task${pendingCount !== 1 ? "s" : ""}**. `;
      }
      if (avgMark !== null) greeting += `Average mark: **${avgMark}%**. `;
      greeting += "\n\nWhat do you need a hand with?";
      setMessages([{ role: "assistant", content: greeting }]);
    }
    setChatOpen(true);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || typing) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setTyping(true);
    try {
      const response = await getGroqCompletion([...messages.slice(-8), userMsg], {
        subjects: [subjectId],
        hobbies: userPrefs.hobbies || [],
        grade: userPrefs.grade,
        learningStyle: userPrefs.learningStyle || "visual",
        responseLength: 2,
        analogyIntensity: 0.1,
        pageContext: buildContext(),
      });
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Couldn't reach AI. Try again." }]);
    } finally {
      setTyping(false);
    }
  };

  const handleAddHomework = async () => {
    if (!homeworkDraft.title.trim()) {
      toast.error("Title required.");
      return;
    }

    const item: SubjectHomework = {
      id: crypto.randomUUID(),
      title: homeworkDraft.title.trim(),
      dueDate: homeworkDraft.dueDate || undefined,
      notes: homeworkDraft.notes.trim() || undefined,
      link: homeworkDraft.link.trim() ? normalizeUrl(homeworkDraft.link) : undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const next = [item, ...homework];
    await subjectStore.updateHomework(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, homework: next } }));
    setHomeworkDraft({ title: "", dueDate: "", link: "", notes: "" });
    setShowHomeworkForm(false);
    toast.success("Task added.");
  };

  const handleToggleHomework = async (id: string) => {
    const next = homework.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
    await subjectStore.updateHomework(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, homework: next } }));
  };

  const handleRemoveHomework = async (id: string) => {
    const next = homework.filter((item) => item.id !== id);
    await subjectStore.updateHomework(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, homework: next } }));
  };

  const handleAddLink = async () => {
    if (!linkDraft.title.trim() || !linkDraft.url.trim()) {
      toast.error("Title and URL required.");
      return;
    }

    const nextLink: SubjectLink = {
      id: crypto.randomUUID(),
      title: linkDraft.title.trim(),
      url: normalizeUrl(linkDraft.url),
      createdAt: new Date().toISOString(),
    };

    const next = [nextLink, ...links];
    await subjectStore.updateLinks(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, links: next } }));
    setLinkDraft({ title: "", url: "" });
    setShowLinkForm(false);
    toast.success("Link saved.");
  };

  const handleRemoveLink = async (id: string) => {
    const next = links.filter((item) => item.id !== id);
    await subjectStore.updateLinks(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, links: next } }));
  };

  const handleCreateDocument = async () => {
    const created = await subjectStore.createDocument(subjectId, docDraft.trim());
    setData((prev) => ({ ...prev, notes: { ...prev.notes, documents: [created, ...(prev.notes.documents || [])] } }));
    setDocDraft("");
    router.push(`/subjects/${subjectId}/document/${created.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative mx-auto max-w-6xl pb-24"
    >
      <div className="absolute left-6 top-16 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="px-1 pb-8 pt-0">
        <button
          onClick={() => router.push("/subjects")}
          className="mb-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Subjects
        </button>

        <div className="relative overflow-hidden rounded-[36px] border border-border/60 bg-card/85 px-6 py-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur md:px-8 md:py-8">
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-36",
              appearance.cover
                ? SUBJECT_COVER_STYLES[appearance.cover]
                : "bg-gradient-to-r from-muted/45 via-background to-muted/25",
            )}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.08),_transparent_35%)]" />
          <div className={cn("absolute -right-10 top-8 h-36 w-36 rounded-full opacity-25 blur-3xl", appearance.color.bg)} />
          <div className="absolute inset-x-0 top-28 h-28 bg-gradient-to-b from-background/0 via-background/85 to-background" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_360px]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
                <span className="rounded-full border border-border/50 bg-background/75 px-3 py-1">Subject Workspace</span>
                {userPrefs.grade ? (
                  <span className="rounded-full border border-border/50 bg-background/75 px-3 py-1">
                    Year {userPrefs.grade}
                  </span>
                ) : null}
                <span className="rounded-full border border-border/50 bg-background/75 px-3 py-1">{gradeBand}</span>
                {appearance.title !== subject.label ? (
                  <span className="rounded-full border border-border/50 bg-background/75 px-3 py-1">
                    {subject.label}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-border/60 bg-background/90 shadow-lg backdrop-blur">
                  <DynamicIcon name={appearance.icon} className={cn("h-9 w-9", appearance.color.text)} />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                    {appearance.title}
                  </h1>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
                    {subjectDescription}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground/80 sm:text-[15px]">
                    {workspaceCopy}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Documents", value: documents.length, icon: FileText },
                  { label: "Pending tasks", value: pendingCount, icon: ClipboardList },
                  { label: "Resources", value: links.length, icon: LinkIcon },
                  { label: "Average mark", value: avgMark !== null ? `${avgMark}%` : "—", icon: GraduationCap },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-border/50 bg-background/75 px-4 py-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/45 bg-muted/40">
                        <stat.icon className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-2xl font-black tracking-tight text-foreground">{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => router.push(`/subjects/${subjectId}/document`)}
                  className="rounded-xl bg-foreground text-background hover:bg-foreground/90"
                >
                  Open Documents
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/flashcards?subjectId=${subjectId}`)}
                  className="rounded-xl border-border/55 bg-background/80"
                >
                  Flashcards
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/flashcards?tab=quiz&subjectId=${subjectId}`)}
                  className="rounded-xl border-border/55 bg-background/80"
                >
                  Quiz
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCustomizeOpen(true)}
                  className="rounded-xl border-border/55 bg-background/80"
                >
                  <Palette className="mr-2 h-4 w-4" />
                  Customise
                </Button>
              </div>
            </div>

            <div className="rounded-[30px] border border-border/55 bg-background/82 p-5 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground/55">
                Workspace Pulse
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">Next up</h2>

              <div className="mt-4 grid gap-3">
                <div className="rounded-[22px] border border-border/50 bg-card/75 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                    Focus item
                  </p>
                  <p className="mt-2 text-lg font-bold tracking-tight text-foreground">{focusPanelTitle}</p>
                  <p className="mt-2 text-sm text-muted-foreground/75">{focusPanelNote}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[22px] border border-border/50 bg-card/75 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                      Revision mode
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {pendingCount > 0 ? "Task-first" : "Review-ready"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {pendingCount > 0
                        ? "Clear upcoming work, then convert it into flashcards or quizzes."
                        : "No urgent task load. Good time for consolidation and practice."}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-border/50 bg-card/75 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/55">
                      Study guide
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {assessmentUploading ? "Generating" : "Ready"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Drop in an assessment or paste brief notes to generate a structured guide.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 px-1 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <SectionCard
            icon={FileText}
            title="Documents"
            badge={`${documents.length}`}
            description="Draft notes, essays, worked examples, and live subject documents."
            action={
              <button
                onClick={handleCreateDocument}
                className="flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            }
          >
            <div className="mb-4 flex gap-2">
              <input
                placeholder="New document title…"
                value={docDraft}
                onChange={(event) => setDocDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && docDraft.trim() && handleCreateDocument()}
                className="flex-1 rounded-xl border border-border/50 bg-background/80 px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/35 focus:border-primary/50 focus:outline-none"
              />
              <Button
                onClick={handleCreateDocument}
                size="sm"
                disabled={!docDraft.trim()}
                className="h-10 rounded-xl px-4 text-xs"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Create
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/55 bg-background/60 py-10 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm font-semibold text-foreground">No documents yet</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Create a subject doc and start building your workspace.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 6).map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex cursor-pointer items-center gap-3 rounded-[20px] border border-transparent bg-background/55 px-3 py-3 transition-all hover:border-border/50 hover:bg-background/85"
                    onClick={() => router.push(`/subjects/${subjectId}/document/${doc.id}`)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/45 bg-muted/35">
                      <FileText className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.title || "Untitled"}</p>
                      <p className="text-[11px] text-muted-foreground/50">
                        Updated {new Date(doc.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={async (event) => {
                        event.stopPropagation();
                        await subjectStore.removeDocument(subjectId, doc.id);
                        setData(await subjectStore.getSubject(subjectId));
                        toast.success("Deleted.");
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {documents.length > 6 ? (
                  <button
                    onClick={() => router.push(`/subjects/${subjectId}/document`)}
                    className="flex w-full items-center gap-1.5 rounded-[18px] px-3 py-2 text-left text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    View all {documents.length} documents
                  </button>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={ClipboardList}
            title="Tasks"
            badge={pendingCount > 0 ? `${pendingCount} pending` : `${homework.length}`}
            description="Track homework, due dates, and what still needs attention."
            action={
              <button
                onClick={() => setShowHomeworkForm((open) => !open)}
                className="flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            }
          >
            <AnimatePresence>
              {showHomeworkForm ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="space-y-2 rounded-[22px] border border-border/45 bg-background/70 p-3">
                    <input
                      placeholder="Task title…"
                      value={homeworkDraft.title}
                      onChange={(event) => setHomeworkDraft({ ...homeworkDraft, title: event.target.value })}
                      className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={homeworkDraft.dueDate}
                        onChange={(event) => setHomeworkDraft({ ...homeworkDraft, dueDate: event.target.value })}
                        className="flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-muted-foreground transition-colors focus:border-primary/50 focus:outline-none"
                      />
                      <input
                        placeholder="Link (optional)"
                        value={homeworkDraft.link}
                        onChange={(event) => setHomeworkDraft({ ...homeworkDraft, link: event.target.value })}
                        className="flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddHomework} size="sm" className="h-9 flex-1 rounded-xl text-xs">
                        Add task
                      </Button>
                      <Button
                        onClick={() => {
                          setShowHomeworkForm(false);
                          setHomeworkDraft({ title: "", dueDate: "", link: "", notes: "" });
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {homework.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/55 bg-background/60 py-10 text-center">
                <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm font-semibold text-foreground">No tasks yet</p>
                <button
                  onClick={() => setShowHomeworkForm(true)}
                  className="mt-2 text-xs text-primary/70 transition-colors hover:text-primary"
                >
                  Add one →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {homework.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-start gap-3 rounded-[20px] border border-transparent bg-background/55 px-3 py-3 transition-all hover:border-border/50 hover:bg-background/85",
                      item.completed && "opacity-55",
                    )}
                  >
                    <button onClick={() => handleToggleHomework(item.id)} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
                      {item.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/35 transition-colors hover:text-primary/60" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium text-foreground", item.completed && "line-through text-muted-foreground")}>
                        {item.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        {item.dueDate ? (
                          <span
                            className={cn(
                              "text-[11px]",
                              new Date(item.dueDate) < new Date() && !item.completed
                                ? "font-semibold text-red-500"
                                : "text-muted-foreground/45",
                            )}
                          >
                            Due {item.dueDate}
                          </span>
                        ) : null}
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-0.5 text-[11px] text-primary/70 transition-colors hover:text-primary hover:underline"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            Link
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveHomework(item.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={LinkIcon}
            title="Resources"
            badge={`${links.length}`}
            description="Keep reference links, past papers, videos, and important sources close."
            action={
              <button
                onClick={() => setShowLinkForm((open) => !open)}
                className="flex items-center gap-1 text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            }
          >
            <AnimatePresence>
              {showLinkForm ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="space-y-2 rounded-[22px] border border-border/45 bg-background/70 p-3">
                    <div className="flex gap-2">
                      <input
                        placeholder="Title"
                        value={linkDraft.title}
                        onChange={(event) => setLinkDraft({ ...linkDraft, title: event.target.value })}
                        className="flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none"
                      />
                      <input
                        placeholder="https://"
                        value={linkDraft.url}
                        onChange={(event) => setLinkDraft({ ...linkDraft, url: event.target.value })}
                        onKeyDown={(event) => event.key === "Enter" && handleAddLink()}
                        className="flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddLink} size="sm" className="h-9 flex-1 rounded-xl text-xs">
                        Save link
                      </Button>
                      <Button
                        onClick={() => {
                          setShowLinkForm(false);
                          setLinkDraft({ title: "", url: "" });
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {links.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/55 bg-background/60 py-10 text-center">
                <LinkIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/25" />
                <p className="text-sm font-semibold text-foreground">No links saved</p>
                <button
                  onClick={() => setShowLinkForm(true)}
                  className="mt-2 text-xs text-primary/70 transition-colors hover:text-primary"
                >
                  Add one →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {links.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 rounded-[20px] border border-transparent bg-background/55 px-3 py-3 transition-all hover:border-border/50 hover:bg-background/85"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/45 bg-muted/35">
                      <LinkIcon className="h-4 w-4 text-muted-foreground/55" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="block truncate text-[11px] text-primary/60 transition-colors hover:text-primary hover:underline"
                      >
                        {item.url}
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/35 transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleRemoveLink(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/35 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5 lg:col-span-5">
          <div className="sticky top-6 space-y-5">
            <SectionCard
              icon={BookOpen}
              title="Study Guide Generator"
              badge="AI"
              description="Upload an assessment or paste notes and Analogix will structure the study guide for you."
              action={<Sparkles className="h-4 w-4 text-primary/70" />}
            >
              <div className="space-y-4">
                <div
                  className={cn(
                    "group relative cursor-pointer rounded-[24px] border-2 border-dashed p-6 text-center transition-all",
                    assessmentUploading
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 bg-background/70 hover:border-primary/45 hover:bg-primary/5",
                  )}
                  onClick={() => !assessmentUploading && assessmentInputRef.current?.click()}
                >
                  <input
                    ref={assessmentInputRef}
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleAssessmentUpload(file);
                    }}
                  />

                  {assessmentUploading ? (
                    <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-primary">Generating your guide…</p>
                      <p className="text-[11px] text-muted-foreground/55">This usually takes about 30 seconds</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/55 transition-colors group-hover:bg-primary/10">
                        <Upload className="h-5 w-5 text-muted-foreground/55 transition-colors group-hover:text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Upload assessment</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/55">
                          PDF, TXT, or DOC and the guide builds from there
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {["Summary", "Practice", "Revision plan"].map((item) => (
                    <div
                      key={item}
                      className="rounded-[18px] border border-border/45 bg-background/70 px-3 py-3 text-center text-xs font-semibold text-muted-foreground/80"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {!pasteMode ? (
                    <button
                      onClick={() => setPasteMode(true)}
                      className="w-full py-1 text-center text-xs text-muted-foreground/50 transition-colors hover:text-primary"
                    >
                      Or paste your notes instead →
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <textarea
                        value={pasteText}
                        onChange={(event) => setPasteText(event.target.value)}
                        placeholder="Paste your assessment details or notes here…"
                        rows={5}
                        className="w-full resize-none rounded-[22px] border border-border/50 bg-background/75 px-3 py-3 text-sm transition-colors placeholder:text-muted-foreground/35 focus:border-primary/50 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => pasteText.trim() && submitAssessmentText(pasteText)}
                          disabled={!pasteText.trim() || assessmentUploading}
                          size="sm"
                          className="h-9 flex-1 rounded-xl text-xs"
                        >
                          {assessmentUploading ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1 h-3.5 w-3.5" />
                          )}
                          Generate
                        </Button>
                        <Button
                          onClick={() => {
                            setPasteMode(false);
                            setPasteText("");
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-xl text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {assessmentError ? (
                  <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{assessmentError}</p>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard
              icon={Sparkles}
              title="Launchpad"
              description="Fast jumps into the main study flows for this subject."
            >
              <div className="grid gap-2">
                {[
                  {
                    label: "Open full document list",
                    onClick: () => router.push(`/subjects/${subjectId}/document`),
                  },
                  {
                    label: "Review flashcards",
                    onClick: () => router.push(`/flashcards?subjectId=${subjectId}`),
                  },
                  {
                    label: "Start a quiz",
                    onClick: () => router.push(`/flashcards?tab=quiz&subjectId=${subjectId}`),
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="flex items-center justify-between rounded-[18px] border border-border/45 bg-background/70 px-4 py-3 text-left text-sm font-medium text-foreground transition-all hover:border-border/70 hover:bg-background"
                  >
                    {action.label}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/55" />
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="flex h-[460px] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:w-96"
            >
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">{appearance.title} Assistant</p>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "max-w-[88%] rounded-xl px-3 py-2.5 text-sm leading-relaxed",
                      msg.role === "assistant"
                        ? "bg-muted/50 text-foreground"
                        : "ml-auto bg-primary/10 text-right text-foreground",
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {typing ? (
                  <div className="w-12 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <span className="animate-pulse">···</span>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2 border-t border-border/40 p-3">
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleChatSend()}
                  placeholder={`Ask about ${appearance.title}…`}
                  className="h-9 rounded-lg border-border/50 text-sm"
                />
                <Button onClick={handleChatSend} size="icon" className="h-9 w-9 shrink-0 rounded-lg">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={chatOpen ? () => setChatOpen(false) : openChat}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-lg transition-all hover:bg-muted/40 hover:text-foreground"
        >
          <AnimatePresence mode="wait">
            {chatOpen ? (
              <motion.div
                key="x"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="sparkles"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <SubjectCustomizationSheet
        subjectId={subject.id}
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        onCustomizationChange={() => {
          subjectStore.getCustomSubject(subject.id).then(setCustomSubject);
        }}
      />
    </motion.div>
  );
}
