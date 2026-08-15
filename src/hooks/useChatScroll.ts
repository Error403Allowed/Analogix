import { useRef, useState, useCallback, useEffect } from "react";

const NEAR_BOTTOM_THRESHOLD = 80;

export function useChatScroll(messagesLength: number, streamingLength = 0) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  // True while the user is "pinned" to the bottom. Only a real user scroll event
  // changes this - never a streaming re-render - so we always follow content
  // growth while pinned, and always leave the view alone the moment the user
  // scrolls up. This removes the earlier "resistance" AND the "never scrolls"
  // behaviour caused by re-measuring position at effect time.
  const pinnedRef = useRef(true);

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  const updateScrollButton = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const near = isNearBottom();
    pinnedRef.current = near;
    setShowScrollToBottom(!near);
  }, [isNearBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    pinnedRef.current = true;
    setShowScrollToBottom(false);
  }, []);

  const followToBottom = useCallback(() => {
    if (!pinnedRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // Follow ANY content-height change while the user is pinned. This is the
  // reliable signal for streaming: MarkdownRenderer re-renders, images/code
  // blocks resize, and token batches land - each one grows the content box and
  // fires the observer, so the container tracks the whole way down even when it
  // is already at an intermediate offset from a previous batch.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      followToBottom();
    });
    const content = contentRef.current;
    if (content) observer.observe(content);
    return () => observer.disconnect();
  }, [followToBottom, messagesLength]);

  // Belt-and-braces: also re-anchor when the message list or streamed text
  // length changes (e.g. between batches, while the ResizeObserver queues work).
  useEffect(() => {
    followToBottom();
  }, [messagesLength, streamingLength, followToBottom]);

  // Keep the scroll-to-bottom button in sync with content changes too, so it
  // never flickers while streams land.
  useEffect(() => {
    updateScrollButton();
  }, [messagesLength, streamingLength, updateScrollButton]);

  return {
    messagesEndRef,
    scrollContainerRef,
    contentRef,
    showScrollToBottom,
    updateScrollButton,
    scrollToBottom,
    followToBottom,
  };
}