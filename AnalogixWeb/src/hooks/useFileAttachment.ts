import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { extractFileText } from "@/utils/extractFileText";
import { flashcardStore } from "@/utils/flashcardStore";
import { generateQuizFromDocument, generateFlashcardsFromDocument } from "@/services/groq";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";

export interface Attachment {
  name: string;
  size: number;
  type: string;
  content: string;
  extractedText: string;
  previewUrl?: string;
  isImage?: boolean;
}

export function useFileAttachment(options: {
  selectedSubject: SubjectId | null;
  userSubjects: string[];
  userPrefs: any;
  router: any;
}) {
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const [fileExtracting, setFileExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const [generatingStudyGuide, setGeneratingStudyGuide] = useState(false);
  const [studyGuideGenerated, setStudyGuideGenerated] = useState(false);

  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);

  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardsGenerated, setFlashcardsGenerated] = useState(false);

  const processFiles = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) {
      console.warn("[Chat] No files selected");
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileExtracting(true);
    const newAttachments: Attachment[] = [];

    for (const file of fileList) {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      try {
        const extractedText = await extractFileText(file);
        newAttachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: "",
          extractedText,
          previewUrl,
          isImage,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        if (isImage) {
          newAttachments.push({
            name: file.name,
            size: file.size,
            type: file.type,
            content: "",
            extractedText: `[Image attached: ${file.name}. No text could be extracted.]`,
            previewUrl,
            isImage,
          });
          toast.message(`Added "${file.name}" without text extraction.`);
        } else {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          toast.error(`Failed to upload "${file.name}": ${errorMessage}`);
        }
      }
    }

    setAttachedFiles(prev => [...prev, ...newAttachments]);
    setFileExtracting(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    processFiles(fileList);
  }, [processFiles]);

  const isFileDrag = useCallback((e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes("Files"), []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isFileDrag(e)) return;
    setIsDraggingFiles(false);
    const fileList = Array.from(e.dataTransfer.files || []);
    processFiles(fileList);
  }, [processFiles, isFileDrag]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingFiles(true);
  }, [isFileDrag]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFiles(false);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachedFiles(prev => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleGenerateStudyGuide = useCallback(async () => {
    if (attachedFiles.length === 0 || generatingStudyGuide) return;
    const subjectToUse = options.selectedSubject || options.userSubjects[0] || "general";
    const combinedText = attachedFiles
      .map(f => `File: ${f.name}\n\n${f.extractedText}`)
      .join("\n\n---\n\n");
    const fileName = attachedFiles.map(f => f.name).join(", ");
    const studyGuideData = {
      text: combinedText,
      file: fileName,
      subject: subjectToUse,
      grade: options.userPrefs.grade || "",
    };
    sessionStorage.setItem("pendingStudyGuide", JSON.stringify(studyGuideData));
    localStorage.setItem("pendingStudyGuide", JSON.stringify(studyGuideData));
    options.router.push("/study-guide-loading");
  }, [options.selectedSubject, attachedFiles, generatingStudyGuide, options.userPrefs.grade, options.userSubjects, options.router]);

  const handleGenerateQuiz = useCallback(async () => {
    if (!options.selectedSubject || attachedFiles.length === 0 || generatingQuiz) return;
    setGeneratingQuiz(true);
    try {
      const combinedText = attachedFiles.map(f => `File: ${f.name}\n\n${f.extractedText}`).join("\n\n---\n\n");
      const subject = SUBJECT_CATALOG.find(s => s.id === options.selectedSubject);
      const result = await generateQuizFromDocument({
        documentContent: combinedText,
        fileName: attachedFiles.map(f => f.name).join(", "),
        subject: subject?.label,
        grade: options.userPrefs.grade,
        numberOfQuestions: 10,
      });
      if (!result) throw new Error("Failed to generate quiz");
      sessionStorage.setItem("pendingQuiz", JSON.stringify(result));
      setQuizGenerated(true);
      setTimeout(() => setQuizGenerated(false), 3000);
      options.router.push(`/quiz?subject=${options.selectedSubject}`);
    } catch (error) {
      console.error("Failed to generate quiz:", error);
    } finally {
      setGeneratingQuiz(false);
    }
  }, [options.selectedSubject, attachedFiles, generatingQuiz, options.userPrefs.grade, options.router]);

  const handleGenerateFlashcards = useCallback(async () => {
    if (!options.selectedSubject || attachedFiles.length === 0 || generatingFlashcards) return;
    setGeneratingFlashcards(true);
    try {
      const combinedText = attachedFiles.map(f => `File: ${f.name}\n\n${f.extractedText}`).join("\n\n---\n\n");
      const subject = SUBJECT_CATALOG.find(s => s.id === options.selectedSubject);
      const result = await generateFlashcardsFromDocument({
        documentContent: combinedText,
        fileName: attachedFiles.map(f => f.name).join(", "),
        subject: subject?.label,
        grade: options.userPrefs.grade,
        count: 20,
      });
      if (result.length === 0) throw new Error("Failed to generate flashcards");
      const docSet = await flashcardStore.createSet(options.selectedSubject, attachedFiles.map(f => f.name.replace(/\.[^/.]+$/, "")).join(", ") || "From document");
      if (docSet) {
        await flashcardStore.add(result.map(f => ({ setId: docSet.id, subjectId: options.selectedSubject, front: f.front, back: f.back })));
      }
      setFlashcardsGenerated(true);
      setTimeout(() => setFlashcardsGenerated(false), 3000);
      options.router.push(`/flashcards?subjectId=${options.selectedSubject}`);
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
    } finally {
      setGeneratingFlashcards(false);
    }
  }, [options.selectedSubject, attachedFiles, generatingFlashcards, options.userPrefs.grade, options.router]);

  return {
    attachedFiles, setAttachedFiles,
    fileExtracting, setFileExtracting,
    fileInputRef,
    isDraggingFiles, setIsDraggingFiles,
    generatingStudyGuide, setGeneratingStudyGuide,
    studyGuideGenerated, setStudyGuideGenerated,
    generatingQuiz, setGeneratingQuiz,
    quizGenerated, setQuizGenerated,
    generatingFlashcards, setGeneratingFlashcards,
    flashcardsGenerated, setFlashcardsGenerated,
    handleFileSelect,
    processFiles,
    handleFileDrop,
    handleDragOver,
    handleDragLeave,
    removeAttachment,
    handleGenerateStudyGuide,
    handleGenerateQuiz,
    handleGenerateFlashcards,
  };
}
