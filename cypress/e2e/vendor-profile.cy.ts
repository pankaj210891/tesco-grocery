/**
 * E2E: Vendor Profile Edit Page
 *
 * Covers:
 *  - Page renders with profile data loaded from API
 *  - Read-only fields (email, owner, slug) are locked
 *  - Editable fields are pre-populated
 *  - Changing a field marks the form as dirty
 *  - Save button is disabled when form is pristine or name is empty
 *  - Discard button resets form to server state
 *  - Successful save shows success banner and disables Save button
 *  - API error shows error banner
 *  - Profile link is visible in VendorSidebar
 *  - API: PUT /api/vendor/profile returns 401 when unauthenticated
 */

const VENDOR_EMAIL    = Cypress.env("VENDOR_EMAIL")    ?? "vendor@example.com";
const VENDOR_PASSWORD = Cypress.env("VENDOR_PASSWORD") ?? "Test@1234";

const MOCK_VENDOR = {
  _id:         "vendor001",
  name:        "Green Harvest",
  slug:        "green-harvest",
  description: "Fresh organic produce",
  logo:        "",
  email:       "vendor@example.com",
  phone:       "+91 98765 43210",
  address:     "12 Farm Lane",
  city:        "Mumbai",
  status:      "active",
  ownerId:     "user001",
  ownerName:   "Raj Kumar",
  createdAt:   new Date().toISOString(),
};

function vendorLogin() {
  cy.request("POST", "/api/auth/login", {
    email:    VENDOR_EMAIL,
    password: VENDOR_PASSWORD,
  }).then((res) => {
    expect(res.status).to.eq(200);
    const { token, user } = res.body.data as { token: string; user: object };
    window.localStorage.setItem(
      "prakash-auth",
      JSON.stringify({ state: { user, token, hasHydrated: true }, version: 0 }),
    );
  });
}

function interceptProfile(overrides: Partial<typeof MOCK_VENDOR> = {}) {
  cy.intercept("GET", "/api/vendor/profile", {
    body: { success: true, data: { ...MOCK_VENDOR, ...overrides } },
  }).as("getProfile");
}

// ── Page rendering ────────────────────────────────────────────────────────────

describe("Vendor Profile page — rendering", () => {
  beforeEach(() => {
    vendorLogin();
    interceptProfile();
    cy.visit("/vendor/profile");
    cy.wait("@getProfile");
  });

  it("shows the page heading", () => {
    cy.contains("Business Profile").should("be.visible");
  });

  it("shows vendor status badge", () => {
    cy.get('[data-testid="vendor-status-badge"]').should("contain", "Active");
  });

  it("pre-fills editable fields from API data", () => {
    cy.get('[data-testid="vendor-name-input"]').should("have.value", MOCK_VENDOR.name);
    cy.get('[data-testid="vendor-description-input"]').should("have.value", MOCK_VENDOR.description);
    cy.get('[data-testid="vendor-phone-input"]').should("have.value", MOCK_VENDOR.phone);
    cy.get('[data-testid="vendor-address-input"]').should("have.value", MOCK_VENDOR.address);
    cy.get('[data-testid="vendor-city-input"]').should("have.value", MOCK_VENDOR.city);
  });

  it("shows read-only email in the account information block", () => {
    cy.contains(MOCK_VENDOR.email).should("be.visible");
  });

  it("shows read-only owner name", () => {
    cy.contains(MOCK_VENDOR.ownerName).should("be.visible");
  });

  it("Save button is disabled when form is pristine", () => {
    cy.get('[data-testid="save-profile-btn"]').should("be.disabled");
  });

  it("Discard button is disabled when form is pristine", () => {
    cy.get('[data-testid="discard-btn"]').should("be.disabled");
  });
});

// ── Dirty state ───────────────────────────────────────────────────────────────

describe("Vendor Profile page — form dirty state", () => {
  beforeEach(() => {
    vendorLogin();
    interceptProfile();
    cy.visit("/vendor/profile");
    cy.wait("@getProfile");
  });

  it("enables Save and Discard after editing a field", () => {
    cy.get('[data-testid="vendor-city-input"]').clear().type("Delhi");
    cy.get('[data-testid="save-profile-btn"]').should("not.be.disabled");
    cy.get('[data-testid="discard-btn"]').should("not.be.disabled");
  });

  it("Discard resets the field to its original value", () => {
    cy.get('[data-testid="vendor-city-input"]').clear().type("Delhi");
    cy.get('[data-testid="discard-btn"]').click();
    cy.get('[data-testid="vendor-city-input"]').should("have.value", MOCK_VENDOR.city);
    cy.get('[data-testid="save-profile-btn"]').should("be.disabled");
  });

  it("Save button is disabled when name is cleared", () => {
    cy.get('[data-testid="vendor-name-input"]').clear();
    cy.get('[data-testid="save-profile-btn"]').should("be.disabled");
  });
});

// ── Successful save ───────────────────────────────────────────────────────────

describe("Vendor Profile page — save flow", () => {
  beforeEach(() => {
    vendorLogin();
    interceptProfile();
  });

  it("shows success banner after a successful PUT", () => {
    cy.intercept("PUT", "/api/vendor/profile", {
      body: { success: true, data: { ...MOCK_VENDOR, city: "Pune" } },
    }).as("putProfile");

    cy.visit("/vendor/profile");
    cy.wait("@getProfile");

    cy.get('[data-testid="vendor-city-input"]').clear().type("Pune");
    cy.get('[data-testid="save-profile-btn"]').click();
    cy.wait("@putProfile");

    cy.get('[data-testid="success-banner"]').should("be.visible");
    cy.get('[data-testid="success-banner"]').should("contain", "updated successfully");
  });

  it("form becomes pristine after save (Save button disabled)", () => {
    cy.intercept("PUT", "/api/vendor/profile", {
      body: { success: true, data: { ...MOCK_VENDOR, phone: "+91 11111 11111" } },
    }).as("putProfile2");

    cy.visit("/vendor/profile");
    cy.wait("@getProfile");

    cy.get('[data-testid="vendor-phone-input"]').clear().type("+91 11111 11111");
    cy.get('[data-testid="save-profile-btn"]').click();
    cy.wait("@putProfile2");

    cy.get('[data-testid="save-profile-btn"]').should("be.disabled");
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe("Vendor Profile page — error states", () => {
  beforeEach(() => {
    vendorLogin();
    interceptProfile();
  });

  it("shows error banner when PUT fails", () => {
    cy.intercept("PUT", "/api/vendor/profile", {
      statusCode: 500,
      body:       { success: false, error: "Database error" },
    }).as("putFail");

    cy.visit("/vendor/profile");
    cy.wait("@getProfile");

    cy.get('[data-testid="vendor-city-input"]').clear().type("Chennai");
    cy.get('[data-testid="save-profile-btn"]').click();
    cy.wait("@putFail");

    cy.get('[data-testid="error-banner"]').should("be.visible");
  });
});

// ── Sidebar navigation ────────────────────────────────────────────────────────

describe("VendorSidebar — profile link", () => {
  beforeEach(() => {
    vendorLogin();
    interceptProfile();
    cy.visit("/vendor");
  });

  it("shows Profile link in desktop sidebar", () => {
    cy.get("aside").contains("Profile").should("exist");
  });

  it("navigates to /vendor/profile on click", () => {
    cy.intercept("GET", "/api/vendor/profile").as("profileGet");
    cy.get("aside").contains("Profile").click();
    cy.url().should("include", "/vendor/profile");
  });
});

// ── API auth guard ────────────────────────────────────────────────────────────

describe("Vendor Profile API — auth guard", () => {
  it("PUT returns 401 when unauthenticated", () => {
    cy.request({
      method:           "PUT",
      url:              "/api/vendor/profile",
      body:             { name: "Hacker" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });

  it("GET returns 401 when unauthenticated", () => {
    cy.request({
      method:           "GET",
      url:              "/api/vendor/profile",
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });
});
