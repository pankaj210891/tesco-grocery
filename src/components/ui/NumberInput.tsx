"use client";

import { forwardRef, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

type NumberInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Drop-in replacement for <input type="number">.
 *
 * Fixes two problems with native controlled number inputs:
 *
 * 1. "0 → backspace → snaps back" — when value={0} and the user deletes it,
 *    Number("") === 0, so parent state never changes and React re-renders "0"
 *    back into the field. Fixed by keeping an internal string display state that
 *    is only synced from the parent when the input is not focused.
 *
 * 2. "0 → type 8 → 08" — fixed by selecting all text on focus so any keystroke
 *    replaces the current value instead of appending to it.
 *
 * The component is a full drop-in: all standard <input> props are forwarded,
 * onChange semantics are preserved (callers still receive the raw event).
 */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, onFocus, onBlur, className, ...props }, ref) => {
    // Internal display value — allows "", partial entry, or any intermediate state
    // without the parent's controlled value snapping the field back.
    const [display, setDisplay] = useState<string>(
      value != null && value !== "" ? String(value) : ""
    );

    // Track focus so the sync effect below does not override what the user is typing.
    const focused = useRef(false);

    // Sync the display from the parent value whenever the user is not actively editing.
    useEffect(() => {
      if (!focused.current) {
        setDisplay(value != null && value !== "" ? String(value) : "");
      }
    }, [value]);

    return (
      <input
        ref={ref}
        {...props}
        type="number"
        value={display}
        className={cn("no-spinner", className)}
        onFocus={(e) => {
          focused.current = true;
          // Select all so the user can immediately type a replacement value.
          e.target.select();
          onFocus?.(e);
        }}
        onChange={(e) => {
          setDisplay(e.target.value);
          // Always propagate — callers that treat "" as "clear" still work.
          onChange?.(e);
        }}
        onBlur={(e) => {
          focused.current = false;
          // If the field is left empty restore the display to the parent's last
          // known value (or "0" as a fallback). The parent state is unchanged
          // because onChange was already called with "" → Number("") === 0, which
          // is typically the correct fallback for a numeric field anyway.
          if (display === "") {
            setDisplay(value != null && value !== "" ? String(value) : "0");
          }
          onBlur?.(e);
        }}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";

export default NumberInput;
