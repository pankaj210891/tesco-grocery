import { useEffect } from "react";

// Module-level counter so stacked modals each hold their own lock.
// Scroll is only restored once ALL active locks are released.
let lockDepth  = 0;
let savedScrollY = 0;

function applyLock() {
  if (lockDepth === 0) {
    savedScrollY = window.scrollY;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.documentElement.style.paddingRight = `${scrollbarWidth}px`;
    }

    // overflow:hidden alone is ignored by iOS Safari — position:fixed is required.
    document.body.style.position = "fixed";
    document.body.style.top      = `-${savedScrollY}px`;
    document.body.style.width    = "100%";
    document.body.style.overflow = "hidden";
  }
  lockDepth++;
}

function releaseLock() {
  lockDepth = Math.max(0, lockDepth - 1);
  if (lockDepth === 0) {
    document.body.style.position = "";
    document.body.style.top      = "";
    document.body.style.width    = "";
    document.body.style.overflow = "";
    document.documentElement.style.paddingRight = "";

    // Restore the scroll position that was lost when position:fixed was applied.
    window.scrollTo(0, savedScrollY);
  }
}

/**
 * Locks body scroll while `enabled` is true.
 * Stacking-safe: multiple concurrent callers each hold their own lock;
 * scroll is only restored after the last one releases.
 * Works on iOS Safari (position:fixed trick) and desktop (overflow:hidden).
 */
export function useScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    applyLock();
    return releaseLock;
  }, [enabled]);
}
