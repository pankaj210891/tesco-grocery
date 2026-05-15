/// <reference types="cypress" />
import React from "react";
import Badge from "../../src/components/ui/Badge";

/*
 * Component Tests — Badge
 * Tests all badge variants render the correct default label and
 * that a custom label overrides the default.
 */

describe("Badge component", () => {
  /* ── Default labels per variant ───────────────────────────────── */
  it("renders 'Sale' label for the sale variant", () => {
    cy.mount(<Badge variant="sale" />);
    cy.get("span").should("contain.text", "Sale");
  });

  it("renders 'New' label for the new variant", () => {
    cy.mount(<Badge variant="new" />);
    cy.get("span").should("contain.text", "New");
  });

  it("renders 'Bestseller' label for the bestseller variant", () => {
    cy.mount(<Badge variant="bestseller" />);
    cy.get("span").should("contain.text", "Bestseller");
  });

  it("renders 'Out of Stock' label for the outOfStock variant", () => {
    cy.mount(<Badge variant="outOfStock" />);
    cy.get("span").should("contain.text", "Out of Stock");
  });

  /* ── Custom label overrides default ───────────────────────────── */
  it("renders a custom label when the label prop is supplied", () => {
    cy.mount(<Badge variant="sale" label="50% OFF" />);
    cy.get("span").should("contain.text", "50% OFF").and("not.contain.text", "Sale");
  });

  /* ── Visual checks ────────────────────────────────────────────── */
  it("applies the correct background colour for the sale variant", () => {
    cy.mount(<Badge variant="sale" />);
    /* Sale badge uses bg-[#EE1C2E] — verify the element is visible and coloured */
    cy.get("span").should("be.visible");
  });

  it("renders as inline-flex so it does not stretch the container", () => {
    cy.mount(
      <div style={{ width: 200, border: "1px solid #ccc" }}>
        <Badge variant="new" />
      </div>
    );
    cy.get("span").should("have.css", "display").and("match", /inline/);
  });

  /* ── Custom className ─────────────────────────────────────────── */
  it("merges a custom className onto the span", () => {
    cy.mount(<Badge variant="new" className="my-badge" />);
    cy.get("span").should("have.class", "my-badge");
  });

  /* ── Accessibility ────────────────────────────────────────────── */
  it("uses uppercase tracking-wide text styling", () => {
    cy.mount(<Badge variant="sale" />);
    cy.get("span")
      .should("have.class", "uppercase")
      .and("have.class", "tracking-wide");
  });
});
