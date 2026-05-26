"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, ArrowLeft, Zap } from "lucide-react";

export interface TourStep {
  title:       string;
  description: string;
  target?:     string; // data-tour attribute value (optional — center-screen if absent)
  position?:   "top" | "bottom" | "left" | "right";
}

interface OnboardingTourProps {
  tourKey:   string; // localStorage key — unique per role+section
  steps:     TourStep[];
  onDismiss?: () => void;
}

function getStorageKey(key: string) {
  return `prakash-tour-dismissed-${key}`;
}

export default function OnboardingTour({ tourKey, steps, onDismiss }: OnboardingTourProps) {
  const [visible,   setVisible]   = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Only show if not already dismissed. Setting state inside this effect is
  // intentional — it reads localStorage (external system) and reflects the
  // result into React state, which is the documented pattern.
  useEffect(() => {
    try {
      if (!localStorage.getItem(getStorageKey(tourKey))) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(true);
      }
    } catch {
      // localStorage unavailable in some environments — skip tour
    }
  }, [tourKey]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(getStorageKey(tourKey), "1"); } catch { /* ignore */ }
    setVisible(false);
    onDismiss?.();
  }, [tourKey, onDismiss]);

  const next = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      dismiss();
    }
  }, [stepIndex, steps.length, dismiss]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!visible || steps.length === 0) return null;

  const step = steps[stepIndex];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9000] bg-black/40 backdrop-blur-[1px]"
        onClick={dismiss}
        aria-hidden
      />

      {/* Tooltip card — centered on screen */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Onboarding step ${stepIndex + 1} of ${steps.length}: ${step.title}`}
        className="fixed z-[9001] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm px-4"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FCA311]/10 flex items-center justify-center shrink-0">
                <Zap className="h-3.5 w-3.5 text-[#FCA311]" aria-hidden />
              </div>
              <p className="text-[10px] font-bold text-[#FCA311] uppercase tracking-wider">
                Step {stepIndex + 1} of {steps.length}
              </p>
            </div>
            <button
              onClick={dismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FCA311] rounded-full transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="text-base font-black text-gray-900 dark:text-gray-100">{step.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={prev}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back
            </button>

            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FCA311] hover:brightness-105 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
            >
              {stepIndex < steps.length - 1 ? "Next" : "Got it!"}
              {stepIndex < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
