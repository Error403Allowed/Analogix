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
  Copy,
  MoreVertical,
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
import { extractFileText } from "@/utils/extractFileText";
import { useTabs } from "@/context/TabsContext";
import { SUBJECT_COLORS } from "@/components/ColorPicker";
import { DynamicIcon } from "@/components/IconPicker";
import { SubjectCustomizationSheet } from "@/components/SubjectCustomizationSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SubjectPagePrefs = {
  grade?: string;
  state?: string;
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

const normalizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export default function SubjectDetail() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find((entry) => entry.id === subjectId);
  const { updateTabLabelByPath, openTab } = useTabs();

  const [data, setData] = useState<SubjectData>({
    id: subjectId,
    marks: [],
    notes: { content: "", lastUpdated: new Date().toISOString(), homework: [], links: [], documents: [] },
  });
  const [customSubject, setCustomSubject] = useState<CustomSubject | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [homeworkDraft, setHomeworkDraft] = useState({ title: "", dueDate: "", link: "", notes: "" });
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ title: "", url: "" });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [docDraft, setDocDraft] = useState("");
  const [userPrefs, setUserPrefs] = useState<SubjectPagePrefs>({});
  const [assessmentUploading, setAssessmentUploading] = useState(false);

  const homework = data.notes.homework || [];
  const links = data.notes.links || [];
  const documents = data.notes.documents || [];
  const pendingCount = homework.filter((item) => !item.completed).length;

  const appearance = useMemo(() => {
    const colorId = customSubject?.custom_color || "default";
    const colorData = SUBJECT_COLORS.find((color) => color.id === colorId) || SUBJECT_COLORS[0];
    return {
      title: customSubject?.custom_title || subject?.label || "Subject",
      icon: customSubject?.custom_icon || subject?.iconName || "BookOpen",
      cover: customSubject?.custom_cover,
      color: colorData,
    };
  }, [customSubject, subject]);

  useEffect(() => {
    if (appearance.title) updateTabLabelByPath(`/subjects/${subjectId}`, appearance.title, "📖");
  }, [appearance.title, subjectId, updateTabLabelByPath]);

  useEffect(() => {
    const load = async () => {
      const [sData, custom] = await Promise.all([
        subjectStore.getSubject(subjectId),
        subjectStore.getCustomSubject(subjectId),
      ]);
      setData(sData);
      setCustomSubject(custom);
      setUserPrefs(JSON.parse(localStorage.getItem("userPreferences") || "{}"));
    };
    load();
  }, [subjectId]);

  const handleCreateDocument = async () => {
    if (!docDraft.trim()) return;
    try {
      const created = await subjectStore.createDocument(subjectId, docDraft.trim());
      setDocDraft("");
      toast.success("Document created");
      const url = `/subjects/${subjectId}/document/${created.id}`;
      openTab(url, created.title || "Untitled", "📄");
      router.push(url);
    } catch {
      toast.error("Failed to create document");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await subjectStore.removeDocument(subjectId, docId);
      setData(prev => ({
        ...prev,
        notes: { ...prev.notes, documents: (prev.notes.documents || []).filter(d => d.id !== docId) }
      }));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const handleDuplicateDocument = async (docId: string) => {
    try {
      const created = await subjectStore.duplicateDocument(subjectId, docId);
      setData(prev => ({
        ...prev,
        notes: { ...prev.notes, documents: [created, ...(prev.notes.documents || [])] }
      }));
      toast.success("Document duplicated");
    } catch {
      toast.error("Failed to duplicate document");
    }
  };

  const handleUpdateDocumentIcon = async (docId: string, icon: string) => {
    try {
      await subjectStore.updateDocument(subjectId, docId, { icon });
      setData(prev => ({
        ...prev,
        notes: {
          ...prev.notes,
          documents: (prev.notes.documents || []).map(d => d.id === docId ? { ...d, icon } : d)
        }
      }));
      toast.success("Icon updated");
    } catch {
      toast.error("Failed to update icon");
    }
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

  const handleAddHomework = async () => {
    if (!homeworkDraft.title.trim()) return;
    const item: SubjectHomework = {
      id: crypto.randomUUID(),
      title: homeworkDraft.title.trim(),
      dueDate: homeworkDraft.dueDate || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...homework];
    await subjectStore.updateHomework(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, homework: next } }));
    setHomeworkDraft({ title: "", dueDate: "", link: "", notes: "" });
    setShowHomeworkForm(false);
  };

  if (!subject) return null;

  return (
    <div className="notion-ui min-h-screen bg-background text-foreground fade-in">
      {/* Cover */}
      <div className={cn("h-48 w-full", appearance.cover ? SUBJECT_COVER_STYLES[appearance.cover] : "bg-muted/20")} />
      
      <div className="mx-auto max-w-5xl px-6 pb-24">
        {/* Header Section */}
        <div className="relative -mt-12 mb-12">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-background bg-card text-4xl shadow-xl">
            <DynamicIcon name={appearance.icon} />
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{appearance.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground/60">
                {getSubjectDescription(subjectId as any, userPrefs.grade)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)} className="rounded-lg h-9">
                <Palette className="mr-2 h-4 w-4" />
                Customise
              </Button>
              <Button size="sm" onClick={() => router.push("/chat")} className="rounded-lg h-9">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Tutor
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Main Content (Documents) */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary/60" />
                  Documents
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="New page..."
                    value={docDraft}
                    onChange={(e) => setDocDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateDocument()}
                    className="h-8 w-40 rounded-md border border-border bg-background px-3 text-xs outline-none focus:border-primary/50"
                  />
                  <button onClick={handleCreateDocument} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 py-12 text-center bg-muted/5">
                  <p className="text-sm text-muted-foreground">No documents yet. Create your first page above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-border/80 hover:shadow-md"
                      onClick={() => {
                        const url = `/subjects/${subjectId}/document/${doc.id}`;
                        openTab(url, doc.title || "Untitled", doc.icon || "📄");
                        router.push(url);
                      }}
                    >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-xl shadow-sm hover:bg-muted transition-colors relative group/icon overflow-hidden">
                      {doc.cover && (
                        <div className={cn("absolute inset-0 opacity-20", SUBJECT_COVER_STYLES[doc.cover])} />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="w-full h-full">
                            {doc.icon || "📄"}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="p-2 grid grid-cols-6 gap-1 rounded-2xl shadow-2xl border-border/50">
                          {["📄", "📝", "📘", "📖", "🎓", "🧪", "🧬", "🧪", "🧮", "🎨", "🎭", "🎼", "🌍", "🗺️", "🏛️", "⚖️", "💡", "🧠", "📅", "✅", "🌟", "🔥", "🚀", "🛠️"].map((emoji) => (
                            <DropdownMenuItem
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateDocumentIcon(doc.id, emoji);
                              }}
                              className="flex h-10 w-10 items-center justify-center rounded-lg p-0 text-xl cursor-pointer hover:bg-muted"
                            >
                              {emoji}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors">
                          {doc.title || "Untitled"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest">
                          {new Date(doc.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-md transition-all">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem onClick={() => handleDuplicateDocument(doc.id)} className="gap-2 text-xs">
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteDocument(doc.id)} className="gap-2 text-xs text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Links/Resources Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary/60" />
                  Resources
                </h2>
                <button onClick={() => setShowLinkForm(!showLinkForm)} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {links.length === 0 && !showLinkForm && (
                  <p className="text-sm text-muted-foreground/60 italic">No resources saved for this subject.</p>
                )}
                {links.map(link => (
                  <div key={link.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-all border border-transparent hover:border-border/40">
                    <div className="h-8 w-8 rounded-md bg-muted/20 flex items-center justify-center">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <a href={link.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline block truncate">
                        {link.title}
                      </a>
                      <p className="text-[10px] text-muted-foreground/40 truncate">{link.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar (Tasks & Pulse) */}
          <div className="space-y-12">
            <section className="rounded-2xl border border-border bg-muted/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Tasks
                </h2>
                <button onClick={() => setShowHomeworkForm(!showHomeworkForm)} className="p-1 hover:bg-muted rounded-md transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {showHomeworkForm && (
                  <div className="space-y-2 mb-4 p-3 bg-background border border-border rounded-xl shadow-sm">
                    <input
                      autoFocus
                      placeholder="What needs to be done?"
                      value={homeworkDraft.title}
                      onChange={e => setHomeworkDraft({...homeworkDraft, title: e.target.value})}
                      className="w-full text-sm outline-none bg-transparent"
                    />
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <input
                        type="date"
                        value={homeworkDraft.dueDate}
                        onChange={e => setHomeworkDraft({...homeworkDraft, dueDate: e.target.value})}
                        className="text-[10px] text-muted-foreground bg-transparent outline-none"
                      />
                      <button onClick={handleAddHomework} className="text-[10px] font-bold text-primary hover:underline">
                        Add Task
                      </button>
                    </div>
                  </div>
                )}
                
                {homework.length === 0 && !showHomeworkForm && (
                  <p className="text-xs text-muted-foreground/50 italic">All caught up!</p>
                )}
                
                {homework.map(task => (
                  <div key={task.id} className="flex items-start gap-3 group">
                    <button onClick={() => handleToggleHomework(task.id)} className="mt-0.5 shrink-0">
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/30 hover:text-primary/50 transition-colors" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium leading-tight", task.completed && "line-through text-muted-foreground/60")}>
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <p className="text-[10px] text-muted-foreground/40 mt-1">Due {task.dueDate}</p>
                      )}
                    </div>
                    <button onClick={() => handleRemoveHomework(task.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Assessment Dropzone - Minimalist */}
            <section className="rounded-2xl border border-dashed border-border/60 p-6 text-center bg-muted/5 transition-colors hover:bg-muted/10 cursor-pointer">
              <Upload className="mx-auto h-6 w-6 text-muted-foreground/30 mb-3" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Upload Assessment</h3>
              <p className="mt-2 text-[10px] text-muted-foreground/40 leading-relaxed">
                Drop your rubric or prompt here to generate a custom study guide.
              </p>
            </section>
          </div>
        </div>
      </div>

      <SubjectCustomizationSheet
        subjectId={subjectId as any}
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
      />
    </div>
  );
}
