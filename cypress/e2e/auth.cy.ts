/// <reference types="cypress" />

/*
 * E2E — Authentication
 * Tests the login, register, and forgot-password flows.
 * API calls are intercepted so tests run without a live database.
 */

describe("Authentication — Login", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  /* ── Page structure ───────────────────────────────────────────── */
  it("renders the login page with required elements", () => {
    cy.get("h1").should("contain.text", "Sign in");
    cy.get("#email").should("be.visible");
    cy.get("#password").should("be.visible");
    cy.get('[type="submit"]').should("contain.text", "Sign in");
    cy.contains("Forgot password?").should("be.visible");
    cy.contains("Create one").should("be.visible");
  });

  /* ── Validation ───────────────────────────────────────────────── */
  it("shows an email validation error when the field is empty", () => {
    cy.get('[type="submit"]').click();
    cy.contains("Enter a valid email address").should("be.visible");
  });

  it("shows a validation error for an invalid email format", () => {
    cy.get("#email").type("not-an-email");
    cy.get('[type="submit"]').click();
    cy.contains("Enter a valid email address").should("be.visible");
  });

  it("shows a password required error when the field is empty", () => {
    cy.get("#email").type("test@example.com");
    cy.get('[type="submit"]').click();
    cy.contains("Password is required").should("be.visible");
  });

  /* ── Password visibility toggle ──────────────────────────────── */
  it("toggles password visibility", () => {
    cy.get("#password").should("have.attr", "type", "password");
    cy.get('[aria-label="Show password"]').click();
    cy.get("#password").should("have.attr", "type", "text");
    cy.get('[aria-label="Hide password"]').click();
    cy.get("#password").should("have.attr", "type", "password");
  });

  /* ── Successful login (mocked) ────────────────────────────────── */
  it("logs in successfully and redirects to the homepage", () => {
    cy.intercept("POST", "/api/auth/login", {
      fixture: "user.json",
      statusCode: 200,
      body: {
        success: true,
        data: {
          user: { id: "u1", name: "Test Customer", email: "customer@example.com", role: "customer" },
          token: "mock.jwt.token",
        },
      },
    }).as("loginRequest");

    cy.get("#email").type("customer@example.com");
    cy.get("#password").type("TestPassword1");
    cy.get('[type="submit"]').click();

    cy.wait("@loginRequest").its("request.body").should("deep.include", {
      email: "customer@example.com",
    });
    cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
  });

  it("redirects admin users to /admin after login", () => {
    cy.intercept("POST", "/api/auth/login", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          user: { id: "a1", name: "Admin", email: "admin@example.com", role: "admin" },
          token: "mock.jwt.token",
        },
      },
    }).as("adminLogin");

    cy.get("#email").type("admin@example.com");
    cy.get("#password").type("AdminPassword1");
    cy.get('[type="submit"]').click();

    cy.wait("@adminLogin");
    cy.url().should("include", "/admin");
  });

  /* ── Failed login (mocked) ────────────────────────────────────── */
  it("shows an error toast when credentials are invalid", () => {
    cy.intercept("POST", "/api/auth/login", {
      statusCode: 401,
      body: { success: false, error: "Invalid email or password" },
    }).as("failedLogin");

    cy.get("#email").type("wrong@example.com");
    cy.get("#password").type("WrongPass1");
    cy.get('[type="submit"]').click();

    cy.wait("@failedLogin");
    cy.contains("Invalid email or password").should("be.visible");
  });

  /* ── Navigation links ─────────────────────────────────────────── */
  it("navigates to the register page via 'Create one' link", () => {
    cy.contains("Create one").click();
    cy.url().should("include", "/register");
  });

  it("navigates to the forgot password page", () => {
    cy.contains("Forgot password?").click();
    cy.url().should("include", "/forgot-password");
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Authentication — Register", () => {
  beforeEach(() => {
    cy.visit("/register");
  });

  it("renders the register page with required fields", () => {
    cy.get("#name").should("be.visible");
    cy.get("#email").should("be.visible");
    cy.get("#password").should("be.visible");
    cy.get("#confirmPassword").should("be.visible");
    cy.get('[type="submit"]').should("be.visible");
  });

  it("validates name length (minimum 2 characters)", () => {
    cy.get("#name").type("A");
    cy.get('[type="submit"]').click();
    cy.contains("Name must be at least 2 characters").should("be.visible");
  });

  it("validates password strength (min 8 chars, uppercase, number)", () => {
    cy.get("#name").type("Test User");
    cy.get("#email").type("test@example.com");
    cy.get("#password").type("weak");
    cy.get("#confirmPassword").type("weak");
    cy.get('[type="submit"]').click();
    cy.contains("Password must be at least 8 characters").should("be.visible");
  });

  it("validates that passwords match", () => {
    cy.get("#name").type("Test User");
    cy.get("#email").type("test@example.com");
    cy.get("#password").type("StrongPass1");
    cy.get("#confirmPassword").type("DifferentPass1");
    cy.get('[type="submit"]').click();
    cy.contains("Passwords do not match").should("be.visible");
  });

  it("registers successfully and redirects to homepage", () => {
    cy.intercept("POST", "/api/auth/register", {
      statusCode: 201,
      body: {
        success: true,
        data: {
          user: { id: "u2", name: "New User", email: "newuser@example.com", role: "customer" },
          token: "mock.jwt.token",
        },
      },
    }).as("registerRequest");

    cy.get("#name").type("New User");
    cy.get("#email").type("newuser@example.com");
    cy.get("#password").type("StrongPass1");
    cy.get("#confirmPassword").type("StrongPass1");
    cy.get('[type="submit"]').click();

    cy.wait("@registerRequest");
    cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
  });
});

/* ─────────────────────────────────────────────────────────────── */

describe("Authentication — Forgot Password", () => {
  it("renders the forgot password form", () => {
    cy.visit("/forgot-password");
    cy.get("#email").should("be.visible");
    cy.get('[type="submit"]').should("be.visible");
  });

  it("validates email on the forgot password form", () => {
    cy.visit("/forgot-password");
    cy.get('[type="submit"]').click();
    cy.contains("Enter a valid email address").should("be.visible");
  });

  it("submits the forgot password form successfully", () => {
    cy.intercept("POST", "/api/auth/forgot-password", {
      statusCode: 200,
      body: { success: true, message: "Reset email sent" },
    }).as("forgotPw");

    cy.visit("/forgot-password");
    cy.get("#email").type("customer@example.com");
    cy.get('[type="submit"]').click();

    cy.wait("@forgotPw");
  });
});
