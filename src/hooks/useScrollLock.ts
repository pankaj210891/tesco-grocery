import { useEffect } from "react";

// Module-level counter so stacked modals each hold their own lock.
// Scroll is only restored once ALL active locks are released.
let lockDepth = 0;

function applyLock() {
  if (lockDepth === 0) {
    // Measure BEFORE hiding — scrollbar may already be visible (overflow-y:scroll on html)
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    // Compensate for the scrollbar space disappearing so the layout doesn't shift
    if (scrollbarWidth > 0) {
      document.documentElement.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockDepth++;
}

function releaseLock() {
  lockDepth = Math.max(0, lockDepth - 1);
  if (lockDepth === 0) {
    document.documentElement.style.overflow = "";
    document.documentElement.style.paddingRight = "";
  }
}

/**
 * Locks body scroll while `enabled` is true.
 * Stacking-safe: multiple concurrent callers each hold their own lock;
 * scroll is only restored after the last one releases.
 */
export function useScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    applyLock();
    return releaseLock;
  }, [enabled]);
}
