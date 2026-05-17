/// <reference types="cypress" />

/*
 * E2E — Department Mega Menu
 *
 * Layout (click-based, 3-column state machine):
 *   Initial:          Departments | Offers
 *   Dept clicked:     Departments | Sub-Departments | Offers
 *   Sub-dept clicked: Departments | Sub-Departments | Sub-Sub-Departments
 *
 * Covers:
 *  - Panel opens / closes correctly
 *  - Open animation class applied (opacity-100 translate-y-0)
 *  - Tree from /api/categories/tree rendered in column 1
 *  - Initial state: only departments + offers (no sub-dept column)
 *  - Clicking a dept with children shows sub-dept column
 *  - Clicking same dept again collapses sub-dept column (toggle)
 *  - Clicking a sub-dept with children replaces offers with sub-sub-depts
 *  - Clicking same sub-dept again restores offers (toggle)
 *  - Mini banners from /api/offers in right panel
 *  - Empty-offer state renders fallback
 *  - Skeletons shown while loading
 *  - Panel closes on outside click
 *  - Panel closes on Escape key
 *  - Navigation to correct URLs (depts/sub-depts/sub-sub-depts without children navigate)
 *  - "View All Departments" footer link works
 *  - Data fetched only once (cache)
 *  - Mobile: hamburger shows real categories from /api/categories
 *  - Accessibility: role=dialog, aria-label, aria-expanded
 *  - Equal column distribution (flex-1 across all visible columns)
 *  - "See all [parent]" footer links in sub-dept and sub-sub-dept panels
 *  - Background scroll locked while panel is open (useScrollLock)
 *  - Outside click via backdrop overlay closes the panel
 */

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_TREE = [
  {
    _id: "dept001", name: "Fresh Food", slug: "fresh-food", emoji: "🥦",
    color: "bg-green-50", textColor: "text-green-700",
    order: 1, isActive: true, productCount: 45,
    parentId: null, level: 0, image: "", description: "", createdAt: "",
    children: [
      {
        _id: "sub001", name: "Vegetables", slug: "vegetables", emoji: "🥕",
        color: "bg-green-50", textColor: "text-green-700",
        order: 1, isActive: true, productCount: 0,
        parentId: "dept001", level: 1, image: "", description: "", createdAt: "",
        children: [
          {
            _id: "subsub001", name: "Organic Veg", slug: "organic-vegetables", emoji: "🌱",
            color: "bg-green-50", textColor: "text-green-700",
            order: 1, isActive: true, productCount: 0,
            parentId: "sub001", level: 2, image: "", description: "", createdAt: "",
            children: [],
          },
          {
            _id: "subsub002", name: "Salads & Leaves", slug: "salads-leaves", emoji: "🥗",
            color: "bg-green-50", textColor: "text-green-700",
            order: 2, isActive: true, productCount: 0,
            parentId: "sub001", level: 2, image: "", description: "", createdAt: "",
            children: [],
          },
        ],
      },
      {
        _id: "sub002", name: "Fruits", slug: "fruits", emoji: "🍎",
        color: "bg-green-50", textColor: "text-green-700",
        order: 2, isActive: true, productCount: 0,
        parentId: "dept001", level: 1, image: "", description: "", createdAt: "",
        children: [],
      },
    ],
  },
  {
    _id: "dept002", name: "Bakery", slug: "bakery", emoji: "🍞",
    color: "bg-amber-50", textColor: "text-amber-700",
    order: 2, isActive: true, productCount: 18,
    parentId: null, level: 0, image: "", description: "", createdAt: "",
    children: [
      {
        _id: "sub003", name: "Breads & Rolls", slug: "breads-rolls", emoji: "🍞",
        color: "bg-amber-50", textColor: "text-amber-700",
        order: 1, isActive: true, productCount: 0,
        parentId: "dept002", level: 1, image: "", description: "", createdAt: "",
        children: [],
      },
    ],
  },
  {
    _id: "dept003", name: "Drinks", slug: "drinks", emoji: "🥤",
    color: "bg-purple-50", textColor: "text-purple-700",
    order: 3, isActive: true, productCount: 28,
    parentId: null, level: 0, image: "", description: "", createdAt: "",
    children: [],
  },
];

const MOCK_OFFERS = [
  {
    _id: "offer001",
    title: "Fresh Food Fiesta",
    subtitle: "Limited time deal",
    code: "FRESH20",
    discountType: "percentage",
    discountValue: 20,
    minOrderValue: 500,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    eligibleCategories: ["fresh-food"],
    badge: "HOT",
    color: "#22c55e",
    emoji: "🥦",
    category: "fresh-food",
    href: "/categories/fresh-food",
    order: 1,
    createdAt: "",
  },
  {
    _id: "offer002",
    title: "Bakery Bonanza",
    subtitle: "Weekend special",
    code: "BAKE15",
    discountType: "percentage",
    discountValue: 15,
    minOrderValue: 300,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    eligibleCategories: ["bakery"],
    badge: "NEW",
    color: "#f59e0b",
    emoji: "🍞",
    category: "bakery",
    href: "/categories/bakery",
    order: 2,
    createdAt: "",
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MOCK_CATEGORIES_FLAT = MOCK_TREE.map(({ children: _children, ...cat }) => ({ ...cat, children: undefined }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function stubApis({ offers = MOCK_OFFERS }: { offers?: typeof MOCK_OFFERS } = {}) {
  cy.intercept("GET", "/api/categories/tree", { body: { success: true, data: MOCK_TREE } }).as("tree");
  cy.intercept("GET", "/api/categories",      { body: { success: true, data: MOCK_CATEGORIES_FLAT } }).as("categories");
  cy.intercept("GET", "/api/offers*",         { body: { success: true, data: offers } }).as("offers");
  cy.intercept("GET", "/api/homepage/**",     { body: { success: true, data: [] } }).as("homepage");
  cy.intercept("GET", "/api/products*",       { body: { success: true, data: { products: [], total: 0, page: 1, totalPages: 0, limit: 12 } } }).as("products");
}

function openMegaMenu() {
  cy.contains("button", "Shop By Departments").click();
  cy.get('[data-testid="dept-mega-panel"]').should("exist");
}

function openAndWaitForTree() {
  openMegaMenu();
  cy.wait("@tree");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Department Mega Menu", () => {
  beforeEach(() => {
    stubApis();
    cy.visit("/");
  });

  /* ── Open / close ───────────────────────────────────────────────────────── */

  it("panel is not visible before the button is clicked", () => {
    cy.get('[data-testid="dept-mega-panel"]').should("not.exist");
  });

  it("opens the mega menu when 'Shop By Departments' is clicked", () => {
    cy.contains("button", "Shop By Departments").click();
    cy.get('[data-testid="dept-mega-panel"]').should("exist");
  });

  it("applies the open animation class after mounting", () => {
    cy.contains("button", "Shop By Departments").click();
    cy.get('[data-testid="dept-mega-panel"]')
      .should("have.class", "opacity-100")
      .and("have.class", "translate-y-0");
  });

  it("closes the panel on outside click (exit animation plays)", () => {
    cy.contains("button", "Shop By Departments").click();
    cy.get('[data-testid="dept-mega-panel"]').should("exist");
    cy.get("body").click(0, 0);
    cy.get('[data-testid="dept-mega-panel"]', { timeout: 1000 }).should("not.exist");
  });

  it("closes the panel when the button is clicked a second time (toggle)", () => {
    cy.contains("button", "Shop By Departments").click();
    cy.get('[data-testid="dept-mega-panel"]').should("exist");
    cy.contains("button", "Shop By Departments").click();
    cy.get('[data-testid="dept-mega-panel"]', { timeout: 1000 }).should("not.exist");
  });

  /* ── Escape key ─────────────────────────────────────────────────────────── */

  it("closes the panel when Escape is pressed", () => {
    openMegaMenu();
    cy.get('[data-testid="dept-mega-panel"]').should("exist");
    cy.get("body").type("{esc}");
    cy.get('[data-testid="dept-mega-panel"]', { timeout: 1000 }).should("not.exist");
  });

  /* ── Column 1: Departments ──────────────────────────────────────────────── */

  it("renders departments from /api/categories/tree in column 1", () => {
    openMegaMenu();
    cy.wait("@tree");
    cy.get('[data-testid="dept-category-list"]').within(() => {
      cy.contains("Fresh Food").should("be.visible");
      cy.contains("Bakery").should("be.visible");
      cy.contains("Drinks").should("be.visible");
    });
  });

  it("shows the emoji for each department", () => {
    openMegaMenu();
    cy.wait("@tree");
    cy.get('[data-testid="dept-row"]').first().should("contain.text", "🥦");
  });

  it("shows skeletons while the tree is loading", () => {
    // Re-intercept with delay AFTER beforeEach's stubApis — Cypress LIFO means this wins
    cy.intercept("GET", "/api/categories/tree", (req) => {
      req.reply({ delay: 500, body: { success: true, data: MOCK_TREE } });
    }).as("treeDelayed");

    cy.contains("button", "Shop By Departments").click();
    cy.get('[data-testid="dept-category-list"]').find('[class*="animate-pulse"]').should("have.length.gte", 1);
    cy.wait("@treeDelayed");
    cy.contains("Fresh Food").should("be.visible");
  });

  /* ── Column layout: click-based state machine ───────────────────────────── */

  it("initially shows only the departments column and offers panel (no sub-department column)", () => {
    openMegaMenu();
    cy.wait("@tree");
    cy.get('[data-testid="dept-category-list"]').should("be.visible");
    cy.get('[data-testid="dept-banners-panel"]').should("be.visible");
    cy.get('[data-testid="dept-subdept-list"]').should("not.exist");
  });

  it("sub-department column appears after clicking a department with children", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click(); // Fresh Food (has children)
    cy.get('[data-testid="dept-subdept-list"]').should("be.visible");
    cy.get('[data-testid="dept-subdept-list"]').within(() => {
      cy.contains("Vegetables").should("be.visible");
      cy.contains("Fruits").should("be.visible");
    });
  });

  it("sub-department column updates when a different department is clicked", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').eq(1).click(); // Bakery (has children)
    cy.get('[data-testid="dept-subdept-list"]').within(() => {
      cy.contains("Breads & Rolls").should("be.visible");
    });
  });

  it("clicking the same department again collapses the sub-department column", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click(); // expand Fresh Food
    cy.get('[data-testid="dept-subdept-list"]').should("exist");
    cy.get('[data-testid="dept-row"]').first().click(); // collapse
    cy.get('[data-testid="dept-subdept-list"]').should("not.exist");
    cy.get('[data-testid="dept-banners-panel"]').should("be.visible");
  });

  it("sub-sub-departments appear and offers panel hides when a sub-dept with children is clicked", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click();          // Fresh Food
    cy.get('[data-testid="dept-subdept-row"]').first().click();  // Vegetables (has children)
    cy.get('[data-testid="dept-subsubdept-panel"]').should("exist");
    cy.get('[data-testid="dept-subsubdept-grid"]').within(() => {
      cy.contains("Organic Veg").should("be.visible");
      cy.contains("Salads & Leaves").should("be.visible");
    });
    cy.get('[data-testid="dept-banners-panel"]').should("not.exist");
  });

  it("clicking the same sub-department again hides sub-sub-departments and restores offers", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click();          // Fresh Food
    cy.get('[data-testid="dept-subdept-row"]').first().click();  // Vegetables (expand)
    cy.get('[data-testid="dept-subsubdept-panel"]').should("exist");
    cy.get('[data-testid="dept-subdept-row"]').first().click();  // Vegetables (collapse)
    cy.get('[data-testid="dept-subsubdept-panel"]').should("not.exist");
    cy.get('[data-testid="dept-banners-panel"]').should("be.visible");
  });

  /* ── Navigation ─────────────────────────────────────────────────────────── */

  it("navigates to the correct department URL when a dept without sub-departments is clicked", () => {
    openAndWaitForTree();
    // Drinks (dept003) has no children — click navigates directly
    cy.get('[data-testid="dept-category-list"]').contains("Drinks").click();
    cy.url().should("include", "/products").and("include", "category=drinks");
  });

  it("closes the panel after navigating to a leaf department", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-category-list"]').contains("Drinks").click();
    cy.url().should("include", "/products");
    cy.get('[data-testid="dept-mega-panel"]', { timeout: 1000 }).should("not.exist");
  });

  it("navigates to the correct sub-department URL when a sub-dept without children is clicked", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click();       // Fresh Food (expand)
    cy.get('[data-testid="dept-subdept-row"]').eq(1).click(); // Fruits (no children → navigate)
    cy.url().should("include", "/products").and("include", "category=fruits");
  });

  it("navigates to the correct sub-sub-department URL when clicked", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click();          // Fresh Food
    cy.get('[data-testid="dept-subdept-row"]').first().click();  // Vegetables (expand sub-sub)
    cy.get('[data-testid="dept-subsubdept-item"]').first().click();
    cy.url().should("include", "/products").and("include", "category=organic-vegetables");
  });

  it("'View All Departments' footer link navigates to /categories", () => {
    openMegaMenu();
    cy.contains("View All Departments").click();
    cy.url().should("include", "/categories");
  });

  /* ── Offers panel (right column) ────────────────────────────────────────── */

  it("renders mini banners from /api/offers in the right panel", () => {
    openMegaMenu();
    cy.wait("@offers");
    cy.get('[data-testid="dept-banners-panel"]').should("be.visible");
    cy.get('[data-testid="dept-mini-banner"]').should("have.length", MOCK_OFFERS.length);
  });

  it("each mini banner shows the offer title and discount", () => {
    openMegaMenu();
    cy.wait("@offers");
    cy.get('[data-testid="dept-mini-banner"]').first().within(() => {
      cy.contains("Fresh Food Fiesta").should("be.visible");
      cy.contains("20% Off").should("be.visible");
    });
  });

  it("each mini banner shows the promo code when present", () => {
    openMegaMenu();
    cy.wait("@offers");
    cy.get('[data-testid="dept-mini-banner"]').first().contains("FRESH20").should("be.visible");
  });

  it("mini banner link navigates to the offer href", () => {
    openMegaMenu();
    cy.wait("@offers");
    cy.get('[data-testid="dept-mini-banner"]').first().click();
    cy.url().should("include", "/categories/fresh-food");
  });

  it("shows the empty-offers state when /api/offers returns an empty array", () => {
    // Re-intercept with empty data — LIFO priority over beforeEach's MOCK_OFFERS intercept
    cy.intercept("GET", "/api/offers*", { body: { success: true, data: [] } }).as("offersEmpty");
    openMegaMenu();
    cy.wait("@offersEmpty");
    cy.get('[data-testid="dept-banners-panel"]').contains("No current offers").should("be.visible");
    cy.get('[data-testid="dept-banners-panel"]').contains("Browse all promotions").should("be.visible");
  });

  it("renders banner skeletons while offers are loading", () => {
    cy.intercept("GET", "/api/offers*", (req) => {
      req.reply({ delay: 500, body: { success: true, data: MOCK_OFFERS } });
    }).as("offersDelayed");

    cy.visit("/");
    cy.contains("button", "Shop By Departments").click();
    cy.get('[data-testid="dept-banners-panel"]').find('[class*="animate-pulse"]').should("have.length.gte", 1);
    cy.wait("@offersDelayed");
    cy.get('[data-testid="dept-mini-banner"]').should("have.length", MOCK_OFFERS.length);
  });

  /* ── Data fetched only once ─────────────────────────────────────────────── */

  it("does not re-fetch the tree when the panel is closed and reopened", () => {
    let callCount = 0;
    cy.intercept("GET", "/api/categories/tree", (req) => {
      callCount++;
      req.reply({ body: { success: true, data: MOCK_TREE } });
    }).as("treeCount");

    cy.visit("/");
    cy.contains("button", "Shop By Departments").click();
    cy.wait("@treeCount");
    cy.get("body").click(0, 0);
    cy.wait(300);
    cy.contains("button", "Shop By Departments").click();
    cy.wait(300);
    cy.then(() => expect(callCount).to.eq(1));
  });

  /* ── Mobile categories (hamburger) ─────────────────────────────────────── */

  it("shows real categories in the mobile hamburger menu", () => {
    cy.viewport(375, 812);
    cy.visit("/");
    cy.get('[aria-label="Open menu"]').click();
    cy.get("header").contains("Fresh Food").should("be.visible");
    cy.get("header").contains("Bakery").should("be.visible");
    cy.get("header").contains("Drinks").should("be.visible");
  });

  it("mobile category links navigate to the correct page", () => {
    cy.viewport(375, 812);
    cy.visit("/");
    cy.get('[aria-label="Open menu"]').click();
    cy.get("header").contains("Bakery").click();
    cy.url().should("include", "/categories/bakery");
  });

  /* ── Accessibility ──────────────────────────────────────────────────────── */

  it("panel has role=dialog with an accessible label", () => {
    openMegaMenu();
    cy.get('[data-testid="dept-mega-panel"]')
      .should("have.attr", "role", "dialog")
      .and("have.attr", "aria-label", "Shop by department");
  });

  it("trigger button has aria-expanded=true when panel is open", () => {
    cy.contains("button", "Shop By Departments").should("have.attr", "aria-expanded", "false");
    cy.contains("button", "Shop By Departments").click();
    cy.contains("button", "Shop By Departments").should("have.attr", "aria-expanded", "true");
  });

  /* ── Equal column distribution ──────────────────────────────────────── */

  it("two visible columns (depts + offers) each have flex-grow:1 for equal distribution", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-category-list"]').should("have.css", "flex-grow", "1");
    cy.get('[data-testid="dept-banners-panel"]').should("have.css", "flex-grow", "1");
  });

  it("all three columns have flex-grow:1 for equal distribution when sub-department column is open", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click(); // Fresh Food → shows sub-dept col
    cy.get('[data-testid="dept-subdept-list"]').should("exist");
    cy.get('[data-testid="dept-category-list"]').should("have.css", "flex-grow", "1");
    cy.get('[data-testid="dept-subdept-list"]').should("have.css", "flex-grow", "1");
    cy.get('[data-testid="dept-banners-panel"]').should("have.css", "flex-grow", "1");
  });

  /* ── "See all" footer links ──────────────────────────────────────────── */

  it("shows 'See all [dept name]' footer link in the sub-department column", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click(); // Fresh Food
    cy.get('[data-testid="dept-subdept-list"]').contains("See all Fresh Food").should("be.visible");
  });

  it("'See all [dept name]' link navigates to the products page filtered by department", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click(); // Fresh Food
    cy.get('[data-testid="dept-subdept-list"]').contains("See all Fresh Food").click();
    cy.url().should("include", "/products").and("include", "category=fresh-food");
    cy.get('[data-testid="dept-mega-panel"]', { timeout: 1000 }).should("not.exist");
  });

  it("'See all' footer link updates when a different department is selected", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click(); // Fresh Food
    cy.get('[data-testid="dept-subdept-list"]').contains("See all Fresh Food").should("be.visible");
    cy.get('[data-testid="dept-row"]').eq(1).click(); // Bakery
    cy.get('[data-testid="dept-subdept-list"]').contains("See all Bakery").should("be.visible");
  });

  it("shows 'See all [sub-dept name]' footer link in the sub-sub-department panel", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click();         // Fresh Food
    cy.get('[data-testid="dept-subdept-row"]').first().click(); // Vegetables (has children)
    cy.get('[data-testid="dept-subsubdept-panel"]').contains("See all Vegetables").should("be.visible");
  });

  it("'See all [sub-dept name]' link navigates to the products page filtered by sub-department", () => {
    openAndWaitForTree();
    cy.get('[data-testid="dept-row"]').first().click();         // Fresh Food
    cy.get('[data-testid="dept-subdept-row"]').first().click(); // Vegetables (has children)
    cy.get('[data-testid="dept-subsubdept-panel"]').contains("See all Vegetables").click();
    cy.url().should("include", "/products").and("include", "category=vegetables");
    cy.get('[data-testid="dept-mega-panel"]', { timeout: 1000 }).should("not.exist");
  });

  /* ── Scroll lock ─────────────────────────────────────────────────────── */

  it("locks background scroll (html overflow: hidden) when the panel is open", () => {
    openMegaMenu();
    cy.get("html").should("have.css", "overflow", "hidden");
  });

  it("restores background scroll when the panel is closed", () => {
    openMegaMenu();
    cy.get("html").should("have.css", "overflow", "hidden");
    cy.contains("button", "Shop By Departments").click(); // toggle close
    cy.get('[data-testid="dept-mega-panel"]', { timeout: 1000 }).should("not.exist");
    cy.get("html").invoke("css", "overflow").should("not.equal", "hidden");
  });

  /* ── Outside click on page content ──────────────────────────────────── */

  it("closes the panel when clicking page content below the panel", () => {
    openAndWaitForTree();
    // y=650 is below the panel content area; outside the nav ref, so the Navbar handler closes it
    cy.get("body").click(640, 650);
    cy.get('[data-testid="dept-mega-panel"]', { timeout: 1000 }).should("not.exist");
  });
});
