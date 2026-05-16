// Admin vendors – status tabs, date filter, URL persistence, and filter chips

describe("Admin Vendors – Filters & URL Sync", () => {
  const adminEmail    = "admin@example.com";
  const adminPassword = "password123";

  function loginAsAdmin() {
    cy.session("admin", () => {
      cy.visit("/login");
      cy.get('[data-testid="email-input"]').type(adminEmail);
      cy.get('[data-testid="password-input"]').type(adminPassword);
      cy.get('[data-testid="login-btn"]').click();
      cy.url().should("not.include", "/login");
    });
  }

  beforeEach(() => {
    loginAsAdmin();
    cy.visit("/admin/vendors");
    cy.get('[data-testid="vendor-status-tabs"]', { timeout: 10000 }).should("be.visible");
  });

  // ─── Status tabs ───────────────────────────────────────────────────────────

  it("renders All, Active, Pending, Suspended status tabs", () => {
    cy.get('[data-testid="vendor-status-all"]').should("exist");
    cy.get('[data-testid="vendor-status-active"]').should("exist");
    cy.get('[data-testid="vendor-status-pending"]').should("exist");
    cy.get('[data-testid="vendor-status-suspended"]').should("exist");
  });

  it("All tab is selected by default", () => {
    cy.get('[data-testid="vendor-status-all"]').should("have.class", "bg-[#0F4C75]");
  });

  it("clicking Active tab updates URL with status=active", () => {
    cy.get('[data-testid="vendor-status-active"]').click();
    cy.url().should("include", "status=active");
  });

  it("clicking Pending tab updates URL with status=pending", () => {
    cy.get('[data-testid="vendor-status-pending"]').click();
    cy.url().should("include", "status=pending");
  });

  it("clicking Suspended tab updates URL with status=suspended", () => {
    cy.get('[data-testid="vendor-status-suspended"]').click();
    cy.url().should("include", "status=suspended");
  });

  it("clicking All tab clears status from URL", () => {
    cy.get('[data-testid="vendor-status-pending"]').click();
    cy.url().should("include", "status=pending");
    cy.get('[data-testid="vendor-status-all"]').click();
    cy.url().should("not.include", "status=");
  });

  it("active status tab sends correct query to API", () => {
    cy.intercept("GET", "/api/admin/vendors*").as("vendorApi");
    cy.get('[data-testid="vendor-status-active"]').click();
    cy.wait("@vendorApi").its("request.url").should("include", "status=active");
  });

  // ─── Search ────────────────────────────────────────────────────────────────

  it("typing in search updates URL search param", () => {
    cy.get('[data-testid="vendor-search"]').type("Fresh");
    cy.url().should("include", "search=Fresh");
  });

  it("typing in search sends correct query to API", () => {
    cy.intercept("GET", "/api/admin/vendors*").as("vendorApi");
    cy.get('[data-testid="vendor-search"]').clear().type("TestVendor");
    cy.wait("@vendorApi").its("request.url").should("include", "TestVendor");
  });

  // ─── Date filter ───────────────────────────────────────────────────────────

  it("opens date filter panel on button click", () => {
    cy.get('[data-testid="date-filter-btn"]').click();
    cy.get('[data-testid="date-from-input"]').should("be.visible");
    cy.get('[data-testid="date-to-input"]').should("be.visible");
  });

  it("applies date filter and updates URL", () => {
    cy.get('[data-testid="date-filter-btn"]').click();
    cy.get('[data-testid="date-from-input"]').type("2024-01-01");
    cy.get('[data-testid="date-to-input"]').type("2024-12-31");
    cy.get('[data-testid="date-filter-apply"]').click();
    cy.url().should("include", "dateFrom=2024-01-01");
    cy.url().should("include", "dateTo=2024-12-31");
  });

  it("date filter sends dateFrom/dateTo to API", () => {
    cy.intercept("GET", "/api/admin/vendors*").as("vendorApi");
    cy.get('[data-testid="date-filter-btn"]').click();
    cy.get('[data-testid="date-from-input"]').type("2024-06-01");
    cy.get('[data-testid="date-to-input"]').type("2024-06-30");
    cy.get('[data-testid="date-filter-apply"]').click();
    cy.wait("@vendorApi").its("request.url").then((url: string) => {
      expect(url).to.include("dateFrom=2024-06-01");
      expect(url).to.include("dateTo=2024-06-30");
    });
  });

  it("date preset Last 7 days applies correctly", () => {
    cy.get('[data-testid="date-filter-btn"]').click();
    cy.get('[data-testid="date-preset-last-7-days"]').click();
    cy.url().should("include", "dateFrom=");
    cy.url().should("include", "dateTo=");
  });

  it("clears date filter when Clear is clicked", () => {
    cy.get('[data-testid="date-filter-btn"]').click();
    cy.get('[data-testid="date-from-input"]').type("2024-01-01");
    cy.get('[data-testid="date-to-input"]').type("2024-12-31");
    cy.get('[data-testid="date-filter-apply"]').click();
    cy.url().should("include", "dateFrom=");
    cy.get('[data-testid="date-filter-btn"]').click();
    cy.get('[data-testid="date-filter-clear"]').click();
    cy.url().should("not.include", "dateFrom=");
    cy.url().should("not.include", "dateTo=");
  });

  // ─── Active filter chips ───────────────────────────────────────────────────

  it("shows filter chips when filters are active", () => {
    cy.get('[data-testid="vendor-status-active"]').click();
    cy.get('[data-testid="active-vendor-filters"]').should("be.visible");
  });

  it("removes status chip clears the status filter", () => {
    cy.get('[data-testid="vendor-status-active"]').click();
    cy.get('[data-testid="active-vendor-filters"]').within(() => {
      cy.get('button[aria-label*="Remove"]').first().click();
    });
    cy.get('[data-testid="vendor-status-all"]').should("have.class", "bg-[#0F4C75]");
  });

  // ─── URL persistence ────────────────────────────────────────────────────────

  it("restores filters from URL on page load", () => {
    cy.visit("/admin/vendors?status=active");
    cy.get('[data-testid="vendor-status-tabs"]', { timeout: 10000 }).should("be.visible");
    cy.get('[data-testid="vendor-status-active"]').should("have.class", "bg-[#0F4C75]");
  });

  it("clears all filters with Clear button", () => {
    cy.get('[data-testid="vendor-status-pending"]').click();
    cy.get('[data-testid="clear-vendor-filters"]').should("be.visible").click();
    cy.url().should("not.include", "status=");
  });

  // ─── RBAC ──────────────────────────────────────────────────────────────────

  it("redirects non-admin to home", () => {
    cy.session("non-admin-vendors", () => {
      cy.visit("/login");
      cy.get('[data-testid="email-input"]').type("customer@example.com");
      cy.get('[data-testid="password-input"]').type("password123");
      cy.get('[data-testid="login-btn"]').click();
    });
    cy.visit("/admin/vendors");
    cy.url().should("not.include", "/admin");
  });
});
