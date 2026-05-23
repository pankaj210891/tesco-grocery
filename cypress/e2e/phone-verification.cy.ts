/// <reference types="cypress" />

/*
 * E2E — Phone Number Verification
 * Tests the full OTP verification flow on the profile page.
 * All API calls are intercepted; no live DB or email required.
 */

const PROFILE_WITH_UNVERIFIED_PHONE = {
  _id:             "user123",
  name:            "Test User",
  email:           "test@example.com",
  role:            "customer",
  status:          "active",
  phone:           "+919876543210",
  isPhoneVerified: false,
  dietaryPreferences: [],
  marketingPreference: null,
  hearFromBrands:  false,
  createdAt:       new Date().toISOString(),
  setupProgress: {
    totalSteps:     3,
    completedSteps: 1,
    percentage:     33,
    steps: [
      { key: "phone",     label: "Mobile number",         description: "Add a phone", completed: true,  href: "/account/profile",              linkLabel: "Add mobile number" },
      { key: "marketing", label: "Marketing preferences", description: "Set prefs",   completed: false, href: "/account/preferences/marketing", linkLabel: "Update marketing preferences" },
      { key: "dietary",   label: "Dietary preferences",   description: "Set diet",    completed: false, href: "/account/preferences/dietary",   linkLabel: "Update dietary preferences" },
    ],
  },
};

const PROFILE_WITH_VERIFIED_PHONE = {
  ...PROFILE_WITH_UNVERIFIED_PHONE,
  isPhoneVerified: true,
};

const PROFILE_NO_PHONE = {
  ...PROFILE_WITH_UNVERIFIED_PHONE,
  phone: null,
  isPhoneVerified: false,
};

function stubAuth() {
  const authState = {
    state: {
      user:        { _id: "user123", name: "Test User", email: "test@example.com", role: "customer" },
      token:       "mock-token",
      hasHydrated: true,
    },
    version: 0,
  };
  window.localStorage.setItem("prakash-auth", JSON.stringify(authState));
}

function stubProfile(profile: typeof PROFILE_WITH_UNVERIFIED_PHONE) {
  cy.intercept("GET", "/api/account/profile", { body: { data: profile } }).as("getProfile");
}

function visitProfile() {
  cy.visit("/account/profile");
}

/* ──────────────────────────────────────────────────────────────── */
describe("Phone Verification — Profile Page", () => {
  beforeEach(() => {
    cy.window().then(stubAuth);
  });

  /* ── Status badges ─────────────────────────────────────────────── */
  describe("Status badges", () => {
    it("shows 'Phone number verified' badge when phone is verified", () => {
      stubProfile(PROFILE_WITH_VERIFIED_PHONE);
      visitProfile();
      cy.wait("@getProfile");
      cy.contains("Phone number verified").should("be.visible");
      cy.contains("Verify now").should("not.exist");
    });

    it("shows unverified warning with 'Verify now' link when phone is set but not verified", () => {
      stubProfile(PROFILE_WITH_UNVERIFIED_PHONE);
      visitProfile();
      cy.wait("@getProfile");
      cy.contains("Phone number not verified").should("be.visible");
      cy.contains("Verify now").should("be.visible");
    });

    it("shows no badge when phone is not added", () => {
      stubProfile(PROFILE_NO_PHONE);
      visitProfile();
      cy.wait("@getProfile");
      cy.contains("Phone number verified").should("not.exist");
      cy.contains("Verify now").should("not.exist");
    });
  });

  /* ── Modal open / close ────────────────────────────────────────── */
  describe("Verification modal", () => {
    beforeEach(() => {
      stubProfile(PROFILE_WITH_UNVERIFIED_PHONE);
      visitProfile();
      cy.wait("@getProfile");
    });

    it("opens the modal when clicking 'Verify now'", () => {
      cy.contains("Verify now").click();
      cy.contains("Verify phone number").should("be.visible");
      cy.contains("Send verification code").should("be.visible");
    });

    it("closes the modal when clicking the X button", () => {
      cy.contains("Verify now").click();
      cy.get('[aria-label="Close"]').click();
      cy.contains("Verify phone number").should("not.exist");
    });

    it("closes the modal when clicking the backdrop", () => {
      cy.contains("Verify now").click();
      cy.get('[role="dialog"]').click("top", { force: true });
      cy.contains("Verify phone number").should("not.exist");
    });
  });

  /* ── Send OTP step ─────────────────────────────────────────────── */
  describe("Send OTP step", () => {
    beforeEach(() => {
      stubProfile(PROFILE_WITH_UNVERIFIED_PHONE);
      visitProfile();
      cy.wait("@getProfile");
      cy.contains("Verify now").click();
    });

    it("calls send-otp API and advances to verify step on success", () => {
      cy.intercept("POST", "/api/account/phone/send-otp", {
        statusCode: 200,
        body: { success: true, message: "Code sent to your email.", cooldown: 60, expiresInMin: 10 },
      }).as("sendOtp");

      cy.contains("Send verification code").click();
      cy.wait("@sendOtp");
      cy.contains("Enter the 6-digit code").should("be.visible");
    });

    it("shows error message when send-otp fails", () => {
      cy.intercept("POST", "/api/account/phone/send-otp", {
        statusCode: 429,
        body: { error: "Please wait 45 seconds before requesting a new code.", retryAfter: 45 },
      }).as("sendOtpFail");

      cy.contains("Send verification code").click();
      cy.wait("@sendOtpFail");
      cy.contains("Please wait 45 seconds").should("be.visible");
    });
  });

  /* ── OTP input ─────────────────────────────────────────────────── */
  describe("OTP input step", () => {
    beforeEach(() => {
      stubProfile(PROFILE_WITH_UNVERIFIED_PHONE);
      visitProfile();
      cy.wait("@getProfile");
      cy.contains("Verify now").click();

      cy.intercept("POST", "/api/account/phone/send-otp", {
        body: { success: true, message: "Code sent.", cooldown: 60, expiresInMin: 10 },
      }).as("sendOtp");
      cy.contains("Send verification code").click();
      cy.wait("@sendOtp");
    });

    it("renders 6 digit input boxes", () => {
      cy.get('[role="group"][aria-label="6-digit verification code"] input').should("have.length", 6);
    });

    it("Verify button is disabled until all 6 digits are entered", () => {
      cy.contains("button", "Verify").should("be.disabled");
      cy.get('[aria-label="Digit 1"]').type("1");
      cy.contains("button", "Verify").should("be.disabled");
    });

    it("enables Verify button after all 6 digits entered", () => {
      ["1", "2", "3", "4", "5", "6"].forEach((d, i) => {
        cy.get(`[aria-label="Digit ${i + 1}"]`).type(d);
      });
      cy.contains("button", "Verify").should("not.be.disabled");
    });

    it("shows success state on correct OTP", () => {
      cy.intercept("POST", "/api/account/phone/verify-otp", {
        body: { success: true, message: "Phone verified." },
      }).as("verifyOtp");

      ["1", "2", "3", "4", "5", "6"].forEach((d, i) => {
        cy.get(`[aria-label="Digit ${i + 1}"]`).type(d);
      });
      cy.contains("button", "Verify").click();
      cy.wait("@verifyOtp");
      cy.contains("Phone verified!").should("be.visible");
    });

    it("shows error and clears inputs on incorrect OTP", () => {
      cy.intercept("POST", "/api/account/phone/verify-otp", {
        statusCode: 400,
        body: { error: "Incorrect code. 4 attempts remaining." },
      }).as("verifyFail");

      ["9", "9", "9", "9", "9", "9"].forEach((d, i) => {
        cy.get(`[aria-label="Digit ${i + 1}"]`).type(d);
      });
      cy.contains("button", "Verify").click();
      cy.wait("@verifyFail");
      cy.contains("Incorrect code. 4 attempts remaining.").should("be.visible");
      cy.get('[aria-label="Digit 1"]').should("have.value", "");
    });

    it("shows resend cooldown timer and re-enables after it expires", () => {
      cy.contains("Resend in").should("be.visible");
      cy.contains("Resend code").should("not.exist");
    });

    it("navigates back to send step via 'Change phone number' link", () => {
      cy.contains("← Change phone number").click();
      cy.contains("Send verification code").should("be.visible");
    });
  });

  /* ── Rate limiting feedback ────────────────────────────────────── */
  describe("Rate limiting", () => {
    it("shows lockout message when too many attempts exhausted", () => {
      stubProfile(PROFILE_WITH_UNVERIFIED_PHONE);
      visitProfile();
      cy.wait("@getProfile");
      cy.contains("Verify now").click();

      cy.intercept("POST", "/api/account/phone/send-otp", {
        statusCode: 429,
        body: { error: "Too many attempts. Please wait 30 minutes before trying again." },
      }).as("locked");

      cy.contains("Send verification code").click();
      cy.wait("@locked");
      cy.contains("Too many attempts").should("be.visible");
    });
  });
});

/* ──────────────────────────────────────────────────────────────── */
describe("Phone Verification — AccountOverview Security Card", () => {
  beforeEach(() => {
    cy.window().then(stubAuth);
  });

  it("shows Verified pill in the security card when phone is verified", () => {
    cy.intercept("GET", "/api/account/profile", { body: { data: PROFILE_WITH_VERIFIED_PHONE } }).as("getProfile");
    cy.intercept("GET", "/api/account/orders*", { body: { data: [] } }).as("getOrders");
    cy.visit("/account");
    cy.wait("@getProfile");
    cy.contains("Verified").should("be.visible");
  });

  it("shows Unverified pill in the security card when phone is set but not verified", () => {
    cy.intercept("GET", "/api/account/profile", { body: { data: PROFILE_WITH_UNVERIFIED_PHONE } }).as("getProfile");
    cy.intercept("GET", "/api/account/orders*", { body: { data: [] } }).as("getOrders");
    cy.visit("/account");
    cy.wait("@getProfile");
    cy.contains("Unverified").should("be.visible");
  });
});
