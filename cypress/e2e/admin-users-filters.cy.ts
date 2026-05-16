/// <reference types="cypress" />

/*
 * E2E — Admin Users Filters
 * Tests all filters, sorting, pagination, URL persistence, and clear filters
 * for the admin users management page.
 */

const ADMIN_AUTH = {
  user:  { _id: "admin001", name: "Admin", email: "admin@test.com", role: "admin", status: "active" },
  token: "fake-admin-token",
};

const USERS_STUB = {
  success: true,
  data: {
    users: [
      {
        _id: "u1", name: "Alice Customer", email: "alice@test.com",
        role: "customer", status: "active", createdAt: "2024-01-15T00:00:00.000Z",
      },
      {
        _id: "u2", name: "Bob Vendor", email: "bob@test.com",
        role: "vendor", status: "active", createdAt: "2024-02-20T00:00:00.000Z",
      },
      {
        _id: "u3", name: "Carol Suspended", email: "carol@test.com",
        role: "customer", status: "suspended", createdAt: "2024-03-10T00:00:00.000Z",
      },
    ],
    total: 3, page: 1, totalPages: 1,
  },
};

const EMPTY_STUB = {
  success: true,
  data: { users: [], total: 0, page: 1, totalPages: 0 },
};

function stubAuth() {
  const authState = { state: { user: ADMIN_AUTH.user, token: ADMIN_AUTH.token, hasHydrated: true }, version: 0 };
  window.localStorage.setItem("prakash-auth", JSON.stringify(authState));
}

function interceptUsers(body = USERS_STUB) {
  cy.intercept("GET", "/api/admin/users*", body).as("getUsers");
}

function visitAdmin(qs = "") {
  cy.visit(`/admin/users${qs ? `?${qs}` : ""}`, {
    onBeforeLoad: stubAuth,
  });
}

// ── Page render ───────────────────────────────────────────────────────────────

describe("Admin Users — Page Render", () => {
  beforeEach(() => {
    interceptUsers();
    visitAdmin();
  });

  it("renders the Users heading", () => {
    cy.contains("Users").should("be.visible");
  });

  it("displays user rows from API", () => {
    cy.get("[data-testid='user-row']").should("have.length", 3);
  });

  it("shows search input", () => {
    cy.get("[data-testid='user-search']").should("exist");
  });

  it("shows role filter tabs", () => {
    cy.get("[data-testid='role-filters']").should("exist");
    cy.get("[data-testid='role-filter-all']").should("be.visible");
  });

  it("shows status filter tabs", () => {
    cy.get("[data-testid='status-filters']").should("exist");
    cy.get("[data-testid='status-filter-all']").should("be.visible");
  });

  it("shows sort dropdown", () => {
    cy.get("[data-testid='user-sort']").should("exist");
  });

  it("shows date range inputs", () => {
    cy.get("[data-testid='user-date-from']").should("exist");
    cy.get("[data-testid='user-date-to']").should("exist");
  });

  it("clear button is not shown when no filters are active", () => {
    cy.get("[data-testid='clear-user-filters']").should("not.exist");
  });
});

// ── Search filter ─────────────────────────────────────────────────────────────

describe("Admin Users — Search Filter", () => {
  beforeEach(() => {
    interceptUsers();
    visitAdmin();
  });

  it("typing in search updates URL with search param", () => {
    cy.get("[data-testid='user-search']").type("alice");
    cy.url().should("include", "search=alice");
  });

  it("search shows active filter chip", () => {
    cy.get("[data-testid='user-search']").type("bob");
    cy.get("[data-testid='active-user-filters']").contains("bob").should("exist");
  });

  it("removing search chip clears URL param", () => {
    cy.get("[data-testid='user-search']").type("carol");
    cy.url().should("include", "search=carol");
    cy.get("[data-testid='active-user-filters']").find("button").first().click();
    cy.url().should("not.include", "search=carol");
  });
});

// ── Role filter ───────────────────────────────────────────────────────────────

describe("Admin Users — Role Filter", () => {
  beforeEach(() => {
    interceptUsers();
    visitAdmin();
  });

  it("clicking customer tab sets role=customer in URL", () => {
    cy.get("[data-testid='role-filter-customer']").click();
    cy.url().should("include", "role=customer");
  });

  it("clicking vendor tab sets role=vendor in URL", () => {
    cy.get("[data-testid='role-filter-vendor']").click();
    cy.url().should("include", "role=vendor");
  });

  it("clicking admin tab sets role=admin in URL", () => {
    cy.get("[data-testid='role-filter-admin']").click();
    cy.url().should("include", "role=admin");
  });

  it("clicking All clears role from URL", () => {
    visitAdmin("role=vendor");
    interceptUsers();
    cy.get("[data-testid='role-filter-all']").click();
    cy.url().should("not.include", "role=");
  });

  it("shows active chip for role filter", () => {
    cy.get("[data-testid='role-filter-vendor']").click();
    cy.get("[data-testid='active-user-filters']").contains("vendor").should("exist");
  });
});

// ── Status filter ─────────────────────────────────────────────────────────────

describe("Admin Users — Status Filter", () => {
  beforeEach(() => {
    interceptUsers();
    visitAdmin();
  });

  it("clicking active sets status=active in URL", () => {
    cy.get("[data-testid='status-filter-active']").click();
    cy.url().should("include", "status=active");
  });

  it("clicking suspended sets status=suspended in URL", () => {
    cy.get("[data-testid='status-filter-suspended']").click();
    cy.url().should("include", "status=suspended");
  });

  it("clicking All Status clears status from URL", () => {
    visitAdmin("status=active");
    interceptUsers();
    cy.get("[data-testid='status-filter-all']").click();
    cy.url().should("not.include", "status=");
  });

  it("shows active chip for status filter", () => {
    cy.get("[data-testid='status-filter-suspended']").click();
    cy.get("[data-testid='active-user-filters']").contains("suspended").should("exist");
  });
});

// ── Date range filter ─────────────────────────────────────────────────────────

describe("Admin Users — Date Range Filter", () => {
  beforeEach(() => {
    interceptUsers();
    visitAdmin();
  });

  it("setting dateFrom updates URL", () => {
    cy.get("[data-testid='user-date-from']").type("2024-01-01");
    cy.url().should("include", "dateFrom=2024-01-01");
  });

  it("setting dateTo updates URL", () => {
    cy.get("[data-testid='user-date-to']").type("2024-12-31");
    cy.url().should("include", "dateTo=2024-12-31");
  });

  it("date range chip appears when both dates are set", () => {
    cy.get("[data-testid='user-date-from']").type("2024-01-01");
    cy.get("[data-testid='user-date-to']").type("2024-12-31");
    cy.get("[data-testid='active-user-filters']").contains("2024-01-01").should("exist");
  });

  it("removing date chip clears both date params", () => {
    cy.get("[data-testid='user-date-from']").type("2024-01-01");
    cy.get("[data-testid='user-date-to']").type("2024-12-31");
    cy.get("[data-testid='active-user-filters']").find("button").last().click();
    cy.url().should("not.include", "dateFrom=");
    cy.url().should("not.include", "dateTo=");
  });
});

// ── Sort filter ───────────────────────────────────────────────────────────────

describe("Admin Users — Sort Filter", () => {
  beforeEach(() => {
    interceptUsers();
    visitAdmin();
  });

  it("sorting by Name A–Z sets sortBy=name-asc", () => {
    cy.get("[data-testid='user-sort']").select("Name A–Z");
    cy.url().should("include", "sortBy=name-asc");
  });

  it("sorting by Name Z–A sets sortBy=name-desc", () => {
    cy.get("[data-testid='user-sort']").select("Name Z–A");
    cy.url().should("include", "sortBy=name-desc");
  });

  it("sorting by Oldest sets sortBy=oldest", () => {
    cy.get("[data-testid='user-sort']").select("Oldest First");
    cy.url().should("include", "sortBy=oldest");
  });

  it("Newest First does not add sortBy to URL (it is the default)", () => {
    cy.get("[data-testid='user-sort']").select("Name A–Z");
    cy.get("[data-testid='user-sort']").select("Newest First");
    cy.url().should("not.include", "sortBy=newest");
  });
});

// ── Clear filters ─────────────────────────────────────────────────────────────

describe("Admin Users — Clear Filters", () => {
  it("clear button resets all filter params from URL", () => {
    interceptUsers();
    visitAdmin("role=vendor&status=active&search=bob");
    cy.get("[data-testid='clear-user-filters']").click();
    cy.url().should("not.include", "role=");
    cy.url().should("not.include", "status=");
    cy.url().should("not.include", "search=");
  });

  it("active chips disappear after clear", () => {
    interceptUsers();
    visitAdmin("role=admin&status=active");
    cy.get("[data-testid='active-user-filters']").should("exist");
    cy.get("[data-testid='clear-user-filters']").click();
    cy.get("[data-testid='active-user-filters']").should("not.exist");
  });

  it("clear button appears when filters are active", () => {
    interceptUsers();
    visitAdmin("role=customer");
    cy.get("[data-testid='clear-user-filters']").should("be.visible");
  });
});

// ── URL persistence ───────────────────────────────────────────────────────────

describe("Admin Users — URL Persistence", () => {
  it("filters persist on page refresh", () => {
    interceptUsers();
    visitAdmin("role=vendor&status=active");
    cy.reload();
    cy.url().should("include", "role=vendor");
    cy.url().should("include", "status=active");
  });

  it("direct URL access with filters renders correctly", () => {
    interceptUsers();
    visitAdmin("role=admin&status=active&sortBy=name-asc");
    cy.contains("Users").should("be.visible");
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe("Admin Users — Pagination", () => {
  it("filter change resets to page 1", () => {
    interceptUsers();
    visitAdmin("page=3");
    cy.get("[data-testid='role-filter-vendor']").click();
    cy.url().should("not.include", "page=3");
    cy.url().should("include", "role=vendor");
  });

  it("shows pagination info when multiple pages exist", () => {
    cy.intercept("GET", "/api/admin/users*", {
      success: true,
      data: { users: USERS_STUB.data.users, total: 50, page: 2, totalPages: 3 },
    }).as("page2");
    visitAdmin("page=2");
    cy.get("[data-testid='user-pagination-info']").should("contain", "Page 2");
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe("Admin Users — Empty State", () => {
  it("shows no users found when API returns empty list", () => {
    cy.intercept("GET", "/api/admin/users*", EMPTY_STUB).as("emptyUsers");
    visitAdmin("role=admin");
    cy.contains("No users found").should("be.visible");
  });
});

// ── Combined filters ──────────────────────────────────────────────────────────

describe("Admin Users — Combined Filters", () => {
  beforeEach(() => {
    interceptUsers();
    visitAdmin();
  });

  it("role + status + sort coexist in URL", () => {
    cy.get("[data-testid='role-filter-customer']").click();
    cy.get("[data-testid='status-filter-active']").click();
    cy.get("[data-testid='user-sort']").select("Name A–Z");
    cy.url().should("include", "role=customer");
    cy.url().should("include", "status=active");
    cy.url().should("include", "sortBy=name-asc");
  });

  it("shows multiple chips simultaneously", () => {
    cy.get("[data-testid='role-filter-vendor']").click();
    cy.get("[data-testid='status-filter-suspended']").click();
    cy.get("[data-testid='active-user-filters']").within(() => {
      cy.contains("vendor").should("exist");
      cy.contains("suspended").should("exist");
    });
  });

  it("removing one chip leaves others intact", () => {
    visitAdmin("role=vendor&status=suspended");
    cy.get("[data-testid='active-user-filters']").within(() => {
      // Remove role chip only
      cy.contains("vendor").closest("span").find("button").click();
    });
    cy.url().should("not.include", "role=vendor");
    cy.url().should("include", "status=suspended");
  });
});

// ── API validation ────────────────────────────────────────────────────────────

describe("Admin Users — API Validation", () => {
  it("API returns 400 for invalid role value", () => {
    cy.request({ url: "/api/admin/users?role=superuser", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 400 for invalid status value", () => {
    cy.request({ url: "/api/admin/users?status=banned", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });

  it("API returns 400 for invalid sortBy value", () => {
    cy.request({ url: "/api/admin/users?sortBy=random", failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.success).to.eq(false);
    });
  });
});
