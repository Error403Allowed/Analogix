/**
 * Premium Tour System — Billion Dollar Company Level
 * 
 * Features:
 * - Cinematic spotlight with gradient glow and particle effects
 * - Smart positioning that never clips off-screen
 * - Interactive demo steps (click-through actions)
 * - Progress persistence with localStorage
 * - Keyboard navigation with visual hints
 * - Smooth spring animations throughout
 * - Accessibility (ARIA, screen reader support)
 * - Auto-trigger on first page visit
 * - Replay from settings
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, Sparkles, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "@/context/TourContext";
import type { TourStep } from "@/types/tour";

export const PageTour: React.FC = () => {
  const { activeTour, currentStep, nextStep, prevStep, endTour } = useTour();
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState({ top: 0, left: 0, rotation: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  // Find target element
  useEffect(() => {
    if (!activeTour || !activeTour.steps[currentStep]) {
      setHighlightedElement(null);
      setSpotlightRect(null);
      return;
    }

    const step = activeTour.steps[currentStep];

    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      setHighlightedElement(element || null);
      if (element instanceof HTMLElement) {
        setSpotlightRect(element.getBoundingClientRect());
        element.setAttribute("aria-describedby", "tour-tooltip");
        if (step.ariaLabel) element.setAttribute("aria-label", step.ariaLabel);
      }
    } else {
      setHighlightedElement(null);
      setSpotlightRect(null);
    }
  }, [activeTour, currentStep]);

  // Calculate positions
  useEffect(() => {
    if (!activeTour || !tooltipRef.current) return;

    const updatePosition = () => {
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      if (!tooltipRect) return;

      const step = activeTour.steps[currentStep];
      const position = step.position || "bottom";
      const gap = 20;
      const arrowSize = 10;

      let top = 0, left = 0, arrowTop = 0, arrowLeft = 0, rotation = 0;

      if (highlightedElement && spotlightRect) {
        const rect = spotlightRect;
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
          default:
            top = window.innerHeight / 2 - tooltipRect.height / 2;
            left = window.innerWidth / 2 - tooltipRect.width / 2;
        }
      } else {
        // Centered (no target)
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
      }

      // Viewport clamping
      const padding = 20;
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
  }, [activeTour, currentStep, highlightedElement, spotlightRect]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeTour) return;
      setIsKeyboardNav(true);
      if (e.key === "Escape") { e.preventDefault(); endTour(); }
      else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); nextStep(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prevStep(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTour, nextStep, prevStep, endTour]);

  // Update spotlight rect on scroll/resize
  useEffect(() => {
    if (!highlightedElement) return;
    const update = () => {
      if (highlightedElement instanceof HTMLElement) {
        setSpotlightRect(highlightedElement.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [highlightedElement]);

  if (!activeTour) return null;

  const step = activeTour.steps[currentStep];
  const isLastStep = currentStep === activeTour.steps.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / activeTour.steps.length) * 100;

  return (
    <>
      {/* Screen reader */}
      <div className="sr-only" role="status" aria-live="polite">
        Step {currentStep + 1} of {activeTour.steps.length}: {step.title}
      </div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-[9998]"
        onClick={endTour}
        aria-hidden="true"
      />

      {/* Spotlight */}
      {spotlightRect && (
        <Spotlight rect={spotlightRect} pulse={step.pulse !== false} />
      )}

      {/* Hint badge */}
      {highlightedElement && step.hint && (
        <HintBadge element={highlightedElement} hint={step.hint} />
      )}

      {/* Tooltip */}
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed z-[9999] w-[380px] max-w-[calc(100vw-40px)]"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        id="tour-tooltip"
      >
        {/* Arrow */}
        {highlightedElement && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute"
            style={{
              top: arrowPosition.top,
              left: arrowPosition.left,
              transform: `rotate(${arrowPosition.rotation}deg)`,
            }}
          >
            <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
              <path d="M10 10L0 0H20L10 10Z" fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth="1" />
            </svg>
          </motion.div>
        )}

        <div className="bg-popover border border-border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted/50">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              {step.icon && (
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, delay: 0.05 }}
                  className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-lg"
                >
                  {step.icon}
                </motion.div>
              )}
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Step {currentStep + 1} of {activeTour.steps.length}
                </span>
              </div>
            </div>
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
            <h3 id="tour-title" className="text-lg font-bold text-foreground mb-2">
              {step.title}
            </h3>
            <p id="tour-description" className="text-sm text-muted-foreground leading-relaxed">
              {step.content}
            </p>

            {/* Action button */}
            {step.action && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4"
              >
                <Button onClick={step.action.onClick} className="w-full gap-2" size="sm">
                  {step.action.icon && <span>{step.action.icon}</span>}
                  {step.action.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={isFirstStep}
              className="gap-1 text-xs px-3"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {activeTour.steps.map((_, index) => (
                <motion.div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStep
                      ? "w-6 bg-primary"
                      : index < currentStep
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-muted"
                  }`}
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={nextStep}
              className="gap-1 text-xs px-4"
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
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2 bg-background/90 backdrop-blur-md rounded-full text-xs text-muted-foreground border border-border/50 shadow-lg"
      >
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">→</kbd>
          Navigate
        </span>
        <span className="w-px h-3 bg-border" />
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">Esc</kbd>
          Close
        </span>
      </motion.div>
    </>
  );
};

/**
 * Spotlight Component — Premium gradient glow around target
 */
const Spotlight: React.FC<{ rect: DOMRect; pulse?: boolean }> = ({ rect, pulse = true }) => {
  const padding = 8;
  const x = Math.max(0, rect.left - padding);
  const y = Math.max(0, rect.top - padding);
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;
  const rx = Math.min(12, rect.height / 2);

  return (
    <div className="fixed inset-0 z-[9997] pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} fill="black" rx={rx} />
          </mask>

          <radialGradient id="tour-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>

          <filter id="tour-glow-filter">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Backdrop with cutout */}
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#tour-spotlight-mask)" />

        {/* Glow ring */}
        {pulse && (
          <motion.rect
            x={x - 4}
            y={y - 4}
            width={w + 8}
            height={h + 8}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            rx={rx + 2}
            filter="url(#tour-glow-filter)"
            animate={{
              opacity: [0.4, 0.8, 0.4],
              strokeWidth: [2, 3, 2],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Sharp border */}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          rx={rx}
        />

        {/* Corner dots */}
        {[
          [x, y],
          [x + w, y],
          [x, y + h],
          [x + w, y + h],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r="3"
            fill="hsl(var(--primary))"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05, type: "spring" }}
          />
        ))}
      </svg>

      {/* Floating sparkle above target */}
      {pulse && (
        <motion.div
          className="absolute pointer-events-none"
          style={{ left: rect.left + rect.width / 2, top: rect.top - 16, transform: "translateX(-50%)" }}
          initial={{ opacity: 0, y: 4, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0], y: -8, scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="w-5 h-5 text-primary drop-shadow-lg" />
        </motion.div>
      )}
    </div>
  );
};

/**
 * Hint Badge — Animated pointer near target
 */
const HintBadge: React.FC<{ element: Element; hint: string }> = ({ element, hint }) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const update = () => {
      if (element instanceof HTMLElement) {
        const r = element.getBoundingClientRect();
        setPos({ top: r.bottom + 12, left: r.left + r.width / 2 });
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [element]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.8 }}
      transition={{ delay: 0.4, type: "spring" }}
      className="fixed z-[9998] pointer-events-none"
      style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
    >
      <div className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg shadow-primary/30 flex items-center gap-1.5 whitespace-nowrap">
        <Zap className="w-3 h-3" />
        <span>{hint}</span>
        <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}>
          <ArrowRight className="w-3 h-3" />
        </motion.div>
      </div>
      {/* Arrow up */}
      <svg className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-2" viewBox="0 0 12 8" fill="none">
        <path d="M6 0L0 8H12L6 0Z" fill="hsl(var(--primary))" />
      </svg>
    </motion.div>
  );
};

export default PageTour;
