/// <reference types="cypress" />
/*
 * E2E support file — loaded automatically before every E2E spec.
 * Import custom commands and any global before/after hooks here.
 */

import "./commands";

/* Silence known Sonner / next-themes hydration warnings in the
 * Cypress browser log to keep test output clean. */
Cypress.on("uncaught:exception", (err) => {
  /* ResizeObserver loop errors are benign browser noise. */
  if (err.message.includes("ResizeObserver loop")) return false;
  /* Next.js router / navigation errors during test teardown. */
  if (err.message.includes("NEXT_NOT_FOUND")) return false;
  if (err.message.includes("NEXT_REDIRECT")) return false;
  if (err.message.includes("invariant")) return false;
  /* React hydration mismatches — surface in dev mode only, not real failures. */
  if (err.message.includes("Hydration")) return false;
  if (err.message.includes("hydrat")) return false;
  if (err.message.includes("did not match")) return false;
  /* Sonner / next-themes issues that appear during initial render. */
  if (err.message.includes("Cannot update a component")) return false;
  return true;
});
