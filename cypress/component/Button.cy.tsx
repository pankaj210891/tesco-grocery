/// <reference types="cypress" />
import React from "react";
import Button from "../../src/components/ui/Button";

/*
 * Component Tests — Button
 * Tests rendering variants, sizes, loading state, disabled behaviour,
 * and click handler invocation in isolation.
 */

describe("Button component", () => {
  /* ── Variants ─────────────────────────────────────────────────── */
  it("renders the primary variant by default", () => {
    cy.mount(<Button>Add to Cart</Button>);
    cy.get("button").should("contain.text", "Add to Cart");
    cy.get("button").should("not.be.disabled");
  });

  it("renders the secondary variant", () => {
    cy.mount(<Button variant="secondary">Secondary</Button>);
    cy.get("button").should("contain.text", "Secondary");
  });

  it("renders the outline variant", () => {
    cy.mount(<Button variant="outline">Outline</Button>);
    cy.get("button").should("exist");
  });

  it("renders the ghost variant", () => {
    cy.mount(<Button variant="ghost">Ghost</Button>);
    cy.get("button").should("exist");
  });

  it("renders the danger variant", () => {
    cy.mount(<Button variant="danger">Delete</Button>);
    cy.get("button").should("contain.text", "Delete");
  });

  /* ── Sizes ────────────────────────────────────────────────────── */
  it("renders at sm size", () => {
    cy.mount(<Button size="sm">Small</Button>);
    cy.get("button").should("exist");
  });

  it("renders at md size (default)", () => {
    cy.mount(<Button size="md">Medium</Button>);
    cy.get("button").should("exist");
  });

  it("renders at lg size", () => {
    cy.mount(<Button size="lg">Large</Button>);
    cy.get("button").should("exist");
  });

  /* ── Full width ───────────────────────────────────────────────── */
  it("renders full-width when fullWidth prop is set", () => {
    cy.mount(<Button fullWidth>Full Width</Button>);
    cy.get("button").should("have.class", "w-full");
  });

  /* ── Loading state ────────────────────────────────────────────── */
  it("shows a spinner and disables the button when loading", () => {
    cy.mount(<Button loading>Saving…</Button>);
    cy.get("button").should("be.disabled");
    /* Spinner rendered as a span with animate-spin */
    cy.get("button span.animate-spin").should("exist");
  });

  /* ── Disabled ─────────────────────────────────────────────────── */
  it("is disabled when the disabled prop is set", () => {
    cy.mount(<Button disabled>Disabled</Button>);
    cy.get("button").should("be.disabled");
  });

  it("does not fire onClick when disabled", () => {
    const onClickSpy = cy.stub().as("clickHandler");
    cy.mount(<Button disabled onClick={onClickSpy}>Disabled</Button>);
    cy.get("button").click({ force: true });
    cy.get("@clickHandler").should("not.have.been.called");
  });

  /* ── Click handler ────────────────────────────────────────────── */
  it("fires the onClick handler when clicked", () => {
    const onClickSpy = cy.stub().as("clickHandler");
    cy.mount(<Button onClick={onClickSpy}>Click Me</Button>);
    cy.get("button").click();
    cy.get("@clickHandler").should("have.been.calledOnce");
  });

  /* ── Accessibility ────────────────────────────────────────────── */
  it("forwards extra HTML attributes (e.g. type=submit)", () => {
    cy.mount(<Button type="submit">Submit</Button>);
    cy.get("button").should("have.attr", "type", "submit");
  });

  it("accepts and applies a custom className", () => {
    cy.mount(<Button className="my-custom-class">Custom</Button>);
    cy.get("button").should("have.class", "my-custom-class");
  });
});
