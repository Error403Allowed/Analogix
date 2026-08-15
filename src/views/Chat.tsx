"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";
import type { LucideIcon } from "lucide-react";
import {
  RefreshCw,
  Copy,
  Check,
  Shuffle,
  ChevronDown,
  Trash2,
  FileText,
  Lightbulb,
  Beaker,
  BookOpen,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AISettingsSheet from "@/components/settings/AISettingsSheet";
import ModelSelectorSheet from "@/components/settings/ModelSelectorSheet";
import {
  ResponsiveSheet,
  ResponsiveSheetContent,
} from "@/components/ui/responsive-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToolProposalCard } from "@/components/chat/ToolProposalCard";
import { ThinkingBlock } from "@/components/chat/ThinkingBlock";
import { StreamingMessage } from "@/components/chat/StreamingMessage";
import { ReExplainMenu } from "@/components/chat/ReExplainMenu";
import { ResearchSourceCard } from "@/components/chat/ResearchSourceCard";
import { parseThinkingContent } from "@/utils/parse-thinking-content";
import { NeuralNetworkLoader } from "@/components/shared/NeuralNetworkLoader";
import { useChat } from "@/hooks/useChat";
import { ChatSkeleton } from "@/components/layout/PageSkeleton";
import ThreadSidebar from "@/components/chat/ThreadSidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import FormulaPanel from "@/components/chat/FormulaPanel";
import { buildPromptSuggestions, type PromptSuggestion } from "@analogix/shared/prompts";

const SUGGESTION_ICONS: LucideIcon[] = [Lightbulb, Beaker, Calculator, BookOpen];

const Chat = () => {
  const {
    selectedSubject,
    messages,
    input, setInput,
    textareaRef,
    isTyping, setIsTyping,
    streamingId, setStreamingId,
    streamingContent, setStreamingContent,
    abortRef,
    selectedModel, setSelectedModel,
    showModelSelector, setShowModelSelector,
    researchMode, setResearchMode,
    researchLoading,
    showAISettings, setShowAISettings,
    reExplainOpenId, setReExplainOpenId,
    reExplainingId,
    formulaPanelOpen, setFormulaPanelOpen,
    expandedTopics, setExpandedTopics,
    formulaSearch, setFormulaSearch,
    chatSessionId,
    allSessions,
    sessionsLoading,
    threadSearch, setThreadSearch,
    renamingThreadId, setRenamingThreadId,
    renamingThreadName, setRenamingThreadName,
    contextMenu, setContextMenu,
    sidebarOpen, setSidebarOpen,
    attachedFiles,
    fileExtracting,
    fileInputRef,
    generatingQuiz,
    quizGenerated,
    generatingFlashcards,
    flashcardsGenerated,
    pendingProposal,
    copiedId,
    isDraggingFiles,
    messagesEndRef,
    scrollContainerRef,
    showScrollToBottom,
    scrollToBottom,
    userName,
    userHobbies,
    userPrefs,
    availableSubjects,
    allSubjects,
    isInputLocked,
    latestAssistantId,
    router,
    handleCopy,
    handleRegenerate,
    handleReExplain,
    handleAllowTools,
    handleDenyTools,
    handleFileSelect,
    handleFileDrop,
    handleDragOver,
    handleDragLeave,
    removeAttachment,
    handleGenerateFlashcards,
    handleGenerateQuiz,
    updateScrollButton,
    contentRef,
    handleSend,
    handleNewTopic,
    handleSwitchThread,
    handleStartNewChat,
    handleDeleteThread,
    handleRenameThread,
  } = useChat();

  const [initialLoading, setInitialLoading] = useState(true);
  const { state: sidebarState } = useSidebar();
  const isMobile = useIsMobile();

  const [suggestionSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));

  const suggestedPrompts = useMemo<PromptSuggestion[]>(
    () => {
      const currentSubjectLabel = allSubjects.find((s) => s.id === selectedSubject)?.label;
      return buildPromptSuggestions(
        {
          subjects: availableSubjects.map((s) => s.label),
          grade: userPrefs.grade,
          hobbies: userHobbies,
        },
        { currentSubject: currentSubjectLabel, seed: suggestionSeed },
      );
    },
    [allSubjects, availableSubjects, selectedSubject, userPrefs.grade, userHobbies, suggestionSeed],
  );

  useEffect(() => {
    if (sidebarState === "collapsed") {
      setSidebarOpen(false);
    }
  }, [sidebarState, setSidebarOpen]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, setSidebarOpen]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, [setSidebarOpen]);

  const handleMobileStartNewChat = useCallback(() => {
    setSidebarOpen(false);
    handleStartNewChat();
  }, [setSidebarOpen, handleStartNewChat]);

  const handleMobileSwitchThread = useCallback((session: any) => {
    setSidebarOpen(false);
    handleSwitchThread(session);
  }, [setSidebarOpen, handleSwitchThread]);

  useEffect(() => {
    if (!sessionsLoading) {
      const timer = setTimeout(() => setInitialLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [sessionsLoading]);

  if (initialLoading && sessionsLoading) {
    return <ChatSkeleton />;
  }

  return (
    <div className={`h-full flex flex-row relative overflow-hidden bg-background ${sidebarState === "collapsed" ? "pl-3" : ""}`}>
{isMobile ? (
  <ResponsiveSheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
    <ResponsiveSheetContent className="p-0">
      <ThreadSidebar
        variant="mobile"
        sidebarOpen={sidebarOpen}
        handleStartNewChat={handleMobileStartNewChat}
        threadSearch={threadSearch}
        setThreadSearch={setThreadSearch}
        sessionsLoading={sessionsLoading}
        allSessions={allSessions}
        chatSessionId={chatSessionId}
        handleSwitchThread={handleMobileSwitchThread}
        renamingThreadId={renamingThreadId}
        renamingThreadName={renamingThreadName}
        setRenamingThreadName={setRenamingThreadName}
        handleRenameThread={handleRenameThread}
        setRenamingThreadId={setRenamingThreadId}
        setContextMenu={setContextMenu}
      />
    </ResponsiveSheetContent>
  </ResponsiveSheet>
) : (
<ThreadSidebar
        sidebarOpen={sidebarOpen}
        handleStartNewChat={handleStartNewChat}
        threadSearch={threadSearch}
        setThreadSearch={setThreadSearch}
        sessionsLoading={sessionsLoading}
        allSessions={allSessions}
        chatSessionId={chatSessionId}
        handleSwitchThread={handleSwitchThread}
        renamingThreadId={renamingThreadId}
        renamingThreadName={renamingThreadName}
        setRenamingThreadName={setRenamingThreadName}
        handleRenameThread={handleRenameThread}
        setRenamingThreadId={setRenamingThreadId}
        setContextMenu={setContextMenu}
      />
)}

      {/* Context Menu for Thread Actions */}
      {createPortal(
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[9999] min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="rounded-lg border border-border/40 bg-card shadow-lg overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const session = allSessions.find(s => s.id === contextMenu.sessionId);
                  if (session) {
                    setRenamingThreadId(session.id);
                    setRenamingThreadName(session.title);
                    setContextMenu(null);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const session = allSessions.find(s => s.id === contextMenu.sessionId);
                  if (session) {
                    handleDeleteThread(session.id);
                    setContextMenu(null);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      <div className="flex-1 flex flex-col w-full relative overflow-hidden">
<ChatHeader
          onToggleSidebar={handleToggleSidebar}
          router={router}
          selectedSubject={selectedSubject}
          handleNewTopic={handleNewTopic}
          isInputLocked={isInputLocked}
          handleStartNewChat={handleStartNewChat}
        />

          {/* Chat always visible - subject auto-detected from first message */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* ── TAB CONTENT ─────────────────────────────── */}
            <div className="flex-1 flex gap-4 min-h-0">
              {/* Main chat column */}
              <div
                className="flex-1 min-h-0 relative"
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleFileDrop}
              >
              {isDraggingFiles && (
                <div className="absolute inset-3 z-40 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 pointer-events-none flex items-center justify-center">
                  <div className="text-xs font-semibold text-primary">
                    Drop files to attach
                  </div>
                </div>
              )}
              {/* Messages - sleek chat bubbles */}
              <div
                ref={scrollContainerRef}
                onScroll={updateScrollButton}
                className="absolute inset-0 overflow-y-auto min-h-0 chat-scroll"
              >
                <div
                  ref={contentRef}
                  className={`mx-auto max-w-4xl w-full px-4 flex flex-col pt-4 sm:pt-4 ${
                  messages.length === 0 && !isTyping
                    ? "min-h-full pb-4"
                    : "pb-44 sm:pb-40 space-y-6"
                }`}>
                  {/* Empty state - shown before any messages */}
                  {messages.length === 0 && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="flex flex-1 flex-col items-center min-h-0 px-6 pt-2 sm:pt-2"
                    >
                      <div className="w-full flex flex-col items-center m-auto">
                      {/* Greeting */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.5, ease: "easeOut" }}
                        className="text-center mb-3"
                      >
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground/90 mb-2">
                          {userName ? `What are you studying, ${userName.split(" ")[0]}?` : "What are you studying?"}
                        </h1>
                      </motion.div>

                      {/* Suggested prompts */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.4 }}
                        className="w-full max-w-xl mb-4"
                      >
                        <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest text-center mb-3">
                          Try asking about
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {suggestedPrompts.map((prompt, i) => {
                            const PromptIcon = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length];
                            return (
                            <motion.button
                              key={prompt.prompt}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
                              onClick={() => {
                                setInput(prompt.prompt);
                                textareaRef.current?.focus();
                              }}
                              className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-border/70 transition-all text-left hover:shadow-sm"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/12 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/18 group-hover:to-primary/8 transition-all">
                                <PromptIcon className="w-4 h-4 text-primary/60" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                                  {prompt.label}
                                </p>
                                <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-relaxed line-clamp-2">
                                  {prompt.prompt}
                                </p>
                              </div>
                            </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                      </div>
                    </motion.div>
                  )}
                  <AnimatePresence>
                    {messages.map((message, index) => {
                      const canRegenerate =
                        message.role === "assistant" &&
                        (message.isWelcome ||
                          (message.id === latestAssistantId && messages[index - 1]?.role === "user"));

                      return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: message.role === "user" ? 16 : -8, x: message.role === "user" ? 20 : -20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" ? (
                          <div className={`max-w-[85%] sm:max-w-[80%] ${(message as any).isSystemNotification ? "max-w-2xl mx-auto" : "message-bubble-assistant"}`}>
                            {(message as any).isSystemNotification ? (
                              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center">
                                <p className="text-sm font-medium text-green-700 dark:text-green-400 whitespace-pre-line">
                                  {message.content}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <div className="mb-2" />
                                {(() => {
                                  const { thinking } = parseThinkingContent(message.content);
                                  return thinking ? <ThinkingBlock content={thinking} /> : null;
                                })()}
                                {message.imageUrl && (
                                  <a
                                    href={message.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block mb-3 rounded-xl overflow-hidden border border-border/60 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 ring-offset-2 ring-offset-transparent"
                                  >
                                    <img
                                      src={message.imageUrl}
                                      alt="Related to this topic"
                                      className="w-full max-h-56 object-cover"
                                      loading="lazy"
                                    />
                                  </a>
                                )}
                                {(() => {
                                  const parsed = parseThinkingContent(
                                    message.isStreaming ? streamingContent : message.content,
                                    !message.isStreaming
                                  );
                                  const emptyStream = message.isStreaming && !parsed.response.trim();
                                  return (
                                    <AnimatePresence mode="wait" initial={false}>
                                      {emptyStream ? (
                                        <motion.div
                                          key="stream-loader"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          transition={{ duration: 0.18 }}
                                        >
                                          <NeuralNetworkLoader />
                                        </motion.div>
                                      ) : (
                                        <motion.div
                                          key="stream-content"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 0.22 }}
                                        >
                                          <StreamingMessage
                                            content={parsed.response}
                                            isStreaming={!!message.isStreaming}
                                          />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  );
                                })()}
                                {message.sources && message.sources.length > 0 && (
                                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {message.sources.map((source, i) => (
                                      <ResearchSourceCard
                                        key={`${source.id}-${i}`}
                                        source={source}
                                        index={i + 1}
                                      />
                                    ))}
                                  </div>
                                )}

                                <AnimatePresence>
                                  {!message.isStreaming && (
                                    <motion.div
                                      key="actions"
                                      initial={{ opacity: 0, y: 4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.25, ease: "easeOut" }}
                                      className="mt-3 flex items-center justify-between gap-0.5"
                                    >
                                      <div className="relative">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setReExplainOpenId(prev => prev === message.id ? null : message.id)}
                                          disabled={isInputLocked}
                                          className="h-7 gap-1.5 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        >
                                          {reExplainingId === message.id ? (
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Shuffle className="w-3 h-3" />
                                          )}
                                          Explain differently
                                          <ChevronDown className={`w-2.5 h-2.5 opacity-50 transition-transform ${reExplainOpenId === message.id ? "rotate-180" : ""}`} />
                                        </Button>
                                        <ReExplainMenu
                                          open={reExplainOpenId === message.id}
                                          hobbies={userHobbies}
                                          onSelect={(anchor) => handleReExplain(message.id, anchor)}
                                          onClose={() => setReExplainOpenId(null)}
                                        />
                                      </div>

                                      <div className="flex items-center opacity-70 hover:opacity-100 transition-opacity">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleCopy(parseThinkingContent(message.content).response, message.id)}
                                          aria-label="Copy response"
                                          title="Copy response"
                                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        >
                                          {copiedId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        </Button>
                                        {canRegenerate && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRegenerate(message.id)}
                                            disabled={isInputLocked}
                                            aria-label="Regenerate response"
                                            title="Regenerate response"
                                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                          >
                                            <RefreshCw className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]">
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-1">
                                {message.attachments.map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                                    {file.isImage && file.previewUrl ? (
                                      <img
                                        src={file.previewUrl}
                                        alt={file.name}
                                        className="w-8 h-8 rounded-md object-cover border border-primary/30"
                                      />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-primary" />
                                    )}
                                    <span className="text-xs text-foreground max-w-[120px] truncate">{file.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.content && message.content.trim() && (
                              <>
                                <div className="inline-block px-4 py-2.5 rounded-2xl rounded-br-sm bg-primary text-primary-foreground">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopy(message.content, message.id)}
                                  aria-label="Copy prompt"
                                  title="Copy prompt"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                >
                                  {copiedId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                    })}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isTyping && !messages.some(m => m.isStreaming) && (
                      <motion.div
                        key="standalone-loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="flex justify-start"
                      >
                        <NeuralNetworkLoader />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {pendingProposal && (
                    <ToolProposalCard
                      proposal={pendingProposal}
                      onAllow={handleAllowTools}
                      onDeny={handleDenyTools}
                    />
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {showScrollToBottom && (
                <Button
                  onClick={() => scrollToBottom("smooth")}
                  size="icon"
                  variant="secondary"
                  aria-label="Scroll to bottom"
                  className="absolute bottom-24 right-6 z-30 h-9 w-9 rounded-full shadow-lg hover:bg-background"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}

<ChatInput
              attachedFiles={attachedFiles}
              removeAttachment={removeAttachment}
              selectedSubject={selectedSubject}
              handleGenerateFlashcards={handleGenerateFlashcards}
              generatingFlashcards={generatingFlashcards}
              flashcardsGenerated={flashcardsGenerated}
              handleGenerateQuiz={handleGenerateQuiz}
              generatingQuiz={generatingQuiz}
              quizGenerated={quizGenerated}
              input={input}
              setInput={setInput}
              textareaRef={textareaRef}
              handleSend={handleSend}
              fileInputRef={fileInputRef}
              handleFileSelect={handleFileSelect}
              fileExtracting={fileExtracting}
              showModelSelector={showModelSelector}
              setShowModelSelector={setShowModelSelector}
              isInputLocked={isInputLocked}
              selectedModel={selectedModel}
              researchMode={researchMode}
              setResearchMode={setResearchMode}
              researchLoading={researchLoading}
              formulaPanelOpen={formulaPanelOpen}
              setFormulaPanelOpen={setFormulaPanelOpen}
              showAISettings={showAISettings}
              setShowAISettings={setShowAISettings}
              isTyping={isTyping}
              streamingId={streamingId}
              abortRef={abortRef}
              setStreamingId={setStreamingId}
              setStreamingContent={setStreamingContent}
              setIsTyping={setIsTyping}
            />
            </div>


<FormulaPanel
              formulaPanelOpen={formulaPanelOpen}
              selectedSubject={selectedSubject}
              formulaSearch={formulaSearch}
              setFormulaSearch={setFormulaSearch}
              expandedTopics={expandedTopics}
              setExpandedTopics={setExpandedTopics}
              setFormulaPanelOpen={setFormulaPanelOpen}
            />
            </div>
          </div>
      </div>

      {/* AI Settings Sheet */}
      <AISettingsSheet open={showAISettings} onOpenChange={setShowAISettings} />

      {/* Model Selector Sheet */}
      <ModelSelectorSheet
        open={showModelSelector}
        onOpenChange={setShowModelSelector}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
      />
    </div>
  );
};

export default Chat;
