// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatScroll } from "@/hooks/useChatScroll";

class MockResizeObserver {
  callback: ResizeObserverCallback;
  elements: Set<Element> = new Set();
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(el: Element) {
    this.elements.add(el);
  }
  unobserve(el: Element) {
    this.elements.delete(el);
  }
  disconnect() {
    this.elements.clear();
  }
}

describe("useChatScroll", () => {
  let instance: MockResizeObserver | undefined;

  beforeEach(() => {
    instance = undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class extends MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          super(cb);
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          instance = this;
        }
      } as unknown as typeof ResizeObserver
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  type Container = {
    el: HTMLDivElement;
    content: HTMLDivElement;
  };

  const makeContainer = (setScrollTop: (el: HTMLDivElement, top: number) => void): Container => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollHeight", { value: 5000, configurable: true, writable: false });
    Object.defineProperty(el, "clientHeight", { value: 800, configurable: true, writable: false });
    let top = 0;
    Object.defineProperty(el, "scrollTop", {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        top = value;
        setScrollTop(el, value);
      },
    });
    el.scrollTo = ((opts: ScrollToOptions | number) =>
      setScrollTop(el, typeof opts === "number" ? opts : opts.top ?? 0)) as unknown as typeof el.scrollTo;
    const content = document.createElement("div");
    el.appendChild(content);
    document.body.appendChild(el);
    return { el, content };
  };

  it("follows content growth while pinned to the bottom", () => {
    let currentTop = 0;
    const { el, content } = makeContainer((container, top) => (currentTop = top));
    const { result, rerender } = renderHook(({ count }: { count: number }) => useChatScroll(count), {
      initialProps: { count: 1 },
    });
    act(() => {
      result.current.scrollContainerRef.current = el;
      result.current.contentRef.current = content;
      content.style.height = "5000px";
    });
    el.scrollTop = 4000;
    rerender({ count: 2 });
    expect(currentTop).toBe(5000);
  });

  it("stays put once the user scrolls up, until they jump back down", () => {
    let currentTop = 0;
    const { el } = makeContainer((container, top) => (currentTop = top));
    const { result, rerender } = renderHook(({ count }: { count: number }) => useChatScroll(count), {
      initialProps: { count: 1 },
    });
    act(() => {
      result.current.scrollContainerRef.current = el;
      el.scrollTop = 0;
    });
    // user scrolls up: pin is released via updateScrollButton
    act(() => {
      el.scrollTop = 3000;
      result.current.updateScrollButton();
    });
    rerender({ count: 5 });
    expect(currentTop).toBe(3000);
    expect(result.current.showScrollToBottom).toBe(true);
    // user jumps back down: re-pins and follows again
    act(() => {
      el.scrollTop = 4150;
      result.current.updateScrollButton();
    });
    rerender({ count: 6 });
    expect(currentTop).toBe(5000);
    expect(result.current.showScrollToBottom).toBe(false);
  });

  it("re-anchors via scrollToBottom even when flagged as scrolled up", () => {
    let currentTop = 0;
    const { el } = makeContainer((container, top) => (currentTop = top));
    const { result } = renderHook(() => useChatScroll(1));
    act(() => {
      result.current.scrollContainerRef.current = el;
      el.scrollTop = 3000;
      result.current.updateScrollButton();
    });
    act(() => {
      result.current.scrollToBottom("auto");
    });
    expect(currentTop).toBe(5000);
  });

  it("cleans up the ResizeObserver on unmount", () => {
    const { result, unmount } = renderHook(() => useChatScroll(1));
    act(() => {
      result.current.contentRef.current = document.createElement("div");
    });
    unmount();
    expect(instance?.elements.size).toBe(0);
  });
});