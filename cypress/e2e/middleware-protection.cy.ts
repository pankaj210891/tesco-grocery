/**
 * E2E: Next.js Route Middleware — server-side auth & role protection
 *
 * Tests that unauthenticated or wrong-role visitors are redirected
 * before any page renders (edge middleware, not client-side AuthGuard).
 */

describe("Route Middleware — unauthenticated redirects", () => {
  beforeEach(() => {
    // Ensure no session cookie is present
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("redirects /account to /login with next param", () => {
    cy.visit("/account", { failOnStatusCode: false });
    cy.url().should("include", "/login");
    cy.url().should("include", "next=%2Faccount");
  });

  it("redirects /admin to /login with next param", () => {
    cy.visit("/admin", { failOnStatusCode: false });
    cy.url().should("include", "/login");
    cy.url().should("include", "next=%2Fadmin");
  });

  it("redirects /vendor to /login with next param", () => {
    cy.visit("/vendor", { failOnStatusCode: false });
    cy.url().should("include", "/login");
    cy.url().should("include", "next=%2Fvendor");
  });

  it("redirects /admin/products to /login", () => {
    cy.visit("/admin/products", { failOnStatusCode: false });
    cy.url().should("include", "/login");
  });

  it("redirects /vendor/products to /login", () => {
    cy.visit("/vendor/products", { failOnStatusCode: false });
    cy.url().should("include", "/login");
  });

  it("allows unauthenticated access to public routes", () => {
    cy.visit("/");
    cy.url().should("not.include", "/login");

    cy.visit("/products");
    cy.url().should("not.include", "/login");

    cy.visit("/login");
    cy.url().should("include", "/login");
  });
});

describe("Route Middleware — role-based redirects (customer cannot access admin/vendor)", () => {
  before(() => {
    // Log in as a customer to obtain the auth_token cookie
    cy.request("POST", "/api/auth/login", {
      email:    Cypress.env("CUSTOMER_EMAIL")    ?? "customer@example.com",
      password: Cypress.env("CUSTOMER_PASSWORD") ?? "Test@1234",
    }).then((res) => {
      expect(res.status).to.eq(200);
      // The login API sets an httpOnly cookie via Set-Cookie header.
      // Cypress automatically stores cookies from API responses.
    });
  });

  it("customer is redirected away from /admin to home", () => {
    cy.visit("/admin", { failOnStatusCode: false });
    cy.url().should("not.include", "/admin");
  });

  it("customer is redirected away from /vendor to home", () => {
    cy.visit("/vendor", { failOnStatusCode: false });
    cy.url().should("not.include", "/vendor");
  });

  it("customer can access /account", () => {
    cy.visit("/account", { failOnStatusCode: false });
    cy.url().should("include", "/account");
  });
});

describe("Route Middleware — logout clears cookie", () => {
  it("logs out and is then redirected from /account to /login", () => {
    // Log in first
    cy.request("POST", "/api/auth/login", {
      email:    Cypress.env("CUSTOMER_EMAIL")    ?? "customer@example.com",
      password: Cypress.env("CUSTOMER_PASSWORD") ?? "Test@1234",
    });

    // Verify cookie exists
    cy.getCookie("auth_token").should("exist");

    // Call logout API (mirrors store behaviour)
    cy.request("POST", "/api/auth/logout").then((res) => {
      expect(res.status).to.eq(200);
    });

    // Cookie should be cleared
    cy.getCookie("auth_token").should("not.exist");

    // Visiting protected route should now redirect
    cy.visit("/account", { failOnStatusCode: false });
    cy.url().should("include", "/login");
  });
});
