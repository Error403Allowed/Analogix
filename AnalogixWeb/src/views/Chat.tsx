"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Copy,
  Check,
  Shuffle,
  ChevronDown,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AISettingsSheet from "@/components/AISettingsSheet";
import ModelSelectorSheet from "@/components/ModelSelectorSheet";
import { ToolProposalCard } from "@/components/chat/ToolProposalCard";
import { ThinkingBlock } from "@/components/chat/ThinkingBlock";
import { StreamingMessage } from "@/components/chat/StreamingMessage";
import { ResearchSourceCard } from "@/components/chat/ResearchSourceCard";
import { parseThinkingContent } from "@/utils/parse-thinking-content";
import { useChat } from "@/hooks/useChat";
import ThreadSidebar from "@/components/chat/ThreadSidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import FormulaPanel from "@/components/chat/FormulaPanel";

const Chat = () => {
  const {
    selectedSubject, setSelectedSubject,
    subjectDetecting, setSubjectDetecting,
    showSubjectPicker, setShowSubjectPicker,
    messages, setMessages,
    input, setInput,
    textareaRef,
    isTyping, setIsTyping,
    streamingId, setStreamingId,
    streamingContent, setStreamingContent,
    abortRef,
    analogyModeEnabled, setAnalogyModeEnabled,
    selectedModel, setSelectedModel,
    showModelSelector, setShowModelSelector,
    researchMode, setResearchMode,
    researchLoading, setResearchLoading,
    showAISettings, setShowAISettings,
    reExplainOpenId, setReExplainOpenId,
    reExplainingId, setReExplainingId,
    savingFlashcards, setSavingFlashcards,
    flashcardsSaved, setFlashcardsSaved,
    formulaPanelOpen, setFormulaPanelOpen,
    expandedTopics, setExpandedTopics,
    formulaSearch, setFormulaSearch,
    chatSessionId, setChatSessionId,
    allSessions, setAllSessions,
    sessionsLoading, setSessionsLoading,
    threadSearch, setThreadSearch,
    renamingThreadId, setRenamingThreadId,
    renamingThreadName, setRenamingThreadName,
    contextMenu, setContextMenu,
    sidebarOpen, setSidebarOpen,
    attachedFiles, setAttachedFiles,
    fileExtracting, setFileExtracting,
    fileInputRef,
    generatingQuiz, setGeneratingQuiz,
    quizGenerated, setQuizGenerated,
    generatingFlashcards, setGeneratingFlashcards,
    flashcardsGenerated, setFlashcardsGenerated,
    pendingProposal, setPendingProposal,
    pendingProposalMessageId, setPendingProposalMessageId,
    copiedId, setCopiedId,
    isDraggingFiles, setIsDraggingFiles,
    messagesEndRef,
    scrollContainerRef,
    userName,
    userHobbies,
    isInputLocked,
    latestAssistantId,
    router,
    handleSaveAsFlashcards,
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
    handleSubjectSelect,
    handleSend,
    handleNewTopic,
    handleSwitchThread,
    handleStartNewChat,
    handleDeleteThread,
    handleRenameThread,
  } = useChat();

  return (
    <div className="h-full flex flex-row relative overflow-hidden bg-background">
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

      {/* Context Menu for Thread Actions */}
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
      </AnimatePresence>

      <div className="flex-1 flex flex-col w-full relative overflow-hidden">
<ChatHeader
          setSidebarOpen={setSidebarOpen}
          sidebarOpen={sidebarOpen}
          router={router}
          selectedSubject={selectedSubject}
          handleNewTopic={handleNewTopic}
          isInputLocked={isInputLocked}
          handleStartNewChat={handleStartNewChat}
        />

          {/* Chat always visible — subject auto-detected from first message */}
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
                <div className="mx-auto max-w-4xl w-full px-4 flex flex-col space-y-6 pb-56 sm:pb-44 pt-4 sm:pt-4">
                  {/* Empty state — shown before any messages */}
                  {messages.length === 0 && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-3 text-center"
                    >
                      <div>
                        <p className="text-base font-semibold text-foreground/80">
                          {userName ? `Hey ${userName}, what are you studying?` : "Hey there, what are you studying?"}
                        </p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                          Ask about any concept — I'll explain it with your interests
                        </p>
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
                                  return (
                                    <StreamingMessage
                                      content={parsed.response}
                                      isStreaming={!!message.isStreaming}
                                    />
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
                                          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                                        </Button>
                                        <AnimatePresence>
                                          {reExplainOpenId === message.id && (
                                            <motion.div
                                              initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                              animate={{ opacity: 1, y: 0, scale: 1 }}
                                              exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                              transition={{ duration: 0.15 }}
                                              className="absolute left-0 top-9 z-50 w-56 rounded-xl border border-border bg-card shadow-xl p-2"
                                            >
                                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                                                Anchor to interest
                                              </p>
                                              <button
                                                type="button"
                                                onClick={() => handleReExplain(message.id)}
                                                className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-muted/60 text-foreground font-medium"
                                              >
                                                🎲 Surprise me
                                              </button>
                                              {userHobbies.map(interest => (
                                                <button
                                                  key={interest}
                                                  type="button"
                                                  onClick={() => handleReExplain(message.id, interest)}
                                                  className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-muted/60 text-foreground truncate"
                                                >
                                                  {interest}
                                                </button>
                                              ))}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
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

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="flex justify-start"
                    >
                      <div className="message-bubble-assistant">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1 items-end h-5">
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                              <div key={i} className="typing-dot" style={{ alignSelf: "flex-end" }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

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
