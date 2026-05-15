/// <reference types="cypress" />
/*
 * Component support file — loaded automatically before every component spec.
 * Registers cy.mount(), imports global styles, and custom commands.
 */

import "./commands";
import "../../src/app/globals.css";

import { mount } from "cypress/react";

/*
 * Register cy.mount() so component specs can mount React components.
 * The framework preset (next/webpack in cypress.config.ts) wires up
 * Next.js context automatically.
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
