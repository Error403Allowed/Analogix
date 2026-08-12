"use client";

import { useEffect } from "react";

/**
 * Guards against a dev-mode-only bug in Next.js's own DevTools error-overlay
 * indicator (`next-devtools/.../dev-tools-indicator/draggable.tsx`). Its
 * `cancel()` path calls `element.releasePointerCapture(pointerId)` without
 * checking `hasPointerCapture` first. When the pointer has already been
 * released (e.g. pointerup fired outside the bubble, or focus loss) the
 * browser throws `NotFoundError`, which surfaces as an uncaught console error:
 *
 *   Uncaught NotFoundError: Failed to execute 'releasePointerCapture' on
 *   'Element': No active pointer with the given id is found.
 *
 * This never ships to production (the overlay only exists in `next dev`), but
 * it's noisy during development. We patch the prototype to swallow exactly
 * that benign DOMException and rethrow everything else, so real pointer-capture
 * behaviour is untouched.
 */
export function ReleasePointerCaptureGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined" || typeof Element === "undefined") return;

    const proto = Element.prototype as Element & {
      releasePointerCapture?: ((pointerId: number) => void) & {
        __analogixGuarded?: boolean;
      };
    };
    const original = proto.releasePointerCapture;
    if (!original || original.__analogixGuarded) return;

    proto.releasePointerCapture = function releasePointerCapture(pointerId: number) {
      try {
        return original.call(this, pointerId);
      } catch (error) {
        if (error instanceof Error && error.name === "NotFoundError") return;
        throw error;
      }
    };
    proto.releasePointerCapture.__analogixGuarded = true;
  }, []);

  return null;
}
