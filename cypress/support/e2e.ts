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
  /* Suppress Next.js router errors that occur during test teardown. */
  if (err.message.includes("NEXT_NOT_FOUND")) return false;
  return true;
});
