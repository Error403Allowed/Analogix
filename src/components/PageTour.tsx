"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/context/TourContext";
import type { TourStep } from "@/types/tour";

/**
 * PageTour Component
 * Renders the tour overlay with highlighted elements and step tooltips
 * Enhanced with visual indicators, animations, and accessibility features
 */
export const PageTour: React.FC = () => {
  const { activeTour, currentStep, nextStep, prevStep, endTour } = useTour();
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0, rotation: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  // Find and set the highlighted element
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
      
      // Add accessibility focus
      if (element) {
        element.setAttribute("aria-describedby", "tour-tooltip");
        if (step.ariaLabel) {
          element.setAttribute("aria-label", step.ariaLabel);
        }
      }
    } else {
      setHighlightedElement(null);
    }
  }, [activeTour, currentStep]);

  // Calculate tooltip and arrow positions
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
      let arrowTop = 0;
      let arrowLeft = 0;
      let rotation = 0;

      const gap = 16;
      const arrowSize = 12;

      switch (position) {
        case "top":
          top = rect.top - tooltipRect.height - gap - arrowSize;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          arrowTop = tooltipRect.height;
          arrowLeft = tooltipRect.width / 2;
          rotation = 180;
          break;
        case "bottom":
          top = rect.bottom + gap + arrowSize;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          arrowTop = -arrowSize;
          arrowLeft = tooltipRect.width / 2;
          rotation = 0;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.left - tooltipRect.width - gap - arrowSize;
          arrowTop = tooltipRect.height / 2;
          arrowLeft = tooltipRect.width;
          rotation = -90;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.right + gap + arrowSize;
          arrowTop = tooltipRect.height / 2;
          arrowLeft = -arrowSize;
          rotation = 90;
          break;
        case "center":
        default:
          top = window.innerHeight / 2 - tooltipRect.height / 2;
          left = window.innerWidth / 2 - tooltipRect.width / 2;
          break;
      }

      // Keep tooltip within viewport
      const padding = 16;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

      setTooltipPosition({ top, left });
      setArrowPosition({ top: arrowTop, left: arrowLeft, rotation });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [activeTour, currentStep, highlightedElement]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeTour) return;

      setIsKeyboardNav(true);

      if (e.key === "Escape") {
        e.preventDefault();
        endTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTour, nextStep, prevStep, endTour]);

  if (!activeTour) return null;

  const step = activeTour.steps[currentStep];
  const isLastStep = currentStep === activeTour.steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        Step {currentStep + 1} of {activeTour.steps.length}: {step.title}
      </div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-0 bg-black/60 z-[9998]"
        onClick={endTour}
        aria-hidden="true"
      />

      {/* Highlight overlay with spotlight */}
      {highlightedElement && (
        <HighlightOverlay 
          element={highlightedElement} 
          pulse={step.pulse}
          ariaLabel={step.ariaLabel}
        />
      )}

      {/* Hint badge near highlighted element */}
      {highlightedElement && step.hint && (
        <HintBadge element={highlightedElement} hint={step.hint} />
      )}

      {/* Tooltip */}
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed z-[9999] max-w-sm"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        id="tour-tooltip"
      >
        {/* Arrow pointing to element */}
        {highlightedElement && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute w-0 h-0"
            style={{ 
              top: arrowPosition.top, 
              left: arrowPosition.left,
              transform: `rotate(${arrowPosition.rotation}deg)`,
            }}
          >
            <div className="w-3 h-3 bg-popover border-t border-l border-border rotate-45" 
              style={{ 
                left: arrowPosition.left - 6,
                top: arrowPosition.top - 6,
              }} 
            />
          </motion.div>
        )}

        <div className="bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with icon */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-muted/50 to-muted/30">
            {step.icon && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                className="text-2xl"
              >
                {step.icon}
              </motion.span>
            )}
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
              Step {currentStep + 1} of {activeTour.steps.length}
            </span>
            <button
              onClick={endTour}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 
              id="tour-title"
              className="text-lg font-bold text-foreground mb-2 flex items-center gap-2"
            >
              {step.title}
            </h3>
            <p 
              id="tour-description"
              className="text-sm text-muted-foreground leading-relaxed"
            >
              {step.content}
            </p>

            {/* Action button if available */}
            {step.action && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4"
              >
                <Button
                  onClick={step.action.onClick}
                  className="w-full gap-2"
                  size="sm"
                >
                  {step.action.icon && <span>{step.action.icon}</span>}
                  {step.action.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Footer with navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={isFirstStep}
              className="gap-1 text-xs"
              aria-label="Previous step"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={activeTour.steps.length}>
              {activeTour.steps.map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ scaleX: 0 }}
                  animate={{ 
                    scaleX: 1,
                    width: index === currentStep ? 24 : 6,
                  }}
                  transition={{ delay: index * 0.1 }}
                  className={`h-1.5 rounded-full origin-left transition-colors ${
                    index === currentStep
                      ? "w-6 bg-primary"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-muted"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={nextStep}
              className="gap-1 text-xs"
              aria-label={isLastStep ? "Finish tour" : "Next step"}
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

      {/* Keyboard hints */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isKeyboardNav ? 1 : 0 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 px-4 py-2 bg-muted/90 backdrop-blur-sm rounded-full text-xs text-muted-foreground border border-border/50"
      >
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px]">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px]">→</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px]">Esc</kbd>
          Close
        </span>
      </motion.div>
    </>
  );
};

/**
 * HighlightOverlay Component
 * Renders a spotlight effect around the highlighted element with pulsing animation
 */
const HighlightOverlay: React.FC<{ 
  element: Element; 
  pulse?: boolean;
  ariaLabel?: string;
}> = ({ element, pulse = true, ariaLabel }) => {
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
          
          {/* Pulsing glow filter */}
          <filter id="pulse-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Darkened backdrop with spotlight */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#highlight-mask)"
        />
        
        {/* Pulsing outer glow */}
        {pulse && (
          <motion.rect
            initial={{ opacity: 0.3, strokeWidth: 3 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              strokeWidth: [3, 5, 3],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            x={Math.max(0, rect.left - 12)}
            y={Math.max(0, rect.top - 12)}
            width={rect.width + 24}
            height={rect.height + 24}
            fill="none"
            stroke="hsl(var(--primary))"
            rx="10"
            filter="url(#pulse-glow)"
          />
        )}
        
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
          className={pulse ? "animate-pulse" : ""}
        />
        
        {/* Corner accents for extra visibility */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Top-left corner */}
          <circle
            cx={Math.max(0, rect.left - 4)}
            cy={Math.max(0, rect.top - 4)}
            r="4"
            fill="hsl(var(--primary))"
          />
          {/* Top-right corner */}
          <circle
            cx={Math.min(window.innerWidth, rect.left + rect.width + 4)}
            cy={Math.max(0, rect.top - 4)}
            r="4"
            fill="hsl(var(--primary))"
          />
          {/* Bottom-left corner */}
          <circle
            cx={Math.max(0, rect.left - 4)}
            cy={Math.min(window.innerHeight, rect.top + rect.height + 4)}
            r="4"
            fill="hsl(var(--primary))"
          />
          {/* Bottom-right corner */}
          <circle
            cx={Math.min(window.innerWidth, rect.left + rect.width + 4)}
            cy={Math.min(window.innerHeight, rect.top + rect.height + 4)}
            r="4"
            fill="hsl(var(--primary))"
          />
        </motion.g>
      </svg>
      
      {/* Animated sparkle effect */}
      {pulse && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          className="absolute"
          style={{
            left: rect.left + rect.width / 2,
            top: rect.top - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <Sparkles className="w-5 h-5 text-primary" />
        </motion.div>
      )}
    </div>
  );
};

/**
 * HintBadge Component
 * Shows a small badge near the highlighted element with hint text
 */
const HintBadge: React.FC<{ element: Element; hint: string }> = ({ element, hint }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [element]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      transition={{ delay: 0.3 }}
      className="fixed z-[9998] pointer-events-none"
      style={{ 
        top: position.top, 
        left: position.left,
        transform: "translateX(-50%)",
      }}
    >
      <div className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg shadow-primary/30 flex items-center gap-1.5">
        <span>{hint}</span>
        <motion.div
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
        >
          <ArrowRight className="w-3 h-3" />
        </motion.div>
      </div>
      
      {/* Small arrow pointing up */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45" />
    </motion.div>
  );
};

export default PageTour;
