"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/context/TourContext";
import type { TourStep } from "@/types/tour";

/**
 * PageTour Component
 * Renders the tour overlay with highlighted elements and step tooltips
 */
export const PageTour: React.FC = () => {
  const { activeTour, currentStep, nextStep, prevStep, endTour } = useTour();
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTour || !activeTour.steps[currentStep]) {
      setHighlightedElement(null);
      return;
    }

    const step = activeTour.steps[currentStep];
    
    // Find the target element if selector is provided
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      setHighlightedElement(element || null);
    } else {
      setHighlightedElement(null);
    }
  }, [activeTour, currentStep]);

  useEffect(() => {
    if (!activeTour || !highlightedElement) return;

    const updatePosition = () => {
      if (!tooltipRef.current || !highlightedElement) return;

      const rect = highlightedElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const step = activeTour.steps[currentStep];
      const position = step.position || "bottom";

      let top = 0;
      let left = 0;

      switch (position) {
        case "top":
          top = rect.top - tooltipRect.height - 16;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          break;
        case "bottom":
          top = rect.bottom + 16;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.left - tooltipRect.width - 16;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.right + 16;
          break;
        case "center":
        default:
          top = window.innerHeight / 2 - tooltipRect.height / 2;
          left = window.innerWidth / 2 - tooltipRect.width / 2;
          break;
      }

      // Keep tooltip within viewport
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipRect.height - 16));
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipRect.width - 16));

      setTooltipPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [activeTour, currentStep, highlightedElement]);

  if (!activeTour) return null;

  const step = activeTour.steps[currentStep];
  const isLastStep = currentStep === activeTour.steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[9998]"
        onClick={endTour}
      />

      {/* Highlight overlay */}
      {highlightedElement && (
        <HighlightOverlay element={highlightedElement} />
      )}

      {/* Tooltip */}
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="fixed z-[9999] max-w-sm"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        <div className="bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Step {currentStep + 1} of {activeTour.steps.length}
            </span>
            <button
              onClick={endTour}
              className="p-1 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-lg font-bold text-foreground mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Footer with navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={isFirstStep}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <div className="flex items-center gap-1.5">
              {activeTour.steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStep
                      ? "w-6 bg-primary"
                      : index < currentStep
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={nextStep}
              className="gap-1 text-xs"
            >
              {isLastStep ? (
                <>
                  Got it
                  <Check className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

/**
 * HighlightOverlay Component
 * Renders a spotlight effect around the highlighted element
 */
const HighlightOverlay: React.FC<{ element: Element }> = ({ element }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (element instanceof HTMLElement) {
        setRect(element.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [element]);

  if (!rect) return null;

  return (
    <div className="fixed inset-0 z-[9997] pointer-events-none">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="highlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={Math.max(0, rect.left - 8)}
              y={Math.max(0, rect.top - 8)}
              width={rect.width + 16}
              height={rect.height + 16}
              fill="black"
              rx="8"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#highlight-mask)"
        />
        {/* Highlight border */}
        <rect
          x={Math.max(0, rect.left - 4)}
          y={Math.max(0, rect.top - 4)}
          width={rect.width + 8}
          height={rect.height + 8}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          rx="6"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
};

export default PageTour;
