import { useRef, useState, useCallback, useEffect } from "react";

export function useChatScroll(messagesLength: number, streamingLength = 0) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const lockedToBottomRef = useRef(true);

  const updateScrollButton = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom <= 80;
    lockedToBottomRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    lockedToBottomRef.current = true;
    setShowScrollToBottom(false);
  }, []);

  // Sticky scrolling: while the container is pinned to the bottom, follow new
  // content as messages grow and as streaming tokens arrive. If the user scrolls
  // up, `updateScrollButton` unpins and we stop following until they jump back.
  useEffect(() => {
    if (!lockedToBottomRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messagesLength, streamingLength]);

  // Re-evaluate the pin state whenever content changes (e.g. a token batch
  // arrives and we were already pinned) so the button stays in sync.
  useEffect(() => {
    updateScrollButton();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesLength, streamingLength, updateScrollButton]);

  return {
    messagesEndRef,
    scrollContainerRef,
    showScrollToBottom,
    lockedToBottomRef,
    updateScrollButton,
    scrollToBottom,
  };
}