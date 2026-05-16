/// <reference types="cypress" />
/*
 * Component support file — loaded automatically before every component spec.
 * Registers cy.mount(), imports global styles, and custom commands.
 */

import "./commands";
import "../../src/app/globals.css";

import { mount } from "cypress/react18";

/*
 * Register cy.mount() for React 19 component testing via Vite.
 * Uses the react18 entry-point which covers React 18 and 19.
 */
Cypress.Commands.add("mount", mount);

/* TypeScript augmentation: tell the type checker cy.mount() exists. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

export {};
